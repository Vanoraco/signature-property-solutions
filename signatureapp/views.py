import json

from django.conf import settings
from django.db.models import Q
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
    catagory,
    serevices,
    about,
    testimonial,
    property_request,
)


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
DEFAULT_SEO_DESCRIPTION = (
    "Signature Property Solutions helps clients find verified apartments, houses, "
    "offices, warehouses, buildings, and land for sale or rent in Ethiopia."
)


def is_residential_category(category):
    if not category:
        return False
    category_name = (category.catagorys or "").lower()
    return any(keyword in category_name for keyword in RESIDENTIAL_CATEGORY_KEYWORDS)


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


def assistant_message_is_allowed(message):
    lower = message.lower()
    if any(term in lower for term in PROPERTY_ASSISTANT_REJECT_TERMS):
        return False
    return any(term in lower for term in PROPERTY_ASSISTANT_ALLOWED_TERMS)


def extract_assistant_filters(message):
    lower = message.lower()
    filters = {
        "status": "",
        "property_type": "",
        "bedrooms": None,
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

    known_locations = set()
    for location in propertys.objects.exclude(property_location="").values_list("property_location", flat=True):
        for part in location.replace(",", " ").split():
            cleaned = part.strip().lower()
            if len(cleaned) >= 3:
                known_locations.add(cleaned)
    filters["locations"] = [location for location in known_locations if location in lower]
    return filters


def assistant_property_payload(pro):
    specs = pro.card_specs()
    return {
        "title": pro.property_title,
        "price": pro.price,
        "location": pro.property_location,
        "status": pro.property_status,
        "type": str(pro.property_types),
        "url": f"/properteasdet/{pro.slug}",
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
    if filters["locations"]:
        location_query = Q()
        for location in filters["locations"]:
            location_query |= Q(property_location__icontains=location)
        queryset = queryset.filter(location_query)

    scored_matches = []
    for pro in queryset:
        score = 0
        listing_currency, listing_amount = parse_price_amount(pro.price)
        if filters["budget"] and filters["currency"] and listing_currency and listing_currency != filters["currency"]:
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
        if filters["budget"]:
            if listing_amount and listing_amount <= filters["budget"]:
                if not filters["currency"] or not listing_currency or listing_currency == filters["currency"]:
                    score += 3
        scored_matches.append((score, pro.id, pro))

    scored_matches.sort(key=lambda item: (item[0], item[1]), reverse=True)
    return [pro for score, _, pro in scored_matches if score >= 0][:5]


def build_assistant_reply(filters, matches):
    if not matches:
        return (
            "I could not find an exact match right now. Please use the property "
            "request box and tell us your preferred property type, location, and "
            "budget so we can prepare better options."
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
        "url": absolute_url(f"/properteasdet/{pro.slug}"),
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


def index(request):
    homes = home.objects.all()
    hom = homes.last()
    catagorys = catagory.objects.all()
    propertyss = propertys.objects.select_related("property_types").all().order_by("-id")[:6]
    contacts = contact.objects.all()
    contactss = contacts.last()

    def parse_price(value):
        if not value:
            return None, None
        lower = value.lower()
        if "br" in lower or "birr" in lower or "etb" in lower:
            currency = "ETB"
        elif "$" in value or "usd" in lower:
            currency = "USD"
        else:
            return None, None
        digits = "".join(ch for ch in value if ch.isdigit())
        if not digits:
            return None, None
        return currency, int(digits)

    max_price_etb = None
    max_price_usd = None
    for price in propertys.objects.values_list("price", flat=True):
        currency, amount = parse_price(price)
        if currency == "ETB" and amount:
            max_price_etb = (
                amount if max_price_etb is None else max(max_price_etb, amount)
            )
        elif currency == "USD" and amount:
            max_price_usd = (
                amount if max_price_usd is None else max(max_price_usd, amount)
            )
    if max_price_etb is None:
        max_price_etb = 1000000
    if max_price_usd is None:
        max_price_usd = 1000000

    context = {
        "hom": hom,
        "catagorys": catagorys,
        "propertyss": propertyss,
        "contactss": contactss,
        "max_price_etb": max_price_etb,
        "max_price_usd": max_price_usd,
        "selected_currency": request.GET.get("currency"),
        "seo": build_seo(
            request,
            "Real Estate in Ethiopia",
            "Find verified apartments, houses, offices, warehouses, buildings, and land for sale or rent in Ethiopia with Signature Property Solutions.",
        ),
        "schema_json": organization_schema(contactss),
    }

    return render(
        request,
        "index.html",
        context,
    )


def aboutus(request):
    aboutss = about.objects.all()
    aboute = aboutss.last()
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
    serevice = serevices.objects.all()
    contacts = contact.objects.all()
    contactss = contacts.last()

    context = {
        "serevice": serevice,
        "contactss": contactss,
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


def properteas(request):
    property_list = propertys.objects.select_related("property_types").all().order_by("-id")
    contacts = contact.objects.all()
    contactss = contacts.last()
    # Get selected category from query parameters
    selected_category = request.GET.get("category")
    selected_category_obj = None
    if selected_category:
        selected_category_obj = catagory.objects.filter(slug=selected_category).first()
        if not selected_category_obj:
            selected_category_obj = catagory.objects.filter(catagorys=selected_category).first()
    if selected_category_obj:
        property_list = property_list.filter(property_types=selected_category_obj)
    selected_filter = request.GET.get("filter")

    if selected_filter == "Sale":
        property_list = property_list.filter(property_status="For Sale")
    elif selected_filter == "Rent":
        property_list = property_list.filter(property_status="For Rent")
    elif selected_filter == "LowToHigh":
        property_list = property_list.order_by("price")
    elif selected_filter == "HighToLow":
        property_list = property_list.order_by("-price")
    selected_bedrooms = request.GET.get("bedrooms")
    allow_bedroom_filter = not selected_category_obj or is_residential_category(selected_category_obj)
    if allow_bedroom_filter and selected_bedrooms and selected_bedrooms.isdigit():
        if 1 <= int(selected_bedrooms) <= 10:
            property_list = property_list.filter(bedrooms=selected_bedrooms)
    max_price = request.GET.get("max_price")
    if max_price and max_price.isdigit():
        property_list = property_list.filter(price__lte=max_price)
    selected_currency = request.GET.get("currency")
    if selected_currency in {"ETB", "USD"}:

        def parse_price(value):
            if not value:
                return None, None
            lower = value.lower()
            if "br" in lower or "birr" in lower or "etb" in lower:
                currency = "ETB"
            elif "$" in value or "usd" in lower:
                currency = "USD"
            else:
                return None, None
            digits = "".join(ch for ch in value if ch.isdigit())
            if not digits:
                return None, None
            return currency, int(digits)

        max_price_value = int(max_price) if max_price and max_price.isdigit() else None
        filtered = []
        for item in property_list:
            currency, amount = parse_price(item.price)
            if currency != selected_currency:
                continue
            if amount is None:
                continue
            if max_price_value is not None and amount > max_price_value:
                continue
            filtered.append(item)
        property_list = filtered
    paginator = Paginator(property_list, 6)  # Show 6 properties per page
    page_number = request.GET.get("page")
    properties = paginator.get_page(page_number)
    categories = catagory.objects.all()
    return render(
        request,
        "properteas.html",
        {
            "properties": properties,
            "categories": categories,
            "selected_category": selected_category,
            "selected_filter": selected_filter,
            "selected_bedrooms": selected_bedrooms,
            "selected_max_price": max_price,
            "selected_currency": selected_currency,
            "contactss": contactss,
            "seo": build_seo(
                request,
                "Properties for Sale and Rent in Ethiopia",
                "Browse verified apartments, houses, offices, warehouses, buildings, and land for sale or rent in Ethiopia.",
            ),
            "schema_json": organization_schema(contactss),
        },
    )


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


def properteasdet(request, slug):
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
        "seo": build_seo(request, pro.property_title, description, image_url),
        "schema_json": property_schema(pro),
    }

    return render(request, "apartment-single.html", context)


def contac(request):
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
        "properteas",
        "services",
        "aboutus",
        "testimonials",
        "contac",
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
                "loc": absolute_url(f"/properteasdet/{pro.slug}"),
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
        return redirect("properteas")

    message = request.POST.get("message", "").strip()
    source_page = request.POST.get("source_page", "").strip() or request.META.get("HTTP_REFERER", "")
    redirect_to = source_page if source_page.startswith("/") else request.META.get("HTTP_REFERER", "/properteas")

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

    filters = extract_assistant_filters(message)
    matches = find_assistant_matches(filters)
    return JsonResponse(
        {
            "reply": build_assistant_reply(filters, matches),
            "matches": [assistant_property_payload(pro) for pro in matches],
        }
    )
