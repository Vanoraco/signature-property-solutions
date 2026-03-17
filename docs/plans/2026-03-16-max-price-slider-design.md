# Max Price Slider Design (Hero Search)

Date: 2026-03-16
Owner: OpenCode

## Context
Homepage hero search form lives in `template/index.html` and submits query parameters to `properteas`. The current Max Price control is a select. The goal is to replace it with a single range slider while keeping query parameters unchanged.

## Goals
- Replace the Max Price select with a slider in the hero search form.
- Keep `max_price` query parameter behavior intact.
- Show a live formatted value label (e.g., "Br. 250,000").

## Non-goals
- Add a min/max dual slider.
- Change backend filtering logic.
- Add new routes or APIs.

## Approach
- Use a native `<input type="range">` with min 10,000, max 1,000,000, step 10,000.
- Default value 1,000,000 to approximate “no limit” unless user changes it.
- Add a small inline script to update a visible label; the range input itself submits `max_price` for no-JS compatibility.

## Layout
- Replace the Max Price select with a slider + label row.
- Keep the control within the existing hero search grid.

## Data Flow
- The range input is named `max_price` and submits directly.
- The label reflects the current slider value.
- If `max_price` is present in the request, the slider initializes to that value; otherwise it defaults to 1,000,000.

## Error Handling
- If JS is disabled, slider still submits its value directly as `max_price`.
- Backend ignores non-numeric values (existing behavior).

## Testing
- Move the slider and confirm the label updates.
- Submit the form and verify `max_price` in the URL.
- Verify filtering applies in `properteas`.

## Files to Change
- `template/index.html`
- `static/assets/css/luxury.css`
