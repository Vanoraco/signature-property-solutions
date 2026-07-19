export interface UserRecord {
  id: number
  username: string
  email: string
  first_name: string
  last_name: string
  is_staff: boolean
  is_active: boolean
  is_superuser: boolean
  groups: number[]
  group_names: string[]
  date_joined: string
  last_login: string | null
}

export interface GroupRecord {
  id: number
  name: string
  user_count: number
}
