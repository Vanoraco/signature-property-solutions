# DB-Driven Max Price Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Compute max price per currency from DB and drive the hero max price options based on the selected currency.

**Architecture:** Parse `propertys.price` in `signatureapp/views.py` to compute `max_price_etb` and `max_price_usd`, pass them to the homepage template, then rebuild the max price options list in JS based on the selected currency.

**Tech Stack:** Django views/templates, vanilla JS.

---

## File Structure
- Modify: `signatureapp/views.py` (compute max per currency)
- Modify: `template/index.html` (data attributes + JS option rebuild)

---

## Chunk 1: Compute Max Price per Currency

### Task 1: Add max price computation in `index` view

**Files:**
- Modify: `signatureapp/views.py`

- [ ] **Step 1: Add helper to parse currency + amount**

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

- [ ] **Step 2: Compute max values**

```python
    max_price_etb = None
    max_price_usd = None
    for item in propertys.objects.all():
        currency, amount = parse_price(item.price)
        if currency == "ETB" and amount:
            max_price_etb = amount if max_price_etb is None else max(max_price_etb, amount)
        elif currency == "USD" and amount:
            max_price_usd = amount if max_price_usd is None else max(max_price_usd, amount)
    if max_price_etb is None:
        max_price_etb = 1000000
    if max_price_usd is None:
        max_price_usd = 1000000
```

- [ ] **Step 3: Add to context**

```python
    context = {
        "hom": hom,
        "catagorys": catagorys,
        "propertyss": propertyss,
        "contactss": contactss,
        "max_price_etb": max_price_etb,
        "max_price_usd": max_price_usd,
    }
```

- [ ] **Step 4: Commit**

```bash
git add signatureapp/views.py
git commit -m "feat: compute max price per currency"
```

---

## Chunk 2: Drive Max Price Options from DB

### Task 2: Rebuild max price options by currency

**Files:**
- Modify: `template/index.html`

- [ ] **Step 1: Add data attributes for max prices**

```html
<select id="search-price" name="max_price"
  data-max-etb="{{ max_price_etb }}"
  data-max-usd="{{ max_price_usd }}">
```

- [ ] **Step 2: Add JS to rebuild options**

```html
<script>
  document.addEventListener('DOMContentLoaded', () => {
    const currencySelect = document.getElementById('search-currency');
    const priceSelect = document.getElementById('search-price');
    if (!currencySelect || !priceSelect) return;
    const step = 10000;
    const getMax = (currency) => {
      const normalized = currency === 'USD' ? 'USD' : 'ETB';
      const maxAttr = normalized === 'USD' ? 'maxUsd' : 'maxEtb';
      const value = priceSelect.dataset[maxAttr];
      const parsed = parseInt(value, 10);
      return Number.isFinite(parsed) ? parsed : 1000000;
    };
    const buildOptions = (currency) => {
      const max = getMax(currency);
      const selected = priceSelect.value;
      priceSelect.innerHTML = '<option value="">Select</option>';
      for (let value = step; value <= max; value += step) {
        const option = document.createElement('option');
        option.value = String(value);
        const formatted = value.toLocaleString();
        option.textContent = currency === 'USD' ? `$ ${formatted}` : `Br. ${formatted}`;
        if (selected && selected === option.value) option.selected = true;
        priceSelect.appendChild(option);
      }
      if (max % step !== 0) {
        const option = document.createElement('option');
        option.value = String(max);
        const formatted = max.toLocaleString();
        option.textContent = currency === 'USD' ? `$ ${formatted}` : `Br. ${formatted}`;
        if (selected && selected === option.value) option.selected = true;
        priceSelect.appendChild(option);
      }
    };
    const currentCurrency = currencySelect.value || 'ETB';
    buildOptions(currentCurrency);
    currencySelect.addEventListener('change', () => {
      buildOptions(currencySelect.value || 'ETB');
    });
  });
</script>
```

- [ ] **Step 3: Commit**

```bash
git add template/index.html
git commit -m "feat: drive max price options from db"
```

---

## Chunk 3: Verification

### Task 3: Manual checks

**Files:**
- None

- [ ] **Step 1: Run server**

Run: `python manage.py runserver`
Expected: Server starts at `http://localhost:8000` without errors.

- [ ] **Step 2: Verify options update by currency**

Check: Switch between ETB and USD.
Expected: Max price options update, and the last option equals the DB-derived max (even if not a 10,000 increment).

- [ ] **Step 3: Verify submit**

Check: Select currency + max price and submit.
Expected: URL includes `currency` and `max_price` and filtering applies.

- [ ] **Step 4: Commit (only if verification-driven tweaks were made)**

```bash
git add signatureapp/views.py template/index.html
git commit -m "chore: verify db-driven max price"
```
