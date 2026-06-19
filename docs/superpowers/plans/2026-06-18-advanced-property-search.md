# Advanced Property Search — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add multi-filter search (beds, baths, price range, furnished, amenities), building-type filter, and auto-suggest location/type search bar to the Properties page, with a simplified homepage search that deep-links.

**Architecture:** A shared `PropertySearch` class in `signatureapp/search.py` owns all queryset filtering. Both the homepage and Properties page views delegate to it. Price is parsed into numeric `price_amount`/`price_currency` fields on save. The Properties page gets a bar + filters drawer UI; the homepage gets a simplified autosuggest bar.

**Tech Stack:** Django 5, SQLite, vanilla JS (jQuery already loaded), Bootstrap (already loaded), `luxury.css` dark/gold theme.

**Design spec:** `docs/superpowers/specs/2026-06-18-advanced-property-search-design.md`

---

## File Map

| File | Responsibility |
|---|---|
| `signatureapp/models.py:93-111` | Add `price_amount`, `price_currency` fields; populate in `save()` |
| `signatureapp/search.py` | **New** — `PropertySearch` class + `building_types()` + `parse_price()` (moved from views) |
| `signatureapp/views.py` | Simplify `properteas` and `index` to use `PropertySearch`; add `search_suggest` |
| `signature/urls.py` | Add `/search/suggest/` route |
| `signatureapp/migrations/0002_price_fields.py` | New migration for price fields |
| `signatureapp/management/commands/backfill_prices.py` | **New** — one-off backfill command |
| `signatureapp/tests.py` | **New tests** — `PropertySearch`, `search_suggest`, `parse_price`, building types |
| `template/properteas.html` | Replace existing filter bar with new bar + drawer + chips markup |
| `template/index.html` | Replace existing market-search form with simplified autosuggest bar |
| `static/assets/css/luxury.css` | Add drawer, chips, suggestion dropdown, filter-bar styles |
| `static/assets/js/search.js` | **New** — autosuggest + filter drawer logic (vanilla, jQuery-compatible) |

---

## Task 1: Add `price_amount` and `price_currency` fields to the `propertys` model

**Files:**
- Modify: `signatureapp/models.py:93-111` (the `propertys` model fields section)
- Create: `signatureapp/migrations/0002_add_price_fields.py` (auto-generated)

- [ ] **Step 1: Add the two new fields after the existing `price` field**

In `signatureapp/models.py`, add these fields directly after `price = models.CharField(...)`:

```python
    price_amount   = models.IntegerField(null=True, blank=True, help_text="Numeric price value, parsed from price text")
    price_currency = models.CharField(max_length=8, blank=True, default='', help_text="ETB, USD, or empty")
```

- [ ] **Step 2: Add price parsing in `propertys.save()`**

Add this method to the `propertys` model class. It reuses the logic already in `views.py:114-138` (`parse_price_amount`), but lives on the model so it runs on every save:

```python
    def save(self, *args, **kwargs):
        # Parse price text into numeric fields
        if self.price:
            self._parse_price()
        else:
            self.price_amount = None
            self.price_currency = ''
        super().save(*args, **kwargs)

    def _parse_price(self):
        """Parse the free-text price into price_amount and price_currency."""
        raw = self.price.strip()
        amount = None
        currency = ''

        # Detect currency
        lower = raw.lower()
        if '$' in raw or 'usd' in lower:
            currency = 'USD'
        elif any(kw in lower for kw in ('br', 'birr', 'etb')):
            currency = 'ETB'

        # Extract digits
        digits = ''
        for ch in raw:
            if ch.isdigit():
                digits += ch
        if digits:
            amount = int(digits)
            self.price_amount = amount
            self.price_currency = currency
        else:
            self.price_amount = None
            self.price_currency = ''
```

- [ ] **Step 3: Generate the migration**

Run: `.venv/Scripts/python.exe manage.py makemigrations signatureapp`
Expected: migration file created in `signatureapp/migrations/`

- [ ] **Step 4: Apply the migration**

Run: `.venv/Scripts/python.exe manage.py migrate`
Expected: `Running migrations... OK`

- [ ] **Step 5: Commit**

```bash
git add signatureapp/models.py signatureapp/migrations/
git commit -m "feat: add price_amount and price_currency derived fields to propertys model"
```

---

## Task 2: Create the backfill management command

**Files:**
- Create: `signatureapp/management/__init__.py`
- Create: `signatureapp/management/commands/__init__.py`
- Create: `signatureapp/management/commands/backfill_prices.py`

- [ ] **Step 1: Create the management package directories**

```bash
mkdir -p signatureapp/management/commands
touch signatureapp/management/__init__.py
touch signatureapp/management/commands/__init__.py
```

- [ ] **Step 2: Write the backfill command**

`signatureapp/management/commands/backfill_prices.py`:

```python
from django.core.management.base import BaseCommand
from signatureapp.models import propertys


class Command(BaseCommand):
    help = 'Backfill price_amount and price_currency from existing price text'

    def handle(self, *args, **options):
        qs = propertys.objects.all()
        total = qs.count()
        updated = 0
        skipped = 0

        for p in qs:
            had_amount = p.price_amount
            p.save()  # triggers _parse_price() in model
            if p.price_amount != had_amount:
                updated += 1
            else:
                skipped += 1

        self.stdout.write(
            f'Backfill complete: {updated} updated, {skipped} unchanged, {total} total'
        )
```

- [ ] **Step 3: Run the backfill**

Run: `.venv/Scripts/python.exe manage.py backfill_prices`
Expected: `Backfill complete: X updated, Y unchanged, 11 total`

- [ ] **Step 4: Verify the data**

Run: `.venv/Scripts/python.exe manage.py shell -c "from signatureapp.models import propertys; [print(p.price, '->', p.price_amount, p.price_currency) for p in propertys.objects.all()]"`
Expected: Each property shows its parsed numeric amount and currency. Unparseable prices show `-> None `.

- [ ] **Step 5: Commit**

```bash
git add signatureapp/management/
git commit -m "feat: add backfill_prices management command"
```

---

## Task 3: Add Parking and Generator facility rows

**Files:**
- Data change only (via Django shell or admin)

- [ ] **Step 1: Add the two facility rows**

Run: `.venv/Scripts/python.exe manage.py shell -c "
from signatureapp.models import facilities
for name in ['Parking', 'Generator']:
    facilities.objects.get_or_create(facilities_name=name, defaults={'slug': name.lower()})
print('Done. Facilities:', [f.facilities_name for f in facilities.objects.all()])
"`

Expected: `Done. Facilities: ['Elevators', 'Security system', ... 'Parking', 'Generator']`

- [ ] **Step 2: Verify in admin or shell**

Run: `.venv/Scripts/python.exe manage.py shell -c "from signatureapp.models import facilities; [print(f.id, f.facilities_name, f.slug) for f in facilities.objects.all()]"`

- [ ] **Step 3: Commit (nothing to commit for data, but note for spec)**

No files changed — this is a DB-only change. Record in project docs if desired.

---

## Task 4: Create the shared `PropertySearch` service

**Files:**
- Create: `signatureapp/search.py`
- Test: `signatureapp/tests.py`

- [ ] **Step 1: Write the failing tests first**

`signatureapp/tests.py` — replace the empty file with:

```python
from django.test import TestCase, RequestFactory
from django.http import QueryDict
from signatureapp.models import propertys, catagory, facilities
from signatureapp.search import PropertySearch, building_types, parse_price


class ParsePriceTests(TestCase):
    """Tests for the parse_price utility function."""

    def test_usd_with_dollar_sign(self):
        amount, currency = parse_price("3500$")
        self.assertEqual(amount, 3500)
        self.assertEqual(currency, 'USD')

    def test_usd_explicit(self):
        amount, currency = parse_price("1500 USD")
        self.assertEqual(amount, 1500)
        self.assertEqual(currency, 'USD')

    def test_etb_birr(self):
        amount, currency = parse_price("11,000,000 Birr")
        self.assertEqual(amount, 11000000)
        self.assertEqual(currency, 'ETB')

    def test_etb_etb(self):
        amount, currency = parse_price("5,500,000 ETB")
        self.assertEqual(amount, 5500000)
        self.assertEqual(currency, 'ETB')

    def test_unparseable_returns_none(self):
        amount, currency = parse_price("1000 Per Sqm")
        self.assertIsNone(amount)
        self.assertEqual(currency, '')

    def test_negotiable_returns_none(self):
        amount, currency = parse_price("Negotiable")
        self.assertIsNone(amount)
        self.assertEqual(currency, '')

    def test_empty_string(self):
        amount, currency = parse_price("")
        self.assertIsNone(amount)
        self.assertEqual(currency, '')


class BuildingTypesTests(TestCase):
    """Tests for the building_types() helper."""

    def test_extracts_distinct_types(self):
        """After seeding categories, building_types returns distinct type names."""
        catagory.objects.create(catagorys="Apartment for Sale", slug="apt-sale")
        catagory.objects.create(catagorys="Apartment for Rent", slug="apt-rent")
        catagory.objects.create(catagorys="Office for Rent", slug="off-rent")
        types = building_types()
        type_names = [t[1] for t in types]
        self.assertIn("Apartment", type_names)
        self.assertIn("Office", type_names)
        # "Apartment" appears only once even though two categories exist
        self.assertEqual(type_names.count("Apartment"), 1)

    def test_empty_categories(self):
        types = building_types()
        self.assertEqual(types, [])


class PropertySearchTests(TestCase):
    """Tests for the PropertySearch class."""

    @classmethod
    def setUpTestData(cls):
        # Categories
        cls.cat_apt_sale = catagory.objects.create(catagorys="Apartment for Sale", slug="apt-sale")
        cls.cat_apt_rent = catagory.objects.create(catagorys="Apartment for Rent", slug="apt-rent")
        cls.cat_office = catagory.objects.create(catagorys="Office for Rent", slug="off-rent")

        # Facilities
        cls.fac_elevator = facilities.objects.create(facilities_name="Elevators", slug="elevators")
        cls.fac_parking = facilities.objects.create(facilities_name="Parking", slug="parking")
        cls.fac_security = facilities.objects.create(facilities_name="Security system", slug="security-system")

        # Properties
        cls.p1 = propertys.objects.create(
            property_title="Bole Modern Apt",
            property_location="Bole",
            price="3500$",
            property_status="For Rent",
            property_types=cls.cat_apt_rent,
            bedrooms=2,
            bathrooms=1,
            furnished="Yes",
            property_floor=5,
            property_size=120,
            published=True,
        )
        cls.p1.facilitie.add(cls.fac_elevator, cls.fac_security)

        cls.p2 = propertys.objects.create(
            property_title="Atlas Office",
            property_location="Atlas",
            price="1000 Per Sqm",
            property_status="For Rent",
            property_types=cls.cat_office,
            bedrooms=0,
            bathrooms=1,
            furnished="No",
            property_floor=3,
            property_size=200,
            published=True,
        )
        cls.p2.facilitie.add(cls.fac_parking)

        cls.p3 = propertys.objects.create(
            property_title="CMC Luxury Apartment",
            property_location="CMC",
            price="11,000,000 ETB",
            property_status="For Sale",
            property_types=cls.cat_apt_sale,
            bedrooms=3,
            bathrooms=2,
            furnished="Yes",
            property_floor=10,
            property_size=180,
            published=True,
        )

    def _search(self, **params):
        """Helper: create a PropertySearch from keyword params."""
        qd = QueryDict(mutable=True)
        for k, v in params.items():
            if isinstance(v, list):
                for item in v:
                    qd.appendlist(k, item)
            else:
                qd[k] = v
        return PropertySearch(qd)

    def test_no_filters_returns_all(self):
        results = self._search().results()
        self.assertEqual(results.count(), 3)

    def test_filter_by_location_q(self):
        results = self._search(q="bo").results()
        titles = [r.property_title for r in results]
        self.assertIn("Bole Modern Apt", titles)
        self.assertNotIn("Atlas Office", titles)

    def test_filter_by_type_apartment(self):
        results = self._search(type="apartment").results()
        titles = [r.property_title for r in results]
        self.assertIn("Bole Modern Apt", titles)
        self.assertIn("CMC Luxury Apartment", titles)
        self.assertNotIn("Atlas Office", titles)

    def test_filter_by_category_slug(self):
        results = self._search(category="apt-rent").results()
        self.assertEqual(results.count(), 1)
        self.assertEqual(results.first().property_title, "Bole Modern Apt")

    def test_filter_by_status_rent(self):
        results = self._search(filter="Rent").results()
        titles = [r.property_title for r in results]
        self.assertIn("Bole Modern Apt", titles)
        self.assertIn("Atlas Office", titles)
        self.assertNotIn("CMC Luxury Apartment", titles)

    def test_filter_by_bedrooms(self):
        results = self._search(bedrooms="2").results()
        self.assertEqual(results.count(), 1)

    def test_filter_by_bathrooms(self):
        results = self._search(bathrooms="2").results()
        self.assertEqual(results.count(), 1)

    def test_filter_by_furnished(self):
        results = self._search(furnished="Yes").results()
        self.assertEqual(results.count(), 2)

    def test_filter_by_floor(self):
        results = self._search(floor="5").results()
        self.assertEqual(results.count(), 1)

    def test_filter_by_size_gte(self):
        results = self._search(size="150").results()
        titles = [r.property_title for r in results]
        self.assertIn("Atlas Office", titles)
        self.assertIn("CMC Luxury Apartment", titles)
        self.assertNotIn("Bole Modern Apt", titles)

    def test_filter_by_price_range_usd(self):
        results = self._search(currency="USD", min_price="2000", max_price="5000").results()
        titles = [r.property_title for r in results]
        self.assertIn("Bole Modern Apt", titles)
        self.assertNotIn("CMC Luxury Apartment", titles)  # ETB, not USD

    def test_filter_by_price_range_etb(self):
        results = self._search(currency="ETB", min_price="5000000", max_price="15000000").results()
        self.assertEqual(results.count(), 1)
        self.assertEqual(results.first().property_title, "CMC Luxury Apartment")

    def test_filter_by_amenities_single(self):
        results = self._search(amenities=["elevators"]).results()
        titles = [r.property_title for r in results]
        self.assertIn("Bole Modern Apt", titles)

    def test_filter_by_amenities_multiple(self):
        results = self._search(amenities=["elevators", "security-system"]).results()
        # Only p1 has BOTH elevator AND security
        self.assertEqual(results.count(), 1)
        self.assertEqual(results.first().property_title, "Bole Modern Apt")

    def test_filter_by_amenities_partial_match_excluded(self):
        results = self._search(amenities=["elevators", "parking"]).results()
        # No property has both elevator AND parking
        self.assertEqual(results.count(), 0)

    def test_type_plus_status_intersection(self):
        results = self._search(type="apartment", filter="Rent").results()
        self.assertEqual(results.count(), 1)
        self.assertEqual(results.first().property_title, "Bole Modern Apt")

    def test_applied_filters_reflects_active(self):
        ps = self._search(bedrooms="2", furnished="Yes", amenities=["elevators"])
        af = ps.applied_filters()
        self.assertEqual(af['bedrooms'], '2')
        self.assertEqual(af['furnished'], 'Yes')
        self.assertIn('elevators', af['amenities'])

    def test_bad_input_ignored(self):
        results = self._search(bedrooms="abc", floor="xyz").results()
        # Bad input ignored — all 3 properties returned
        self.assertEqual(results.count(), 3)

    def test_category_overrides_type(self):
        results = self._search(type="apartment", category="off-rent").results()
        # category wins — returns only the office
        self.assertEqual(results.count(), 1)
        self.assertEqual(results.first().property_title, "Atlas Office")
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `.venv/Scripts/python.exe manage.py test signatureapp -v2`
Expected: FAIL — `ModuleNotFoundError: No module named 'signatureapp.search'`

- [ ] **Step 3: Write the `signatureapp/search.py` implementation**

`signatureapp/search.py`:

```python
from django.db.models import Q, Count
from signatureapp.models import propertys, catagory


def parse_price(price_text):
    """Parse a free-text price string into (amount: int|None, currency: str)."""
    if not price_text:
        return None, ''
    raw = price_text.strip()
    lower = raw.lower()
    currency = ''
    if '$' in raw or 'usd' in lower:
        currency = 'USD'
    elif any(kw in lower for kw in ('br', 'birr', 'etb')):
        currency = 'ETB'
    digits = ''.join(ch for ch in raw if ch.isdigit())
    if digits:
        return int(digits), currency
    return None, ''


def building_types():
    """Return distinct building types derived from category names.

    Strips ' for Sale' / ' for Rent' suffixes and deduplicates.
    Returns list of (slug, label) tuples, e.g. [('apartment', 'Apartment')].
    """
    types = set()
    for cat in catagory.objects.all():
        name = cat.catagorys
        for suffix in (' for Sale', ' for Rent'):
            if name.endswith(suffix):
                name = name[: -len(suffix)]
                break
        if name:
            types.add(name)
    return sorted(types, key=lambda x: x[0])


class PropertySearch:
    """Turns query params into a filtered, sorted queryset of properties."""

    RESIDENTIAL_TYPES = {'Apartment', 'House', 'Villa', 'Condominium', 'Penthouse'}

    def __init__(self, get_params):
        self.params = get_params
        self._applied = {}

    def results(self):
        qs = propertys.objects.filter(published=True).select_related('property_types').prefetch_related('facilitie')
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
        return dict(self._applied)

    # --- individual filters ---

    def _filter_q(self, qs):
        q = self.params.get('q', '').strip()
        if not q:
            return qs
        self._applied['q'] = q
        # Match location substring OR category name
        return qs.filter(
            Q(property_location__icontains=q) | Q(property_types__catagorys__icontains=q)
        ).distinct()

    def _filter_type_or_category(self, qs):
        category = self.params.get('category', '').strip()
        type_param = self.params.get('type', '').strip()

        if category:
            self._applied['category'] = category
            return qs.filter(property_types__slug=category)

        if type_param:
            type_label = type_param.replace('-', ' ').title()
            # Build matching category names
            status_filter = self.params.get('filter', '').strip()
            if status_filter in ('Sale', 'Rent'):
                target = f"{type_label} for {status_filter}"
            else:
                target = type_label
            slugs = catagory.objects.filter(
                catagorys__icontains=target
            ).values_list('slug', flat=True)
            if slugs:
                self._applied['type'] = type_param
                return qs.filter(property_types__slug__in=list(slugs))
        return qs

    def _filter_status(self, qs):
        val = self.params.get('filter', '').strip()
        if val in ('Sale', 'Rent'):
            self._applied['filter'] = val
            status = f'For {val}'
            return qs.filter(property_status=status)
        return qs

    def _filter_bedrooms(self, qs):
        val = self.params.get('bedrooms', '').strip()
        if not val or not val.isdigit():
            return qs
        self._applied['bedrooms'] = val
        return qs.filter(bedrooms=int(val))

    def _filter_bathrooms(self, qs):
        val = self.params.get('bathrooms', '').strip()
        if not val or not val.isdigit():
            return qs
        self._applied['bathrooms'] = val
        return qs.filter(bathrooms=int(val))

    def _filter_floor(self, qs):
        val = self.params.get('floor', '').strip()
        if not val or not val.isdigit():
            return qs
        self._applied['floor'] = val
        return qs.filter(property_floor=int(val))

    def _filter_furnished(self, qs):
        val = self.params.get('furnished', '').strip()
        if not val:
            return qs
        self._applied['furnished'] = val
        return qs.filter(furnished__iexact=val)

    def _filter_size(self, qs):
        val = self.params.get('size', '').strip()
        if not val or not val.isdigit():
            return qs
        self._applied['size'] = val
        return qs.filter(property_size__gte=int(val))

    def _filter_price(self, qs):
        currency = self.params.get('currency', '').strip().upper()
        min_p = self.params.get('min_price', '').strip()
        max_p = self.params.get('max_price', '').strip()
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
        val = self.params.get('sort', '').strip()
        if val == 'LowToHigh':
            return qs.order_by('price_amount')
        elif val == 'HighToLow':
            return qs.order_by('-price_amount')
        return qs.order_by('-id')
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `.venv/Scripts/python.exe manage.py test signatureapp -v2`
Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add signatureapp/search.py signatureapp/tests.py
git commit -m "feat: add PropertySearch service with tests"
```

---

## Task 5: Add the `search_suggest` endpoint

**Files:**
- Modify: `signatureapp/views.py` (add `search_suggest` function)
- Modify: `signature/urls.py` (add route)
- Test: `signatureapp/tests.py` (add suggest tests)

- [ ] **Step 1: Add suggest tests to `signatureapp/tests.py`**

Append these tests to the existing file (after the `PropertySearchTests` class):

```python
from django.test import Client


class SearchSuggestTests(TestCase):
    """Tests for the /search/suggest/ endpoint."""

    @classmethod
    def setUpTestData(cls):
        cls.cat_apt = catagory.objects.create(catagorys="Apartment for Sale", slug="apt-sale")
        cls.cat_house = catagory.objects.create(catagorys="House for Rent", slug="house-rent")
        cls.cat_office = catagory.objects.create(catagorys="Office for Rent", slug="off-rent")

        propertys.objects.create(
            property_title="Bole Apt", property_location="Bole",
            price="3500$", property_status="For Sale",
            property_types=cls.cat_apt, published=True,
        )
        propertys.objects.create(
            property_title="Bole Subcity Apt", property_location="Bole next to Boston Spa",
            price="5000$", property_status="For Sale",
            property_types=cls.cat_apt, published=True,
        )
        propertys.objects.create(
            property_title="CMC House", property_location="CMC",
            price="11,000,000 ETB", property_status="For Rent",
            property_types=cls.cat_house, published=True,
        )

    def test_suggest_location_starts_with(self):
        c = Client()
        resp = c.get('/search/suggest/', {'q': 'bo'})
        data = resp.json()
        labels = [r['label'] for r in data['results']]
        self.assertIn('Bole', labels)

    def test_suggest_groups_locations_and_types(self):
        c = Client()
        resp = c.get('/search/suggest/', {'q': 'o'})
        data = resp.json()
        types = [r['type'] for r in data['results']]
        self.assertIn('location', types)
        self.assertIn('type', types)

    def test_suggest_empty_q(self):
        c = Client()
        resp = c.get('/search/suggest/', {'q': ''})
        data = resp.json()
        self.assertEqual(data['results'], [])

    def test_suggest_respects_cap(self):
        """Results should not exceed ~8 locations."""
        c = Client()
        resp = c.get('/search/suggest/', {'q': 'a'})
        data = resp.json()
        self.assertLessEqual(len(data['results']), 10)

    def test_suggest_no_match(self):
        c = Client()
        resp = c.get('/search/suggest/', {'q': 'zzznonexistent'})
        data = resp.json()
        self.assertEqual(data['results'], [])
```

- [ ] **Step 2: Run the new tests to verify they fail**

Run: `.venv/Scripts/python.exe manage.py test signatureapp.tests.SearchSuggestTests -v2`
Expected: FAIL — 404 for `/search/suggest/`

- [ ] **Step 3: Add `search_suggest` view function in `signatureapp/views.py`**

Add this function at the end of `views.py` (or near the other property views). Do NOT remove any existing view functions yet — that happens in Task 6:

```python
from django.http import JsonResponse
from signatureapp.search import building_types


def search_suggest(request):
    q = request.GET.get('q', '').strip()
    if len(q) < 1:
        return JsonResponse({'results': []})

    results = []

    # Location suggestions (starts-with, then contains)
    locations_qs = (
        propertys.objects.filter(published=True, property_location__icontains=q)
        .values('property_location')
        .annotate(count=Count('id'))
        .order_by('-count')
    )
    # Prioritize starts-with matches
    starts_with = [loc for loc in locations_qs if loc['property_location'].lower().startswith(q.lower())]
    contains = [loc for loc in locations_qs if not loc['property_location'].lower().startswith(q.lower())]
    for loc in (starts_with + contains)[:8]:
        results.append({
            'type': 'location',
            'label': loc['property_location'],
            'value': loc['property_location'],
            'count': loc['count'],
        })

    # Building type suggestions
    for slug, label in building_types():
        if q.lower() in label.lower():
            results.append({
                'type': 'type',
                'label': label,
                'value': slug,
            })

    return JsonResponse({'results': results})
```

- [ ] **Step 4: Add the URL route in `signature/urls.py`**

Add this line in the urlpatterns list (before the catch-all patterns):

```python
path('search/suggest/', views.search_suggest, name='search_suggest'),
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `.venv/Scripts/python.exe manage.py test signatureapp -v2`
Expected: All tests pass (PropertySearch + SearchSuggest).

- [ ] **Step 6: Commit**

```bash
git add signatureapp/views.py signature/urls.py signatureapp/tests.py
git commit -m "feat: add /search/suggest/ endpoint for autosuggest"
```

---

## Task 6: Refactor `views.py` to use `PropertySearch`

**Files:**
- Modify: `signatureapp/views.py` (simplify `properteas` and `index` views)

- [ ] **Step 1: Refactor the `properteas` view**

Replace the existing `properteas` view function body. The function signature stays the same, but the body delegates to `PropertySearch`. Find the `def properteas(request, ...)` function and replace its body:

```python
def properteas(request, category_slug=None):
    search = PropertySearch(request.GET)
    all_properties = search.results()
    paginator = Paginator(all_properties, 6)
    page_number = request.GET.get('page')
    page_obj = paginator.get_page(page_number)

    # Build context for the filter UI
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
    }
    return render(request, 'properteas.html', context)
```

- [ ] **Step 2: Refactor the `index` view**

Replace the existing `def index(request)` body. Remove the category-split logic (`catagorys_rent`, `catagorys_sale`, `max_price_etb`, `max_price_usd`). The view simply renders the homepage template:

```python
def index(request):
    categories = catagory.objects.all()
    featured = propertys.objects.filter(published=True).order_by('-id')[:6]
    context = {
        'categories': categories,
        'featured': featured,
    }
    return render(request, 'index.html', context)
```

- [ ] **Step 3: Add the imports at the top of `views.py`**

At the top of `views.py`, add these imports (some may already exist):

```python
from signatureapp.search import PropertySearch, building_types
```

Remove any now-unused imports (e.g. `Q` if it was only used in the old filter logic).

- [ ] **Step 4: Run all tests to verify nothing broke**

Run: `.venv/Scripts/python.exe manage.py test signatureapp -v2`
Expected: All tests pass.

- [ ] **Step 5: Manual smoke test — start the server and visit /properteas**

Run: `.venv/Scripts/python.exe manage.py runserver`
Open: `http://127.0.0.1:8000/properteas`
Expected: Properties page loads (with broken/stale HTML since template not updated yet — that's Task 7). No 500 error.

- [ ] **Step 6: Commit**

```bash
git add signatureapp/views.py
git commit -m "refactor: use PropertySearch in properteas and index views"
```

---

## Task 7: Build the Properties page filter UI (bar + drawer + chips)

**Files:**
- Modify: `template/properteas.html`
- Modify: `static/assets/css/luxury.css`
- Create: `static/assets/js/search.js`

This is the largest task. It replaces the existing minimal filter bar with the new bar + drawer + chips layout.

- [ ] **Step 1: Replace the filter section in `template/properteas.html`**

Replace the existing `{% block content %}` content with the new layout. The full replacement for the filter area (everything above the property cards grid) is:

```html
{% extends 'layouts/base.html' %}
{% load static %}

{% block content %}
<section class="lux-properties">
  <div class="container">
    <!-- Page header -->
    <div class="lux-section-header">
      <p class="lux-eyebrow">PROPERTIES</p>
      <h2>Find Your Property</h2>
    </div>

    <!-- Search bar -->
    <form method="get" action="/properteas" id="prop-search-form" class="lux-search-bar">
      <div class="lux-search-input-wrap">
        <span class="lux-search-icon">🔍</span>
        <input type="text" name="q" value="{{ applied_filters.q|default:'' }}" placeholder="Bole, Kazanchis, Apartment..." autocomplete="off" id="lux-search-input">
        <div class="lux-suggest-dropdown" id="lux-suggest-dropdown"></div>
      </div>

      <div class="lux-status-pills">
        <button type="submit" name="filter" value="" class="lux-pill {% if not applied_filters.filter %}is-active{% endif %}">All</button>
        <button type="submit" name="filter" value="Rent" class="lux-pill {% if applied_filters.filter == 'Rent' %}is-active{% endif %}">Rent</button>
        <button type="submit" name="filter" value="Sale" class="lux-pill {% if applied_filters.filter == 'Sale' %}is-active{% endif %}">Sale</button>
      </div>

      <button type="button" class="lux-filter-toggle" id="lux-filter-toggle">
        <span>⚙ Filters</span>
        {% if active_filter_count > 0 %}
          <span class="lux-filter-badge">{{ active_filter_count }}</span>
        {% endif %}
      </button>

      <button type="submit" class="lux-search-btn">Search</button>
    </form>

    <!-- Active filter chips -->
    {% if active_filter_count > 0 %}
    <div class="lux-filter-chips">
      {% if applied_filters.bedrooms %}
        <span class="lux-chip">
          Beds: {{ applied_filters.bedrooms }}
          <a href="#" class="lux-chip-remove" data-remove="bedrooms">✕</a>
        </span>
      {% endif %}
      {% if applied_filters.bathrooms %}
        <span class="lux-chip">
          Baths: {{ applied_filters.bathrooms }}
          <a href="#" class="lux-chip-remove" data-remove="bathrooms">✕</a>
        </span>
      {% endif %}
      {% if applied_filters.furnished %}
        <span class="lux-chip">
          Furnished: {{ applied_filters.furnished }}
          <a href="#" class="lux-chip-remove" data-remove="furnished">✕</a>
        </span>
      {% endif %}
      {% if applied_filters.floor %}
        <span class="lux-chip">
          Floor: {{ applied_filters.floor }}
          <a href="#" class="lux-chip-remove" data-remove="floor">✕</a>
        </span>
      {% endif %}
      {% if applied_filters.size %}
        <span class="lux-chip">
          Min Size: {{ applied_filters.size }} sqm
          <a href="#" class="lux-chip-remove" data-remove="size">✕</a>
        </span>
      {% endif %}
      {% if applied_filters.min_price or applied_filters.max_price %}
        <span class="lux-chip">
          {{ applied_filters.currency }}: {{ applied_filters.min_price|default:'0' }}–{{ applied_filters.max_price|default:'∞' }}
          <a href="#" class="lux-chip-remove" data-remove="price">✕</a>
        </span>
      {% endif %}
      {% if applied_filters.type %}
        <span class="lux-chip">
          Type: {{ applied_filters.type }}
          <a href="#" class="lux-chip-remove" data-remove="type">✕</a>
        </span>
      {% endif %}
      {% for slug in applied_filters.amenities %}
        <span class="lux-chip">
          {{ slug }}
          <a href="#" class="lux-chip-remove" data-remove="amenities" data-value="{{ slug }}">✕</a>
        </span>
      {% endfor %}
      <a href="/properteas" class="lux-clear-all">Clear all</a>
    </div>
    {% endif %}

    <!-- Filters drawer -->
    <div class="lux-filter-drawer" id="lux-filter-drawer">
      <div class="lux-filter-drawer-overlay" id="lux-drawer-overlay"></div>
      <div class="lux-filter-drawer-panel">
        <div class="lux-drawer-header">
          <strong>Filters</strong>
          <button type="button" id="lux-drawer-close">✕</button>
        </div>
        <div class="lux-drawer-body">
          <!-- Building type -->
          <div class="lux-drawer-group">
            <label class="lux-drawer-label">BUILDING TYPE</label>
            <div class="lux-type-chips">
              <button type="submit" name="type" value="" class="lux-type-chip {% if not applied_filters.type %}is-active{% endif %}">Any</button>
              {% for slug, label in building_type_choices %}
              <button type="submit" name="type" value="{{ slug }}" class="lux-type-chip {% if applied_filters.type == slug %}is-active{% endif %}">{{ label }}</button>
              {% endfor %}
            </div>
          </div>

          <!-- Bedrooms / Bathrooms -->
          <div class="lux-drawer-row">
            <div class="lux-drawer-field">
              <label class="lux-drawer-label">BEDROOMS</label>
              <select name="bedrooms">
                <option value="">Any</option>
                {% for n in '12345' %}
                <option value="{{ n }}" {% if applied_filters.bedrooms == n %}selected{% endif %}>{{ n }}</option>
                {% endfor %}
                <option value="6" {% if applied_filters.bedrooms == '6' %}selected{% endif %}>6+</option>
              </select>
            </div>
            <div class="lux-drawer-field">
              <label class="lux-drawer-label">BATHROOMS</label>
              <select name="bathrooms">
                <option value="">Any</option>
                {% for n in '12345' %}
                <option value="{{ n }}" {% if applied_filters.bathrooms == n %}selected{% endif %}>{{ n }}</option>
                {% endfor %}
              </select>
            </div>
          </div>

          <!-- Price range -->
          <div class="lux-drawer-group">
            <label class="lux-drawer-label">PRICE</label>
            <div class="lux-drawer-row">
              <div class="lux-drawer-field">
                <select name="currency">
                  <option value="">Currency</option>
                  <option value="ETB" {% if applied_filters.currency == 'ETB' %}selected{% endif %}>ETB</option>
                  <option value="USD" {% if applied_filters.currency == 'USD' %}selected{% endif %}>USD</option>
                </select>
              </div>
              <div class="lux-drawer-field">
                <input type="number" name="min_price" placeholder="Min" value="{{ applied_filters.min_price|default:'' }}">
              </div>
              <div class="lux-drawer-field">
                <input type="number" name="max_price" placeholder="Max" value="{{ applied_filters.max_price|default:'' }}">
              </div>
            </div>
          </div>

          <!-- Furnished / Floor -->
          <div class="lux-drawer-row">
            <div class="lux-drawer-field">
              <label class="lux-drawer-label">FURNISHED</label>
              <select name="furnished">
                <option value="">Any</option>
                <option value="Yes" {% if applied_filters.furnished == 'Yes' %}selected{% endif %}>Yes</option>
                <option value="No" {% if applied_filters.furnished == 'No' %}selected{% endif %}>No</option>
              </select>
            </div>
            <div class="lux-drawer-field">
              <label class="lux-drawer-label">FLOOR</label>
              <input type="number" name="floor" placeholder="Any" value="{{ applied_filters.floor|default:'' }}">
            </div>
          </div>

          <!-- Amenities -->
          <div class="lux-drawer-group">
            <label class="lux-drawer-label">AMENITIES</label>
            <div class="lux-amenity-grid">
              {% for fac in all_facilities %}
              <label class="lux-amenity-check">
                <input type="checkbox" name="amenities" value="{{ fac.slug }}"
                  {% if fac.slug in applied_filters.amenities %}checked{% endif %}>
                {{ fac.facilities_name }}
              </label>
              {% endfor %}
            </div>
          </div>
        </div>

        <div class="lux-drawer-footer">
          <a href="/properteas" class="lux-btn-clear">Clear</a>
          <button type="submit" class="lux-btn-apply">Show {{ all_properties.paginator.count }} results</button>
        </div>
      </div>
    </div>

    <!-- Results header -->
    <div class="lux-results-header">
      <span class="lux-results-count">{{ all_properties.paginator.count }} properties found</span>
      <div class="lux-sort" id="lux-sort-links">
        <span>Sort:</span>
        <a href="#" class="lux-sort-link{% if not request.GET.sort %} is-active{% endif %}" data-sort="">Newest</a>
        <a href="#" class="lux-sort-link{% if request.GET.sort == 'LowToHigh' %} is-active{% endif %}" data-sort="LowToHigh">Price ↑</a>
        <a href="#" class="lux-sort-link{% if request.GET.sort == 'HighToLow' %} is-active{% endif %}" data-sort="HighToLow">Price ↓</a>
      </div>
    </div>

    <!-- Property cards grid -->
    <div class="lux-prop-grid">
      {% for property in all_properties %}
        <!-- Existing property card markup (reuse the card_specs helper / card HTML) -->
        {% include "partials/property_card.html" with property=property %}
      {% empty %}
        <p class="lux-no-results">No properties match your filters. <a href="/properteas">Clear all filters</a>.</p>
      {% endfor %}
    </div>

    <!-- Pagination -->
    {% if all_properties.has_other_pages %}
    <div class="lux-pagination">
      {% if all_properties.has_previous %}
        <a href="?page={{ all_properties.previous_page_number }}" class="lux-page-btn">← Prev</a>
      {% endif %}
      <span class="lux-page-info">Page {{ all_properties.number }} of {{ all_properties.paginator.num_pages }}</span>
      {% if all_properties.has_next %}
        <a href="?page={{ all_properties.next_page_number }}" class="lux-page-btn">Next →</a>
      {% endif %}
    </div>
    {% endif %}
  </div>
</section>
{% endblock %}
```

**Note:** The property card include and sort links may need the `{% querystring %}` template tag from `django-template-request`. If unavailable, replace with a simpler approach that preserves existing GET params.

- [ ] **Step 2: Add CSS for the new filter UI in `static/assets/css/luxury.css`**

Append these styles at the end of `luxury.css`:

```css
/* ================================================
   SEARCH BAR + FILTER DRAWER
   ================================================ */

.lux-search-bar {
  display: flex;
  gap: 0.6rem;
  align-items: center;
  background: var(--dark-3);
  border: 1px solid var(--gold);
  border-radius: 12px;
  padding: 0.75rem 1rem;
  flex-wrap: wrap;
}

.lux-search-input-wrap {
  flex: 1;
  min-width: 180px;
  position: relative;
}

.lux-search-input-wrap input {
  width: 100%;
  background: var(--dark);
  border: 1px solid var(--dark-4);
  border-radius: 8px;
  padding: 0.6rem 0.6rem 0.6rem 2.2rem;
  color: var(--white);
  font-size: 0.9rem;
  outline: none;
}

.lux-search-input-wrap input:focus {
  border-color: var(--gold);
}

.lux-search-icon {
  position: absolute;
  left: 0.7rem;
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
  font-size: 0.85rem;
}

/* Suggest dropdown */
.lux-suggest-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  background: var(--dark-2);
  border: 1px solid var(--gold);
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.6);
  display: none;
  z-index: 100;
  max-height: 260px;
  overflow-y: auto;
}

.lux-suggest-dropdown.is-open { display: block; }

.lux-suggest-group-label {
  padding: 0.4rem 0.8rem;
  font-size: 0.65rem;
  letter-spacing: 1.5px;
  color: var(--gray);
  text-transform: uppercase;
  border-top: 1px solid var(--dark-4);
}

.lux-suggest-item {
  padding: 0.5rem 0.8rem;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  font-size: 0.85rem;
  color: var(--white);
}

.lux-suggest-item:hover,
.lux-suggest-item.is-highlighted {
  background: var(--dark-3);
  color: var(--gold);
}

.lux-suggest-item .count {
  color: var(--gray);
  font-size: 0.75rem;
}

/* Status pills */
.lux-status-pills {
  display: flex;
  gap: 3px;
  background: var(--dark);
  border-radius: 8px;
  padding: 3px;
}

.lux-pill {
  background: transparent;
  border: none;
  padding: 0.4rem 0.9rem;
  font-size: 0.8rem;
  color: var(--gray);
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.2s;
}

.lux-pill.is-active {
  background: var(--gold);
  color: #1a1a1a;
  font-weight: 600;
}

.lux-pill:hover:not(.is-active) {
  color: var(--white);
}

/* Filter toggle button */
.lux-filter-toggle {
  background: var(--dark);
  color: var(--gold);
  border: 1px solid var(--gold);
  border-radius: 8px;
  padding: 0.5rem 0.9rem;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.3rem;
}

.lux-filter-badge {
  background: var(--gold);
  color: #1a1a1a;
  border-radius: 50%;
  width: 18px;
  height: 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.65rem;
  font-weight: 700;
}

.lux-search-btn {
  background: var(--gold);
  color: #1a1a1a;
  border: none;
  border-radius: 8px;
  padding: 0.55rem 1.4rem;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
}

/* Filter chips */
.lux-filter-chips {
  display: flex;
  gap: 0.4rem;
  flex-wrap: wrap;
  margin-top: 0.6rem;
  align-items: center;
}

.lux-chip {
  background: var(--dark-3);
  border: 1px solid var(--gold);
  border-radius: 16px;
  padding: 0.2rem 0.5rem 0.2rem 0.7rem;
  font-size: 0.75rem;
  color: var(--white);
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
}

.lux-chip-remove {
  color: var(--gold);
  text-decoration: none;
  font-size: 0.7rem;
  cursor: pointer;
}

.lux-chip-remove:hover {
  color: var(--white);
}

.lux-clear-all {
  font-size: 0.75rem;
  color: var(--gray);
  margin-left: 0.4rem;
}

/* ================================================
   FILTER DRAWER
   ================================================ */

.lux-filter-drawer {
  position: fixed;
  inset: 0;
  z-index: 200;
  pointer-events: none;
  visibility: hidden;
}

.lux-filter-drawer.is-open {
  pointer-events: auto;
  visibility: visible;
}

.lux-filter-drawer-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0,0,0,0.6);
}

.lux-filter-drawer-panel {
  position: absolute;
  top: 0;
  right: 0;
  width: 320px;
  max-width: 90vw;
  height: 100%;
  background: var(--dark-2);
  border-left: 1px solid var(--gold);
  box-shadow: -8px 0 24px rgba(0,0,0,0.5);
  display: flex;
  flex-direction: column;
  transform: translateX(100%);
  transition: transform 0.3s ease;
}

.lux-filter-drawer.is-open .lux-filter-drawer-panel {
  transform: translateX(0);
}

.lux-drawer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.2rem;
  border-bottom: 1px solid var(--dark-4);
  color: var(--gold);
  font-size: 1rem;
}

.lux-drawer-header button {
  background: none;
  border: none;
  color: var(--gray);
  font-size: 1.2rem;
  cursor: pointer;
}

.lux-drawer-body {
  flex: 1;
  overflow-y: auto;
  padding: 1rem 1.2rem;
}

.lux-drawer-group {
  margin-bottom: 1.2rem;
}

.lux-drawer-row {
  display: flex;
  gap: 0.8rem;
  margin-bottom: 1.2rem;
}

.lux-drawer-field {
  flex: 1;
}

.lux-drawer-field select,
.lux-drawer-field input[type="number"],
.lux-drawer-field input[type="text"] {
  width: 100%;
  background: var(--dark);
  border: 1px solid var(--dark-4);
  border-radius: 6px;
  padding: 0.5rem 0.6rem;
  color: var(--white);
  font-size: 0.85rem;
  outline: none;
}

.lux-drawer-field select:focus,
.lux-drawer-field input:focus {
  border-color: var(--gold);
}

.lux-drawer-label {
  display: block;
  font-size: 0.65rem;
  letter-spacing: 1.2px;
  color: var(--gray);
  margin-bottom: 0.4rem;
  text-transform: uppercase;
}

/* Type chips in drawer */
.lux-type-chips {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.lux-type-chip {
  background: var(--dark);
  border: 1px solid var(--dark-4);
  border-radius: 5px;
  padding: 0.3rem 0.6rem;
  font-size: 0.78rem;
  color: var(--white);
  cursor: pointer;
}

.lux-type-chip.is-active {
  background: var(--gold);
  color: #1a1a1a;
  border-color: var(--gold);
  font-weight: 600;
}

/* Amenity grid */
.lux-amenity-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.35rem;
}

.lux-amenity-check {
  font-size: 0.8rem;
  color: var(--white);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.3rem;
}

.lux-amenity-check input[type="checkbox"] {
  accent-color: var(--gold);
}

/* Drawer footer */
.lux-drawer-footer {
  padding: 0.8rem 1.2rem;
  border-top: 1px solid var(--dark-4);
  display: flex;
  gap: 0.6rem;
}

.lux-btn-clear {
  flex: 1;
  background: transparent;
  border: 1px solid var(--dark-4);
  color: var(--gray);
  border-radius: 8px;
  padding: 0.6rem;
  text-align: center;
  font-size: 0.85rem;
}

.lux-btn-apply {
  flex: 1;
  background: var(--gold);
  color: #1a1a1a;
  border: none;
  border-radius: 8px;
  padding: 0.6rem;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
}

/* Results header */
.lux-results-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 1rem;
  margin-bottom: 0.6rem;
}

.lux-results-count {
  color: var(--gray);
  font-size: 0.85rem;
}

.lux-sort {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  font-size: 0.85rem;
  color: var(--gray);
}

.lux-sort-link {
  color: var(--gray);
}

.lux-sort-link.is-active,
.lux-sort-link:hover {
  color: var(--gold);
}

/* Section header */
.lux-section-header {
  text-align: center;
  margin-bottom: 1.5rem;
}

.lux-eyebrow {
  font-size: 0.75rem;
  letter-spacing: 2px;
  color: var(--gold);
  text-transform: uppercase;
  margin-bottom: 0.3rem;
}

.lux-section-header h2 {
  font-size: 1.5rem;
  color: var(--white);
}

/* Property grid */
.lux-prop-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
}

@media (max-width: 992px) {
  .lux-prop-grid { grid-template-columns: repeat(2, 1fr); }
  .lux-search-bar { flex-direction: column; }
}

@media (max-width: 576px) {
  .lux-prop-grid { grid-template-columns: 1fr; }
  .lux-drawer-row { flex-direction: column; }
}

/* Pagination */
.lux-pagination {
  display: flex;
  justify-content: center;
  gap: 1rem;
  align-items: center;
  margin-top: 1.5rem;
  padding: 1rem 0;
}

.lux-page-btn {
  color: var(--gold);
  font-size: 0.85rem;
}

.lux-page-info {
  color: var(--gray);
  font-size: 0.85rem;
}

/* No results */
.lux-no-results {
  text-align: center;
  padding: 2rem;
  color: var(--gray);
  font-size: 0.95rem;
}
```

- [ ] **Step 3: Create `static/assets/js/search.js`**

```javascript
/**
 * Search UI: autosuggest + filter drawer
 * Vanilla JS, compatible with jQuery IIFE in main.js
 */
(function () {
  'use strict';

  /* ---------------------------------------------
   Autosuggest
   --------------------------------------------- */
  var searchInput = document.getElementById('lux-search-input');
  var suggestDropdown = document.getElementById('lux-suggest-dropdown');
  var suggestUrl = '/search/suggest/?q=';
  var debounceTimer = null;
  var highlightIndex = -1;
  var items = [];

  function fetchSuggestions(query) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', suggestUrl + encodeURIComponent(query), true);
    xhr.onreadystatechange = function () {
      if (xhr.readyState === 4 && xhr.status === 200) {
        var data = JSON.parse(xhr.responseText);
        renderSuggestions(data.results);
      }
    };
    xhr.send();
  }

  function renderSuggestions(results) {
    items = results;
    highlightIndex = -1;
    if (!results.length) {
      suggestDropdown.classList.remove('is-open');
      return;
    }

    var html = '';
    var lastType = '';
    results.forEach(function (r, i) {
      if (r.type !== lastType) {
        html += '<div class="lux-suggest-group-label">' + r.type + 's</div>';
        lastType = r.type;
      }
      html += '<div class="lux-suggest-item" data-index="' + i +
        '" data-type="' + r.type + '" data-value="' + r.value + '">' +
        '<span>' + escapeHtml(r.label) + '</span>';
      if (r.count !== undefined) {
        html += '<span class="count">(' + r.count + ')</span>';
      }
      html += '</div>';
    });
    suggestDropdown.innerHTML = html;
    suggestDropdown.classList.add('is-open');
  }

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  function selectSuggestion(index) {
    var item = items[index];
    if (!item) return;
    var form = document.getElementById('prop-search-form');
    if (item.type === 'location') {
      searchInput.value = item.value;
    } else if (item.type === 'type') {
      searchInput.value = '';
      // Add hidden input for type
      var hidden = document.createElement('input');
      hidden.type = 'hidden';
      hidden.name = 'type';
      hidden.value = item.value;
      form.appendChild(hidden);
    }
    suggestDropdown.classList.remove('is-open');
    form.submit();
  }

  if (searchInput) {
    searchInput.addEventListener('input', function () {
      clearTimeout(debounceTimer);
      var q = searchInput.value.trim();
      if (q.length < 1) {
        suggestDropdown.classList.remove('is-open');
        return;
      }
      debounceTimer = setTimeout(function () {
        fetchSuggestions(q);
      }, 150);
    });

    searchInput.addEventListener('keydown', function (e) {
      var allItems = suggestDropdown.querySelectorAll('.lux-suggest-item');
      if (!allItems.length) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        highlightIndex = Math.min(highlightIndex + 1, allItems.length - 1);
        allItems.forEach(function (el, i) {
          el.classList.toggle('is-highlighted', i === highlightIndex);
        });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        highlightIndex = Math.max(highlightIndex - 1, 0);
        allItems.forEach(function (el, i) {
          el.classList.toggle('is-highlighted', i === highlightIndex);
        });
      } else if (e.key === 'Enter') {
        if (highlightIndex >= 0) {
          e.preventDefault();
          selectSuggestion(highlightIndex);
        }
      } else if (e.key === 'Escape') {
        suggestDropdown.classList.remove('is-open');
        highlightIndex = -1;
      }
    });
  }

  // Click handler for suggestion items
  if (suggestDropdown) {
    suggestDropdown.addEventListener('click', function (e) {
      var item = e.target.closest('.lux-suggest-item');
      if (item) {
        selectSuggestion(parseInt(item.dataset.index, 10));
      }
    });
  }

  // Close dropdown on outside click
  document.addEventListener('click', function (e) {
    if (searchInput && suggestDropdown && !searchInput.contains(e.target) && !suggestDropdown.contains(e.target)) {
      suggestDropdown.classList.remove('is-open');
    }
  });

  /* ---------------------------------------------
   Filter Drawer
   --------------------------------------------- */
  var filterToggle = document.getElementById('lux-filter-toggle');
  var drawer = document.getElementById('lux-filter-drawer');
  var drawerClose = document.getElementById('lux-drawer-close');
  var drawerOverlay = document.getElementById('lux-drawer-overlay');

  function openDrawer() {
    if (drawer) drawer.classList.add('is-open');
    document.body.style.overflow = 'hidden';
  }

  function closeDrawer() {
    if (drawer) drawer.classList.remove('is-open');
    document.body.style.overflow = '';
  }

  if (filterToggle) filterToggle.addEventListener('click', openDrawer);
  if (drawerClose) drawerClose.addEventListener('click', closeDrawer);
  if (drawerOverlay) drawerOverlay.addEventListener('click', closeDrawer);

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && drawer && drawer.classList.contains('is-open')) {
      closeDrawer();
    }
  });

  /* ---------------------------------------------
   Filter Chips — remove single filter
   --------------------------------------------- */
  document.querySelectorAll('.lux-chip-remove').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      var removeKey = btn.dataset.remove;
      var removeValue = btn.dataset.value;
      var params = new URLSearchParams(window.location.search);
      if (removeKey === 'price') {
        params.delete('currency');
        params.delete('min_price');
        params.delete('max_price');
      } else if (removeKey === 'amenities' && removeValue) {
        // Remove specific amenity value
        var current = params.getAll('amenities');
        params.delete('amenities');
        current.filter(function (v) { return v !== removeValue; }).forEach(function (v) {
          params.append('amenities', v);
        });
      } else {
        params.delete(removeKey);
      }
      window.location.href = '/properteas?' + params.toString();
    });
  });

  /* ---------------------------------------------
   Sort links — update URL params without losing other filters
   --------------------------------------------- */
  document.querySelectorAll('#lux-sort-links .lux-sort-link').forEach(function (link) {
    link.addEventListener('click', function (e) {
      e.preventDefault();
      var sortVal = link.dataset.sort;
      var params = new URLSearchParams(window.location.search);
      if (sortVal) {
        params.set('sort', sortVal);
      } else {
        params.delete('sort');
      }
      window.location.href = '/properteas?' + params.toString();
    });
  });

})();
```

- [ ] **Step 4: Add the `search.js` script tag to the template**

In `template/properteas.html`, add this at the bottom (before closing `</body>` or in a block):

```html
{% block extra_js %}
<script src="{% static 'assets/js/search.js' %}"></script>
{% endblock %}
```

- [ ] **Step 5: Run tests**

Run: `.venv/Scripts/python.exe manage.py test signatureapp -v2`
Expected: All tests pass.

- [ ] **Step 6: Manual smoke test — start server, visit /properteas**

Run: `.venv/Scripts/python.exe manage.py runserver`
Open: `http://127.0.0.1:8000/properteas`
Verify:
- Search bar renders with autosuggest input, status pills, Filters button
- Click Filters → drawer slides in from right
- Type "bo" in search → dropdown shows location suggestions
- Select a suggestion → page reloads with `q=Bole`
- Apply a filter in drawer → page reloads with filter chips
- Click ✕ on a chip → that filter is removed
- Click "Clear all" → all filters removed

- [ ] **Step 7: Commit**

```bash
git add template/properteas.html static/assets/css/luxury.css static/assets/js/search.js
git commit -m "feat: new Properties page with search bar, filters drawer, and chips"
```

---

## Task 8: Simplify the homepage search

**Files:**
- Modify: `template/index.html`

- [ ] **Step 1: Replace the existing `market-search` form in `template/index.html`**

Find the existing `<div class="market-search">` block (the tabs + grid of selects). Replace it with:

```html
<div class="market-search">
  <form method="get" action="/properteas" class="market-search-form">
    <div class="market-search-bar">
      <div class="market-search-input-wrap">
        <span class="market-search-icon">🔍</span>
        <input type="text" name="q" placeholder="Bole, Kazanchis, Apartment..." autocomplete="off" id="home-search-input">
        <div class="lux-suggest-dropdown" id="home-suggest-dropdown"></div>
      </div>
      <div class="market-search-pills">
        <button type="submit" name="filter" value="" class="market-pill">All</button>
        <button type="submit" name="filter" value="Rent" class="market-pill">Rent</button>
        <button type="submit" name="filter" value="Sale" class="market-pill">Sale</button>
      </div>
      <button type="submit" class="market-search-btn">Search</button>
    </div>
  </form>
</div>
```

- [ ] **Step 2: Remove the old market-search JS from `template/index.html`**

Find and remove the `<script>` block near the bottom of `index.html` that handles:
- `categoryChange()` / populating the selects based on category
- The `filterForm` submission logic
- The `max_price` / `currency` interplay

This is approximately 130 lines of JS. Remove it entirely — the new simple form doesn't need it.

- [ ] **Step 3: Add CSS for the simplified homepage bar**

In `luxury.css`, replace/update the existing `.market-search` styles (lines 178–247) with:

```css
.market-search {
  margin-top: -2.5rem;
  position: relative;
  z-index: 4;
}

.market-search-form {
  max-width: 720px;
  margin: 0 auto;
}

.market-search-bar {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 14px;
  box-shadow: 0 18px 45px rgba(20,20,20,0.08);
  padding: 1rem 1.2rem;
  display: flex;
  gap: 0.6rem;
  align-items: center;
  flex-wrap: wrap;
}

.market-search-input-wrap {
  flex: 1;
  min-width: 200px;
  position: relative;
}

.market-search-input-wrap input {
  width: 100%;
  padding: 0.7rem 0.7rem 0.7rem 2.2rem;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface-muted);
  color: #1f1f1f;
  font-size: 0.9rem;
  outline: none;
}

.market-search-input-wrap input:focus {
  border-color: var(--gold);
}

.market-search-icon {
  position: absolute;
  left: 0.7rem;
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
}

.market-search-pills {
  display: flex;
  gap: 3px;
  background: var(--surface-muted);
  border-radius: 8px;
  padding: 3px;
}

.market-pill {
  background: transparent;
  border: none;
  padding: 0.45rem 1rem;
  font-size: 0.8rem;
  color: var(--gray);
  cursor: pointer;
  border-radius: 6px;
}

.market-pill:hover {
  color: #1f1f1f;
}

.market-search-btn {
  background: var(--gold);
  color: #1a1a1a;
  border: none;
  border-radius: 8px;
  padding: 0.6rem 1.5rem;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
}

@media (max-width: 576px) {
  .market-search-bar {
    flex-direction: column;
  }
}
```

- [ ] **Step 4: Initialize the autosuggest on the homepage input**

Add this script at the bottom of `index.html`:

```html
<script>
(function () {
  var input = document.getElementById('home-search-input');
  var dropdown = document.getElementById('home-suggest-dropdown');
  if (!input || !dropdown) return;

  var timer = null;
  var highlightIdx = -1;
  var allItems = [];

  input.addEventListener('input', function () {
    clearTimeout(timer);
    var q = input.value.trim();
    if (q.length < 1) { dropdown.classList.remove('is-open'); return; }
    timer = setTimeout(function () {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', '/search/suggest/?q=' + encodeURIComponent(q), true);
      xhr.onreadystatechange = function () {
        if (xhr.readyState === 4 && xhr.status === 200) {
          var data = JSON.parse(xhr.responseText);
          allItems = data.results;
          highlightIdx = -1;
          if (!allItems.length) { dropdown.classList.remove('is-open'); return; }
          var html = '', lastType = '';
          allItems.forEach(function (r, i) {
            if (r.type !== lastType) {
              html += '<div class="lux-suggest-group-label">' + r.type + 's</div>';
              lastType = r.type;
            }
            html += '<div class="lux-suggest-item" data-index="' + i + '" data-type="' + r.type + '" data-value="' + r.value + '">';
            html += '<span>' + r.label + '</span>';
            if (r.count !== undefined) html += '<span class="count">(' + r.count + ')</span>';
            html += '</div>';
          });
          dropdown.innerHTML = html;
          dropdown.classList.add('is-open');
        }
      };
      xhr.send();
    }, 150);
  });

  input.addEventListener('keydown', function (e) {
    var els = dropdown.querySelectorAll('.lux-suggest-item');
    if (!els.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); highlightIdx = Math.min(highlightIdx + 1, els.length - 1); els.forEach(function(el,i){ el.classList.toggle('is-highlighted', i===highlightIdx); }); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); highlightIdx = Math.max(highlightIdx - 1, 0); els.forEach(function(el,i){ el.classList.toggle('is-highlighted', i===highlightIdx); }); }
    else if (e.key === 'Enter' && highlightIdx >= 0) {
      e.preventDefault();
      var item = allItems[highlightIdx];
      if (!item) return;
      var form = input.closest('form');
      if (item.type === 'location') { input.value = item.value; }
      else if (item.type === 'type') { input.value = ''; var h = document.createElement('input'); h.type='hidden'; h.name='type'; h.value=item.value; form.appendChild(h); }
      dropdown.classList.remove('is-open');
      form.submit();
    }
    else if (e.key === 'Escape') { dropdown.classList.remove('is-open'); }
  });

  dropdown.addEventListener('click', function (e) {
    var item = e.target.closest('.lux-suggest-item');
    if (item) {
      var idx = parseInt(item.dataset.index, 10);
      var r = allItems[idx];
      if (!r) return;
      var form = input.closest('form');
      if (r.type === 'location') { input.value = r.value; }
      else if (r.type === 'type') { input.value = ''; var h = document.createElement('input'); h.type='hidden'; h.name='type'; h.value=r.value; form.appendChild(h); }
      dropdown.classList.remove('is-open');
      form.submit();
    }
  });

  document.addEventListener('click', function (e) {
    if (!input.contains(e.target) && !dropdown.contains(e.target)) dropdown.classList.remove('is-open');
  });
})();
</script>
```

- [ ] **Step 5: Manual smoke test — start server, visit homepage**

Open: `http://127.0.0.1:8000/`
Verify:
- Simplified search bar renders (no selects for beds/baths/price etc.)
- Type "bo" → dropdown shows suggestions
- Select "Bole" → redirects to `/properteas?q=Bole`
- Click "Rent" pill → redirects to `/properteas?filter=Rent`
- Properties page shows the full filter UI with the query applied

- [ ] **Step 6: Commit**

```bash
git add template/index.html static/assets/css/luxury.css
git commit -m "feat: simplify homepage to autosuggest search bar with pills"
```

---

## Task 9: Extract property card partial (if not already extracted)

**Files:**
- Create: `template/partials/property_card.html` (if it doesn't exist)

- [ ] **Step 1: Check if a property card partial exists**

If the property card HTML in `properteas.html` is not already a `{% include %}`, extract the card markup from the current template into `template/partials/property_card.html` and replace it with:

```html
{% include "partials/property_card.html" with property=property %}
```

The partial should contain the existing card HTML from the current `properteas.html` — the image, title, location, price, `card_specs()` method call, and link. Keep it exactly as it renders today.

- [ ] **Step 2: Commit (if changed)**

```bash
git add template/partials/ template/properteas.html
git commit -m "refactor: extract property card into reusable partial"
```

---

## Task 10: Final integration test and cleanup

**Files:**
- All modified files (verification only)

- [ ] **Step 1: Run all tests**

Run: `.venv/Scripts/python.exe manage.py test signatureapp -v2`
Expected: All `ParsePriceTests`, `BuildingTypesTests`, `PropertySearchTests`, `SearchSuggestTests` pass.

- [ ] **Step 2: Full manual smoke test**

Start server. Walk through these scenarios:
1. **Homepage → Properties:** Type "Bole" on homepage, select from dropdown → lands on `/properteas?q=Bole`
2. **Drawer filters:** Open drawer, select "Apartment" type, Beds: 2, Furnished: Yes → results filter correctly, chips appear
3. **Chip removal:** Click ✕ on "Furnished: Yes" chip → only that filter removed
4. **Clear all:** Click "Clear all" → all filters removed, all properties shown
5. **Price range:** In drawer, set currency USD, min 2000, max 5000 → only USD properties in that range
6. **Amenities:** Check "Elevators" and "Security system" → only properties with both
7. **Building type + status:** Select type "Apartment" + pill "Rent" → only apartments for rent
8. **Sort:** Click "Price ↑" and "Price ↓" → ordering changes
9. **No results:** Apply impossible filter combo → "No properties match" message shown
10. **Back-compat:** Visit `/properteas?category=apt-rent` → works as before
11. **No JS:** Disable JavaScript in browser → bar + pills still submit; drawer content visible in page (or via noscript fallback)

- [ ] **Step 3: Remove dead code**

Check `views.py` for any now-unused functions or imports (e.g. the old inline `parse_price_amount` at line 114 if `search.py` now owns parsing). Remove them.

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: complete advanced property search (sub-project A)"
```

---

## Self-Review Checklist

| Spec section | Task(s) covering it |
|---|---|
| §2 Data model (price fields) | Tasks 1, 2 |
| §2 Amenity rows | Task 3 |
| §3 PropertySearch service | Task 4 |
| §4 Auto-suggest endpoint | Task 5 |
| §3+§6 Views refactor | Task 6 |
| §5 Properties page UI (bar + drawer + chips) | Tasks 7, 9 |
| §6 Homepage UI | Task 8 |
| §8 Edge cases + testing | Tasks 4, 5, 10 |
| §7 Files touched | All tasks |
