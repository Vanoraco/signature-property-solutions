'use client'
import { useQuery } from '@tanstack/react-query'
import Image from 'next/image'
import api from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { Building2, Users, Inbox, Star, Search, MapPin, RefreshCw } from 'lucide-react'

const visitors = [210, 238, 225, 260, 301, 190, 175, 254, 289, 312, 298, 205, 188, 231]
const requestsTrend = [4, 6, 5, 8, 7, 10, 9, 13]
const topSearches = [
  ['Apartment in Bole Atlas', 41],
  ['Penthouse for rent', 29],
  ['House for sale, Ayat', 24],
  ['Office space Bole', 19],
  ['Land for sale, CMC', 16],
]

function MiniBars({ values, brass = true }: { values: number[]; brass?: boolean }) {
  const max = Math.max(...values, 1)
  return (
    <div className="h-full flex items-end gap-2 px-1 pt-6">
      {values.map((v, i) => (
        <div key={i} className="flex-1 rounded-md" style={{ height: `${Math.max(12, (v / max) * 100)}%`, background: brass ? 'var(--brass)' : 'var(--silver)' }} />
      ))}
    </div>
  )
}

function MiniLine({ values }: { values: number[] }) {
  const max = Math.max(...values, 1)
  const min = Math.min(...values)
  const points = values.map((v, i) => {
    const x = (i / (values.length - 1)) * 100
    const y = 90 - ((v - min) / Math.max(1, max - min)) * 70
    return `${x},${y}`
  }).join(' ')
  return (
    <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible">
      <polyline points={points} fill="none" stroke="var(--ink)" strokeWidth="2.4" vectorEffect="non-scaling-stroke" />
      <polyline points={points} fill="none" stroke="var(--brass)" strokeWidth="1.4" vectorEffect="non-scaling-stroke" transform="translate(0 8)" opacity=".9" />
    </svg>
  )
}

function TrafficDonut() {
  return (
    <div className="h-full flex items-center gap-5">
      <div className="w-[132px] h-[132px] rounded-full" style={{ background: 'conic-gradient(var(--ink) 0 36%, var(--brass) 36% 69%, var(--success) 69% 89%, var(--silver) 89% 100%)' }}>
        <div className="w-[82px] h-[82px] rounded-full bg-card m-[25px]" />
      </div>
      <div className="flex-1 space-y-2">
        {[
          ['Direct', '36%', 'var(--ink)'],
          ['Google', '33%', 'var(--brass)'],
          ['Social', '20%', 'var(--success)'],
          ['Referral', '11%', 'var(--silver)'],
        ].map(([label, value, color]) => (
          <div key={label}>
            <div className="flex justify-between text-[11.5px] text-text-soft"><span>{label}</span><b className="text-ink">{value}</b></div>
            <div className="h-[5px] rounded bg-border-soft mt-1"><div className="h-full rounded" style={{ width: value, background: color }} /></div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { user } = useAuth()
  const enabled = !!user

  const { data: properties } = useQuery({ queryKey: ['properties'], queryFn: () => api.get('/properties/?page_size=100').then(r => r.data), enabled })
  const { data: agents } = useQuery({ queryKey: ['agents'], queryFn: () => api.get('/agents/').then(r => r.data), enabled })
  const { data: requests } = useQuery({ queryKey: ['requests'], queryFn: () => api.get('/requests/').then(r => r.data), enabled })
  const { data: testimonials } = useQuery({ queryKey: ['testimonials'], queryFn: () => api.get('/testimonials/').then(r => r.data), enabled })

  const propertyRows = properties?.results || []
  const requestRows = requests?.results || []
  const forSale = propertyRows.filter((p: any) => p.property_status === 'For Sale').length
  const forRent = propertyRows.filter((p: any) => p.property_status === 'For Rent').length
  const newLeads = requestRows.filter((r: any) => !r.is_reviewed).length

  const stats = [
    { label: 'Total Properties', value: properties?.count || 0, icon: Building2, sub: `${forSale} for sale · ${forRent} for rent` },
    { label: 'Active Agents', value: agents?.count || 0, icon: Users, sub: 'Across all listings' },
    { label: 'New Leads', value: newLeads, icon: Inbox, sub: `of ${requests?.count || 0} total requests` },
    { label: 'Published Testimonials', value: testimonials?.count || 0, icon: Star, sub: `${testimonials?.count || 0} total` },
  ]

  return (
    <div>
      <div className="page-head">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 relative flex-shrink-0">
            <Image src="/logo.png" alt="Signature Property Solutions" fill className="object-contain" />
          </div>
          <div>
            <div className="page-eyebrow">Overview</div>
            <div className="page-title">Good to see you, {user?.username || 'Admin'}</div>
            <div className="page-desc">Here&apos;s what&apos;s happening across Signature Property Solutions today.</div>
          </div>
        </div>
      </div>

      <div className="stat-grid">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <div key={stat.label} className="stat-card">
              <div className="stat-top"><div className="stat-icon"><Icon size={17} /></div></div>
              <div className="stat-value">{stat.value}</div>
              <div className="stat-label">{stat.label}</div>
              <div className="stat-label mt-2 text-[11.5px]">{stat.sub}</div>
            </div>
          )
        })}
      </div>

      <div className="charts-grid">
        <div className="panel">
          <div className="panel-head"><h3>Property Requests — Week over Week</h3><span className="stat-trend trend-up">+44% vs last week</span></div>
          <div className="chart-card"><MiniBars values={requestsTrend} /></div>
        </div>
        <div className="panel">
          <div className="panel-head"><h3>Website Visitors &amp; Page Views</h3><span className="count-chip">Last 14 days</span></div>
          <div className="chart-card"><MiniLine values={visitors} /></div>
        </div>
        <div className="panel">
          <div className="panel-head"><h3>What Visitors Are Searching For</h3><span className="count-chip">By search volume</span></div>
          <div className="chart-card">
            <div className="h-full flex flex-col justify-center gap-3">
              {topSearches.map(([label, count]) => (
                <div key={label}>
                  <div className="flex justify-between text-[11.5px] text-text-soft mb-1"><span>{label}</span><b className="text-ink">{count}</b></div>
                  <div className="h-2 rounded bg-border-soft"><div className="h-full rounded bg-silver" style={{ width: `${Number(count) * 2}%` }} /></div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="panel">
          <div className="panel-head"><h3>Traffic Sources</h3><span className="count-chip">Last 30 days</span></div>
          <div className="chart-card"><TrafficDonut /></div>
        </div>
      </div>

      <div className="panel mb-[18px]">
        <div className="map-panel-head">
          <h3 className="text-[14.5px] font-semibold text-ink">Property Locations</h3>
          <div className="map-legend">
            <span><i className="bg-brass" />For Sale ({forSale})</span>
            <span><i className="bg-success" />For Rent ({forRent})</span>
            <span>Click a pin for details</span>
          </div>
        </div>
        <div className="map-wrap">
          {propertyRows.slice(0, 7).map((p: any, i: number) => {
            const left = [18, 42, 63, 31, 74, 52, 22][i] || 45
            const top = [28, 42, 34, 61, 57, 70, 48][i] || 50
            return (
              <div key={p.id}>
                <div className={`map-pin ${p.property_status === 'For Rent' ? 'rent' : ''}`} style={{ left: `${left}%`, top: `${top}%` }} />
                {i < 3 && <div className="map-label" style={{ left: `${left}%`, top: `${top}%` }}><div className="cell-primary text-[12.5px]">{p.property_title}</div><div className="cell-sub flex items-center gap-1"><MapPin size={11} />{p.property_location}</div></div>}
              </div>
            )
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-[18px]">
        <div className="panel">
          <div className="panel-head"><h3>Recent Property Requests</h3><span className="text-[12.5px] font-semibold text-brass-dark">View all</span></div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px]">
              <thead><tr><th>Contact</th><th>Interested In</th><th>Goal</th><th>Status</th></tr></thead>
              <tbody>{requestRows.slice(0, 5).map((r: any) => (
                <tr key={r.id}><td><div className="cell-primary">{r.name}</div><div className="cell-sub">{r.email || r.phone_number}</div></td><td>{r.property_type}<div className="cell-sub">{r.location}</div></td><td><span className="chip chip-brass">{r.goal}</span></td><td><span className={`chip ${r.is_reviewed ? 'chip-success' : 'chip-danger'}`}>{r.is_reviewed ? 'Reviewed' : 'New'}</span></td></tr>
              ))}</tbody>
            </table>
          </div>
        </div>
        <div className="panel">
          <div className="panel-head"><h3>Live Search Activity</h3><span className="text-[12.5px] font-semibold text-brass-dark">View all</span></div>
          <div className="panel-body pt-1">
            {topSearches.map(([q, n]) => (
              <div key={q} className="flex items-start gap-2.5 py-3 border-b border-border-soft last:border-0">
                <div className="stat-icon !w-7 !h-7 flex-shrink-0"><Search size={13} /></div>
                <div className="min-w-0 flex-1"><div className="text-[13px] font-semibold font-mono">&quot;{q}&quot;</div><div className="cell-sub">{n} searches · Addis Ababa</div></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
