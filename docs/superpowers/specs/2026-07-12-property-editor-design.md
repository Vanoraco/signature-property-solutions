# Property Add/Edit Workflow Design

**Date:** 2026-07-12
**Status:** Ready for implementation review

## Context

The admin properties page already lists and deletes properties, but its Add Property and Edit Property actions open a placeholder modal. The Django REST API already exposes writable property, category, facility, and agent endpoints, including multipart image fields. This feature completes the existing frontend workflow without changing the database schema.

## Goals

- Create and edit properties from the existing properties page.
- Match the reference admin's four-part form structure: Basic Info, Location & Pricing, Amenities, and Media.
- Validate input before submission with React Hook Form and Zod.
- Load category, agent, and facility choices from the API.
- Upload the main image and six optional gallery images with multipart requests.
- Preserve existing images during edit unless the user selects replacements.
- Show field-level API validation errors and a clear form-level failure message.
- Refresh the properties table and show success feedback after a save.
- Keep the workflow usable on desktop and mobile.

## Non-Goals

- Adding `availability`, commission, or price-history fields. They appear in the HTML prototype but do not exist in the current Django model or serializer.
- Building the Media Library or selecting assets from it.
- Removing an already-saved image without replacing it. The current API supports image replacement but has no explicit persisted-image removal contract.
- Changing property deletion, bulk import, or the public property detail page.
- Changing the Django property schema or generating a migration.

## User Flow

### Create

1. The administrator selects Add Property.
2. A large modal opens on Basic Info with clean defaults.
3. Category, agent, and facility choices load concurrently.
4. The slug follows the title until the administrator edits the slug manually.
5. The administrator completes the four tabs and selects optional media files.
6. Save validates every tab. If validation fails, the form opens the first tab containing an error and focuses the first invalid field.
7. A valid form submits `multipart/form-data` to `POST /api/properties/`.
8. On success, the modal closes, the properties query refreshes, and the page shows a success message.

### Edit

1. The administrator selects a row or its Edit action.
2. The same modal opens with values from the selected property. Its existing slug stays unchanged unless the administrator edits it.
3. Existing image URLs appear as previews. Selecting a file replaces that image in the outgoing request.
4. Save submits changed form values to `PATCH /api/properties/{id}/` as multipart data.
5. Omitted image fields remain unchanged on the server.
6. On success, the modal closes, the list refreshes, and the page shows a success message.

## Form Structure

### Basic Info

| Field | API key | Control | Validation |
| --- | --- | --- | --- |
| Property title | `property_title` | Text input | Required, 2-600 characters |
| Property ID | `property_id` | Text input | Optional, at most 20 characters |
| Status | `property_status` | Select | Required: For Sale or For Rent |
| Category | `property_types` | Select | Required category ID |
| Agent | `agent` | Select | Optional agent ID |
| Slug | `slug` | Text input | Required lowercase URL slug |
| Short description | `property_short_discription` | Textarea | Optional |

### Location & Pricing

| Field | API key | Control | Validation |
| --- | --- | --- | --- |
| Price | `price` | Text input | Required, at most 100 characters; include ETB or USD when numeric filtering is expected |
| Location | `property_location` | Text input | Required, at most 100 characters |
| Size | `property_size` | Number input | Non-negative integer, defaults to 0 |
| Land area | `property_area` | Number input | Non-negative integer, defaults to 0 |
| Floor | `property_floor` | Number input | Non-negative integer, defaults to 0 |
| Bedrooms | `bedrooms` | Text input | Optional, at most 100 characters |
| Bathrooms | `bathrooms` | Text input | Optional, at most 100 characters |
| Furnished | `furnished` | Select | Optional: Furnished, Unfurnished, or Semi-furnished |

### Amenities

Facilities use a searchable multi-select checklist backed by `GET /api/facilities/?page_size=100`. At least one facility is required because the current serializer treats the many-to-many field as required. Selected values submit as repeated `facilitie` form-data entries.

### Media

| Field | API key | Behavior |
| --- | --- | --- |
| Main image | `main_image` | Optional image file with preview; replaces the saved image during edit |
| Gallery slots 1-6 | `slide_1` through `slide_6` | Optional image files with individual previews |
| Video URL | `video_link` | Optional valid HTTP or HTTPS URL |

Each selected image must have an `image/*` MIME type and be no larger than 10 MB. New previews use object URLs that are revoked when replaced or when the form unmounts.

## Interaction Design

- The modal uses a maximum width of 960px and a scrollable body so its header, tabs, and save controls remain stable.
- Tabs are an accessible `tablist`; each tab exposes an error marker when one of its fields is invalid.
- Desktop uses a two-column field grid. The grid becomes one column on narrow screens.
- Required fields show a visible required marker and inline validation message.
- Facility options render as compact checkboxes suited to repeated selection.
- Media slots use image thumbnails, an upload/replace command, file name, and size metadata.
- Save is disabled while a request is pending and changes its label to Saving.
- Cancel closes the form. No browser-level unsaved-changes prompt is added in this slice.
- API failures keep the modal open. Field errors appear beside their controls; non-field and network failures appear in a form alert.

## Component Boundaries

### `admin-frontend/src/app/(admin)/properties/page.tsx`

Owns list queries, modal selection state, lookup queries, create/update mutations, table invalidation, and page-level success feedback. It passes data and callbacks into the form rather than embedding form details in the page.

### `admin-frontend/src/components/properties/PropertyForm.tsx`

Owns React Hook Form state, tabs, slug-following behavior, field rendering, client validation feedback, and submission. It receives initial property data, lookup options, pending state, API errors, and submit/cancel callbacks.

### `admin-frontend/src/components/properties/PropertyMediaFields.tsx`

Owns the main-image and gallery slot controls, local file previews, replacement behavior, and object URL cleanup.

### `admin-frontend/src/components/properties/property-form.ts`

Contains the Zod schema, form value types, default-value mapping, slug conversion, multipart payload construction, paginated-result normalization, and Django REST error normalization. These pure functions are unit tested independently of React.

### `admin-frontend/src/components/properties/PropertyForm.module.css`

Contains form-specific tab, grid, field, facility, media, error, and responsive styling. Existing application tokens remain the source of colors, borders, spacing, and typography.

### `admin-frontend/src/components/ui/Modal.tsx`

Adds an `xl` size option for the property editor while preserving the existing default and large modal behavior.

## Data Contracts

The properties list type will include every field returned by `PropertyListSerializer`, including relation IDs, facility IDs, dimensions, description, media URLs, and video URL. Lookup endpoints may return either a DRF paginated object or a plain array; a shared normalizer produces an array in either case.

The multipart payload always includes supported scalar fields and each selected facility ID. Empty optional agent and video values are sent as empty strings so an edit can clear a previous value. Image keys are appended only when their value is a newly selected file, which prevents edit requests from overwriting saved images with URL strings.

The existing Next.js API proxy forwards request headers and bytes unchanged, so the browser-generated multipart boundary reaches Django. The Axios call must allow the browser adapter to set that boundary rather than assigning a manual multipart content type.

## Error Handling

- Zod errors appear inline and prevent a request.
- A failed lookup query shows a retryable message inside the form instead of empty required selectors.
- Django object-shaped errors map by field name into React Hook Form.
- `non_field_errors`, `detail`, and unknown response shapes map to the form alert.
- Network failures use a concise connection message.
- A failed save leaves entered values and selected files intact.
- A successful save clears editing state and feedback is announced with `role="status"`.

## Testing

### Automated

- Unit-test slug generation, create/edit default mapping, multipart construction, image omission rules, paginated lookup normalization, and API error normalization.
- Unit-test schema acceptance for a valid property and rejection for missing required fields, invalid slugs, negative dimensions, missing facilities, invalid URLs, and oversized or non-image files.
- Run ESLint, TypeScript, unit tests, `git diff --check`, and a production Next.js build.

### Browser QA

- Open Add Property and verify all four tabs, lookup loading, slug following, and responsive layout.
- Submit an empty form and verify first-error tab navigation and inline messages.
- Create a property with facilities and image files; verify the modal closes and the row appears.
- Edit that property without choosing replacement images; verify saved images remain.
- Replace one image, save, reopen, and verify the replacement.
- Force a server validation error and verify the mapped field/form alert.
- Collapse and reopen the sidebar to ensure the modal and page remain usable.
- Check desktop and mobile viewports, framework overlays, and console warnings/errors.

## Acceptance Criteria

- Add Property creates a valid Django property record through the admin UI.
- Edit Property updates scalar fields, relations, facilities, and selected replacement images.
- Existing images survive edit requests when no replacement file is selected.
- Client and server validation errors are actionable and do not discard form state.
- Success refreshes the table without a full page reload.
- The property editor follows the reference tab structure and the existing admin visual system.
- Lint, TypeScript, unit tests, production build, and browser QA pass.
