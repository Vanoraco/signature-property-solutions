export interface HomeRecord {
  id: number
  image: string | null
  slogon: string
  title: string
  video: string | null
}

export interface AboutRecord {
  id: number
  image: string | null
  hading: string
  title: string
  aboutus: string
  aboutus_image: string | null
  vision: string
  vision_image: string | null
  mission: string
  mission_image: string | null
  value: string
  value_image: string | null
  why_choose_us_header: string
  tytle: string
  description: string
  ceo_image: string | null
  ceo_name: string
  ceo_position: string
  ceo_description: string
  ceo_facebook: string
  ceo_twitter: string
  ceo_linkden: string
  hero_lead: string
  commitment_promise: string
  commitment: string
  hero_eyebrow: string
  hero_title: string
  vision_statement: string
  mission_statement: string
  why_choose_title: string
  intro_paragraphs: OrderedTextRecord[]
  value_items: AboutValueItemRecord[]
  why_items: AboutWhyItemRecord[]
  commitment_paragraphs: OrderedTextRecord[]
}

export interface OrderedTextRecord {
  id: number
  key: string
  text: string
  order: number
}

export interface AboutValueItemRecord extends OrderedTextRecord {
  tag: string
}

export interface AboutWhyItemRecord extends OrderedTextRecord {
  title: string
}

export interface ContactRecord {
  id: number
  google_map: string
  phone_number: string
  office_phone: string
  email: string
  website: string
  address: string
  facebook: string
  instagram: string
  linkden: string
}

export interface ServicesPageItemRecord {
  id: number
  key: string
  title: string
  text: string
  order: number
}

export interface ServicesPageRecord {
  id: number
  hero_eyebrow: string
  hero_title: string
  hero_lead: string
  hero_image: string | null
  intro: string
  why_choose_title: string
  process_title: string
  why_items: ServicesPageItemRecord[]
  process_steps: ServicesPageItemRecord[]
  service_items: ServicesPageServiceRecord[]
}

export interface ServicesPageServiceRecord {
  id: number
  key: string
  tag: string
  title: string
  tagline: string
  order: number
  paragraphs: OrderedTextRecord[]
  tag_groups: ServicesPageServiceTagGroupRecord[]
}

export interface ServicesPageServiceTagGroupRecord {
  id: number
  key: string
  title: string
  order: number
  items: OrderedTextRecord[]
}

export type SingletonCollection<T> = T[] | { results: T[] }

export function pickSingleton<T extends { id: number }>(
  data: SingletonCollection<T> | undefined,
): T | null {
  if (!data) return null
  const results = Array.isArray(data) ? data : data.results
  return results.reduce<T | null>(
    (latest, item) => (!latest || item.id > latest.id ? item : latest),
    null,
  )
}
