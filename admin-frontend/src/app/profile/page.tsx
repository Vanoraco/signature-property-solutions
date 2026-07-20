'use client'

import { KeyRound, LogOut, Mail, ShieldCheck, UserRound } from 'lucide-react'
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
  const { user, logout } = useAuth()
  const accessLabel = getAccessLabel(user?.is_superuser, user?.is_staff)
  const username = user?.username || 'Administrator'
  const email = user?.email || 'No email provided'

  return (
    <div className="max-w-[940px]">
      <div className="page-head">
        <div>
          <div className="page-eyebrow">Account</div>
          <h1 className="page-title">Profile</h1>
          <p className="page-desc">Your identity and access details for the admin panel.</p>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.45fr)_minmax(250px,.75fr)]">
        <section className="overflow-hidden rounded-[10px] border border-border bg-card shadow-sm" aria-labelledby="profile-identity-title">
          <div className="relative overflow-hidden border-b border-[rgba(201,162,39,.35)] bg-ink px-6 py-7 text-white sm:px-8">
            <div className="absolute inset-x-0 bottom-0 h-px bg-brass" aria-hidden="true" />
            <div className="relative flex items-center gap-4 sm:gap-5">
              <span className="avatar h-16 w-16 basis-16 border-2 border-brass-tint text-[20px]" aria-hidden="true">
                {getInitials(user?.username)}
              </span>
              <div className="min-w-0">
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-[1.8px] text-brass-tint">Account holder</p>
                <h2 id="profile-identity-title" className="truncate font-display text-[24px] font-semibold leading-tight">{username}</h2>
                <p className="mt-1 truncate text-[13px] text-white/65">{email}</p>
              </div>
            </div>
          </div>

          <div className="px-6 py-6 sm:px-8">
            <div className="mb-4 flex items-end justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[1.4px] text-brass-dark">Identity</p>
                <p className="mt-1 text-[12.5px] text-text-soft">The details attached to this admin account.</p>
              </div>
              <span className="chip chip-brass shrink-0">{accessLabel}</span>
            </div>

            <dl className="divide-y divide-border-soft border-y border-border-soft">
              <div className="grid gap-2 py-4 sm:grid-cols-[180px_1fr] sm:items-center">
                <dt className="flex items-center gap-2 text-[12.5px] font-medium text-text-soft">
                  <UserRound size={15} aria-hidden="true" />
                  Username
                </dt>
                <dd className="break-words text-[13.5px] font-medium text-text-main">{username}</dd>
              </div>
              <div className="grid gap-2 py-4 sm:grid-cols-[180px_1fr] sm:items-center">
                <dt className="flex items-center gap-2 text-[12.5px] font-medium text-text-soft">
                  <Mail size={15} aria-hidden="true" />
                  Email address
                </dt>
                <dd className="break-words text-[13.5px] font-medium text-text-main">{email}</dd>
              </div>
              <div className="grid gap-2 py-4 sm:grid-cols-[180px_1fr] sm:items-center">
                <dt className="flex items-center gap-2 text-[12.5px] font-medium text-text-soft">
                  <ShieldCheck size={15} aria-hidden="true" />
                  Access level
                </dt>
                <dd className="text-[13.5px] font-medium text-text-main">{accessLabel}</dd>
              </div>
            </dl>
          </div>
        </section>

        <div className="flex flex-col gap-5">
          <section className="rounded-[10px] border border-border bg-card p-5 shadow-sm" aria-labelledby="profile-access-title">
            <div className="mb-4 flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-[8px] border border-brass/25 bg-brass-tint text-brass-dark">
                <KeyRound size={17} aria-hidden="true" />
              </span>
              <div>
                <h2 id="profile-access-title" className="text-[14px] font-semibold text-text-main">Access</h2>
                <p className="text-[11.5px] text-text-faint">Current account permissions</p>
              </div>
            </div>
            <div className="border-t border-border-soft pt-4">
              <p className="text-[12px] uppercase tracking-[1.2px] text-text-faint">Signed in as</p>
              <p className="mt-1 break-words text-[13.5px] font-medium text-text-main">{username}</p>
              <p className="mt-2 text-[12.5px] leading-relaxed text-text-soft">{accessLabel} access is active for this workspace.</p>
            </div>
          </section>

          <section className="rounded-[10px] border border-danger/25 bg-card p-5 shadow-sm" aria-labelledby="profile-session-title">
            <div className="mb-3 flex items-center gap-3">
              <span className="profile-danger-icon grid h-9 w-9 place-items-center rounded-[8px] border border-danger/20 bg-danger-tint">
                <LogOut size={17} aria-hidden="true" />
              </span>
              <div>
                <h2 id="profile-session-title" className="text-[14px] font-semibold text-text-main">Session</h2>
                <p className="text-[11.5px] text-text-faint">Leave the admin panel</p>
              </div>
            </div>
            <p className="mb-4 text-[12.5px] leading-relaxed text-text-soft">Sign out when you are finished managing the site.</p>
            <button type="button" className="btn btn-danger-ghost profile-signout-button w-full justify-center" onClick={logout}>
              <LogOut size={15} aria-hidden="true" />
              Log out
            </button>
          </section>
        </div>
      </div>
    </div>
  )
}
