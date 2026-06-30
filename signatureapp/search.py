from django.db.models import Q
from signatureapp.models import propertys, catagory


def parse_price(price_text):
    """Parse a free-text price string into (amount: int|None, currency: str).

    Detects USD via '$' or 'usd', ETB via 'br'/'birr'/'etb'. Extracts all
    digits into an integer. If no currency can be detected, returns (None, '')
    so the property is excluded from price-range filters (it remains visible
    in all other searches).
    """
    if not price_text:
        return None, ''
    raw = price_text.strip()
    lower = raw.lower()
    currency = ''
    if '$' in raw or 'usd' in lower:
        currency = 'USD'
    elif any(kw in lower for kw in ('br', 'birr', 'etb')):
        currency = 'ETB'
    if not currency:
        return None, ''
    digits = ''.join(ch for ch in raw if ch.isdigit())
    if digits:
        return int(digits), currency
    return None, ''


def building_types():
    """Return distinct building types derived from category names.

    Strips ' for Sale' / ' for Rent' suffixes (case-insensitive) and deduplicates.
    Returns list of (slug, label) tuples, e.g. [('apartment', 'Apartment')].
    """
    types = set()
    for cat in catagory.objects.all():
        name = cat.catagorys or ''
        lower = name.lower()
        for suffix in (' for sale', ' for rent'):
            if lower.endswith(suffix):
                name = name[: -len(suffix)]
                break
        if name:
            types.add(name)
    return sorted(((t.lower(), t) for t in types), key=lambda x: x[1])


AMENITY_CONTEXT = {
    'swimming-pool': 'residential',
    'fitness-center-gym': 'residential',
    'playground-park': 'residential',
    'rooftop-terrace': 'residential,commercial',
    'elevators': 'residential,commercial',
    'security-system-cctv-access-control': 'residential,commercial',
    'reception-area': 'commercial',
    'kitchen-break-room': 'commercial',
    'wi-fi-internet-access': 'commercial',
    'hvac-system': 'commercial',
    'fire-safety-systems-fire-alarms-sprinklers': 'commercial',
    'parking': 'residential,commercial',
    'generator': 'residential,commercial',
}


class PropertySearch:
    """Turns query params into a filtered, sorted queryset of properties.

    Usage:
        search = PropertySearch(request.GET)
        results = search.results()          # filtered + sorted queryset
        applied = search.applied_filters()  # dict of active filters (for UI)
    """

    def __init__(self, get_params):
        self.params = get_params
        self._applied = None  # lazily computed

    def results(self):
        # Force computation of applied filters (populates self._applied)
        self.applied_filters()
        qs = (
            propertys.objects
            .select_related('property_types')
            .prefetch_related('facilitie')
        )
        filters = [
            self._filter_q,
            self._filter_type_or_category,
            self._filter_status,
            self._filter_bedrooms,
            self._filter_bathrooms,
            self._filter_floor,
            self._filter_furnished,
            self._filter_size,
            self._filter_price,
            self._filter_amenities,
        ]
        for fn in filters:
            qs = fn(qs)
        qs = self._apply_sort(qs)
        return qs

    def applied_filters(self):
        """Return a dict of the filters active in the request params.

        Computed independently of results() so it can be called before or
        without running the queryset. Re-computed each call; results() reuses
        the populated mapping so the queryset filtering stays consistent.
        """
        applied = {}
        q = (self.params.get('q') or '').strip()
        if q:
            applied['q'] = q
        category = (self.params.get('category') or '').strip()
        if category:
            applied['category'] = category
        type_param = (self.params.get('type') or '').strip()
        if type_param:
            applied['type'] = type_param
        val = (self.params.get('filter') or '').strip()
        if val in ('Sale', 'Rent'):
            applied['filter'] = val
        for key in ('bedrooms', 'bathrooms', 'floor', 'furnished', 'size'):
            v = (self.params.get(key) or '').strip()
            if v:
                applied[key] = v
        currency = (self.params.get('currency') or '').strip().upper()
        if currency:
            applied['currency'] = currency
        min_p = (self.params.get('min_price') or '').strip()
        max_p = (self.params.get('max_price') or '').strip()
        if min_p:
            applied['min_price'] = min_p
        if max_p:
            applied['max_price'] = max_p
        amenities = self.params.getlist('amenities')
        if amenities:
            applied['amenities'] = amenities
        self._applied = applied
        return dict(applied)

    # --- individual filters ---

    def _filter_q(self, qs):
        q = (self.params.get('q') or '').strip()
        if not q:
            return qs
        self._applied['q'] = q
        # Match location substring OR category name
        return qs.filter(
            Q(property_location__icontains=q) | Q(property_types__catagorys__icontains=q)
        ).distinct()

    def _filter_type_or_category(self, qs):
        category = (self.params.get('category') or '').strip()
        type_param = (self.params.get('type') or '').strip()

        if category:
            self._applied['category'] = category
            return qs.filter(property_types__slug=category)

        if type_param:
            type_label = type_param.replace('-', ' ').title()
            status_filter = (self.params.get('filter') or '').strip()
            if status_filter in ('Sale', 'Rent'):
                target = f"{type_label} for {status_filter}"
            else:
                target = type_label
            slugs = list(catagory.objects.filter(
                catagorys__icontains=target
            ).values_list('slug', flat=True))
            if slugs:
                self._applied['type'] = type_param
                return qs.filter(property_types__slug__in=slugs)
        return qs

    def _filter_status(self, qs):
        val = (self.params.get('filter') or '').strip()
        if val in ('Sale', 'Rent'):
            self._applied['filter'] = val
            return qs.filter(property_status=f'For {val}')
        return qs

    def _filter_bedrooms(self, qs):
        val = (self.params.get('bedrooms') or '').strip()
        if not val or not val.isdigit():
            return qs
        self._applied['bedrooms'] = val
        return qs.filter(bedrooms=val)

    def _filter_bathrooms(self, qs):
        val = (self.params.get('bathrooms') or '').strip()
        if not val or not val.isdigit():
            return qs
        self._applied['bathrooms'] = val
        return qs.filter(bathrooms=val)

    def _filter_floor(self, qs):
        val = (self.params.get('floor') or '').strip()
        if not val or not val.isdigit():
            return qs
        self._applied['floor'] = val
        return qs.filter(property_floor=int(val))

    def _filter_furnished(self, qs):
        val = (self.params.get('furnished') or '').strip()
        if not val:
            return qs
        self._applied['furnished'] = val
        return qs.filter(furnished__iexact=val)

    def _filter_size(self, qs):
        val = (self.params.get('size') or '').strip()
        if not val or not val.isdigit():
            return qs
        self._applied['size'] = val
        return qs.filter(property_size__gte=int(val))

    def _filter_price(self, qs):
        currency = (self.params.get('currency') or '').strip().upper()
        min_p = (self.params.get('min_price') or '').strip()
        max_p = (self.params.get('max_price') or '').strip()
        if not currency:
            return qs
        self._applied['currency'] = currency
        qs = qs.filter(price_currency__exact=currency)
        if min_p and min_p.isdigit():
            self._applied['min_price'] = min_p
            qs = qs.filter(price_amount__gte=int(min_p))
        if max_p and max_p.isdigit():
            self._applied['max_price'] = max_p
            qs = qs.filter(price_amount__lte=int(max_p))
        return qs

    def _filter_amenities(self, qs):
        vals = self.params.getlist('amenities')
        if not vals:
            return qs
        self._applied['amenities'] = vals
        for slug in vals:
            qs = qs.filter(facilitie__slug=slug)
        return qs.distinct()

    def _apply_sort(self, qs):
        val = (self.params.get('sort') or '').strip()
        if val == 'LowToHigh':
            return qs.order_by('price_amount')
        elif val == 'HighToLow':
            return qs.order_by('-price_amount')
        return qs.order_by('-id')
