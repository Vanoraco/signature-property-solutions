export interface ApiCollection<T> {
  count: number
  results: T[]
}

export interface PaginatedApiResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

export interface Property {
  id: number
  property_title: string
  price: string
  property_location: string
  property_status: string
  category_name: string
  agent_name: string | null
  main_image: string | null
  bedrooms: string
  bathrooms: string
}

export interface Agent {
  id: number
  name: string
}

export interface PropertyRequest {
  id: number
  name: string
  phone_number: string
  email: string
  property_type: string
  goal: string
  location: string
  is_reviewed: boolean
  created_at: string
}

export interface Testimonial {
  id: number
  is_published: boolean
}
