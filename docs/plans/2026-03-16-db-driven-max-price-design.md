# DB-Driven Max Price Design (ETB/USD)

Date: 2026-03-16
Owner: OpenCode

## Context
Prices are stored as symbolized strings in `propertys.price`. The hero search has currency and max price filters. The goal is to set the max price options based on DB-derived max values per currency.

## Goals
- Compute max price per currency from DB.
- Update max price dropdown options based on selected currency.
- Keep query parameter behavior unchanged.

## Non-goals
- Database schema changes.
- New endpoints or API routes.

## Approach
- Parse all `propertys.price` values in `views.py` to detect currency and numeric value.
- Determine `max_price_etb` and `max_price_usd`.
- Pass these values to `template/index.html` as data attributes.
- Use JS to build the max price options list in 10,000 increments up to the selected currency max.

## Error Handling
- If a currency has no parsable prices, use a fallback max (1,000,000).
- If currency not selected, default to ETB options.

## Testing
- Change currency and confirm options refresh.
- Ensure max option equals DB-derived max.
- Verify submit still passes `max_price`.

## Files to Change
- `signatureapp/views.py`
- `template/index.html`
