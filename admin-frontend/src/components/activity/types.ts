export interface ActivityLogEntry {
  id: number
  actor: number | null
  actor_username: string
  action: string
  target_model: string
  target_id: number | null
  target_label: string
  summary: string
  created_at: string
}
