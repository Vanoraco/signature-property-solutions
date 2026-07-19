import type { PermissionRecord } from '@/components/roles/types'

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

export type GroupRecord = {
  id: number
  name: string
  user_count: number
  permissions: number[]
  permission_details: PermissionRecord[]
}

// Re-export so existing imports of GroupRecord from users/types keep working.
export type { PermissionRecord } from '@/components/roles/types'
