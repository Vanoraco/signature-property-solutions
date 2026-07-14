export interface CategoryRecord {
  id: number
  catagorys: string
  slug: string
  icon: string | null
  property_count: number
}

export interface FacilityRecord {
  id: number
  facilities_name: string
  slug: string
  property_count: number
}

export type LookupRecord = CategoryRecord | FacilityRecord
export type LookupKind = 'categories' | 'facilities'
