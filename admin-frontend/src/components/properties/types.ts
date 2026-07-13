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
