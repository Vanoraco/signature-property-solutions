'use client'

import { Mail, ShieldCheck, UserRound } from 'lucide-react'
import { useAuth } from '@/lib/auth'

function getAccessLabel(isSuperuser?: boolean, isStaff?: boolean) {
  if (isSuperuser) return 'Super administrator'
  if (isStaff) return 'Staff administrator'
  return 'Authenticated user'
}

function getInitials(value?: string) {
  if (!value) return 'A'
  const parts = value.trim().split(/[\s._-]+/).filter(Boolean)
  return parts.slice(0, 2).map(part => part[0]).join('').toUpperCase() || 'A'
}

export default function ProfilePage() {
  const { user } = useAuth()
  const accessLabel = getAccessLabel(user?.is_superuser, user?.is_staff)

  return (
    <div className="max-w-[760px]">
      <div className="page-head">
        <div>
          <div className="page-eyebrow">Account</div>
          <h1 className="page-title">Profile</h1>
          <p className="page-desc">Your account details.</p>
        </div>
      </div>

      <section className="overflow-hidden rounded-[8px] border border-border bg-card shadow-sm" aria-label="Profile details">
        <div className="flex items-center gap-4 border-b border-border-soft px-5 py-5 sm:px-6">
          <span className="avatar profile-avatar" aria-hidden="true">
            {getInitials(user?.username)}
          </span>
          <div className="min-w-0">
            <h2 className="truncate text-[16px] font-semibold text-text-main">{user?.username || 'Administrator'}</h2>
            <p className="truncate text-[13px] text-text-soft">{user?.email || 'No email provided'}</p>
          </div>
        </div>

        <dl className="divide-y divide-border-soft">
          <div className="grid gap-2 px-5 py-4 sm:grid-cols-[180px_1fr] sm:items-center sm:px-6">
            <dt className="flex items-center gap-2 text-[12.5px] font-medium text-text-soft">
              <UserRound size={15} aria-hidden="true" />
              Username
            </dt>
            <dd className="break-words text-[13.5px] font-medium text-text-main">{user?.username || 'Not available'}</dd>
          </div>
          <div className="grid gap-2 px-5 py-4 sm:grid-cols-[180px_1fr] sm:items-center sm:px-6">
            <dt className="flex items-center gap-2 text-[12.5px] font-medium text-text-soft">
              <Mail size={15} aria-hidden="true" />
              Email address
            </dt>
            <dd className="break-words text-[13.5px] font-medium text-text-main">{user?.email || 'Not provided'}</dd>
          </div>
          <div className="grid gap-2 px-5 py-4 sm:grid-cols-[180px_1fr] sm:items-center sm:px-6">
            <dt className="flex items-center gap-2 text-[12.5px] font-medium text-text-soft">
              <ShieldCheck size={15} aria-hidden="true" />
              Access level
            </dt>
            <dd className="text-[13.5px] font-medium text-text-main">{accessLabel}</dd>
          </div>
        </dl>
      </section>
    </div>
  )
}
