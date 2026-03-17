# Currency Filter Design (ETB/USD)

Date: 2026-03-16
Owner: OpenCode

## Context
Prices are stored as symbolized strings (e.g., "$1200", "50,000 Br.") in `propertys.price`. The goal is to support separate currency filtering via the hero search, using query parameters to `properteas`.

## Goals
- Add a currency selector (ETB/USD) to the hero search.
- Filter listings by selected currency and optional max price.
- Keep existing data model unchanged.

## Non-goals
- Database schema changes or migrations.
- Changing price storage format.
- Adding new routes.

## Approach
- Add `currency` select to the hero search form.
- In `properteas`, parse `propertys.price` strings to detect currency and numeric value.
- Apply filters in Python when a currency is selected.

## Parsing Rules
- ETB if price contains "Br" or "birr" (case-insensitive).
- USD if price contains "$" or "USD" (case-insensitive).
- Numeric value extracted from digits and commas.

## Error Handling
- If currency cannot be detected or numeric value cannot be parsed, skip the item for currency filtering.
- If currency is selected but max_price is missing, filter by currency only.

## Testing
- Filter ETB listings with max price.
- Filter USD listings with max price.
- Filter currency only (no max price).
- Mixed/invalid price strings do not break rendering.

## Files to Change
- `template/index.html`
- `signatureapp/views.py`
