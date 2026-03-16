# Hero Search Filter Design (Live Ethio-Inspired)

Date: 2026-03-16
Owner: OpenCode

## Context
Homepage is `template/index.html` with styling in `static/assets/css/luxury.css`. Listings are rendered by `properteas` in `signatureapp/views.py`, which already supports basic query parameters for category and sale/rent filtering. The goal is to add a Live‑Ethio‑style hero search filter that submits query parameters to the existing `properteas` listing page.

## Goals
- Add a hero search filter block that matches Live Ethio’s layout pattern.
- Submit search using query parameters to `properteas` (no new routes).
- Filter by status (rent/sale), category, bedrooms, and max price.

## Non-goals
- Introduce new backend models or admin fields.
- Implement client-side search or API endpoints.
- Add new listing pages or routes.

## Approach
- Add a GET form in the hero section that submits to `properteas`.
- Use query params: `filter` (Rent/Sale), `category` (category slug), `bedrooms` (1–10), `max_price` (numeric).
- Extend `properteas` view logic to apply the extra filters.

## Layout
- Add a tab strip for status (All / For Rent / For Sale).
- Place the form in a raised card beneath the hero headline.
- Keep existing hero text and CTA buttons.

## Data Flow
- The hero form uses existing `catagorys` for the category select.
- `properteas` reads query parameters and filters the existing queryset.

## Error Handling
- Missing/invalid filters are ignored gracefully (falls back to all listings).
- `max_price` is applied only when numeric.
- Invalid category slug is ignored.

## Testing
- Submit hero form with each filter and confirm expected listings.
- Verify query params appear in the URL.
- Check mobile layout stacks inputs without overflow.

## Files to Change
- `template/index.html`
- `static/assets/css/luxury.css`
- `signatureapp/views.py`
