export interface AgentRecord {
  id: number
  name: string
  image: string | null
  phone_number: string
  office_phone: string
  email: string
  facebook: string
  instagram: string
  linkden: string
  listing_count: number
}

export type AgentCollection = AgentRecord[] | { results: AgentRecord[] }
