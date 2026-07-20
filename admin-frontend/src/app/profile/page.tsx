'use client'

import Image from 'next/image'
import { Building2, CheckCircle2, KeyRound, Mail, ShieldCheck, UserRound } from 'lucide-react'
import { useAuth } from '@/lib/auth'

function getAccessLabel(isSuperuser?: boolean, isStaff?: boolean) {
  if (isSuperuser) return 'Super administrator'
  if (isStaff) return 'Staff administrator'
  return 'Authenticated user'
}

function getAccessScope(isSuperuser?: boolean, isStaff?: boolean) {
  if (isSuperuser) return 'Full workspace access across the admin panel.'
  if (isStaff) return 'Operational access for assigned admin modules.'
  return 'Standard authenticated workspace access.'
}

export default function ProfilePage() {
  const { user } = useAuth()
  const accessLabel = getAccessLabel(user?.is_superuser, user?.is_staff)
  const accessScope = getAccessScope(user?.is_superuser, user?.is_staff)
  const username = user?.username || 'Administrator'
  const email = user?.email || 'No email provided'
  const userId = user?.id ? `USR-${String(user.id).padStart(4, '0')}` : 'USR-0000'

  return (
    <div className="max-w-[1100px]">
      <div className="page-head">
        <div>
          <div className="page-eyebrow">Account</div>
          <h1 className="page-title">Profile</h1>
          <p className="page-desc">A private account dossier for the Signature Property Solutions workspace.</p>
        </div>
      </div>

      <section className="profile-dossier" aria-labelledby="profile-identity-title">
        <header className="profile-dossier-hero">
          <div className="profile-dossier-brand" aria-hidden="true">
            <Image src="/favicon.png" alt="" width={64} height={64} />
          </div>
          <div className="profile-dossier-identity">
            <p className="profile-dossier-kicker">Signature Property Solutions</p>
            <h2 id="profile-identity-title">{username}</h2>
            <p>{email}</p>
          </div>
        </header>

        <div className="profile-dossier-grid">
          <div className="profile-dossier-main">
            <div className="profile-section-heading">
              <div>
                <p className="profile-section-label">Identity record</p>
                <p className="profile-section-copy">The details attached to this administrator account.</p>
              </div>
              <span className="chip chip-brass">{accessLabel}</span>
            </div>

            <dl className="profile-info-list">
              <div className="profile-info-row">
                <dt><UserRound size={15} aria-hidden="true" /> Username</dt>
                <dd>{username}</dd>
              </div>
              <div className="profile-info-row">
                <dt><Mail size={15} aria-hidden="true" /> Email address</dt>
                <dd>{email}</dd>
              </div>
              <div className="profile-info-row">
                <dt><ShieldCheck size={15} aria-hidden="true" /> Access level</dt>
                <dd>{accessLabel}</dd>
              </div>
              <div className="profile-info-row">
                <dt><KeyRound size={15} aria-hidden="true" /> Account ID</dt>
                <dd className="font-mono">{userId}</dd>
              </div>
            </dl>
          </div>

          <aside className="profile-dossier-side" aria-labelledby="profile-access-title">
            <div className="profile-section-heading profile-side-heading">
              <div className="profile-section-icon" aria-hidden="true">
                <Building2 size={17} />
              </div>
              <div>
                <p className="profile-section-label">Workspace access</p>
                <h2 id="profile-access-title">{accessLabel}</h2>
              </div>
            </div>
            <p className="profile-access-scope">{accessScope}</p>

            <dl className="profile-access-list">
              <div>
                <dt>Workspace</dt>
                <dd>Signature Property Solutions</dd>
              </div>
              <div>
                <dt>Account status</dt>
                <dd className="profile-active-value"><CheckCircle2 size={14} aria-hidden="true" /> Active</dd>
              </div>
              <div>
                <dt>Signed-in identity</dt>
                <dd>{username}</dd>
              </div>
            </dl>
          </aside>
        </div>
      </section>
    </div>
  )
}
