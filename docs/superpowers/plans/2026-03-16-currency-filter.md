# Currency Filter Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add ETB/USD filtering via a currency selector in the hero search and apply filters in `properteas` by parsing symbolized prices.

**Architecture:** Extend the hero search form in `template/index.html` with a currency select. In `signatureapp/views.py`, parse `propertys.price` strings to detect currency and numeric value, then filter the queryset in Python when a currency is selected (and optionally max_price).

**Tech Stack:** Django templates, Django views, Python string parsing.

---

## File Structure
- Modify: `template/index.html` (add currency selector to hero search)
- Modify: `signatureapp/views.py` (parse price strings and filter)

---

## Chunk 1: Hero Search Currency Selector

### Task 1: Add currency select to hero search

**Files:**
- Modify: `template/index.html`

- [ ] **Step 1: Insert currency select near Max Price**

```html
<div class="market-field">
  <label for="search-currency">Currency</label>
  <select id="search-currency" name="currency">
    <option value="">Select</option>
    <option value="ETB">ETB</option>
    <option value="USD">USD</option>
  </select>
</div>
```

- [ ] **Step 2: Add helper text under currency + price controls**

```html
<p class="market-muted" style="margin-top:0.5rem">Prices filtered by selected currency.</p>
```

- [ ] **Step 3: Commit**

```bash
git add template/index.html
git commit -m "feat: add currency selector to hero search"
```

---

## Chunk 2: Backend Price Parsing + Filtering

### Task 2: Parse price strings and filter by currency

**Files:**
- Modify: `signatureapp/views.py`

- [ ] **Step 1: Add helper parsing function in `properteas`**

```python
    def parse_price(value):
        if not value:
            return None, None
        lower = value.lower()
        if "br" in lower or "birr" in lower:
            currency = "ETB"
        elif "$" in value or "usd" in lower:
            currency = "USD"
        else:
            return None, None
        digits = "".join(ch for ch in value if ch.isdigit())
        if not digits:
            return None, None
        return currency, int(digits)
```

- [ ] **Step 2: Apply currency + max price filters in Python**

```python
    selected_currency = request.GET.get("currency")
    max_price = request.GET.get("max_price")
    max_price_value = int(max_price) if max_price and max_price.isdigit() else None

    if selected_currency in {"ETB", "USD"}:
        filtered = []
        for item in property_list:
            currency, amount = parse_price(item.price)
            if currency != selected_currency:
                continue
            if amount is None:
                continue
            if max_price_value and amount > max_price_value:
                continue
            filtered.append(item)
        property_list = filtered
```

- [ ] **Step 3: Commit**

```bash
git add signatureapp/views.py
git commit -m "feat: filter properties by currency"
```

---

## Chunk 3: Verification

### Task 3: Manual checks

**Files:**
- None

- [ ] **Step 1: Run server**

Run: `python manage.py runserver`
Expected: Server starts at `http://localhost:8000` without errors.

- [ ] **Step 2: Verify ETB filtering**

Check: Select ETB + max price and submit.
Expected: Only ETB listings at or below max price appear.

- [ ] **Step 3: Verify USD filtering**

Check: Select USD + max price and submit.
Expected: Only USD listings at or below max price appear.

- [ ] **Step 4: Verify currency-only filtering**

Check: Select currency with no max price.
Expected: All listings matching the currency appear.

- [ ] **Step 5: Verify invalid price strings**

Check: Listings with malformed or mixed price strings.
Expected: Page renders without errors; invalid prices are skipped in currency filtering.

- [ ] **Step 6: Commit (only if verification-driven tweaks were made)**

```bash
git add template/index.html signatureapp/views.py
git commit -m "chore: verify currency filtering"
```
