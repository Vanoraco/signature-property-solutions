# Property Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Properties page placeholder modal with a validated, reference-aligned Add/Edit workflow that saves scalar fields, relationships, facilities, and image replacements through the existing Django REST API.

**Architecture:** Keep React Query and API mutation ownership in the route page, put form state and tab behavior in a dedicated `PropertyForm`, and isolate media preview lifecycle in `PropertyMediaFields`. Pure schema, default mapping, multipart construction, and error normalization live in `property-form.ts` so they can be unit tested without rendering React.

**Tech Stack:** Next.js 14, React 19, TypeScript, TanStack Query, Axios, React Hook Form, Zod, CSS Modules, Vitest, Testing Library, Django REST Framework.

---

## File Map

- Create `admin-frontend/vitest.config.ts`: test environment and `@` alias.
- Create `admin-frontend/src/test/setup.ts`: Testing Library matchers and browser API shims.
- Create `admin-frontend/src/test/smoke.test.ts`: verifies the frontend unit-test harness.
- Create `admin-frontend/src/components/properties/types.ts`: API record and lookup types.
- Create `admin-frontend/src/components/properties/property-form.ts`: schema, defaults, payload, lookup, and API-error helpers.
- Create `admin-frontend/src/components/properties/property-form.test.ts`: pure contract tests.
- Create `admin-frontend/src/components/properties/PropertyMediaFields.tsx`: image slots and object URL lifecycle.
- Create `admin-frontend/src/components/properties/PropertyMediaFields.test.tsx`: media interaction tests.
- Create `admin-frontend/src/components/properties/PropertyForm.tsx`: accessible four-tab form.
- Create `admin-frontend/src/components/properties/PropertyForm.test.tsx`: form behavior tests.
- Create `admin-frontend/src/components/properties/PropertyForm.module.css`: scoped form and media styling.
- Modify `admin-frontend/src/components/ui/Modal.tsx`: add the `xl` property-editor width.
- Modify `admin-frontend/src/lib/api.ts`: remove the JSON content type for browser `FormData` requests.
- Modify `admin-frontend/src/app/(admin)/properties/page.tsx`: queries, mutations, feedback, and modal integration.
- Modify `admin-frontend/package.json` and `admin-frontend/package-lock.json`: test script and test dependencies.
- Modify `signatureapp/tests.py`: isolated multipart create/update characterization tests.

### Task 1: Frontend Test Harness

**Files:**
- Modify: `admin-frontend/package.json`
- Modify: `admin-frontend/package-lock.json`
- Create: `admin-frontend/vitest.config.ts`
- Create: `admin-frontend/src/test/setup.ts`
- Create: `admin-frontend/src/test/smoke.test.ts`

- [ ] **Step 1: Install the test dependencies and add the test script**

Run from `admin-frontend`:

```powershell
npm install --save-dev vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
npm pkg set scripts.test='vitest run'
```

Expected: `package.json` contains `"test": "vitest run"`, and the lockfile records the five dev dependencies.

- [ ] **Step 2: Create the Vitest configuration**

Create `admin-frontend/vitest.config.ts`:

```ts
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: true,
  },
})
```

- [ ] **Step 3: Create the shared test setup and a smoke test**

Create `admin-frontend/src/test/setup.ts`:

```ts
import '@testing-library/jest-dom/vitest'
```

Create `admin-frontend/src/test/smoke.test.ts`:

```ts
import { describe, expect, it } from 'vitest'

describe('frontend test harness', () => {
  it('provides a browser-like document', () => {
    const element = document.createElement('div')
    element.textContent = 'Signature admin'
    expect(element).toHaveTextContent('Signature admin')
  })
})
```

- [ ] **Step 4: Run the smoke test**

Run: `npm test`

Expected: one test file and one test pass.

- [ ] **Step 5: Commit the test harness**

```powershell
git add admin-frontend/package.json admin-frontend/package-lock.json admin-frontend/vitest.config.ts admin-frontend/src/test
git commit -m 'test(admin): add frontend unit test harness'
```

### Task 2: Property Form Contracts and Multipart Helpers

**Files:**
- Create: `admin-frontend/src/components/properties/types.ts`
- Create: `admin-frontend/src/components/properties/property-form.ts`
- Create: `admin-frontend/src/components/properties/property-form.test.ts`

- [ ] **Step 1: Write failing contract tests**

Create `admin-frontend/src/components/properties/property-form.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import {
  emptyPropertyFormValues,
  MAX_PROPERTY_IMAGE_SIZE,
  normalizeApiErrors,
  normalizeResults,
  propertyFormSchema,
  propertyToFormValues,
  slugifyPropertyTitle,
  toPropertyFormData,
} from './property-form'
import type { PropertyRecord } from './types'

const property: PropertyRecord = {
  id: 7,
  property_id: 'SPS-007',
  property_title: 'Bole Garden Apartment',
  slug: 'bole-garden-apartment',
  price: '8,500,000 ETB',
  price_amount: 8500000,
  price_currency: 'ETB',
  property_types: 2,
  category_name: 'Apartment',
  category_slug: 'apartment',
  agent: 4,
  agent_name: 'Marta Alemu',
  facilitie: [1, 3],
  facilitie_names: ['Parking', 'Security'],
  property_location: 'Bole',
  property_size: 160,
  property_area: 180,
  property_status: 'For Sale',
  property_floor: 6,
  bedrooms: '3',
  bathrooms: '2',
  furnished: 'Furnished',
  property_short_discription: 'Quiet three-bedroom apartment.',
  main_image: '/media/products/main.jpg',
  slide_1: '/media/products/slide-1.jpg',
  slide_2: null,
  slide_3: null,
  slide_4: null,
  slide_5: null,
  slide_6: null,
  video_link: 'https://example.com/tour',
  last_update: '2026-07-12T08:00:00Z',
}

describe('property form contracts', () => {
  it('slugifies a property title', () => {
    expect(slugifyPropertyTitle('  Bole Garden Apartment  ')).toBe('bole-garden-apartment')
  })

  it('maps an API property to editable string values', () => {
    const values = propertyToFormValues(property)
    expect(values.property_types).toBe('2')
    expect(values.agent).toBe('4')
    expect(values.facilitie).toEqual(['1', '3'])
    expect(values.property_size).toBe('160')
    expect(values.main_image).toBeNull()
  })

  it('accepts a complete valid property', () => {
    const result = propertyFormSchema.safeParse({
      ...emptyPropertyFormValues,
      property_title: 'Bole Garden Apartment',
      slug: 'bole-garden-apartment',
      price: '8,500,000 ETB',
      property_types: '2',
      property_location: 'Bole',
      facilitie: ['1'],
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid required and numeric values', () => {
    const result = propertyFormSchema.safeParse({
      ...emptyPropertyFormValues,
      property_title: '',
      slug: 'Invalid Slug',
      price: '',
      property_types: '',
      property_location: '',
      property_size: '-1',
      facilitie: [],
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid video URLs, non-images, and oversized images', () => {
    const nonImage = new File(['text'], 'notes.txt', { type: 'text/plain' })
    const oversized = new File(
      [new Uint8Array(MAX_PROPERTY_IMAGE_SIZE + 1)],
      'oversized.png',
      { type: 'image/png' },
    )
    const result = propertyFormSchema.safeParse({
      ...emptyPropertyFormValues,
      property_title: 'Bole Garden Apartment',
      slug: 'bole-garden-apartment',
      price: '8,500,000 ETB',
      property_types: '2',
      property_location: 'Bole',
      facilitie: ['1'],
      video_link: 'ftp://example.com/tour',
      main_image: nonImage,
      slide_1: oversized,
    })
    expect(result.success).toBe(false)
  })

  it('builds repeated facility entries and appends only new files', () => {
    const mainImage = new File(['image'], 'main.png', { type: 'image/png' })
    const data = toPropertyFormData({
      ...propertyToFormValues(property),
      agent: '',
      video_link: '',
      main_image: mainImage,
    })
    expect(data.getAll('facilitie')).toEqual(['1', '3'])
    expect(data.get('agent')).toBe('')
    expect(data.get('video_link')).toBe('')
    expect(data.get('main_image')).toBe(mainImage)
    expect(data.has('slide_1')).toBe(false)
  })

  it('normalizes paginated and plain lookup responses', () => {
    expect(normalizeResults([{ id: 1 }])).toEqual([{ id: 1 }])
    expect(normalizeResults({ results: [{ id: 2 }] })).toEqual([{ id: 2 }])
  })

  it('normalizes Django field and form errors', () => {
    expect(normalizeApiErrors({
      slug: ['This field must be unique.'],
      non_field_errors: ['Unable to save property.'],
    })).toEqual({
      fields: { slug: 'This field must be unique.' },
      form: 'Unable to save property.',
    })
  })
})
```

- [ ] **Step 2: Run the contract tests to verify they fail**

Run: `npm test -- src/components/properties/property-form.test.ts`

Expected: FAIL because `property-form.ts` and `types.ts` do not exist.

- [ ] **Step 3: Define the API types**

Create `admin-frontend/src/components/properties/types.ts`:

```ts
export type PropertyStatus = 'For Sale' | 'For Rent'

export type PropertyMediaField =
  | 'main_image'
  | 'slide_1'
  | 'slide_2'
  | 'slide_3'
  | 'slide_4'
  | 'slide_5'
  | 'slide_6'

export const PROPERTY_MEDIA_FIELDS: PropertyMediaField[] = [
  'main_image',
  'slide_1',
  'slide_2',
  'slide_3',
  'slide_4',
  'slide_5',
  'slide_6',
]

export interface PropertyRecord {
  id: number
  property_id: string | null
  property_title: string
  slug: string
  price: string
  price_amount: number | null
  price_currency: string
  property_types: number
  category_name: string
  category_slug: string
  agent: number | null
  agent_name: string | null
  facilitie: number[]
  facilitie_names: string[]
  property_location: string
  property_size: number
  property_area: number
  property_status: PropertyStatus
  property_floor: number
  bedrooms: string
  bathrooms: string
  furnished: string
  property_short_discription: string
  main_image: string | null
  slide_1: string | null
  slide_2: string | null
  slide_3: string | null
  slide_4: string | null
  slide_5: string | null
  slide_6: string | null
  video_link: string
  last_update: string
}

export interface CategoryOption {
  id: number
  catagorys: string
}

export interface AgentOption {
  id: number
  name: string
}

export interface FacilityOption {
  id: number
  facilities_name: string
}

export type ApiCollection<T> = T[] | { results: T[] }
```

- [ ] **Step 4: Implement schema, defaults, payload, and error helpers**

Create `admin-frontend/src/components/properties/property-form.ts`:

```ts
import { z } from 'zod'
import type { ApiCollection, PropertyMediaField, PropertyRecord } from './types'
import { PROPERTY_MEDIA_FIELDS } from './types'

export const MAX_PROPERTY_IMAGE_SIZE = 10 * 1024 * 1024

const isFile = (value: unknown): value is File =>
  typeof File !== 'undefined' && value instanceof File

const imageFileSchema = z
  .custom<File | null>(value => value === null || isFile(value), 'Select a valid image file.')
  .refine(value => value === null || value.type.startsWith('image/'), 'Select an image file.')
  .refine(value => value === null || value.size <= MAX_PROPERTY_IMAGE_SIZE, 'Images must be 10 MB or smaller.')

const nonNegativeInteger = z
  .string()
  .regex(/^\d+$/, 'Enter a non-negative whole number.')
  .refine(value => Number.isSafeInteger(Number(value)), 'Enter a valid whole number.')

const optionalHttpUrl = z.string().refine(value => {
  if (!value) return true
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}, 'Enter a valid HTTP or HTTPS URL.')

export const propertyFormSchema = z.object({
  property_id: z.string().max(20, 'Use at most 20 characters.'),
  property_title: z.string().trim().min(2, 'Enter a property title.').max(600),
  slug: z.string().trim().min(1, 'Enter a slug.').regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers, and hyphens.'),
  price: z.string().trim().min(1, 'Enter a price.').max(100),
  property_types: z.string().min(1, 'Select a category.'),
  agent: z.string(),
  facilitie: z.array(z.string()).min(1, 'Select at least one facility.'),
  property_location: z.string().trim().min(1, 'Enter a location.').max(100),
  property_size: nonNegativeInteger,
  property_area: nonNegativeInteger,
  property_status: z.enum(['For Sale', 'For Rent']),
  property_floor: nonNegativeInteger,
  bedrooms: z.string().max(100),
  bathrooms: z.string().max(100),
  furnished: z.string().max(100),
  property_short_discription: z.string(),
  main_image: imageFileSchema,
  slide_1: imageFileSchema,
  slide_2: imageFileSchema,
  slide_3: imageFileSchema,
  slide_4: imageFileSchema,
  slide_5: imageFileSchema,
  slide_6: imageFileSchema,
  video_link: optionalHttpUrl,
})

export type PropertyFormValues = z.infer<typeof propertyFormSchema>
export type PropertyFieldName = keyof PropertyFormValues

export const emptyPropertyFormValues: PropertyFormValues = {
  property_id: '',
  property_title: '',
  slug: '',
  price: '',
  property_types: '',
  agent: '',
  facilitie: [],
  property_location: '',
  property_size: '0',
  property_area: '0',
  property_status: 'For Sale',
  property_floor: '0',
  bedrooms: '',
  bathrooms: '',
  furnished: '',
  property_short_discription: '',
  main_image: null,
  slide_1: null,
  slide_2: null,
  slide_3: null,
  slide_4: null,
  slide_5: null,
  slide_6: null,
  video_link: '',
}

export const PROPERTY_FIELD_TABS: Record<PropertyFieldName, 'basic' | 'location' | 'amenities' | 'media'> = {
  property_id: 'basic',
  property_title: 'basic',
  slug: 'basic',
  property_status: 'basic',
  property_types: 'basic',
  agent: 'basic',
  property_short_discription: 'basic',
  price: 'location',
  property_location: 'location',
  property_size: 'location',
  property_area: 'location',
  property_floor: 'location',
  bedrooms: 'location',
  bathrooms: 'location',
  furnished: 'location',
  facilitie: 'amenities',
  main_image: 'media',
  slide_1: 'media',
  slide_2: 'media',
  slide_3: 'media',
  slide_4: 'media',
  slide_5: 'media',
  slide_6: 'media',
  video_link: 'media',
}

export function slugifyPropertyTitle(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function propertyToFormValues(property?: PropertyRecord | null): PropertyFormValues {
  if (!property) return { ...emptyPropertyFormValues, facilitie: [] }
  return {
    property_id: property.property_id ?? '',
    property_title: property.property_title,
    slug: property.slug,
    price: property.price,
    property_types: String(property.property_types),
    agent: property.agent === null ? '' : String(property.agent),
    facilitie: property.facilitie.map(String),
    property_location: property.property_location,
    property_size: String(property.property_size ?? 0),
    property_area: String(property.property_area ?? 0),
    property_status: property.property_status,
    property_floor: String(property.property_floor ?? 0),
    bedrooms: property.bedrooms ?? '',
    bathrooms: property.bathrooms ?? '',
    furnished: property.furnished ?? '',
    property_short_discription: property.property_short_discription ?? '',
    main_image: null,
    slide_1: null,
    slide_2: null,
    slide_3: null,
    slide_4: null,
    slide_5: null,
    slide_6: null,
    video_link: property.video_link ?? '',
  }
}

const scalarFields: PropertyFieldName[] = [
  'property_id', 'property_title', 'slug', 'price', 'property_types', 'agent',
  'property_location', 'property_size', 'property_area', 'property_status',
  'property_floor', 'bedrooms', 'bathrooms', 'furnished',
  'property_short_discription', 'video_link',
]

export function toPropertyFormData(values: PropertyFormValues) {
  const data = new FormData()
  scalarFields.forEach(field => data.append(field, String(values[field])))
  values.facilitie.forEach(id => data.append('facilitie', id))
  PROPERTY_MEDIA_FIELDS.forEach(field => {
    const file = values[field]
    if (isFile(file)) data.append(field, file)
  })
  return data
}

export function normalizeResults<T>(data: ApiCollection<T> | undefined): T[] {
  if (!data) return []
  return Array.isArray(data) ? data : data.results
}

const propertyFields = new Set<PropertyFieldName>([
  ...scalarFields,
  'facilitie',
  ...PROPERTY_MEDIA_FIELDS,
])

function errorMessage(value: unknown): string | undefined {
  if (typeof value === 'string') return value
  if (Array.isArray(value)) return value.map(errorMessage).filter(Boolean).join(' ')
  return undefined
}

export interface NormalizedApiErrors {
  fields: Partial<Record<PropertyFieldName, string>>
  form?: string
}

export function normalizeApiErrors(data: unknown): NormalizedApiErrors {
  const result: NormalizedApiErrors = { fields: {} }
  if (!data || typeof data !== 'object') {
    result.form = 'Unable to connect to the property service. Try again.'
    return result
  }
  Object.entries(data as Record<string, unknown>).forEach(([key, value]) => {
    const message = errorMessage(value)
    if (!message) return
    if (propertyFields.has(key as PropertyFieldName)) {
      result.fields[key as PropertyFieldName] = message
    } else if (key === 'non_field_errors' || key === 'detail') {
      result.form = message
    }
  })
  if (!result.form && Object.keys(result.fields).length === 0) {
    result.form = 'The property could not be saved. Review the form and try again.'
  }
  return result
}

export function existingPropertyMedia(property?: PropertyRecord | null): Partial<Record<PropertyMediaField, string | null>> {
  if (!property) return {}
  return Object.fromEntries(PROPERTY_MEDIA_FIELDS.map(field => [field, property[field]]))
}
```

- [ ] **Step 5: Run contract tests**

Run: `npm test -- src/components/properties/property-form.test.ts`

Expected: all eight contract tests pass.

- [ ] **Step 6: Commit the property contracts**

```powershell
git add admin-frontend/src/components/properties/types.ts admin-frontend/src/components/properties/property-form.ts admin-frontend/src/components/properties/property-form.test.ts
git commit -m 'feat(admin): add property form contracts'
```

### Task 3: Property Media Controls and XL Modal

**Files:**
- Create: `admin-frontend/src/components/properties/PropertyMediaFields.tsx`
- Create: `admin-frontend/src/components/properties/PropertyMediaFields.test.tsx`
- Create: `admin-frontend/src/components/properties/PropertyForm.module.css`
- Modify: `admin-frontend/src/components/ui/Modal.tsx`

- [ ] **Step 1: Write failing media interaction tests**

Create `admin-frontend/src/components/properties/PropertyMediaFields.test.tsx`:

```tsx
import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import PropertyMediaFields from './PropertyMediaFields'

vi.mock('next/image', () => ({
  default: ({ fill: _fill, unoptimized: _unoptimized, ...props }: React.ImgHTMLAttributes<HTMLImageElement> & { fill?: boolean; unoptimized?: boolean }) => <img {...props} />,
}))

describe('PropertyMediaFields', () => {
  beforeEach(() => {
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn(() => 'blob:property-preview'),
    })
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: vi.fn(),
    })
  })

  it('shows an existing image and reports a replacement file', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <PropertyMediaFields
        existing={{ main_image: '/media/products/current.jpg' }}
        files={{}}
        errors={{}}
        onChange={onChange}
      />,
    )

    expect(screen.getByAltText('Main image preview')).toHaveAttribute('src', '/media/products/current.jpg')
    const file = new File(['image'], 'replacement.png', { type: 'image/png' })
    await user.upload(screen.getByLabelText('Main image file'), file)

    expect(onChange).toHaveBeenCalledWith('main_image', file)
    expect(screen.getByText('replacement.png')).toBeInTheDocument()
    expect(screen.getByAltText('Main image preview')).toHaveAttribute('src', 'blob:property-preview')
  })
})
```

- [ ] **Step 2: Run the media test to verify it fails**

Run: `npm test -- src/components/properties/PropertyMediaFields.test.tsx`

Expected: FAIL because `PropertyMediaFields.tsx` does not exist.

- [ ] **Step 3: Implement the media controls**

Create `admin-frontend/src/components/properties/PropertyMediaFields.tsx`:

```tsx
'use client'

import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import { ImageIcon, Upload } from 'lucide-react'
import type { PropertyMediaField } from './types'
import styles from './PropertyForm.module.css'

interface MediaSlotProps {
  field: PropertyMediaField
  label: string
  existing?: string | null
  file?: File | null
  error?: string
  featured?: boolean
  onChange: (field: PropertyMediaField, file: File) => void
}

function MediaSlot({ field, label, existing, file, error, featured, onChange }: MediaSlotProps) {
  const previewRef = useRef<string | null>(null)
  const [preview, setPreview] = useState<string | null>(null)

  useEffect(() => () => {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current)
  }, [])

  const selectFile = (selected: File) => {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current)
    const nextPreview = URL.createObjectURL(selected)
    previewRef.current = nextPreview
    setPreview(nextPreview)
    onChange(field, selected)
  }

  const source = preview ?? existing ?? null

  return (
    <section className={featured ? styles.mediaFeatured : styles.mediaSlot}>
      <div className={styles.mediaPreview}>
        {source ? (
          <Image src={source} alt={label + ' preview'} fill sizes={featured ? '420px' : '220px'} unoptimized />
        ) : (
          <ImageIcon aria-hidden="true" size={28} />
        )}
      </div>
      <div className={styles.mediaMeta}>
        <strong>{label}</strong>
        <span>{file ? file.name : existing ? 'Current image' : 'No image selected'}</span>
        {file ? <span>{(file.size / 1024 / 1024).toFixed(2)} MB</span> : null}
      </div>
      <label className={styles.mediaButton}>
        <Upload aria-hidden="true" size={15} />
        {source ? 'Replace image' : 'Choose image'}
        <input
          type="file"
          accept="image/*"
          aria-label={label + ' file'}
          onChange={event => {
            const selected = event.target.files?.[0]
            if (selected) selectFile(selected)
            event.target.value = ''
          }}
        />
      </label>
      {error ? <p className={styles.errorText}>{error}</p> : null}
    </section>
  )
}

interface PropertyMediaFieldsProps {
  existing: Partial<Record<PropertyMediaField, string | null>>
  files: Partial<Record<PropertyMediaField, File | null>>
  errors: Partial<Record<PropertyMediaField, string | undefined>>
  onChange: (field: PropertyMediaField, file: File) => void
}

const galleryFields: Array<{ field: PropertyMediaField; label: string }> = [
  { field: 'slide_1', label: 'Gallery image 1' },
  { field: 'slide_2', label: 'Gallery image 2' },
  { field: 'slide_3', label: 'Gallery image 3' },
  { field: 'slide_4', label: 'Gallery image 4' },
  { field: 'slide_5', label: 'Gallery image 5' },
  { field: 'slide_6', label: 'Gallery image 6' },
]

export default function PropertyMediaFields({ existing, files, errors, onChange }: PropertyMediaFieldsProps) {
  return (
    <div className={styles.mediaSection}>
      <MediaSlot
        field="main_image"
        label="Main image"
        existing={existing.main_image}
        file={files.main_image}
        error={errors.main_image}
        featured
        onChange={onChange}
      />
      <div className={styles.galleryGrid}>
        {galleryFields.map(item => (
          <MediaSlot
            key={item.field}
            field={item.field}
            label={item.label}
            existing={existing[item.field]}
            file={files[item.field]}
            error={errors[item.field]}
            onChange={onChange}
          />
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Add the media CSS**

Create `admin-frontend/src/components/properties/PropertyForm.module.css`:

```css
.mediaSection { display: grid; gap: 18px; }
.mediaFeatured,
.mediaSlot { display: grid; gap: 10px; padding: 14px; border: 1px solid var(--border); border-radius: 8px; background: var(--canvas); }
.mediaFeatured { grid-template-columns: minmax(220px, 1.25fr) minmax(170px, .75fr); align-items: center; }
.mediaPreview { position: relative; min-height: 132px; overflow: hidden; display: grid; place-items: center; border: 1px dashed var(--border); border-radius: 7px; color: var(--text-faint); background: var(--card); }
.mediaPreview img { object-fit: cover; }
.mediaMeta { display: grid; align-content: center; gap: 4px; min-width: 0; }
.mediaMeta strong { color: var(--ink); font-size: 13px; }
.mediaMeta span { overflow: hidden; color: var(--text-faint); font-size: 11.5px; text-overflow: ellipsis; white-space: nowrap; }
.mediaButton { display: inline-flex; width: max-content; align-items: center; justify-content: center; gap: 7px; min-height: 34px; padding: 7px 10px; border: 1px solid var(--border); border-radius: 7px; color: var(--text-soft); background: var(--card); cursor: pointer; font-size: 12px; font-weight: 700; }
.mediaButton:hover { color: var(--ink); border-color: var(--brass); }
.mediaButton input { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
.mediaFeatured .mediaButton,
.mediaFeatured .errorText { grid-column: 2; }
.galleryGrid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
.galleryGrid .mediaPreview { min-height: 104px; }
.errorText { margin: 0; color: var(--danger); font-size: 11.5px; }

@media (max-width: 760px) {
  .mediaFeatured { grid-template-columns: 1fr; }
  .mediaFeatured .mediaButton,
  .mediaFeatured .errorText { grid-column: auto; }
  .galleryGrid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

@media (max-width: 480px) {
  .galleryGrid { grid-template-columns: 1fr; }
}
```

- [ ] **Step 5: Add the XL modal width**

In `admin-frontend/src/components/ui/Modal.tsx`, change the size type and compute the width class:

```tsx
interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: React.ReactNode
  footer?: React.ReactNode
  size?: 'default' | 'lg' | 'xl'
}

const modalWidths = {
  default: 'max-w-[640px]',
  lg: 'max-w-[840px]',
  xl: 'max-w-[960px]',
} as const
```

Replace the modal panel class expression with:

```tsx
className={`bg-card rounded-[14px] w-full ${modalWidths[size]} max-h-[88vh] flex flex-col shadow-lg animate-in`}
```

- [ ] **Step 6: Run media tests, lint, and TypeScript**

Run:

```powershell
npm test -- src/components/properties/PropertyMediaFields.test.tsx
npm run lint
npx tsc --noEmit --pretty false
```

Expected: media test passes; lint and TypeScript exit 0.

- [ ] **Step 7: Commit media controls and modal sizing**

```powershell
git add admin-frontend/src/components/properties/PropertyMediaFields.tsx admin-frontend/src/components/properties/PropertyMediaFields.test.tsx admin-frontend/src/components/properties/PropertyForm.module.css admin-frontend/src/components/ui/Modal.tsx
git commit -m 'feat(admin): add property media controls'
```

### Task 4: Four-Tab Property Form

**Files:**
- Create: `admin-frontend/src/components/properties/PropertyForm.tsx`
- Create: `admin-frontend/src/components/properties/PropertyForm.test.tsx`
- Modify: `admin-frontend/src/components/properties/PropertyForm.module.css`

- [ ] **Step 1: Write failing form behavior tests**

Create `admin-frontend/src/components/properties/PropertyForm.test.tsx`:

```tsx
import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import PropertyForm from './PropertyForm'
import type { PropertyRecord } from './types'

vi.mock('./PropertyMediaFields', () => ({
  default: () => <div>Media controls</div>,
}))

const baseProps = {
  initialProperty: null,
  categories: [{ id: 2, catagorys: 'Apartment' }],
  agents: [{ id: 4, name: 'Marta Alemu' }],
  facilities: [{ id: 1, facilities_name: 'Parking' }],
  lookupsLoading: false,
  lookupError: false,
  apiErrors: null,
  onRetryLookups: vi.fn(),
  onSubmit: vi.fn(),
}

describe('PropertyForm', () => {
  it('generates a slug from a new property title', async () => {
    const user = userEvent.setup()
    render(<PropertyForm {...baseProps} />)
    await user.type(screen.getByLabelText('Property title'), 'Bole Garden Apartment')
    expect(screen.getByLabelText('Slug')).toHaveValue('bole-garden-apartment')
  })

  it('preserves the existing slug while editing', async () => {
    const user = userEvent.setup()
    const initialProperty = {
      id: 7,
      property_id: 'SPS-007',
      property_title: 'Original title',
      slug: 'keep-this-slug',
      price: '8,500,000 ETB',
      price_amount: 8500000,
      price_currency: 'ETB',
      property_types: 2,
      category_name: 'Apartment',
      category_slug: 'apartment',
      agent: 4,
      agent_name: 'Marta Alemu',
      facilitie: [1],
      facilitie_names: ['Parking'],
      property_location: 'Bole',
      property_size: 160,
      property_area: 180,
      property_status: 'For Sale',
      property_floor: 6,
      bedrooms: '3',
      bathrooms: '2',
      furnished: 'Furnished',
      property_short_discription: '',
      main_image: null,
      slide_1: null,
      slide_2: null,
      slide_3: null,
      slide_4: null,
      slide_5: null,
      slide_6: null,
      video_link: '',
      last_update: '2026-07-12T08:00:00Z',
    } satisfies PropertyRecord
    render(<PropertyForm {...baseProps} initialProperty={initialProperty} />)
    await user.clear(screen.getByLabelText('Property title'))
    await user.type(screen.getByLabelText('Property title'), 'Changed title')
    expect(screen.getByLabelText('Slug')).toHaveValue('keep-this-slug')
  })

  it('returns to Basic Info when required basic fields are invalid', async () => {
    const user = userEvent.setup()
    render(
      <>
        <PropertyForm {...baseProps} />
        <button type="submit" form="property-editor-form">Validate property</button>
      </>,
    )
    await user.click(screen.getByRole('tab', { name: 'Media' }))
    await user.click(screen.getByRole('button', { name: 'Validate property' }))
    expect(await screen.findByText('Enter a property title.')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Basic Info' })).toHaveAttribute('aria-selected', 'true')
  })

  it('renders normalized server errors beside their fields', () => {
    render(
      <PropertyForm
        {...baseProps}
        apiErrors={{ fields: { slug: 'This field must be unique.' }, form: 'Unable to save property.' }}
      />,
    )
    expect(screen.getByText('This field must be unique.')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('Unable to save property.')
  })
})
```

- [ ] **Step 2: Run the form tests to verify they fail**

Run: `npm test -- src/components/properties/PropertyForm.test.tsx`

Expected: FAIL because `PropertyForm.tsx` does not exist.

- [ ] **Step 3: Implement the four-tab form**

Create `admin-frontend/src/components/properties/PropertyForm.tsx`:

```tsx
'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { AlertCircle, Check, Search } from 'lucide-react'
import { useForm, type FieldErrors } from 'react-hook-form'
import PropertyMediaFields from './PropertyMediaFields'
import {
  PROPERTY_FIELD_TABS,
  existingPropertyMedia,
  propertyFormSchema,
  propertyToFormValues,
  slugifyPropertyTitle,
  type NormalizedApiErrors,
  type PropertyFieldName,
  type PropertyFormValues,
} from './property-form'
import { PROPERTY_MEDIA_FIELDS, type AgentOption, type CategoryOption, type FacilityOption, type PropertyMediaField, type PropertyRecord } from './types'
import styles from './PropertyForm.module.css'

type TabId = 'basic' | 'location' | 'amenities' | 'media'

const tabs: Array<{ id: TabId; label: string }> = [
  { id: 'basic', label: 'Basic Info' },
  { id: 'location', label: 'Location & Pricing' },
  { id: 'amenities', label: 'Amenities' },
  { id: 'media', label: 'Media' },
]

interface FieldProps {
  label: string
  htmlFor: string
  error?: string
  hint?: string
  required?: boolean
  spanTwo?: boolean
  children: ReactNode
}

function Field({ label, htmlFor, error, hint, required, spanTwo, children }: FieldProps) {
  return (
    <div className={`${styles.field} ${spanTwo ? styles.spanTwo : ''}`}>
      <label className={styles.label} htmlFor={htmlFor}>
        {label}{required ? <span className={styles.required}> *</span> : null}
      </label>
      {children}
      {hint && !error ? <p className={styles.hint}>{hint}</p> : null}
      {error ? <p className={styles.errorText}>{error}</p> : null}
    </div>
  )
}

interface PropertyFormProps {
  formId?: string
  initialProperty: PropertyRecord | null
  categories: CategoryOption[]
  agents: AgentOption[]
  facilities: FacilityOption[]
  lookupsLoading: boolean
  lookupError: boolean
  apiErrors: NormalizedApiErrors | null
  onRetryLookups: () => void
  onSubmit: (values: PropertyFormValues) => void | Promise<void>
}

export default function PropertyForm({
  formId = 'property-editor-form',
  initialProperty,
  categories,
  agents,
  facilities,
  lookupsLoading,
  lookupError,
  apiErrors,
  onRetryLookups,
  onSubmit,
}: PropertyFormProps) {
  const [activeTab, setActiveTab] = useState<TabId>('basic')
  const [slugLocked, setSlugLocked] = useState(Boolean(initialProperty))
  const [facilitySearch, setFacilitySearch] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const {
    register,
    watch,
    setValue,
    setError,
    handleSubmit,
    formState: { errors },
  } = useForm<PropertyFormValues>({
    resolver: zodResolver(propertyFormSchema),
    defaultValues: propertyToFormValues(initialProperty),
    mode: 'onBlur',
  })

  const title = watch('property_title')
  const selectedFacilities = watch('facilitie')
  const watchedMedia = watch(PROPERTY_MEDIA_FIELDS)
  const slugRegistration = register('slug')
  const mediaFiles = Object.fromEntries(
    PROPERTY_MEDIA_FIELDS.map((field, index) => [field, watchedMedia[index]]),
  ) as Partial<Record<PropertyMediaField, File | null>>

  useEffect(() => {
    if (!slugLocked) {
      setValue('slug', slugifyPropertyTitle(title), { shouldDirty: Boolean(title), shouldValidate: Boolean(title) })
    }
  }, [setValue, slugLocked, title])

  useEffect(() => {
    if (!apiErrors) return
    Object.entries(apiErrors.fields).forEach(([field, message]) => {
      if (message) setError(field as PropertyFieldName, { type: 'server', message })
    })
    const firstField = Object.keys(apiErrors.fields)[0] as PropertyFieldName | undefined
    if (firstField) setActiveTab(PROPERTY_FIELD_TABS[firstField])
    setFormError(apiErrors.form ?? null)
  }, [apiErrors, setError])

  const filteredFacilities = useMemo(() => {
    const query = facilitySearch.trim().toLowerCase()
    return query
      ? facilities.filter(item => item.facilities_name.toLowerCase().includes(query))
      : facilities
  }, [facilities, facilitySearch])

  const tabHasError = (tab: TabId) => Object.keys(errors).some(
    field => PROPERTY_FIELD_TABS[field as PropertyFieldName] === tab,
  )

  const showFirstError = (invalid: FieldErrors<PropertyFormValues>) => {
    const firstField = Object.keys(invalid)[0] as PropertyFieldName | undefined
    if (!firstField) return
    setActiveTab(PROPERTY_FIELD_TABS[firstField])
    window.setTimeout(() => document.getElementById('property-' + firstField)?.focus(), 0)
  }

  const submitValid = async (values: PropertyFormValues) => {
    setFormError(null)
    await onSubmit(values)
  }

  const mediaErrors = Object.fromEntries(
    PROPERTY_MEDIA_FIELDS.map(field => [field, errors[field]?.message]),
  ) as Partial<Record<PropertyMediaField, string | undefined>>

  return (
    <div className={styles.editor}>
      <div className={styles.tabs} role="tablist" aria-label="Property editor sections">
        {tabs.map(tab => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={'property-panel-' + tab.id}
            className={`${styles.tab} ${activeTab === tab.id ? styles.tabActive : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
            {tabHasError(tab.id) ? <span className={styles.errorDot} aria-hidden="true" /> : null}
          </button>
        ))}
      </div>

      {formError ? (
        <div className={styles.formAlert} role="alert">
          <AlertCircle aria-hidden="true" size={16} />
          <span>{formError}</span>
        </div>
      ) : null}

      {lookupsLoading ? <div className={styles.lookupState} role="status">Loading categories, agents, and facilities...</div> : null}
      {lookupError ? (
        <div className={styles.formAlert} role="alert">
          <span>Lookup choices could not be loaded.</span>
          <button type="button" onClick={onRetryLookups}>Retry</button>
        </div>
      ) : null}

      <form id={formId} className={styles.form} onSubmit={handleSubmit(submitValid, showFirstError)} noValidate>
        <section id="property-panel-basic" role="tabpanel" hidden={activeTab !== 'basic'} className={styles.panel}>
          <div className={styles.grid}>
            <Field label="Property title" htmlFor="property-property_title" error={errors.property_title?.message} required spanTwo>
              <input id="property-property_title" className={styles.input} {...register('property_title')} />
            </Field>
            <Field label="Property ID" htmlFor="property-property_id" error={errors.property_id?.message} hint="Optional internal identifier.">
              <input id="property-property_id" className={styles.input} {...register('property_id')} />
            </Field>
            <Field label="Status" htmlFor="property-property_status" error={errors.property_status?.message} required>
              <select id="property-property_status" className={styles.select} {...register('property_status')}>
                <option value="For Sale">For Sale</option>
                <option value="For Rent">For Rent</option>
              </select>
            </Field>
            <Field label="Category" htmlFor="property-property_types" error={errors.property_types?.message} required>
              <select id="property-property_types" className={styles.select} disabled={lookupsLoading || lookupError} {...register('property_types')}>
                <option value="">Select category</option>
                {categories.map(category => <option key={category.id} value={category.id}>{category.catagorys}</option>)}
              </select>
            </Field>
            <Field label="Agent" htmlFor="property-agent" error={errors.agent?.message}>
              <select id="property-agent" className={styles.select} disabled={lookupsLoading || lookupError} {...register('agent')}>
                <option value="">Unassigned</option>
                {agents.map(agent => <option key={agent.id} value={agent.id}>{agent.name}</option>)}
              </select>
            </Field>
            <Field label="Slug" htmlFor="property-slug" error={errors.slug?.message} hint="Generated from the title until edited." required spanTwo>
              <input
                id="property-slug"
                className={styles.input}
                {...slugRegistration}
                onChange={event => {
                  setSlugLocked(true)
                  slugRegistration.onChange(event)
                }}
              />
            </Field>
            <Field label="Short description" htmlFor="property-property_short_discription" error={errors.property_short_discription?.message} spanTwo>
              <textarea id="property-property_short_discription" className={styles.textarea} rows={5} {...register('property_short_discription')} />
            </Field>
          </div>
        </section>

        <section id="property-panel-location" role="tabpanel" hidden={activeTab !== 'location'} className={styles.panel}>
          <div className={styles.grid}>
            <Field label="Price" htmlFor="property-price" error={errors.price?.message} hint="Include ETB or USD when numeric filtering is expected." required>
              <input id="property-price" className={styles.input} {...register('price')} />
            </Field>
            <Field label="Location" htmlFor="property-property_location" error={errors.property_location?.message} required>
              <input id="property-property_location" className={styles.input} {...register('property_location')} />
            </Field>
            <Field label="Size (m2)" htmlFor="property-property_size" error={errors.property_size?.message}>
              <input id="property-property_size" type="number" min="0" step="1" className={styles.input} {...register('property_size')} />
            </Field>
            <Field label="Land area (m2)" htmlFor="property-property_area" error={errors.property_area?.message}>
              <input id="property-property_area" type="number" min="0" step="1" className={styles.input} {...register('property_area')} />
            </Field>
            <Field label="Floor" htmlFor="property-property_floor" error={errors.property_floor?.message}>
              <input id="property-property_floor" type="number" min="0" step="1" className={styles.input} {...register('property_floor')} />
            </Field>
            <Field label="Bedrooms" htmlFor="property-bedrooms" error={errors.bedrooms?.message}>
              <input id="property-bedrooms" className={styles.input} {...register('bedrooms')} />
            </Field>
            <Field label="Bathrooms" htmlFor="property-bathrooms" error={errors.bathrooms?.message}>
              <input id="property-bathrooms" className={styles.input} {...register('bathrooms')} />
            </Field>
            <Field label="Furnished" htmlFor="property-furnished" error={errors.furnished?.message}>
              <select id="property-furnished" className={styles.select} {...register('furnished')}>
                <option value="">Not specified</option>
                <option value="Furnished">Furnished</option>
                <option value="Unfurnished">Unfurnished</option>
                <option value="Semi-furnished">Semi-furnished</option>
              </select>
            </Field>
          </div>
        </section>

        <section id="property-panel-amenities" role="tabpanel" hidden={activeTab !== 'amenities'} className={styles.panel}>
          <div id="property-facilitie" tabIndex={-1} className={styles.facilitySection}>
            <div className={styles.facilityToolbar}>
              <div>
                <h4>Facilities</h4>
                <p>Select every amenity included with this listing.</p>
              </div>
              <label className={styles.facilitySearch}>
                <Search aria-hidden="true" size={15} />
                <span className="sr-only">Search facilities</span>
                <input value={facilitySearch} onChange={event => setFacilitySearch(event.target.value)} placeholder="Search facilities" />
              </label>
            </div>
            <div className={styles.facilityGrid}>
              {filteredFacilities.map(facility => {
                const value = String(facility.id)
                const checked = selectedFacilities.includes(value)
                return (
                  <label key={facility.id} className={`${styles.facilityOption} ${checked ? styles.facilityChecked : ''}`}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {
                        const next = checked
                          ? selectedFacilities.filter(id => id !== value)
                          : [...selectedFacilities, value]
                        setValue('facilitie', next, { shouldDirty: true, shouldValidate: true })
                      }}
                    />
                    <span className={styles.facilityCheck}>{checked ? <Check aria-hidden="true" size={13} /> : null}</span>
                    <span>{facility.facilities_name}</span>
                  </label>
                )
              })}
              {!lookupsLoading && filteredFacilities.length === 0 ? <p className={styles.facilityEmpty}>No matching facilities.</p> : null}
            </div>
            {errors.facilitie?.message ? <p className={styles.errorText}>{errors.facilitie.message}</p> : null}
          </div>
        </section>

        <section id="property-panel-media" role="tabpanel" hidden={activeTab !== 'media'} className={styles.panel}>
          <PropertyMediaFields
            existing={existingPropertyMedia(initialProperty)}
            files={mediaFiles}
            errors={mediaErrors}
            onChange={(field, file) => setValue(field, file, { shouldDirty: true, shouldValidate: true })}
          />
          <div className={styles.videoField}>
            <Field label="Video URL" htmlFor="property-video_link" error={errors.video_link?.message} hint="Use an HTTP or HTTPS link." spanTwo>
              <input id="property-video_link" type="url" className={styles.input} {...register('video_link')} />
            </Field>
          </div>
        </section>
      </form>
    </div>
  )
}
```

- [ ] **Step 4: Add the form, tab, and facility CSS**

Append to `admin-frontend/src/components/properties/PropertyForm.module.css`:

```css
.editor { display: grid; gap: 16px; }
.tabs { display: flex; min-height: 42px; overflow-x: auto; border-bottom: 1px solid var(--border); }
.tab { position: relative; flex: 0 0 auto; padding: 10px 16px; border: 0; border-bottom: 2px solid transparent; color: var(--text-soft); background: transparent; cursor: pointer; font-size: 12.5px; font-weight: 700; }
.tab:hover { color: var(--ink); }
.tabActive { color: var(--brass-dark); border-bottom-color: var(--brass); }
.errorDot { position: absolute; top: 8px; right: 7px; width: 6px; height: 6px; border-radius: 50%; background: var(--danger); }
.form { min-width: 0; }
.panel { min-width: 0; }
.grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
.spanTwo { grid-column: 1 / -1; }
.field { display: grid; align-content: start; gap: 6px; min-width: 0; }
.label { color: var(--text-main); font-size: 11.5px; font-weight: 750; }
.required { color: var(--danger); }
.input,
.select,
.textarea { width: 100%; border: 1px solid var(--border); border-radius: 7px; color: var(--text-main); background: var(--card); font: inherit; font-size: 13px; outline: none; transition: border-color .15s ease, box-shadow .15s ease; }
.input,
.select { min-height: 39px; padding: 8px 10px; }
.textarea { min-height: 112px; padding: 10px; resize: vertical; }
.input:focus,
.select:focus,
.textarea:focus { border-color: var(--brass); box-shadow: 0 0 0 3px var(--brass-tint); }
.input:disabled,
.select:disabled { opacity: .55; cursor: not-allowed; }
.hint,
.errorText { margin: 0; font-size: 11.5px; line-height: 1.4; }
.hint { color: var(--text-faint); }
.errorText { color: var(--danger); }
.formAlert,
.lookupState { display: flex; align-items: center; gap: 9px; min-height: 38px; padding: 9px 11px; border-radius: 7px; font-size: 12.5px; }
.formAlert { color: var(--danger); border: 1px solid var(--danger-tint); background: var(--danger-tint); }
.formAlert button { margin-left: auto; border: 0; color: inherit; background: transparent; cursor: pointer; font-weight: 750; }
.lookupState { color: var(--text-soft); border: 1px solid var(--border); background: var(--canvas); }
.facilitySection { display: grid; gap: 14px; outline: none; }
.facilityToolbar { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.facilityToolbar h4 { margin: 0; color: var(--ink); font-family: var(--font-display); font-size: 16px; }
.facilityToolbar p { margin: 3px 0 0; color: var(--text-faint); font-size: 11.5px; }
.facilitySearch { display: flex; align-items: center; gap: 7px; min-width: 220px; min-height: 36px; padding: 7px 10px; border: 1px solid var(--border); border-radius: 7px; color: var(--text-faint); background: var(--card); }
.facilitySearch input { width: 100%; border: 0; outline: 0; color: var(--text-main); background: transparent; font-size: 12px; }
.facilityGrid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 9px; }
.facilityOption { display: flex; align-items: center; gap: 9px; min-height: 40px; padding: 9px 10px; border: 1px solid var(--border); border-radius: 7px; color: var(--text-soft); background: var(--card); cursor: pointer; font-size: 12px; }
.facilityOption input { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
.facilityOption input:focus-visible + .facilityCheck { outline: 2px solid var(--brass); outline-offset: 2px; }
.facilityChecked { color: var(--ink); border-color: var(--brass); background: var(--brass-tint); }
.facilityCheck { display: grid; place-items: center; width: 17px; height: 17px; flex: 0 0 17px; border: 1px solid var(--border); border-radius: 4px; color: var(--ink); background: var(--card); }
.facilityChecked .facilityCheck { border-color: var(--brass); background: var(--brass); }
.facilityEmpty { grid-column: 1 / -1; margin: 0; padding: 26px; color: var(--text-faint); text-align: center; font-size: 12.5px; }
.videoField { margin-top: 18px; }

@media (max-width: 700px) {
  .grid { grid-template-columns: 1fr; }
  .spanTwo { grid-column: auto; }
  .facilityToolbar { align-items: stretch; flex-direction: column; }
  .facilitySearch { min-width: 0; width: 100%; }
  .facilityGrid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

@media (max-width: 480px) {
  .tab { padding-inline: 12px; }
  .facilityGrid { grid-template-columns: 1fr; }
}
```

- [ ] **Step 5: Run form tests and static checks**

Run:

```powershell
npm test -- src/components/properties/PropertyForm.test.tsx
npm run lint
npx tsc --noEmit --pretty false
```

Expected: four form tests pass; lint and TypeScript exit 0.

- [ ] **Step 6: Commit the property form**

```powershell
git add admin-frontend/src/components/properties/PropertyForm.tsx admin-frontend/src/components/properties/PropertyForm.test.tsx admin-frontend/src/components/properties/PropertyForm.module.css
git commit -m 'feat(admin): add validated property editor form'
```

### Task 5: Properties Page and API Integration

**Files:**
- Modify: `admin-frontend/src/lib/api.ts`
- Modify: `admin-frontend/src/app/(admin)/properties/page.tsx`

- [ ] **Step 1: Let Axios assign multipart boundaries**

In the request interceptor in `admin-frontend/src/lib/api.ts`, add the `FormData` branch before authentication:

```ts
api.interceptors.request.use((config) => {
  if (config.url) config.url = config.url.replace(/\/(\?|$)/, '$1')
  if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
    config.headers.setContentType(undefined)
  }
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('access_token')
    if (token) config.headers.Authorization = `Bearer ${token}`
  }
  return config
})
```

This removes the instance's JSON default only for `FormData`, allowing the browser to supply `multipart/form-data` with its generated boundary.

- [ ] **Step 2: Replace the placeholder properties page with the complete integration**

Replace `admin-frontend/src/app/(admin)/properties/page.tsx` with:

```tsx
'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertCircle, CheckCircle2, Edit, Plus, Trash2 } from 'lucide-react'
import api from '@/lib/api'
import DataTable, { type Column } from '@/components/ui/DataTable'
import Modal from '@/components/ui/Modal'
import PropertyForm from '@/components/properties/PropertyForm'
import {
  normalizeApiErrors,
  normalizeResults,
  toPropertyFormData,
  type NormalizedApiErrors,
  type PropertyFormValues,
} from '@/components/properties/property-form'
import type {
  AgentOption,
  ApiCollection,
  CategoryOption,
  FacilityOption,
  PropertyRecord,
} from '@/components/properties/types'

interface SavePropertyArgs {
  values: PropertyFormValues
  propertyId?: number
}

interface Feedback {
  message: string
  tone: 'success' | 'danger'
}

function responseData(error: unknown) {
  if (!error || typeof error !== 'object') return undefined
  return (error as { response?: { data?: unknown } }).response?.data
}

export default function PropertiesPage() {
  const queryClient = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<PropertyRecord | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [saveErrors, setSaveErrors] = useState<NormalizedApiErrors | null>(null)
  const [feedback, setFeedback] = useState<Feedback | null>(null)

  const propertiesQuery = useQuery<ApiCollection<PropertyRecord>>({
    queryKey: ['properties'],
    queryFn: () => api.get('/properties/?page_size=100').then(response => response.data),
  })

  const categoriesQuery = useQuery<ApiCollection<CategoryOption>>({
    queryKey: ['property-form', 'categories'],
    queryFn: () => api.get('/categories/?page_size=100').then(response => response.data),
    enabled: modalOpen,
  })

  const agentsQuery = useQuery<ApiCollection<AgentOption>>({
    queryKey: ['property-form', 'agents'],
    queryFn: () => api.get('/agents/?page_size=100').then(response => response.data),
    enabled: modalOpen,
  })

  const facilitiesQuery = useQuery<ApiCollection<FacilityOption>>({
    queryKey: ['property-form', 'facilities'],
    queryFn: () => api.get('/facilities/?page_size=100').then(response => response.data),
    enabled: modalOpen,
  })

  const closePropertyModal = () => {
    setModalOpen(false)
    setEditing(null)
    setSaveErrors(null)
  }

  const openCreate = () => {
    setFeedback(null)
    setSaveErrors(null)
    setEditing(null)
    setModalOpen(true)
  }

  const openEdit = (property: PropertyRecord) => {
    setFeedback(null)
    setSaveErrors(null)
    setEditing(property)
    setModalOpen(true)
  }

  const saveMutation = useMutation({
    mutationFn: ({ values, propertyId }: SavePropertyArgs) => {
      const data = toPropertyFormData(values)
      return propertyId
        ? api.patch('/properties/' + propertyId + '/', data)
        : api.post('/properties/', data)
    },
    onSuccess: async (_response, variables) => {
      await queryClient.invalidateQueries({ queryKey: ['properties'] })
      closePropertyModal()
      setFeedback({
        tone: 'success',
        message: variables.propertyId ? 'Property updated successfully.' : 'Property created successfully.',
      })
    },
    onError: error => {
      setSaveErrors(normalizeApiErrors(responseData(error)))
      setFeedback(null)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete('/properties/' + id + '/'),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['properties'] })
      setDeleteId(null)
      setFeedback({ tone: 'success', message: 'Property deleted successfully.' })
    },
    onError: () => {
      setDeleteId(null)
      setFeedback({ tone: 'danger', message: 'The property could not be deleted.' })
    },
  })

  const columns: Column<PropertyRecord>[] = [
    {
      key: 'property_title',
      label: 'Property',
      render: property => (
        <div className="flex items-center gap-2.5">
          {property.main_image ? (
            <Image src={property.main_image} alt="" width={42} height={42} className="w-[42px] h-[42px] rounded-lg object-cover bg-border-soft" />
          ) : (
            <div className="w-[42px] h-[42px] rounded-lg bg-border-soft" />
          )}
          <div>
            <div className="font-semibold text-ink">{property.property_title}</div>
            <div className="text-[11.5px] text-text-faint font-mono">{property.property_id || 'No ID'}</div>
          </div>
        </div>
      ),
      sortVal: property => property.property_title,
    },
    {
      key: 'property_location',
      label: 'Location',
      render: property => <span className="text-text-soft">{property.property_location}</span>,
    },
    {
      key: 'category_name',
      label: 'Category',
      render: property => <span className="inline-flex items-center text-[11px] font-semibold px-2.5 py-1 rounded-full bg-border-soft text-text-soft">{property.category_name}</span>,
    },
    {
      key: 'price',
      label: 'Price',
      render: property => <span className="font-semibold font-mono text-ink">{property.price}</span>,
      sortVal: property => property.price_amount ?? 0,
    },
    {
      key: 'property_status',
      label: 'Status',
      render: property => (
        <span className={`inline-flex items-center text-[11px] font-semibold px-2.5 py-1 rounded-full ${property.property_status === 'For Sale' ? 'bg-brass-tint text-brass-dark' : 'bg-success-tint text-success'}`}>
          {property.property_status}
        </span>
      ),
    },
    {
      key: 'actions',
      label: '',
      render: property => (
        <div className="flex items-center gap-1.5 justify-end">
          <button
            type="button"
            aria-label={'Edit ' + property.property_title}
            title="Edit property"
            onClick={event => {
              event.stopPropagation()
              openEdit(property)
            }}
            className="w-8 h-8 rounded-lg border border-border bg-card flex items-center justify-center text-text-soft hover:bg-canvas hover:text-text-main"
          >
            <Edit aria-hidden="true" size={14} />
          </button>
          <button
            type="button"
            aria-label={'Delete ' + property.property_title}
            title="Delete property"
            onClick={event => {
              event.stopPropagation()
              setDeleteId(property.id)
            }}
            className="w-8 h-8 rounded-lg border border-danger-tint bg-danger-tint text-danger flex items-center justify-center hover:bg-[#f6d9d6]"
          >
            <Trash2 aria-hidden="true" size={14} />
          </button>
        </div>
      ),
    },
  ]

  const lookupLoading = categoriesQuery.isLoading || agentsQuery.isLoading || facilitiesQuery.isLoading
  const lookupError = categoriesQuery.isError || agentsQuery.isError || facilitiesQuery.isError

  const retryLookups = () => {
    void Promise.all([
      categoriesQuery.refetch(),
      agentsQuery.refetch(),
      facilitiesQuery.refetch(),
    ])
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <div className="page-eyebrow">Properties</div>
          <div className="page-title">All Properties</div>
          <div className="page-desc">Manage every property record shown across the site.</div>
        </div>
        <button type="button" onClick={openCreate} className="btn btn-brass">
          <Plus aria-hidden="true" size={16} /> Add Property
        </button>
      </div>

      {feedback ? (
        <div
          role={feedback.tone === 'danger' ? 'alert' : 'status'}
          className={`mb-4 flex items-center gap-2 rounded-lg border px-3.5 py-3 text-[12.5px] font-semibold ${feedback.tone === 'success' ? 'border-success/20 bg-success-tint text-success' : 'border-danger/20 bg-danger-tint text-danger'}`}
        >
          {feedback.tone === 'success' ? <CheckCircle2 aria-hidden="true" size={16} /> : <AlertCircle aria-hidden="true" size={16} />}
          {feedback.message}
        </div>
      ) : null}

      {propertiesQuery.isLoading ? (
        <div className="flex items-center justify-center py-20" role="status" aria-label="Loading properties">
          <div className="w-8 h-8 border-3 border-border border-t-brass rounded-full animate-spin" />
        </div>
      ) : propertiesQuery.isError ? (
        <div className="rounded-lg border border-danger-tint bg-danger-tint p-6 text-center text-danger">
          <p className="text-[13px] font-semibold">Properties could not be loaded.</p>
          <button type="button" className="btn btn-ghost mt-3" onClick={() => propertiesQuery.refetch()}>Retry</button>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={normalizeResults(propertiesQuery.data)}
          searchKey="property_title"
          searchPlaceholder="Search properties..."
          onRowClick={openEdit}
        />
      )}

      <Modal
        open={modalOpen}
        onClose={closePropertyModal}
        title={editing ? 'Edit Property' : 'Add Property'}
        description={editing ? 'Update listing details and replace media when needed.' : 'Create a property listing for the public site.'}
        size="xl"
        footer={(
          <>
            <button type="button" onClick={closePropertyModal} className="btn btn-ghost" disabled={saveMutation.isPending}>Cancel</button>
            <button
              type="submit"
              form="property-editor-form"
              className="btn btn-brass"
              disabled={saveMutation.isPending || lookupLoading || lookupError}
            >
              {saveMutation.isPending ? 'Saving...' : editing ? 'Save Changes' : 'Create Property'}
            </button>
          </>
        )}
      >
        <PropertyForm
          key={editing ? 'edit-' + editing.id : 'create'}
          initialProperty={editing}
          categories={normalizeResults(categoriesQuery.data)}
          agents={normalizeResults(agentsQuery.data)}
          facilities={normalizeResults(facilitiesQuery.data)}
          lookupsLoading={lookupLoading}
          lookupError={lookupError}
          apiErrors={saveErrors}
          onRetryLookups={retryLookups}
          onSubmit={values => saveMutation.mutate({ values, propertyId: editing?.id })}
        />
      </Modal>

      <Modal open={deleteId !== null} onClose={() => setDeleteId(null)} title="Delete Property" size="default">
        <p className="text-text-soft text-[13.5px]">Are you sure you want to delete this property? This action cannot be undone.</p>
        <div className="flex justify-end gap-2.5 mt-5">
          <button type="button" onClick={() => setDeleteId(null)} className="btn btn-ghost">Cancel</button>
          <button
            type="button"
            onClick={() => {
              if (deleteId !== null) deleteMutation.mutate(deleteId)
            }}
            className="px-4 py-2 rounded-lg text-[13.5px] font-semibold bg-danger text-white hover:bg-[#b03e35]"
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </Modal>
    </div>
  )
}
```

- [ ] **Step 3: Run the complete unit and static-check suite**

Run from `admin-frontend`:

```powershell
npm test
npm run lint
npx tsc --noEmit --pretty false
```

Expected: all property contract, media, form, and smoke tests pass; lint and TypeScript exit 0.

- [ ] **Step 4: Commit the API integration**

```powershell
git add admin-frontend/src/lib/api.ts 'admin-frontend/src/app/(admin)/properties/page.tsx'
git commit -m 'feat(admin): connect property editor to API'
```

### Task 6: API Contract Test and Rendered QA

**Files:**
- Modify: `signatureapp/tests.py`
- Temporarily create then delete: `admin-frontend/src/app/property-editor-preview/page.tsx`
- Temporarily modify then restore: `admin-frontend/src/components/layout/AdminShell.tsx`

- [ ] **Step 1: Add an isolated Django multipart create/update test**

Add these imports to `signatureapp/tests.py`:

```python
import tempfile
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
```

Append this test class to `signatureapp/tests.py`:

```python
class PropertyApiMutationTests(APITestCase):
    def setUp(self):
        self.media_directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.media_directory.cleanup)
        self.media_override = self.settings(MEDIA_ROOT=self.media_directory.name)
        self.media_override.enable()
        self.addCleanup(self.media_override.disable)
        self.user = get_user_model().objects.create_user(
            username='property-editor-test',
            password='test-pass',
        )
        self.client.force_authenticate(self.user)
        self.category = catagory.objects.create(
            catagorys='Apartment',
            slug='property-editor-apartment',
            icon=_icon(),
        )
        self.facility = facilities.objects.create(
            facilities_name='Parking',
            slug='property-editor-parking',
        )

    def payload(self):
        return {
            'property_id': 'SPS-TEST-1',
            'property_title': 'Property Editor Test',
            'slug': 'property-editor-test',
            'price': '8,500,000 ETB',
            'property_types': self.category.id,
            'agent': '',
            'facilitie': [self.facility.id],
            'property_location': 'Bole',
            'property_size': 160,
            'property_area': 180,
            'property_status': 'For Sale',
            'property_floor': 6,
            'bedrooms': '3',
            'bathrooms': '2',
            'furnished': 'Furnished',
            'property_short_discription': 'Created through the admin property editor contract.',
            'video_link': '',
            'main_image': _icon(),
        }

    def test_create_property_with_multipart_relations_and_image(self):
        response = self.client.post('/api/properties/', self.payload(), format='multipart')
        self.assertEqual(response.status_code, 201, response.data)
        created = propertys.objects.get(slug='property-editor-test')
        self.assertEqual(created.property_types, self.category)
        self.assertEqual(list(created.facilitie.all()), [self.facility])
        self.assertTrue(created.main_image.name)

    def test_patch_without_image_preserves_existing_image(self):
        response = self.client.post('/api/properties/', self.payload(), format='multipart')
        self.assertEqual(response.status_code, 201, response.data)
        created = propertys.objects.get(slug='property-editor-test')
        original_image = created.main_image.name

        patch_response = self.client.patch(
            '/api/properties/{}/'.format(created.id),
            {
                'property_title': 'Updated Property Editor Test',
                'agent': '',
                'facilitie': [self.facility.id],
                'video_link': '',
            },
            format='multipart',
        )

        self.assertEqual(patch_response.status_code, 200, patch_response.data)
        created.refresh_from_db()
        self.assertEqual(created.property_title, 'Updated Property Editor Test')
        self.assertEqual(created.main_image.name, original_image)
```

- [ ] **Step 2: Run the isolated API contract tests**

Run from the repository root:

```powershell
python manage.py test signatureapp.tests.PropertyApiMutationTests -v 2
```

Expected: two tests pass against Django's temporary test database; the working `db.sqlite3` is not modified.

- [ ] **Step 3: Commit the API characterization test**

```powershell
git add signatureapp/tests.py
git commit -m 'test: cover property multipart mutations'
```

- [ ] **Step 4: Create an unauthenticated development-only preview for browser QA**

Create `admin-frontend/src/app/property-editor-preview/page.tsx`:

```tsx
'use client'

import { useState } from 'react'
import PropertyForm from '@/components/properties/PropertyForm'
import Modal from '@/components/ui/Modal'

export default function PropertyEditorPreviewPage() {
  const [saved, setSaved] = useState(false)

  return (
    <div className="min-h-screen bg-canvas">
      <Modal
        open
        onClose={() => undefined}
        title="Add Property"
        description="Create a property listing for the public site."
        size="xl"
        footer={(
          <button type="submit" form="property-editor-form" className="btn btn-brass">
            Create Property
          </button>
        )}
      >
        {saved ? <div role="status" className="mb-4 rounded-lg bg-success-tint px-3 py-2 text-success">Preview property saved.</div> : null}
        <PropertyForm
          initialProperty={null}
          categories={[{ id: 2, catagorys: 'Apartment' }, { id: 3, catagorys: 'Villa' }]}
          agents={[{ id: 4, name: 'Marta Alemu' }]}
          facilities={[
            { id: 1, facilities_name: 'Parking' },
            { id: 2, facilities_name: 'Security' },
            { id: 3, facilities_name: 'Elevator' },
          ]}
          lookupsLoading={false}
          lookupError={false}
          apiErrors={null}
          onRetryLookups={() => undefined}
          onSubmit={() => setSaved(true)}
        />
      </Modal>
    </div>
  )
}
```

In `admin-frontend/src/components/layout/AdminShell.tsx`, add a development-only preview guard alongside `isLogin`:

```tsx
const isPreview = process.env.NODE_ENV === 'development' && pathname === '/property-editor-preview'
```

Exclude that route from the auth redirect and return its children directly:

```tsx
if (!isLogin && !isPreview && !loading && !user) router.replace('/login')
```

```tsx
if (isLogin || isPreview) return children
```

Include `isPreview` in the auth effect dependency array.

- [ ] **Step 5: Run the browser validation loop**

Start or reuse the development server at `http://127.0.0.1:3000`, then use the Browser plugin against `http://127.0.0.1:3000/property-editor-preview`.

Required checks:

1. Confirm URL and title, a meaningful DOM snapshot, no framework overlay, and no console warnings/errors.
2. Capture the expanded Basic Info modal at a desktop viewport.
3. Open Media, submit the empty form, and verify the form returns to Basic Info with `Enter a property title.` visible.
4. Enter title `Bole Garden Apartment` and verify slug `bole-garden-apartment`.
5. Enter price and location, select a category, select Parking, submit, and verify `Preview property saved.` appears.
6. Capture Basic Info, Amenities, and Media screenshots.
7. Repeat layout checks at a mobile viewport around 390 by 844; verify the two-column grid becomes one column and controls do not clip or overlap.
8. Collapse and expand the sidebar on the normal authenticated route when an authenticated session is available; otherwise verify the preview modal at desktop and mobile sizes.

Save screenshots outside the repository and record any intentional mismatch from the HTML reference.

- [ ] **Step 6: Remove every preview-only source change**

Delete `admin-frontend/src/app/property-editor-preview/page.tsx` and restore `AdminShell.tsx` so only `isLogin` bypasses authentication. Confirm `git status --short` contains no preview route or `AdminShell.tsx` modification.

- [ ] **Step 7: Run the full final verification suite**

Stop the development server before clearing generated output. Resolve and remove `admin-frontend/.next`, then run:

```powershell
cd admin-frontend
npm test
npm run lint
npx tsc --noEmit --pretty false
npm run build
cd ..
python manage.py test signatureapp.tests.PropertyApiMutationTests -v 2
git diff --check
```

Expected:

- Frontend unit tests pass.
- ESLint and TypeScript exit 0.
- Next.js production build completes and includes `/properties` but no `/property-editor-preview` route.
- The two isolated Django API tests pass.
- `git diff --check` reports no whitespace errors.

- [ ] **Step 8: Restart the development server and review the final diff**

Restart on `http://127.0.0.1:3000`. Run `git status --short` and `git diff --stat`; verify only the property editor implementation, test harness, and API characterization test are part of this feature. Do not stage `db.sqlite3`, `signatureapp/models.py`, the spreadsheet, root logo copies, or the HTML reference.
