# Advanced Property Search — Design (Sub-project A)

**Date:** 2026-06-18
**Project:** Signature Property Solutions (`ethiosps.com`)
**Status:** Approved (design), pending implementation plan
**Stack:** Django 5 + SQLite, server-rendered Bootstrap templates, `static/assets/css/luxury.css` (dark/gold theme).

## 1. Scope & Goals

### In scope
- Multi-filter search: bedrooms, bathrooms, price range, furnished, amenities.
- Search by building type (apartment, house, office, villa, building, warehouse, land).
- Auto-suggest search bar matching locations and property types (e.g. "Bole", "Kazanchis", "CMC", "Apartment").
- A unified filter UI on the Properties page (search bar + filters drawer) and a simplified search box on the homepage that deep-links into the Properties page.

### Out of scope (deferred to Sub-project B)
- Search by map.
- Search by neighborhood radius.

Both require latitude/longitude on properties, which the data does not have today (`property_location` is free text). Sub-project B will geo-enable properties (lat/lng migration + geocoding) and add map and radius search. Also out of scope: any AI/RAG changes to the property assistant.

### Goals
- One backend search engine shared by the homepage and Properties page, eliminating the duplicated/split filter logic that exists today.
- A fast, luxury-feeling search experience consistent across pages.
- Backward compatibility with existing URLs and bookmarks that use `?category=`.

### Root cause being fixed
The homepage (`template/index.html`) already renders a rich filter form (type, beds, baths, floor, furnished, size, currency, price) that submits GET params to the `properteas` view. The `properteas` view supports most of those params — but `template/properteas.html` only renders a minimal bar (Sale/Rent/Sort/Category) and ignores them in the UI. The two pages are inconsistent. This design consolidates all filter logic into a shared service and gives the Properties page the full filter UI.

## 2. Data Model Changes

Two changes, both backward-compatible.

### Change 1 — Derived price fields on `propertys`
Add two fields:
```python
price_amount   = models.IntegerField(null=True, blank=True)   # e.g. 11000000
price_currency = models.CharField(max_length=8, blank=True)   # 'ETB' | 'USD' | ''
```
- Auto-populated in `propertys.save()` by parsing the existing `price` text. Reuse the `parse_price` logic currently in `views.py` (lines ~703–716): detects `$/usd` → USD, `br/birr/etb` → ETB; strips non-digits to an integer.
- If a price cannot be parsed (e.g. `"1000 Per Sqm"`, `"Negotiable"`), both fields stay empty. The property remains visible in all other searches; it is simply excluded from price-range filters. No data loss.
- One Django migration. Existing rows are backfilled via a one-off management command (see "Backfill" below).
- `price` text remains the display source of truth on cards/detail pages.
- This replaces the per-row Python string-parsing currently performed in the view. Filtering becomes `price_currency__exact` + `price_amount__gte`/`__lte` — indexed DB queries instead of scanning every row.

### Change 2 — Amenity rows (data only, no migration)
Add two rows to the `facilities` table: "Parking" and "Generator". Together with the existing 11 (Elevators, Security system, Gym, Pool, Playground, Rooftop terrace, Reception, Kitchen, Wi-Fi, HVAC, Fire safety) these form the amenities filter checklist. Existing properties are re-tagged in admin as needed. No schema change.

### Not changed
No new model field for building type — it is derived at query time from category names (Section 3).

### Backfill
A one-off management command `signatureapp/management/commands/backfill_prices.py` iterates all `propertys` rows and calls `save()` once so the new fields populate from the existing `price` text. Run once after migration. Also reusable if prices are edited later (though normal `save()` keeps them in sync going forward).

## 3. Shared Search Service — `signatureapp/search.py`

A single class that turns query params into a filtered, sorted queryset. Both views call it.

```python
class PropertySearch:
    def __init__(self, get_params): ...        # QueryDict
    def results(self): ...                     # -> filtered + sorted QuerySet[propertys]
    def applied_filters(self): ...             # -> dict of active filters (for badge + chips)
```

### Filters (each maps to a GET param; each silently ignores bad/empty input)

| Param | Filter |
|---|---|
| `q` | Auto-suggest text — matches `property_location__icontains` ∪ category name |
| `type` | Building type — expand to matching category slugs, filter `property_types__in` |
| `category` | Exact category slug (back-compat with existing homepage form) |
| `filter` | `Sale` / `Rent` / `LowToHigh` / `HighToLow` (existing semantics) |
| `bedrooms`, `bathrooms` | Exact match (residential-aware guard, as in current view) |
| `floor` | Exact match |
| `furnished` | Yes / No (`__iexact`) |
| `size` | `property_size__gte` |
| `currency`, `min_price`, `max_price` | `price_currency__exact` + `price_amount__gte`/`__lte` (new fields) |
| `amenities` (repeatable, e.g. `amenities=Elevators&amenities=Security_system`) | `facilitie__slug__in=[...]`; property must have ALL selected |

### Building-type derivation
A helper `building_types()` returns the distinct building types derived from `catagory.objects.all()` by stripping ` for Sale` / ` for Rent` from the name, e.g. `[("apartment","Apartment"), ("house","House"), ("office","Office"), ("building","Building"), ("warehouse","Warehouse"), ("land","Land")]`. (Villa/Penthouse appear only if such categories exist in data.) When a `type` param is given, it expands to the set of matching category slugs and applies `property_types__in`.

### Interaction rules
- All active filters combine with AND: a property must satisfy every applied filter to appear in results. So `q` (substring match) AND `type` AND `amenities` AND price-range, etc., all narrow together.
- If both `type` and `category` are present, `category` wins (more specific).
- The `filter` param's Sale/Rent also constrains the type expansion: `type=apartment` + `filter=Rent` shows only apartment-for-rent categories.
- Bad input (out-of-range numbers, unknown enums) is ignored, not errored — the filter simply does not apply.

### Result
`views.py` loses ~80 lines of duplicated parsing. The `properteas` and `index` views each become ~10 lines calling `PropertySearch(request.GET).results()`.

## 4. Auto-Suggest Search Bar

A free-text input with a live dropdown of suggestions as the user types.

### Matches (locations + property types)
- **Locations** — distinct values of `property_location` across published properties (Bole, Atlas, Ayat, "Bole next to Boston Spa", Kazanchis once added, etc.).
- **Property types** — the derived building-type list.

### Endpoint
`GET /search/suggest?q=bo` → JSON:
```json
{ "results": [
  {"type":"location", "label":"Bole", "value":"Bole", "count": 6},
  {"type":"location", "label":"Bole next to Boston Spa", "value":"Bole next to Boston Spa", "count": 1},
  {"type":"type", "label":"Building", "value":"building"}
]}
```
- Locations ranked starts-with first, then contains; capped at ~8 total. A group separator divides locations from property types.
- Small dataset (11 properties) — live distinct query each call is acceptable.
- Registered in `signature/urls.py`; view is a thin function returning `JsonResponse`.

### Frontend behavior (vanilla JS)
- On input (debounced ~150ms), fetch `/search/suggest?q=...`, render a dropdown.
- Selecting a **location** sets the `q` param (substring location match) and submits.
- Selecting a **type** sets the `type` param and submits.
- Keyboard navigation (arrow up/down, enter, escape) + click.
- Falls back to plain text submit when JS is unavailable — typed `q` text still filters by location substring via `PropertySearch.q`.

## 5. Properties Page UI (bar + filters drawer)

Luxury dark/gold styling reusing existing `luxury.css` tokens — no new design system.

### The bar (always visible)
- Auto-suggest search input (left, grows to fill).
- Status pills: All / Rent / Sale.
- **Filters (n)** button — shows a count badge of active filters; opens the drawer.
- Search button.

### Active filter chips
Removable chips rendered above results (e.g. `Beds: 2 ✕`, `Furnished: Yes ✕`, `Elevator ✕`) plus a "Clear all" link. Let users drop a single filter without reopening the drawer.

### Results header
Result count ("8 properties found") and a Sort control (Newest / Price low→high / Price high→low).

### Filters drawer (opens on demand)
Slides in from the right. Contains:
- **Building type** — choice chips (Apartment, House, Office, Villa, Building, Warehouse, Land).
- **Bedrooms / Bathrooms** — selects.
- **Price range** — min–max slider, scoped to the selected currency (uses new `price_amount`/`price_currency`).
- **Furnished / Floor** — selects.
- **Amenities** — checklist (Parking, Generator, Elevators, Security, Gym, Pool, etc.).
- Footer: **Clear** (resets all) and **Show N** (applies + closes drawer).

### Interaction
- Drawer open/close is CSS + small JS toggle.
- All filters submit via normal GET form to `/properteas` — works without JS (drawer becomes a `<details>`/noscript fallback so every filter remains reachable).
- Pagination is preserved (existing `Paginator`, 6 per page).

## 6. Homepage UI

The homepage keeps its hero, but the current large filter form is simplified to a single prominent autosuggest search bar plus the All/Rent/Sale pills, which deep-link into the Properties page:
```
[ 🔍 Bole, Kazanchis, Apartment... ]  [ All | Rent | Sale ]  [ Search ]
```
- Same autosuggest endpoint and JS as the Properties page.
- On submit, `q` + `filter` go to `/properteas?...` where the full filter UI lives.
- The existing `category`/`bedrooms`/`bathrooms`/`floor`/`furnished`/`size`/`currency`/`price` selects on the homepage are **removed** — they were the source of the homepage/Properties inconsistency. Power filtering happens on the Properties page. This removes ~130 lines of JS from `index.html`.
- The `index` view loses the category-split logic (`catagorys_rent`, `catagorys_sale`, `max_price_etb`, `max_price_usd`) it currently builds for that form.

## 7. Files Touched

| File | Change |
|---|---|
| `signatureapp/models.py` | Add `price_amount`, `price_currency`; parse in `save()` |
| `signatureapp/search.py` | **New** — `PropertySearch` class + `building_types()` helper |
| `signatureapp/views.py` | `properteas` + `index` use `PropertySearch`; add `search_suggest`; remove old parsing |
| `signature/urls.py` | Add `/search/suggest` |
| `signatureapp/migrations/000X_*` | New migration for price fields |
| `signatureapp/management/commands/backfill_prices.py` | **New** — one-off backfill of existing rows |
| `template/properteas.html` | New bar + filter chips + drawer markup |
| `template/index.html` | Simplify to autosuggest bar + pills; remove selects/JS |
| `static/assets/css/luxury.css` | Styles for bar, drawer, chips, suggestion dropdown |
| `static/assets/js/autosuggest.js` | **New** — autosuggest dropdown logic |
| `static/assets/js/filter-drawer.js` | **New** — drawer open/close + active-count badge |
| Data | Add Parking + Generator facility rows (admin or fixture) |

## 8. Error Handling, Edge Cases, Testing

### Edge cases
- Unparseable prices (`"1000 Per Sqm"`, `"Negotiable"`) → empty `price_amount`; excluded from price filters only.
- Mixed-case furnished (`"yes"` / `"Yes"`) → `__iexact`.
- Building-type param with no matching categories → empty result set (not an error).
- `amenities` multi-select requires the property to have all selected amenities.
- No-JS: bar + pills still submit; drawer uses a `<details>`/noscript fallback so all filters remain reachable.
- Existing homepage links/bookmarks using `?category=` keep working (back-compat).

### Testing
- Django `TestCase` covering `PropertySearch`: each filter param individually, combined filters, type→category expansion, price-range with numeric fields, building-type derivation, and back-compat (`category` still works).
- A test for `search_suggest` JSON output (location + type grouping, ordering, cap).
- `parse_price` unit tests (USD `$`, ETB `birr/br/etb`, commas, unparseable → None).
- Manual: `manage.py runserver`; verify homepage bar deep-links correctly, drawer opens/closes, chips remove filters, autosuggest keyboard navigation, no-JS fallback.

## 9. Open Questions
None — all design decisions are resolved (scope, search location, autosuggest scope, amenities source, building-type derivation, price handling, UI style, backend approach).
