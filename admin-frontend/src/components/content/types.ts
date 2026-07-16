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

export type SingletonCollection<T> = T[] | { results: T[] }

export function pickSingleton<T extends { id: number }>(
  data: SingletonCollection<T> | undefined,
): T | null {
  if (!data) return null
  const results = Array.isArray(data) ? data : data.results
  return results.length > 0 ? results[0] : null
}
