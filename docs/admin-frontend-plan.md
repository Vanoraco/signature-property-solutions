# Admin Frontend — Implementation Plan

> **Stack:** Next.js 14 (App Router) + DRF + TanStack Query + React Hook Form + Zod + Tailwind CSS
>
> **Design reference:** `signature-property-solutions-admin-final.html`

---

## Architecture

```
signature-property-solutions/
├── signature/                  # Django backend (existing)
│   ├── api/                    # NEW — DRF serializers, viewsets, permissions
│   ├── models.py               # Existing models
│   └── settings.py             # Add DRF, corsheaders
│
└── admin-frontend/             # NEW — Next.js 14 app
    ├── app/
    │   ├── layout.tsx          # Root layout (sidebar + topbar)
    │   ├── page.tsx            # Dashboard
    │   ├── (admin)/            # Protected admin routes
    │   │   ├── layout.tsx      # Admin layout with sidebar
    │   │   ├── properties/     # Property CRUD
    │   │   ├── categories/     # Category CRUD
    │   │   ├── facilities/     # Facility CRUD
    │   │   ├── agents/         # Agent CRUD
    │   │   ├── services/       # Service CRUD
    │   │   ├── testimonials/   # Testimonial CRUD
    │   │   ├── requests/       # Property requests (leads)
    │   │   ├── search/         # Search analytics
    │   │   ├── content/        # Home, About, Contact page editors
    │   │   ├── users/          # User management
    │   │   ├── roles/          # Roles & permissions
    │   │   ├── activity/       # Activity log
    │   │   ├── leaderboard/    # Agent leaderboard
    │   │   └── media/          # Media library
    │   └── api/                # Next.js API routes (proxy to DRF)
    ├── components/
    │   ├── ui/                 # Button, Input, Select, Modal, etc.
    │   ├── layout/             # Sidebar, Topbar, CommandPalette
    │   ├── tables/             # DataTable with sort, search, pagination
    │   ├── forms/              # PropertyForm, CategoryForm, etc.
    │   ├── dashboard/          # Stats, Charts, Map
    │   └── media/              # Upload, Gallery, MediaPicker
    ├── lib/
    │   ├── api.ts              # DRF API client (axios/fetch)
    │   ├── auth.ts             # JWT auth helpers
    │   └── utils.ts            # Formatters, helpers
    ├── hooks/
    │   ├── useProperties.ts    # TanStack Query hooks per entity
    │   ├── useCategories.ts
    │   └── ...
    ├── validators/
    │   ├── property.ts         # Zod schemas
    │   ├── category.ts
    │   └── ...
    ├── stores/
    │   └── ui.ts               # Sidebar state, theme, etc.
    └── styles/
        └── globals.css         # Tailwind + design tokens from HTML
```

---

## Phase 1: Foundation (Days 1–3)

### 1.1 DRF API Setup
- Install `djangorestframework`, `django-cors-headers`, `djangorestframework-simplejwt`
- Create `signature/api/` package
- Configure DRF in `settings.py` (pagination, auth, permissions)
- Add CORS config for `localhost:3000`

### 1.2 DRF Serializers + ViewSets
Create serializers and viewsets for all existing models:

| Model | Serializer | ViewSet | Endpoints |
|-------|-----------|---------|-----------|
| `propertys` | `PropertySerializer` | `PropertyViewSet` | `/api/properties/` |
| `catagory` | `CategorySerializer` | `CategoryViewSet` | `/api/categories/` |
| `facilities` | `FacilitySerializer` | `FacilityViewSet` | `/api/facilities/` |
| `egent` | `AgentSerializer` | `AgentViewSet` | `/api/agents/` |
| `home` | `HomeSerializer` | `HomeViewSet` | `/api/home/` |
| `about` | `AboutSerializer` | `AboutViewSet` | `/api/about/` |
| `contact` | `ContactSerializer` | `ContactViewSet` | `/api/contact/` |
| `serevices` | `ServiceSerializer` | `ServiceViewSet` | `/api/services/` |
| `testimonial` | `TestimonialSerializer` | `TestimonialViewSet` | `/api/testimonials/` |
| `property_request` | `PropertyRequestSerializer` | `PropertyRequestViewSet` | `/api/requests/` |
| `search_queries` | `SearchQuerySerializer` | `SearchQueryViewSet` | `/api/search-queries/` |

### 1.3 Next.js Scaffold
```bash
npx create-next-app@latest admin-frontend --typescript --tailwind --app --src-dir
```
- Configure Tailwind with design tokens from HTML (`--ink`, `--brass`, `--canvas`, etc.)
- Set up `globals.css` with CSS variables
- Install: `@tanstack/react-query`, `react-hook-form`, `@hookform/resolvers`, `zod`, `axios`, `lucide-react`, `recharts`, `leaflet`

### 1.4 Auth System
- Login page (JWT token-based)
- `AuthProvider` context
- Protected route middleware
- Token refresh logic

---

## Phase 2: Layout + Core Components (Days 4–6)

### 2.1 App Shell
- **Sidebar** — collapsible, dark theme, nav groups, role-based visibility
- **Topbar** — breadcrumb, search, notifications, theme toggle, user menu
- **Command palette** — `Cmd+K` global search
- **Mobile responsive** — sidebar drawer, stacked layouts

### 2.2 Reusable UI Components
Build from the HTML design tokens:

| Component | Description |
|-----------|-------------|
| `Button` | Primary, brass, ghost, danger-ghost, sm variants |
| `Input` | Text, email, number, url with focus brass border |
| `Select` | Dropdown with options |
| `Textarea` | Auto-resize |
| `Modal` | Standard and large variants with overlay |
| `ConfirmModal` | Delete confirmation |
| `Chip` | Brass, success, danger, gray variants |
| `Toggle` | On/off switch |
| `Badge` | Count and dot variants |
| `Toast` | Success/danger notifications |
| `DataTable` | Sort, search, pagination, bulk select |
| `ImageUpload` | Single image + gallery |
| `RichTextEditor` | Basic toolbar (bold, italic, lists, links) |
| `RatingInput` | Star rating 1–5 |
| `DropZone` | Drag-and-drop file upload |
| `KanbanBoard` | Drag-and-drop columns |

### 2.3 DataTable Component
The most reused component — powers all CRUD pages:
- Column definition with custom render functions
- Sort by any column (ascending/descending)
- Search/filter toolbar
- Pagination (page size: 8, 16, 25)
- Row selection for bulk actions
- Saved views (persisted in localStorage)

---

## Phase 3: Dashboard (Days 7–9)

### 3.1 Stats Cards
- Total properties, active listings, new requests this month, total agents
- Trend indicators (up/down percentages)

### 3.2 Charts (Recharts)
- **Requests trend** — line chart (weekly)
- **Visitors trend** — line chart (daily, visitors + pageviews)
- **Traffic sources** — doughnut chart
- **Device split** — doughnut chart
- **Top searches** — horizontal bar chart

### 3.3 Property Map (Leaflet)
- Map pins for all properties (color-coded: sale vs rent)
- Popup with property details, price, agent
- Legend

### 3.4 Activity Log Feed
- Recent actions (who did what, when)
- Module + label links

---

## Phase 4: CRUD Pages (Days 10–18)

### 4.1 Simple CRUD (Categories, Facilities, Agents)
Each follows the same pattern:
- DataTable listing with search + sort
- "Add New" button → Modal with form
- Edit action → Modal pre-filled
- Delete action → Confirm modal
- TanStack Query for data fetching + cache invalidation

### 4.2 Property CRUD (Most Complex)
- **Tabbed form**: Basic Info → Location & Pricing → Amenities → Media
- **FK selects**: Category, Agent (populated from API)
- **M2M multi-select**: Facilities (chip-style toggles)
- **Image upload**: Main image + gallery (drag reorder)
- **Price history**: Display past price changes
- **Bulk actions**: Select multiple → delete, change status
- **Availability status**: Available / Sold / Rented Out

### 4.3 Content Pages (Home, About, Contact)
- **Home**: Hero image, slogan, title, CTA labels, video URL
- **About**: Rich text sections (About Us, Vision, Mission, Value, Why Choose Us) + CEO info
- **Contact**: Map embed URL, phone, email, social links, site notice

### 4.4 Services + Testimonials
- Rich text editor for descriptions
- Image upload for icons/covers
- Rating input for testimonials
- Published/draft toggle

### 4.5 Property Requests (Leads)
- **Table view** with pipeline stage chips
- **Kanban board view** (drag between stages: New → Contacted → Viewing → Offer → Won/Lost)
- Pipeline stages: New, Contacted, Viewing Scheduled, Offer Made, Closed Won, Closed Lost
- Mark as reviewed toggle
- Source page tracking

### 4.6 Search Analytics
- Read-only table (no CRUD)
- Query text, filters, price range, results count, converted (clicked property)
- Date filtering
- Export to CSV

---

## Phase 5: Team & Access (Days 19–22)

### 5.1 Users
- User list with avatar, role chip, status chip, last login
- Invite / edit / suspend actions
- Role assignment

### 5.2 Roles & Permissions
- Role list with color indicators
- Permission matrix (module × level: none / view / manage)
- Role preview mode (see sidebar as that role would see it)
- Predefined roles: Administrator, Property Manager, Marketing Editor, Agent

### 5.3 Activity Log
- Filterable by user, module, action type
- Timestamp + description

### 5.4 Agent Leaderboard
- Performance stats per agent
- Listings count, requests handled, conversion rate
- Chart visualization

---

## Phase 6: Media Library (Days 23–24)

- Grid view of all uploaded images
- Drag-and-drop upload zone
- Search / filter by type
- Select for use in forms (media picker modal)
- Delete with confirmation
- File size + upload date metadata

---

## Phase 7: Polish + Deploy (Days 25–28)

### 7.1 Theme
- Light/dark mode toggle (CSS variables from HTML)
- Persist preference in localStorage

### 7.2 Performance
- Image optimization (Next.js `Image` component)
- API response caching (TanStack Query)
- Lazy loading for charts/map
- Code splitting per route

### 7.3 Error Handling
- API error boundaries
- Form validation feedback (Zod + RHF)
- Loading skeletons
- Empty states

### 7.4 Deployment
- Vercel for Next.js frontend
- Keep Django on Hostinger VPS
- Environment variables for API URL
- CORS configuration for production domain

---

## Zod Schemas (Examples)

```typescript
// validators/property.ts
import { z } from 'zod'

export const propertySchema = z.object({
  property_title: z.string().min(1, 'Title is required'),
  slug: z.string().min(1, 'Slug is required'),
  property_status: z.enum(['For Sale', 'For Rent']),
  availability: z.enum(['Available', 'Sold', 'Rented Out']),
  property_types: z.number().min(1, 'Category is required'),
  agent: z.number().min(1, 'Agent is required'),
  price: z.string().min(1, 'Price is required'),
  property_location: z.string().min(1, 'Location is required'),
  property_size: z.number().optional(),
  property_area: z.number().optional(),
  property_floor: z.number().optional(),
  bedrooms: z.string().optional(),
  bathrooms: z.string().optional(),
  furnished: z.enum(['Furnished', 'Unfurnished', 'Semi-furnished']).optional(),
  facilitie: z.array(z.number()).optional(),
  propertyshortdiscription: z.string().optional(),
  main_image: z.string().optional(),
  gallery: z.array(z.string()).optional(),
  video_link: z.string().url().optional().or(z.literal('')),
  commission_rate: z.number().min(0).max(100).optional(),
})

export type PropertyFormData = z.infer<typeof propertySchema>
```

---

## API Client (Example)

```typescript
// lib/api.ts
import axios from 'axios'

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api',
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export default api

// hooks/useProperties.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'

export function useProperties(params?: Record<string, string>) {
  return useQuery({
    queryKey: ['properties', params],
    queryFn: () => api.get('/properties/', { params }).then(r => r.data),
  })
}

export function useCreateProperty() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: FormData) => api.post('/properties/', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['properties'] }),
  })
}
```

---

## File Map — Tasks

| Task | Files | Description |
|------|-------|-------------|
| T1 | `signature/api/`, `settings.py` | DRF setup + serializers + viewsets |
| T2 | `admin-frontend/` scaffold | Next.js + Tailwind + dependencies |
| T3 | `components/ui/*` | All reusable UI components |
| T4 | `components/layout/*` | Sidebar, Topbar, CommandPalette |
| T5 | `app/(admin)/page.tsx` | Dashboard with stats, charts, map |
| T6 | `app/(admin)/properties/` | Property CRUD (tabbed form) |
| T7 | `app/(admin)/categories/`, `facilities/`, `agents/` | Simple CRUD pages |
| T8 | `app/(admin)/services/`, `testimonials/` | Rich text CRUD |
| T9 | `app/(admin)/content/` | Home, About, Contact editors |
| T10 | `app/(admin)/requests/` | Leads table + Kanban |
| T11 | `app/(admin)/search/` | Search analytics (read-only) |
| T12 | `app/(admin)/users/`, `roles/`, `activity/` | Team & access |
| T13 | `app/(admin)/leaderboard/` | Agent performance |
| T14 | `app/(admin)/media/` | Media library |
| T15 | Auth system | Login, JWT, middleware |
| T16 | Theme + polish | Dark/light mode, responsive, errors |
| T17 | Deploy | Vercel + CORS + env vars |
