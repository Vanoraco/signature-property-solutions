import json

from django.conf import settings
from django.db.models import Q, Count, Prefetch
from django.http import JsonResponse
from django.http import HttpResponse
from django.shortcuts import redirect
from django.shortcuts import render
from django.shortcuts import render, get_object_or_404
from django.core.paginator import Paginator
from signatureapp.models import (
    home,
    catagory,
    propertys,
    contact,
    serevices,
    about,
    testimonial,
    property_request,
    facilities,
    SearchEvent,
    servicespage,
    servicespage_why_item,
    servicespage_process_step,
)
from signatureapp.search import PropertySearch, building_types


# Create your views here.
RESIDENTIAL_CATEGORY_KEYWORDS = ("apartment", "house", "villa", "penthouse", "condo")
PROPERTY_ASSISTANT_TYPES = {
    "apartment": ("apartment", "apartments", "flat", "flats", "condo", "condominium"),
    "office": ("office", "offices", "workspace", "work space"),
    "house": ("house", "houses", "villa", "villas", "home", "homes"),
    "land": ("land", "plot"),
    "warehouse": ("warehouse", "warehouses", "store", "storage"),
    "building": ("building", "buildings"),
}
PROPERTY_ASSISTANT_ALLOWED_TERMS = (
    "agent",
    "available",
    "availability",
    "bath",
    "bathroom",
    "bed",
    "bedroom",
    "birr",
    "bole",
    "budget",
    "buy",
    "call",
    "contact",
    "email",
    "etb",
    "floor",
    "furnished",
    "house",
    "land",
    "lease",
    "location",
    "office",
    "parking",
    "price",
    "property",
    "rent",
    "sale",
    "sell",
    "service",
    "size",
    "usd",
    "warehouse",
    "whatsapp",
) + tuple(term for terms in PROPERTY_ASSISTANT_TYPES.values() for term in terms)
PROPERTY_ASSISTANT_REJECT_TERMS = (
    "code",
    "coding",
    "essay",
    "homework",
    "ignore previous",
    "joke",
    "medical",
    "politics",
    "previous instructions",
    "program",
    "python",
    "recipe",
    "school",
    "write a poem",
)
PROPERTY_ASSISTANT_REFUSAL = (
    "I can only help with Signature Property Solutions listings, prices, "
    "locations, and real estate services in Ethiopia."
)
PROPERTY_ASSISTANT_CONTEXT_KEY = "property_assistant_context"
PROPERTY_ASSISTANT_GREETING_REPLY = (
    "Hi, how can I help you today? Are you looking to rent or buy a property?"
)
PROPERTY_ASSISTANT_PRICE_PROMPT = (
    "Great. What price range or budget should I search within? You can also add a "
    "location or property type, such as apartment in Bole under 10,000,000 ETB."
)
PROPERTY_ASSISTANT_BROWSE_REPLY = (
    "Okay, feel free to browse the site. If you need help later, tell me what kind "
    "of property, location, or budget you prefer."
)
DEFAULT_SEO_DESCRIPTION = (
    "Signature Property Solutions helps clients find verified apartments, houses, "
    "offices, warehouses, buildings, and land for sale or rent in Ethiopia."
)


def parse_price_amount(value):
    if not value:
        return None, None
    lower = value.lower()
    if "br" in lower or "birr" in lower or "etb" in lower:
        currency = "ETB"
    elif "$" in value or "usd" in lower:
        currency = "USD"
    else:
        currency = None
    digits = "".join(ch for ch in value if ch.isdigit())
    return currency, int(digits) if digits else None


def normalize_assistant_token(value):
    return "".join(ch for ch in value.lower() if ch.isalpha())


def compress_repeated_letters(value):
    compressed = []
    previous = ""
    for char in value:
        if char != previous:
            compressed.append(char)
        previous = char
    return "".join(compressed)


def assistant_word_matches(word, targets):
    normalized = normalize_assistant_token(word)
    if not normalized:
        return False
    compressed = compress_repeated_letters(normalized)
    return normalized in targets or compressed in targets


def assistant_message_is_greeting(message):
    greeting_targets = {"hey", "hi", "hello", "helo", "selam"}
    words = [word for word in message.split() if normalize_assistant_token(word)]
    if not words or len(words) > 4:
        return False
    return any(assistant_word_matches(word, greeting_targets) for word in words)


def assistant_message_is_yes(message):
    yes_targets = {"yes", "yep", "yeah", "sure", "ok", "okay", "yea"}
    words = [word for word in message.split() if normalize_assistant_token(word)]
    if not words or len(words) > 4:
        return False
    return any(assistant_word_matches(word, yes_targets) for word in words)


def assistant_message_is_no(message):
    no_targets = {"no", "nope", "nah", "not"}
    words = [word for word in message.split() if normalize_assistant_token(word)]
    if not words or len(words) > 5:
        return False
    return any(assistant_word_matches(word, no_targets) for word in words)


def assistant_message_is_allowed(message):
    lower = message.lower()
    if any(term in lower for term in PROPERTY_ASSISTANT_REJECT_TERMS):
        return False
    if assistant_message_is_greeting(message) or assistant_message_is_yes(message) or assistant_message_is_no(message):
        return True
    if assistant_message_has_budget(message):
        return True
    return any(term in lower for term in PROPERTY_ASSISTANT_ALLOWED_TERMS)


def assistant_message_has_budget(message):
    for token in message.lower().replace(",", "").split():
        if token.isdigit() and int(token) >= 1000:
            return True
    return False


def extract_assistant_filters(message):
    lower = message.lower()
    filters = {
        "status": "",
        "property_type": "",
        "bedrooms": None,
        "bathrooms": None,
        "floor": None,
        "budget": None,
        "currency": "",
        "locations": [],
    }

    if any(term in lower for term in ("rent", "lease")):
        filters["status"] = "For Rent"
    elif any(term in lower for term in ("sale", "buy", "purchase", "sell")):
        filters["status"] = "For Sale"

    for property_type, terms in PROPERTY_ASSISTANT_TYPES.items():
        if any(term in lower for term in terms):
            filters["property_type"] = property_type
            break

    for bedroom_count in range(1, 11):
        bedroom_terms = (
            f"{bedroom_count} bedroom",
            f"{bedroom_count} bedrooms",
            f"{bedroom_count} bed",
            f"{bedroom_count} beds",
        )
        if any(term in lower for term in bedroom_terms):
            filters["bedrooms"] = str(bedroom_count)
            break

    for bathroom_count in range(1, 11):
        bathroom_terms = (
            f"{bathroom_count} bathroom",
            f"{bathroom_count} bathrooms",
            f"{bathroom_count} bath",
            f"{bathroom_count} baths",
            f"{bathroom_count} restroom",
            f"{bathroom_count} restrooms",
        )
        if any(term in lower for term in bathroom_terms):
            filters["bathrooms"] = str(bathroom_count)
            break

    for floor_number in range(1, 101):
        floor_terms = (
            f"{floor_number} floor",
            f"{floor_number} floors",
            f"floor {floor_number}",
            f"{floor_number}th floor",
            f"{floor_number}st floor",
            f"{floor_number}nd floor",
            f"{floor_number}rd floor",
        )
        if any(term in lower for term in floor_terms):
            filters["floor"] = floor_number
            break

    for token in lower.replace(",", "").split():
        if token.isdigit():
            amount = int(token)
            if amount >= 1000:
                filters["budget"] = amount
                break
    if any(term in lower for term in ("usd", "$", "dollar")):
        filters["currency"] = "USD"
    elif any(term in lower for term in ("etb", "birr", "br")):
        filters["currency"] = "ETB"
    elif filters["budget"] and filters["budget"] >= 100000:
        filters["currency"] = "ETB"

    known_locations = set()
    for location in propertys.objects.exclude(property_location="").values_list("property_location", flat=True):
        for part in location.replace(",", " ").split():
            cleaned = part.strip().lower()
            if len(cleaned) >= 3:
                known_locations.add(cleaned)
    filters["locations"] = [location for location in known_locations if location in lower]
    return filters


def assistant_filters_have_search_intent(filters):
    return any(
        (
            filters["status"],
            filters["property_type"],
            filters["bedrooms"],
            filters["bathrooms"],
            filters["floor"],
            filters["budget"],
            filters["locations"],
        )
    )


def assistant_filters_only_goal(filters):
    return bool(filters["status"]) and not any(
        (
            filters["property_type"],
            filters["bedrooms"],
            filters["bathrooms"],
            filters["floor"],
            filters["budget"],
            filters["locations"],
        )
    )


def assistant_filters_are_followup(filters):
    has_primary_search = bool(filters["status"] or filters["property_type"])
    has_refinement = bool(
        filters["bedrooms"]
        or filters["bathrooms"]
        or filters["floor"]
        or filters["budget"]
        or filters["locations"]
    )
    return has_refinement and not has_primary_search


def assistant_filters_are_status_change(filters):
    return assistant_filters_only_goal(filters)


def assistant_context_filters(request):
    context = request.session.get(PROPERTY_ASSISTANT_CONTEXT_KEY, {})
    filters = context.get("filters", {})
    return {
        "status": filters.get("status", ""),
        "property_type": filters.get("property_type", ""),
        "bedrooms": filters.get("bedrooms"),
        "bathrooms": filters.get("bathrooms"),
        "floor": filters.get("floor"),
        "budget": filters.get("budget"),
        "currency": filters.get("currency", ""),
        "locations": filters.get("locations", []),
    }


def assistant_store_context(request, filters=None, stage=""):
    request.session[PROPERTY_ASSISTANT_CONTEXT_KEY] = {
        "stage": stage,
        "filters": filters or {},
    }
    request.session.modified = True


def assistant_merge_filters(base_filters, new_filters):
    merged = dict(base_filters)
    for key, value in new_filters.items():
        if value:
            merged[key] = value
    return merged


def assistant_property_payload(pro):
    specs = pro.card_specs()
    return {
        "title": pro.property_title,
        "price": pro.price,
        "location": pro.property_location,
        "status": pro.property_status,
        "type": str(pro.property_types),
        "url": f"/properties/{pro.slug}",
        "specs": [f"{spec['value']} {spec['label']}" for spec in specs],
    }


def find_assistant_matches(filters):
    queryset = propertys.objects.select_related("property_types").all().order_by("-id")
    if filters["status"]:
        queryset = queryset.filter(property_status=filters["status"])
    if filters["property_type"]:
        queryset = queryset.filter(property_types__catagorys__icontains=filters["property_type"])
    if filters["bedrooms"]:
        queryset = queryset.filter(bedrooms=filters["bedrooms"])
    if filters["bathrooms"]:
        queryset = queryset.filter(bathrooms=filters["bathrooms"])
        if not filters["property_type"]:
            residential_query = Q()
            for keyword in RESIDENTIAL_CATEGORY_KEYWORDS:
                residential_query |= Q(property_types__catagorys__icontains=keyword)
            queryset = queryset.filter(residential_query)
    if filters["floor"]:
        queryset = queryset.filter(property_floor=filters["floor"])
    if filters["locations"]:
        location_query = Q()
        for location in filters["locations"]:
            location_query |= Q(property_location__icontains=location)
        queryset = queryset.filter(location_query)

    scored_matches = []
    for pro in queryset:
        score = 0
        price_fit_score = 0
        listing_currency, listing_amount = parse_price_amount(pro.price)
        if filters["budget"] and filters["currency"] and listing_currency != filters["currency"]:
            continue
        if filters["budget"] and listing_amount and listing_amount > filters["budget"]:
            continue
        if filters["property_type"] and filters["property_type"] in str(pro.property_types).lower():
            score += 4
        if filters["status"] and filters["status"] == pro.property_status:
            score += 3
        if filters["locations"] and any(location in pro.property_location.lower() for location in filters["locations"]):
            score += 3
        if filters["bedrooms"] and filters["bedrooms"] == pro.bedrooms:
            score += 2
        if filters["bathrooms"] and filters["bathrooms"] == pro.bathrooms:
            score += 2
        if filters["floor"] and filters["floor"] == pro.property_floor:
            score += 2
        if filters["budget"]:
            if listing_amount and listing_amount <= filters["budget"]:
                if not filters["currency"] or not listing_currency or listing_currency == filters["currency"]:
                    score += 3
                    price_fit_score = int((listing_amount / filters["budget"]) * 1000)
        scored_matches.append((score, price_fit_score, pro.id, pro))

    scored_matches.sort(key=lambda item: (item[0], item[1], item[2]), reverse=True)
    return [pro for score, _, _, pro in scored_matches if score >= 0][:5]


def build_assistant_reply(filters, matches):
    if not matches:
        return (
            "I could not find an exact match right now. Send us your preferred "
            "property type, location, and budget through the request box so we can "
            "prepare better options."
        )

    lead = "I found"
    if filters["property_type"]:
        lead += f" {filters['property_type']}"
    if filters["status"]:
        lead += f" listings for {filters['status'].lower().replace('for ', '')}"
    lead += f" that may fit. Here are the best {min(len(matches), 5)} options."

    best = matches[0]
    details = [best.property_title]
    if best.property_location:
        details.append(f"in {best.property_location}")
    if best.price:
        details.append(f"listed at {best.price}")
    return f"{lead} Best match: {' '.join(details)}."


def absolute_url(path):
    return f"{settings.SITE_URL}{path}"


def build_seo(request, title, description=DEFAULT_SEO_DESCRIPTION, image_url=""):
    canonical_url = absolute_url(request.path)
    return {
        "site_name": settings.SITE_NAME,
        "title": f"{title} | {settings.SITE_NAME}",
        "description": description,
        "canonical_url": canonical_url,
        "image_url": image_url,
    }


def organization_schema(contactss):
    schema = {
        "@context": "https://schema.org",
        "@type": "RealEstateAgent",
        "name": settings.SITE_NAME,
        "url": settings.SITE_URL,
        "areaServed": {
            "@type": "Country",
            "name": "Ethiopia",
        },
    }
    if contactss:
        if contactss.phone_number:
            schema["telephone"] = contactss.phone_number
        if contactss.email:
            schema["email"] = contactss.email
        if contactss.address:
            schema["address"] = contactss.address
        same_as = [
            url
            for url in (contactss.facebook, contactss.instagram, contactss.linkden)
            if url
        ]
        if same_as:
            schema["sameAs"] = same_as
    return json.dumps(schema)


def property_schema(pro):
    schema = {
        "@context": "https://schema.org",
        "@type": "Offer",
        "name": pro.property_title,
        "url": absolute_url(f"/properties/{pro.slug}"),
        "category": str(pro.property_types),
        "availability": "https://schema.org/InStock",
        "itemOffered": {
            "@type": "Residence" if pro.is_residential_listing() else "Place",
            "name": pro.property_title,
            "description": pro.property_short_discription,
            "address": pro.property_location,
        },
        "seller": {
            "@type": "RealEstateAgent",
            "name": settings.SITE_NAME,
            "url": settings.SITE_URL,
        },
    }
    if pro.price:
        schema["price"] = "".join(ch for ch in pro.price if ch.isdigit())
        if "usd" in pro.price.lower() or "$" in pro.price:
            schema["priceCurrency"] = "USD"
        elif "br" in pro.price.lower() or "birr" in pro.price.lower() or "etb" in pro.price.lower():
            schema["priceCurrency"] = "ETB"
    if pro.main_image:
        schema["image"] = absolute_url(pro.main_image.url)
    return json.dumps(schema)


def _log_search_event(request, search, results_count):
    """Persist a SearchEvent from the properties listing or suggest endpoint."""
    try:
        applied = search.applied_filters()
        SearchEvent.objects.create(
            query=applied.get('q', ''),
            source=request.resolver_match.route if hasattr(request, 'resolver_match') and request.resolver_match else 'properties',
            location_filter=applied.get('q', '') if 'q' in applied else '',
            property_type=applied.get('type', ''),
            status_filter=applied.get('filter', ''),
            results_count=results_count,
        )
    except Exception:
        pass


def index(request):
    homes = home.objects.all()
    hom = homes.last()
    categories = catagory.objects.all()
    featured = propertys.objects.select_related("property_types").order_by('-id')[:6]
    contacts = contact.objects.all()
    contactss = contacts.last()

    context = {
        "hom": hom,
        "catagorys": categories,
        "propertyss": featured,
        "contactss": contactss,
        "seo": build_seo(
            request,
            "Real Estate in Ethiopia",
            "Find verified apartments, houses, offices, warehouses, buildings, and land for sale or rent in Ethiopia with Signature Property Solutions.",
        ),
        "schema_json": organization_schema(contactss),
    }

    return render(request, "index.html", context)


def aboutus(request):
    aboute = about.objects.prefetch_related(
        "intro_paragraphs",
        "value_items",
        "why_items",
        "commitment_paragraphs",
    ).last()
    contacts = contact.objects.all()
    contactss = contacts.last()

    context = {
        "about": aboute,
        "contactss": contactss,
        "seo": build_seo(
            request,
            "About Us",
            "Learn about Signature Property Solutions, a real estate company helping clients buy, rent, and invest in properties across Ethiopia.",
        ),
        "schema_json": organization_schema(contactss),
    }
    return render(request, "about.html", context)


def services(request):
    contacts = contact.objects.all()
    contactss = contacts.last()
    services_page = servicespage.objects.prefetch_related(
        Prefetch(
            "why_items",
            queryset=servicespage_why_item.objects.filter(key__startswith="reference-"),
        ),
        Prefetch(
            "process_steps",
            queryset=servicespage_process_step.objects.filter(key__startswith="reference-"),
        ),
        "service_items__paragraphs",
        "service_items__tag_groups__items",
    ).last()

    context = {
        "contactss": contactss,
        "services_page": services_page,
        "service_items": services_page.service_items.all() if services_page else [],
        "why_items": services_page.why_items.all() if services_page else [],
        "process_steps": services_page.process_steps.all() if services_page else [],
        "seo": build_seo(
            request,
            "Real Estate Services in Ethiopia",
            "Explore real estate services for property rental, sales, consulting, and client support in Ethiopia.",
        ),
        "schema_json": organization_schema(contactss),
    }

    return render(request, "service.html", context)


def servicesdt(request, slug):
    serevice = serevices.objects.get(slug=slug)
    contacts = contact.objects.all()
    contactss = contacts.last()

    context = {
        "serevice": serevice,
        "contactss": contactss,
        "seo": build_seo(
            request,
            serevice.service_name,
            f"{serevice.service_name} from Signature Property Solutions in Ethiopia.",
        ),
        "schema_json": organization_schema(contactss),
    }

    return render(request, "servicedt.html", context)


def properties(request):
    search = PropertySearch(request.GET)
    all_properties = search.results()
    paginator = Paginator(all_properties, 6)
    page_number = request.GET.get('page')
    page_obj = paginator.get_page(page_number)

    contacts = contact.objects.all()
    contactss = contacts.last()

    applied = search.applied_filters()
    active_count = sum(
        1 for k in ('bedrooms', 'bathrooms', 'floor', 'furnished', 'size',
                     'min_price', 'max_price', 'currency', 'type', 'amenities')
        if applied.get(k)
    )

    context = {
        'all_properties': page_obj,
        'categories': catagory.objects.all(),
        'all_facilities': facilities.objects.all(),
        'applied_filters': applied,
        'active_filter_count': active_count,
        'building_type_choices': building_types(),
        'contactss': contactss,
        'request': request,
        'seo': build_seo(
            request,
            'Properties for Sale and Rent in Ethiopia',
            'Browse verified apartments, houses, offices, warehouses, buildings, and land for sale or rent in Ethiopia.',
        ),
        'schema_json': organization_schema(contactss),
    }
    # Persist search event for analytics (only when filters are active)
    if active_count > 0 or applied.get('q'):
        _log_search_event(request, search, all_properties.count())
    return render(request, 'properties.html', context)


def filter_properties(request, category_slug):
    category = get_object_or_404(catagory, slug=category_slug)
    contacts = contact.objects.all()
    contactss = contacts.last()
    property_list = propertys.objects.select_related("property_types").filter(property_types=category)
    # Get selected category from query parameters
    selected_category = request.GET.get("category")
    if selected_category:
        property_list = property_list.filter(
            property_types__catagorys=selected_category
        )
    selected_filter = request.GET.get("filter")

    if selected_filter == "Sale":
        property_list = property_list.filter(property_status="For Sale")
    elif selected_filter == "Rent":
        property_list = property_list.filter(property_status="For Rent")
    elif selected_filter == "LowToHigh":
        property_list = property_list.order_by("price")
    elif selected_filter == "HighToLow":
        property_list = property_list.order_by("-price")
    paginator = Paginator(property_list, 6)  # Show 6 properties per page
    page_number = request.GET.get("page")
    properties = paginator.get_page(page_number)
    categories = catagory.objects.all()

    return render(
        request,
        "filtered_properties.html",
        {
            "properties": properties,
            "contactss": contactss,
            "categories": categories,
            "selected_category": selected_category,
            "selected_filter": selected_filter,
            "seo": build_seo(
                request,
                f"{category.catagorys} in Ethiopia",
                f"Browse verified {category.catagorys.lower()} listings in Ethiopia from Signature Property Solutions.",
            ),
            "schema_json": organization_schema(contactss),
        },
    )


def properties_detail(request, slug):
    pro = propertys.objects.select_related("property_types").get(slug=slug)
    propertyss = propertys.objects.select_related("property_types").all().order_by("-id")[:3]
    contacts = contact.objects.all()
    contactss = contacts.last()

    description = pro.property_short_discription or f"{pro.property_title} in {pro.property_location}. View price, location, and property details from Signature Property Solutions."
    image_url = absolute_url(pro.main_image.url) if pro.main_image else ""
    context = {
        "pro": pro,
        "propertyss": propertyss,
        "contactss": contactss,
        "categories": catagory.objects.all(),
        "seo": build_seo(request, pro.property_title, description, image_url),
        "schema_json": property_schema(pro),
    }

    return render(request, "apartment-single.html", context)


def contact_view(request):
    contacts = contact.objects.all()
    contactus = contacts.last()
    contacts = contact.objects.all()
    contactss = contacts.last()

    context = {
        "contac": contactus,
        "contactss": contactss,
        "seo": build_seo(
            request,
            "Contact",
            "Contact Signature Property Solutions for property sales, rentals, and real estate support in Ethiopia.",
        ),
        "schema_json": organization_schema(contactss),
    }

    return render(request, "contact.html", context)


def testimonials(request):
    testimonials_list = testimonial.objects.filter(is_published=True)
    contacts = contact.objects.all()
    contactss = contacts.last()

    context = {
        "testimonials": testimonials_list,
        "contactss": contactss,
        "seo": build_seo(
            request,
            "Client Testimonials",
            "Read client testimonials and property service experiences from Signature Property Solutions in Ethiopia.",
        ),
        "schema_json": organization_schema(contactss),
    }

    return render(request, "testimonials.html", context)


def robots_txt(request):
    return render(request, "robots.txt", content_type="text/plain")


def llms_txt(request):
    return render(request, "llms.txt", content_type="text/plain")


def sitemap_xml(request):
    static_paths = [
        "",
        "properties",
        "services",
        "aboutus",
        "testimonials",
        "contact",
    ]
    urls = [
        {
            "loc": absolute_url(f"/{path}" if path else "/"),
            "changefreq": "weekly",
            "priority": "1.0" if path == "" else "0.8",
        }
        for path in static_paths
    ]
    for category in catagory.objects.exclude(slug=""):
        urls.append(
            {
                "loc": absolute_url(f"/filter_properties/{category.slug}/"),
                "changefreq": "weekly",
                "priority": "0.7",
            }
        )
    for service in serevices.objects.exclude(slug=""):
        urls.append(
            {
                "loc": absolute_url(f"/servicesdt/{service.slug}"),
                "changefreq": "monthly",
                "priority": "0.7",
            }
        )
    for pro in propertys.objects.exclude(slug=""):
        urls.append(
            {
                "loc": absolute_url(f"/properties/{pro.slug}"),
                "lastmod": pro.last_update.date().isoformat(),
                "changefreq": "weekly",
                "priority": "0.9",
            }
        )
    lines = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for url in urls:
        lines.append("  <url>")
        lines.append(f"    <loc>{url['loc']}</loc>")
        if url.get("lastmod"):
            lines.append(f"    <lastmod>{url['lastmod']}</lastmod>")
        lines.append(f"    <changefreq>{url['changefreq']}</changefreq>")
        lines.append(f"    <priority>{url['priority']}</priority>")
        lines.append("  </url>")
    lines.append("</urlset>")
    return HttpResponse("\n".join(lines), content_type="application/xml")


def submit_property_request(request):
    if request.method != "POST":
        return redirect("properties")

    message = request.POST.get("message", "").strip()
    source_page = request.POST.get("source_page", "").strip() or request.META.get("HTTP_REFERER", "")
    redirect_to = source_page if source_page.startswith("/") else request.META.get("HTTP_REFERER", "/properties")

    if message:
        property_request.objects.create(
            name=request.POST.get("name", "").strip(),
            phone_number=request.POST.get("phone_number", "").strip(),
            email=request.POST.get("email", "").strip(),
            property_type=request.POST.get("property_type", "").strip(),
            goal=request.POST.get("goal", "").strip(),
            location=request.POST.get("location", "").strip(),
            budget=request.POST.get("budget", "").strip(),
            message=message,
            source_page=source_page,
        )
        separator = "&" if "?" in redirect_to else "?"
        return redirect(f"{redirect_to}{separator}request_submitted=1#property-request")

    separator = "&" if "?" in redirect_to else "?"
    return redirect(f"{redirect_to}{separator}request_error=1#property-request")


def property_assistant(request):
    if request.method != "POST":
        return JsonResponse({"reply": PROPERTY_ASSISTANT_REFUSAL, "matches": []}, status=405)

    message = request.POST.get("message", "").strip()
    if not message or len(message) > 500:
        return JsonResponse(
            {
                "reply": "Please send a short property question, such as offices for rent in Bole or apartments under 100,000 ETB.",
                "matches": [],
            },
            status=400,
        )

    if not assistant_message_is_allowed(message):
        return JsonResponse({"reply": PROPERTY_ASSISTANT_REFUSAL, "matches": []})

    if assistant_message_is_greeting(message):
        assistant_store_context(request, stage="asked_goal")
        return JsonResponse({"reply": PROPERTY_ASSISTANT_GREETING_REPLY, "matches": []})

    context = request.session.get(PROPERTY_ASSISTANT_CONTEXT_KEY, {})
    if assistant_message_is_no(message):
        assistant_store_context(request)
        return JsonResponse({"reply": PROPERTY_ASSISTANT_BROWSE_REPLY, "matches": []})

    filters = extract_assistant_filters(message)
    if assistant_message_is_yes(message) and not assistant_filters_have_search_intent(filters):
        assistant_store_context(request, assistant_context_filters(request), "asked_budget")
        return JsonResponse({"reply": PROPERTY_ASSISTANT_PRICE_PROMPT, "matches": []})

    if context.get("stage") == "asked_goal" and assistant_filters_only_goal(filters):
        assistant_store_context(request, filters, "asked_budget")
        return JsonResponse({"reply": PROPERTY_ASSISTANT_PRICE_PROMPT, "matches": []})

    if context.get("stage") in ("asked_goal", "asked_budget") or (
        context.get("stage") == "searching"
        and (assistant_filters_are_followup(filters) or assistant_filters_are_status_change(filters))
    ):
        filters = assistant_merge_filters(assistant_context_filters(request), filters)

    if assistant_filters_have_search_intent(filters):
        assistant_store_context(request, filters, "searching")

    matches = find_assistant_matches(filters)
    return JsonResponse(
        {
            "reply": build_assistant_reply(filters, matches),
            "matches": [assistant_property_payload(pro) for pro in matches],
            "request_link": not matches and assistant_filters_have_search_intent(filters),
        }
    )


def search_suggest(request):
    q = request.GET.get('q', '').strip()
    if len(q) < 1:
        return JsonResponse({'results': []})

    results = []

    locations_qs = (
        propertys.objects.filter(property_location__icontains=q)
        .values('property_location')
        .annotate(count=Count('id'))
        .order_by('-count')
    )
    starts_with = [loc for loc in locations_qs if loc['property_location'].lower().startswith(q.lower())]
    contains = [loc for loc in locations_qs if not loc['property_location'].lower().startswith(q.lower())]
    for loc in (starts_with + contains)[:8]:
        results.append({
            'type': 'location',
            'label': loc['property_location'],
            'value': loc['property_location'],
            'count': loc['count'],
        })

    for slug, label in building_types():
        if q.lower() in label.lower():
            results.append({
                'type': 'type',
                'label': label,
                'value': slug,
            })

    return JsonResponse({'results': results})


def properties_partial(request):
    search = PropertySearch(request.GET)
    all_properties = search.results()
    paginator = Paginator(all_properties, 6)
    page_number = request.GET.get('page')
    page_obj = paginator.get_page(page_number)

    applied = search.applied_filters()
    active_count = sum(
        1 for k in ('bedrooms', 'bathrooms', 'floor', 'furnished', 'size',
                     'min_price', 'max_price', 'currency', 'type', 'amenities')
        if applied.get(k)
    )

    context = {
        'all_properties': page_obj,
        'applied_filters': applied,
        'active_filter_count': active_count,
        'building_type_choices': building_types(),
        'all_facilities': facilities.objects.all(),
        'request': request,
    }
    return render(request, 'properties_cards.html', context)


def properties_count(request):
    search = PropertySearch(request.GET)
    count = search.results().count()
    return JsonResponse({'count': count})


def handler404(request, exception):
    contacts = contact.objects.all()
    contactss = contacts.last()
    return render(request, '404.html', {'contactss': contactss}, status=404)
