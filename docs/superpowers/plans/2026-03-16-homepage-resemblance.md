# Homepage Live Ethio Resemblance Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle and lightly restructure the homepage to resemble livingethio.com while keeping existing data-driven content intact.

**Architecture:** Use the existing Django template `template/index.html` to adjust layout structure and add minimal class wrappers. Update `static/assets/css/luxury.css` to shift to a lighter marketplace aesthetic with card-based layout, refined typography, and improved spacing. No backend/model changes.

**Tech Stack:** Django templates, Bootstrap 5 grid utilities, custom CSS in `static/assets/css/luxury.css`.

---

## File Structure
- Modify: `template/index.html` (homepage layout wrappers, button styles, section structure)
- Modify: `static/assets/css/luxury.css` (variables, hero, sections, cards, responsive)

---

## Chunk 1: Homepage Template Restructure

### Task 1: Adjust hero markup to marketplace layout

**Files:**
- Modify: `template/index.html`

- [ ] **Step 1: Update hero section structure**

```html
<section class="market-hero">
  {% if hom.video %}
  <video autoplay loop muted playsinline>
    <source src="{{ hom.video.url }}" type="video/mp4">
  </video>
  {% else %}
  <div class="market-hero-fallback" aria-hidden="true"></div>
  {% endif %}
  <div class="market-hero-overlay"></div>
  <div class="container">
    <div class="market-hero-content">
      <span class="market-strap">Trusted Property Marketplace</span>
      <h1>{{ hom.slogon }}</h1>
      <p>{{ hom.title }}</p>
      <div class="market-hero-actions">
        <a href="{% url 'properteas' %}" class="btn-market">Explore Properties</a>
        <a href="{% url 'properteas' %}" class="btn-market-ghost">Browse Listings</a>
      </div>
    </div>
  </div>
</section>
```

- [ ] **Step 2: Remove old hero wrapper classes**

Delete references to `.lux-hero` and `.lux-hero-content` in the hero markup and replace with the new `market-*` class names shown above.

- [ ] **Step 3: Commit**

```bash
git add template/index.html
git commit -m "refactor: restructure homepage hero layout"
```

### Task 2: Update categories and featured sections wrappers

**Files:**
- Modify: `template/index.html`

- [ ] **Step 1: Add section wrappers and titles aligned to new layout**

```html
<section class="market-section market-section-light">
  <div class="container">
    <div class="market-section-title">
      <h2>What Are You Looking For?</h2>
      <p>Browse curated categories of properties across Addis Ababa.</p>
    </div>
    <div class="row g-4">
      <!-- category cards unchanged inside -->
    </div>
  </div>
</section>
```

- [ ] **Step 2: Update category card wrapper class**

Replace `.lux-cat-card` with `.market-cat-card` in the category loop:

```html
<div class="market-cat-card">
  <img src="{{ catagory.icon.url }}" alt="{{ catagory.catagorys }}">
  <span class="market-cat-meta">Discover</span>
  <h5>{{ catagory.catagorys }}</h5>
</div>
```

- [ ] **Step 3: Update featured section wrapper classes**

```html
<section class="market-section market-section-muted">
  <div class="container">
    <div class="market-section-title">
      <h2>Featured Listings: Verified & Vetted</h2>
      <p>Discover our handpicked selection of premium properties.</p>
    </div>
    <div class="row g-4">
      <!-- property cards unchanged inside -->
    </div>
  </div>
</section>
```

- [ ] **Step 4: Commit**

```bash
git add template/index.html
git commit -m "refactor: align homepage section wrappers"
```

### Task 3: Update contact strip wrapper

**Files:**
- Modify: `template/index.html`

- [ ] **Step 1: Adjust contact strip headings and wrappers**

```html
<section class="market-section market-section-light">
  <div class="container">
    <div class="row align-items-center g-4">
      <div class="col-lg-7">
        <div class="market-map">
          {% if contactss.google_map %}
          <iframe src="{{ contactss.google_map }}" allowfullscreen></iframe>
          {% else %}
          <div class="market-map-placeholder">Map coming soon</div>
          {% endif %}
        </div>
      </div>
      <div class="col-lg-5">
        <span class="market-strap">Available 24/7</span>
        <h2>We help you move fast.</h2>
        <p class="market-muted">Our support team is always ready to assist.</p>
        <!-- contact cards unchanged inside -->
      </div>
    </div>
  </div>
</section>
```

- [ ] **Step 2: Replace `.lux-contact-card` with `.market-contact-card`**

```html
<div class="market-contact-card">
  <i class="fas fa-phone"></i>
  <h5>Call</h5>
  <p>{{ contactss.phone_number }}</p>
</div>
```

- [ ] **Step 3: Commit**

```bash
git add template/index.html
git commit -m "refactor: update contact strip layout"
```

---

## Chunk 2: CSS Refresh to Light Marketplace Aesthetic

### Task 4: Update design tokens and global styles

**Files:**
- Modify: `static/assets/css/luxury.css`

- [ ] **Step 1: Update root variables for light palette**

```css
:root {
  --dark: #141414;
  --dark-2: #1d1d1d;
  --dark-3: #2a2a2a;
  --dark-4: #3a3a3a;
  --gold: #b88a2f;
  --gold-light: #d9b15a;
  --gold-dark: #8f6b20;
  --white: #ffffff;
  --gray: #6b6b6b;
  --light-gray: #f4f2ee;
  --surface: #ffffff;
  --surface-muted: #f8f7f4;
  --border: rgba(20,20,20,0.08);
}
```

- [ ] **Step 2: Update body background and text colors**

```css
body {
  font-family: 'Inter', sans-serif;
  background: var(--light-gray);
  color: #1f1f1f;
  overflow-x: hidden;
}
h1, h2, h3, h4, h5 {
  font-family: 'Playfair Display', serif;
}
```

- [ ] **Step 3: Commit**

```bash
git add static/assets/css/luxury.css
git commit -m "style: shift to light marketplace palette"
```

### Task 5: Add new marketplace hero styles

**Files:**
- Modify: `static/assets/css/luxury.css`

- [ ] **Step 1: Add hero layout styles**

```css
.market-hero {
  position: relative;
  min-height: 70vh;
  display: flex;
  align-items: center;
  overflow: hidden;
  background: linear-gradient(120deg, #f5f1e8, #ffffff);
}
.market-hero video {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.market-hero-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(120deg, rgba(255,255,255,0.9), rgba(255,255,255,0.55));
}
.market-hero-fallback {
  position: absolute;
  inset: 0;
  background: linear-gradient(120deg, #efe6d4, #ffffff);
}
.market-hero-content {
  position: relative;
  max-width: 640px;
  padding: 6rem 0;
}
.market-strap {
  display: inline-block;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 2px;
  color: var(--gold-dark);
  margin-bottom: 0.8rem;
}
.market-hero-content h1 {
  font-size: clamp(2.4rem, 4vw, 4rem);
  color: #1a1a1a;
  margin-bottom: 1rem;
}
.market-hero-content p {
  font-size: 1.05rem;
  color: var(--gray);
  margin-bottom: 2rem;
}
.market-hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}
.btn-market {
  background: var(--gold);
  color: #1a1a1a;
  padding: 0.85rem 2.2rem;
  border-radius: 6px;
  font-weight: 600;
  letter-spacing: 1px;
  text-transform: uppercase;
  font-size: 0.8rem;
  transition: all 0.3s;
}
.btn-market:hover {
  background: var(--gold-light);
  color: #1a1a1a;
  transform: translateY(-2px);
}
.btn-market-ghost {
  border: 1px solid var(--gold);
  color: var(--gold-dark);
  padding: 0.85rem 2.2rem;
  border-radius: 6px;
  font-weight: 600;
  letter-spacing: 1px;
  text-transform: uppercase;
  font-size: 0.8rem;
  transition: all 0.3s;
}
.btn-market-ghost:hover {
  background: var(--gold);
  color: #1a1a1a;
}
```

- [ ] **Step 2: Commit**

```bash
git add static/assets/css/luxury.css
git commit -m "style: add marketplace hero and buttons"
```

### Task 6: Update category and property card styles

**Files:**
- Modify: `static/assets/css/luxury.css`

- [ ] **Step 1: Add section and title styles**

```css
.market-section { padding: 4.5rem 0; }
.market-section-light { background: var(--surface); }
.market-section-muted { background: var(--surface-muted); }
.market-section-title {
  text-align: center;
  max-width: 720px;
  margin: 0 auto 3rem;
}
.market-section-title h2 { font-size: 2.3rem; color: #1a1a1a; }
.market-section-title p { color: var(--gray); }
```

- [ ] **Step 2: Add category card styles**

```css
.market-cat-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 2rem 1.5rem;
  text-align: center;
  height: 100%;
  box-shadow: 0 12px 30px rgba(20,20,20,0.05);
  transition: transform 0.3s, box-shadow 0.3s, border-color 0.3s;
}
.market-cat-card:hover {
  transform: translateY(-4px);
  border-color: rgba(184,138,47,0.3);
  box-shadow: 0 18px 38px rgba(20,20,20,0.08);
}
.market-cat-card img { height: 52px; margin-bottom: 1rem; }
.market-cat-meta {
  display: inline-block;
  font-size: 0.7rem;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: var(--gold-dark);
  margin-bottom: 0.4rem;
}
.market-cat-card h5 { font-size: 1rem; color: #1f1f1f; margin: 0; }
```

- [ ] **Step 3: Add property card adjustments**

```css
.lux-prop-card {
  background: var(--surface);
  border: 1px solid var(--border);
  box-shadow: 0 16px 40px rgba(20,20,20,0.06);
}
.lux-prop-card .card-body h5 a { color: #1a1a1a; }
.lux-prop-card .prop-location { color: var(--gray); }
.lux-prop-card .prop-meta { color: var(--gray); }
.lux-prop-card .prop-footer { background: var(--surface-muted); }
.lux-prop-card .prop-price { color: var(--gold-dark); }
.lux-prop-card .card-img .badge-status {
  border-radius: 999px;
  padding: 0.35rem 0.9rem;
  background: rgba(184,138,47,0.9);
}
```

- [ ] **Step 4: Commit**

```bash
git add static/assets/css/luxury.css
git commit -m "style: refresh cards and sections"
```

### Task 7: Update contact strip and map styles

**Files:**
- Modify: `static/assets/css/luxury.css`

- [ ] **Step 1: Add contact card and map styles**

```css
.market-contact-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 1rem 1.2rem;
  text-align: center;
  box-shadow: 0 10px 24px rgba(20,20,20,0.05);
}
.market-contact-card i { color: var(--gold); }
.market-contact-card p { color: var(--gray); }
.market-map iframe {
  width: 100%;
  height: 320px;
  border: none;
  border-radius: 16px;
  filter: grayscale(0.4) brightness(0.95);
}
.market-map-placeholder {
  height: 320px;
  border-radius: 16px;
  background: var(--surface-muted);
  border: 1px dashed var(--border);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--gray);
  font-size: 0.95rem;
}
.market-muted { color: var(--gray); }
```

- [ ] **Step 2: Commit**

```bash
git add static/assets/css/luxury.css
git commit -m "style: update contact strip components"
```

### Task 8: Responsive refinements and cleanup

**Files:**
- Modify: `static/assets/css/luxury.css`

- [ ] **Step 1: Add responsive adjustments**

```css
@media (max-width: 768px) {
  .market-hero-content { padding: 4rem 0; }
  .market-hero-actions { flex-direction: column; align-items: flex-start; }
  .market-section { padding: 3rem 0; }
  .market-section-title h2 { font-size: 1.9rem; }
}
```

- [ ] **Step 2: Commit**

```bash
git add static/assets/css/luxury.css
git commit -m "style: refine marketplace responsive behavior"
```

---

## Chunk 3: Verification

### Task 9: Manual visual checks

**Files:**
- None

- [ ] **Step 1: Run dev server**

Run: `python manage.py runserver`
Expected: Server starts at `http://localhost:8000` with no errors.

- [ ] **Step 2: Verify homepage layout**

Check: Hero readability, category tiles layout, featured cards spacing, contact strip appearance.
Expected: Hero text remains readable, tiles align evenly, cards have consistent spacing, and contact strip aligns without overlap.

- [ ] **Step 3: Check for missing assets**

Check: Browser console/network shows no missing CSS, images, or video assets on homepage load.
Expected: No 404s or failed asset requests on the homepage.

- [ ] **Step 4: Validate fallbacks**

Check: Temporarily remove `hom.video` and `contactss.google_map` content in admin (or simulate null) and confirm hero renders with fallback background and map placeholder appears.
Expected: Hero shows gradient fallback; map is hidden or shows the placeholder block without layout collapse.

- [ ] **Step 5: Restore admin content**

Check: Restore `hom.video` and `contactss.google_map` values after validation so the homepage data is intact.
Expected: Hero video and map iframe return to their normal state.

- [ ] **Step 6: Accessibility and contrast check**

Check: Keyboard focus is visible for hero buttons and cards; text contrast remains readable on light backgrounds at desktop and mobile sizes.
Expected: Focus ring/outline is visible, and text remains legible on light surfaces.

- [ ] **Step 7: Mobile check**

Check: Layout stacks correctly at <= 768px, buttons remain readable and accessible.
Expected: Sections stack in a single column, CTAs remain tappable, and text does not overflow.

- [ ] **Step 8: Commit (only if verification-driven tweaks were made)**

```bash
git add template/index.html static/assets/css/luxury.css
git commit -m "chore: verify homepage marketplace styling"
```
