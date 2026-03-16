# Homepage Resemblance Design (Live Ethio-Inspired)

Date: 2026-03-16
Owner: OpenCode

## Context
The site is a Django app using `template/index.html` for the homepage and `static/assets/css/luxury.css` for styling. The goal is to make the full homepage resemble the visual language and layout cadence of livingethio.com while keeping existing data-driven content and sections intact.

## Goals
- Restyle and lightly restructure the homepage to feel like a clean real estate marketplace similar to Live Ethio.
- Keep existing data sources (hero fields, categories, featured properties, contact strip) unchanged.
- Maintain existing routes and template context variables.

## Non-goals
- Add new backend data models or admin fields.
- Implement new search filters or advanced interactive components.
- Redesign other pages (about, services, property detail, etc.).

## Approaches Considered
1) CSS-only facelift: fastest, but limited by current markup fidelity.
2) Light HTML restructure (recommended): small markup changes + CSS to align layout and hierarchy with Live Ethio.
3) Section rebuild: closest visual match, but higher effort and risk.

Recommendation: Approach 2 to balance fidelity and safety.

## Design

### Architecture
- Continue using Django templates for structure and the existing `luxury.css` for styles.
- Update `template/index.html` to introduce minimal wrappers/classes for layout alignment.
- Update `static/assets/css/luxury.css` to shift to a lighter marketplace aesthetic.

### Layout Structure
- Hero becomes a clean headline-focused section with a primary CTA and secondary action.
- Categories become a dense tile grid with larger cards and clear labels.
- Featured properties become lighter, more spacious cards with sharper hierarchy for price and metadata.
- Contact strip becomes a compact trust/help band with soft cards and a smaller map.

### Visual Language
- Palette: off-white/light gray backgrounds, charcoal text, muted gold accents for continuity.
- Typography: keep Playfair Display for headings; Inter for body; increase label tracking.
- Cards: soft shadows, subtle borders, rounded corners, more whitespace.
- Section backgrounds: light panels and gentle gradients instead of dark blocks.

### Components
- Hero: strapline, headline, subhead, primary CTA, secondary ghost button; video treated as subtle backdrop or side visual depending on readability.
- Category tiles: 3-4 column grid, larger icon, micro-label like "Discover".
- Property cards: badge pills, title/location, beds/baths, price in footer with compact actions.
- Contact cards: lighter styling with minimal icons and smaller text.

### Data Flow
- Existing template context is reused: `hom`, `catagorys`, `propertyss`, `contactss`.
- No new queries or model changes required.

### Error Handling
- If `hom.video` is missing, degrade to a solid/gradient hero background.
- If `contactss.google_map` is missing, hide the iframe container or show a neutral placeholder.

### Accessibility
- Maintain sufficient contrast for text on light backgrounds.
- Preserve focus states and readable font sizes on mobile.

### Testing
- Manual visual check at desktop and mobile widths (<= 768px).
- Verify homepage loads without missing asset errors.

## Files to Change
- `template/index.html`
- `static/assets/css/luxury.css`
