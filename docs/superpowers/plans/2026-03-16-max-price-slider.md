# Max Price Slider Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hero search Max Price select with a slider that submits `max_price` query parameters.

**Architecture:** Update the hero search form markup in `template/index.html` to use a range input and live label. Add CSS for the slider styling in `static/assets/css/luxury.css`. Keep backend filtering intact (already handles numeric `max_price`).

**Tech Stack:** Django templates, HTML range input, vanilla JS, custom CSS.

---

## File Structure
- Modify: `template/index.html` (replace select with range + label)
- Modify: `static/assets/css/luxury.css` (slider styles)

---

## Chunk 1: Hero Search Markup

### Task 1: Replace Max Price select with range input

**Files:**
- Modify: `template/index.html`

- [ ] **Step 1: Replace Max. Price field with a slider**

```html
<div class="market-field">
  <label for="search-price">Max. Price</label>
  <div class="market-range">
    <input
      id="search-price"
      name="max_price"
      type="range"
      min="10000"
      max="1000000"
      step="10000"
      value="{{ request.GET.max_price|default:'1000000' }}"
      aria-valuemin="10000"
      aria-valuemax="1000000"
      aria-valuenow="{{ request.GET.max_price|default:'1000000' }}"
    >
    <span id="search-price-output">Br. {{ request.GET.max_price|default:'1000000' }}</span>
  </div>
</div>
```

- [ ] **Step 2: Add small script to update the label**

```html
<script>
  (function () {
    const slider = document.getElementById('search-price');
    const output = document.getElementById('search-price-output');
    if (!slider || !output) return;
    const format = (value) => `Br. ${Number(value).toLocaleString()}`;
    const update = () => {
      output.textContent = format(slider.value);
      slider.setAttribute('aria-valuenow', slider.value);
    };
    slider.addEventListener('input', update);
    update();
  })();
</script>
```

- [ ] **Step 3: Commit**

```bash
git add template/index.html
git commit -m "feat: replace max price select with slider"
```

---

## Chunk 2: Slider Styles

### Task 2: Add slider styling

**Files:**
- Modify: `static/assets/css/luxury.css`

- [ ] **Step 1: Add slider styles**

```css
.market-range {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}
.market-range input[type="range"] {
  width: 100%;
  accent-color: var(--gold);
}
.market-range span {
  min-width: 120px;
  font-size: 0.9rem;
  color: #1f1f1f;
  text-align: right;
}
```

- [ ] **Step 2: Commit**

```bash
git add static/assets/css/luxury.css
git commit -m "style: add hero max price slider"
```

---

## Chunk 3: Verification

### Task 3: Manual checks

**Files:**
- None

- [ ] **Step 1: Run server**

Run: `python manage.py runserver`
Expected: Server starts at `http://localhost:8000` without errors.

- [ ] **Step 2: Verify label updates**

Check: Move the slider thumb.
Expected: The label updates to the formatted price (e.g., "Br. 250,000").

- [ ] **Step 3: Verify form submit and filtering**

Check: Submit the hero search form.
Expected: URL includes `max_price=<value>` and listing results respect the selected max price.

- [ ] **Step 4: Verify default "no limit" behavior**

Check: Leave slider at 1,000,000 and submit.
Expected: Results are not unintentionally constrained.

- [ ] **Step 5: Mobile layout check**

Check: Slider and label align without overflow on small screens.
Expected: Slider stays usable and label remains readable.

- [ ] **Step 6: Commit (only if verification-driven tweaks were made)**

```bash
git add template/index.html static/assets/css/luxury.css
git commit -m "chore: verify max price slider"
```
