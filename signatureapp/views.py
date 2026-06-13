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
)


# Create your views here.
RESIDENTIAL_CATEGORY_KEYWORDS = ("apartment", "house", "villa", "penthouse", "condo")


def is_residential_category(category):
    if not category:
        return False
    category_name = (category.catagorys or "").lower()
    return any(keyword in category_name for keyword in RESIDENTIAL_CATEGORY_KEYWORDS)


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

    context = {"about": aboute, "contactss": contactss}
    return render(request, "about.html", context)


def services(request):
    serevice = serevices.objects.all()
    contacts = contact.objects.all()
    contactss = contacts.last()

    context = {"serevice": serevice, "contactss": contactss}

    return render(request, "service.html", context)


def servicesdt(request, slug):
    serevice = serevices.objects.get(slug=slug)
    contacts = contact.objects.all()
    contactss = contacts.last()

    context = {"serevice": serevice, "contactss": contactss}

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
        },
    )


def properteasdet(request, slug):
    pro = propertys.objects.select_related("property_types").get(slug=slug)
    propertyss = propertys.objects.select_related("property_types").all().order_by("-id")[:3]
    contacts = contact.objects.all()
    contactss = contacts.last()

    context = {"pro": pro, "propertyss": propertyss, "contactss": contactss}

    return render(request, "apartment-single.html", context)


def contac(request):
    contacts = contact.objects.all()
    contactus = contacts.last()
    contacts = contact.objects.all()
    contactss = contacts.last()

    context = {"contac": contactus, "contactss": contactss}

    return render(request, "contact.html", context)


def testimonials(request):
    testimonials_list = testimonial.objects.filter(is_published=True)
    contacts = contact.objects.all()
    contactss = contacts.last()

    context = {"testimonials": testimonials_list, "contactss": contactss}

    return render(request, "testimonials.html", context)
