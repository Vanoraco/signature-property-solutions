export interface PermissionRecord {
  id: number
  name: string
  codename: string
  model: string
  app_label: string
}

export type { GroupRecord } from '@/components/users/types'

export interface PermissionCollection {
  count: number
  results: PermissionRecord[]
}
