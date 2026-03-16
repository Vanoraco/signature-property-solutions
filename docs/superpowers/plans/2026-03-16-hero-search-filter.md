# Hero Search Filter Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Live‑Ethio‑style hero search filter that submits query parameters to the existing `properteas` listings page and filters results.

**Architecture:** Add a GET form in `template/index.html` that submits `filter`, `category`, `bedrooms`, and `max_price` parameters to the `properteas` view. Extend `signatureapp/views.py` to apply these filters safely (ignore invalid values). Style the new block in `static/assets/css/luxury.css` to match the hero layout.

**Tech Stack:** Django templates, Django view filtering, Bootstrap 5 grid, custom CSS.

---

## File Structure
- Modify: `template/index.html` (hero search form markup)
- Modify: `static/assets/css/luxury.css` (hero search block styles)
- Modify: `signatureapp/views.py` (apply query parameter filters)

---

## Chunk 1: Backend Filtering Logic

### Task 1: Add query parameter filters to `properteas`

**Files:**
- Modify: `signatureapp/views.py`

- [ ] **Step 1: Add bedrooms and max_price query param handling**

```python
    selected_bedrooms = request.GET.get('bedrooms')
    if selected_bedrooms and selected_bedrooms.isdigit():
        if 1 <= int(selected_bedrooms) <= 10:
            property_list = property_list.filter(bedrooms=selected_bedrooms)

    max_price = request.GET.get('max_price')
    if max_price and max_price.isdigit():
        property_list = property_list.filter(price__lte=max_price)
```

- [ ] **Step 2: Update category filtering to use slug with existence check**

```python
    selected_category = request.GET.get('category')
    if selected_category and catagory.objects.filter(slug=selected_category).exists():
        property_list = property_list.filter(property_types__slug=selected_category)
```

- [ ] **Step 3: Include new selected params in context**

```python
    return render(request, 'properteas.html', {
        'properties': properties,
        'categories': categories,
        'selected_category': selected_category,
        'selected_filter': selected_filter,
        'selected_bedrooms': selected_bedrooms,
        'selected_max_price': max_price,
        'contactss': contactss,
    })
```

- [ ] **Step 4: Commit**

```bash
git add signatureapp/views.py
git commit -m "feat: add query filters for hero search"
```

---

## Chunk 2: Hero Search Form Markup

### Task 2: Add hero search form in homepage

**Files:**
- Modify: `template/index.html`

- [ ] **Step 1: Insert hero search form below hero headline**

```html
<form action="{% url 'properteas' %}" method="get" class="market-search">
  <input type="hidden" name="filter" id="search-filter" value="">
  <div class="market-search-tabs">
    <button type="button" data-filter="" class="market-tab is-active">All Status</button>
    <button type="button" data-filter="Rent" class="market-tab">For Rent</button>
    <button type="button" data-filter="Sale" class="market-tab">For Sale</button>
  </div>
  <div class="market-search-card">
    <div class="market-search-grid">
      <div class="market-field">
        <label for="search-category">Property Type</label>
        <select id="search-category" name="category">
          <option value="">Select</option>
          {% for catagory in catagorys %}
          {% if catagory.slug %}
          <option value="{{ catagory.slug }}">{{ catagory.catagorys }}</option>
          {% endif %}
          {% endfor %}
        </select>
      </div>
      <div class="market-field">
        <label for="search-bedrooms">Bedrooms</label>
        <select id="search-bedrooms" name="bedrooms">
          <option value="">Select</option>
          <option value="1">1</option>
          <option value="2">2</option>
          <option value="3">3</option>
          <option value="4">4</option>
          <option value="5">5</option>
          <option value="6">6</option>
          <option value="7">7</option>
          <option value="8">8</option>
          <option value="9">9</option>
          <option value="10">10</option>
        </select>
      </div>
      <div class="market-field">
        <label for="search-price">Max. Price</label>
        <select id="search-price" name="max_price">
          <option value="">Select</option>
          <option value="10000">Br. 10,000</option>
          <option value="20000">Br. 20,000</option>
          <option value="30000">Br. 30,000</option>
          <option value="40000">Br. 40,000</option>
          <option value="50000">Br. 50,000</option>
          <option value="100000">Br. 100,000</option>
          <option value="200000">Br. 200,000</option>
          <option value="300000">Br. 300,000</option>
          <option value="500000">Br. 500,000</option>
          <option value="1000000">Br. 1,000,000</option>
        </select>
      </div>
      <div class="market-field market-field-submit">
        <button type="submit" class="btn-market">Search</button>
      </div>
    </div>
  </div>
</form>

<script>
  (function () {
    const tabs = document.querySelectorAll('.market-tab');
    const input = document.getElementById('search-filter');
    if (!tabs.length || !input) return;
    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        tabs.forEach((t) => t.classList.remove('is-active'));
        tab.classList.add('is-active');
        input.value = tab.getAttribute('data-filter') || '';
      });
    });
  })();
</script>
```

- [ ] **Step 2: Commit**

```bash
git add template/index.html
git commit -m "feat: add hero search form"
```

---

## Chunk 3: Styling for Hero Search Block

### Task 3: Add hero search styles

**Files:**
- Modify: `static/assets/css/luxury.css`

- [ ] **Step 1: Add search container styles**

```css
.market-search {
  margin-top: -2.5rem;
  position: relative;
  z-index: 4;
}
.market-search-tabs {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 10px 10px 0 0;
  overflow: hidden;
  max-width: 560px;
  margin: 0 auto;
}
.market-tab {
  background: transparent;
  padding: 0.8rem 1rem;
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--gray);
  border-right: 1px solid var(--border);
}
.market-tab.is-active {
  background: var(--gold);
  color: #1a1a1a;
}
.market-tab:last-child { border-right: none; }
.market-search-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 0 0 14px 14px;
  box-shadow: 0 18px 45px rgba(20,20,20,0.08);
  padding: 1.5rem;
  max-width: 980px;
  margin: 0 auto;
}
.market-search-grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  align-items: end;
}
.market-field label {
  display: block;
  font-size: 0.85rem;
  color: #1f1f1f;
  margin-bottom: 0.6rem;
}
.market-field select {
  width: 100%;
  padding: 0.75rem 0.9rem;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface-muted);
  color: #1f1f1f;
}
.market-field-submit { display: flex; }
.market-field-submit .btn-market {
  width: 100%;
  justify-content: center;
}
```

- [ ] **Step 2: Add responsive behavior**

```css
@media (max-width: 992px) {
  .market-search-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (max-width: 768px) {
  .market-search { margin-top: -1.5rem; }
  .market-search-grid { grid-template-columns: 1fr; }
}
```

- [ ] **Step 3: Commit**

```bash
git add static/assets/css/luxury.css
git commit -m "style: add hero search filter block"
```

---

## Chunk 4: Verification

### Task 4: Manual verification

**Files:**
- None

- [ ] **Step 1: Run server**

Run: `python manage.py runserver`
Expected: Server starts at `http://localhost:8000` without errors.

- [ ] **Step 2: Verify hero search submit**

Check: Select category/bedrooms/max price and submit.
Expected: Browser navigates to `/properteas` with query parameters applied.

- [ ] **Step 3: Verify filters apply**

Check: Listing results reflect the selected status/category/bedrooms/max price filters.
Expected: Only matching properties show; removing filters shows all.

- [ ] **Step 4: Verify invalid inputs are ignored**

Check: Manually edit URL to include invalid `category` slug or non-numeric `max_price`.
Expected: Listings render without errors and fall back to unfiltered results for invalid values.

- [ ] **Step 5: Mobile layout check**

Check: Hero search form stacks in a single column on narrow screens.
Expected: Inputs and button are fully visible without overflow.

- [ ] **Step 6: Commit (only if verification-driven tweaks were made)**

```bash
git add template/index.html static/assets/css/luxury.css signatureapp/views.py
git commit -m "chore: verify hero search filtering"
```
