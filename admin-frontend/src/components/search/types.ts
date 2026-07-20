export interface SearchEvent {
  id: number
  query: string
  source: string
  location_filter: string
  property_type: string
  status_filter: string
  results_count: number
  pathway: string
  created_at: string
}
