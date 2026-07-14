'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { House, Inbox, RefreshCw, Search, Star, Users } from 'lucide-react'
import {
  agentsQueryOptions,
  dashboardRequestsQueryOptions,
  dashboardTestimonialsQueryOptions,
  propertiesQueryOptions,
} from '@/lib/admin-queries'
import { useAuth } from '@/lib/auth'
import { liveSearchActivity } from '@/components/dashboard/analytics'
import styles from '@/components/dashboard/Dashboard.module.css'

const CHART_PLACEHOLDERS = [0, 1, 2, 3] as const
const DashboardCharts = dynamic(
  () => import('@/components/dashboard/DashboardCharts'),
  {
    ssr: false,
    loading: () => (
      <div className="charts-grid" role="status" aria-label="Loading dashboard charts">
        {CHART_PLACEHOLDERS.map(index => (
          <section key={index} className="panel h-[300px] animate-pulse" aria-hidden="true" />
        ))}
      </div>
    ),
  },
)
const PropertyMap = dynamic(
  () => import('@/components/dashboard/PropertyMap'),
  {
    ssr: false,
    loading: () => (
      <div className={styles.mapFrame}>
        <div className={`map-wrap ${styles.map}`} aria-hidden="true" />
        <div className={styles.mapStatus} role="status">Loading property map...</div>
      </div>
    ),
  },
)

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  const day = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
  const time = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
  return `${day} · ${time}`
}

function displayName(username?: string) {
  if (!username) return 'Admin'
  return username.charAt(0).toLocaleUpperCase() + username.slice(1)
}

function DashboardHeader({ username }: { username?: string }) {
  return (
    <div className="page-head">
      <div>
        <div className="page-eyebrow">Overview</div>
        <div className="page-title">Good to see you, {displayName(username)}</div>
        <div className="page-desc">Here&apos;s what&apos;s happening across Signature Property Solutions today.</div>
      </div>
    </div>
  )
}

function DashboardLoading() {
  const labels = ['Total Properties', 'Active Agents', 'New Leads', 'Published Testimonials']
  return (
    <div aria-busy="true" aria-label="Loading dashboard data">
      <div className="stat-grid">
        {labels.map((label) => (
          <div className="stat-card" key={label}>
            <div className="stat-top"><div className="stat-icon"><RefreshCw size={17} className="animate-spin" /></div></div>
            <div className={`stat-value ${styles.loadingValue}`}>—</div>
            <div className="stat-label">{label}</div>
          </div>
        ))}
      </div>
      <div className={`panel ${styles.statePanel}`}>
        <RefreshCw size={20} className="animate-spin text-brass-dark" />
        <p>Loading the latest listings, leads, agents, and testimonials…</p>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { user } = useAuth()
  const enabled = Boolean(user)

  const propertiesQuery = useQuery({
    ...propertiesQueryOptions,
    enabled,
    retry: 1,
  })
  const agentsQuery = useQuery({
    ...agentsQueryOptions,
    enabled,
    retry: 1,
  })
  const requestsQuery = useQuery({
    ...dashboardRequestsQueryOptions,
    enabled,
    retry: 1,
  })
  const testimonialsQuery = useQuery({
    ...dashboardTestimonialsQueryOptions,
    enabled,
    retry: 1,
  })

  const queries = [propertiesQuery, agentsQuery, requestsQuery, testimonialsQuery]
  const isLoading = queries.some((query) => query.isPending)
  const isError = queries.some((query) => query.isError)
  const isRefetching = queries.some((query) => query.isFetching)

  if (isLoading) {
    return (
      <div>
        <DashboardHeader username={user?.username} />
        <DashboardLoading />
      </div>
    )
  }

  if (isError) {
    return (
      <div>
        <DashboardHeader username={user?.username} />
        <div className={`panel ${styles.statePanel}`} role="alert">
          <Inbox size={22} className="text-danger" />
          <div className={styles.stateTitle}>Dashboard data could not be loaded</div>
          <p>One or more data sources are unavailable. Check that the API is running, then try again.</p>
          <button className="btn btn-ghost" type="button" onClick={() => void Promise.all(queries.map((query) => query.refetch()))} disabled={isRefetching}>
            <RefreshCw size={15} className={isRefetching ? 'animate-spin' : ''} />
            {isRefetching ? 'Retrying…' : 'Try again'}
          </button>
        </div>
      </div>
    )
  }

  const properties = propertiesQuery.data ?? { count: 0, results: [] }
  const agents = agentsQuery.data ?? { count: 0, results: [] }
  const requests = requestsQuery.data ?? { count: 0, results: [] }
  const testimonials = testimonialsQuery.data ?? { count: 0, results: [] }
  const forSale = properties.results.filter((property) => property.property_status === 'For Sale').length
  const forRent = properties.results.filter((property) => property.property_status === 'For Rent').length
  const newLeads = requests.results.filter((request) => !request.is_reviewed).length
  const publishedTestimonials = testimonials.results.filter((testimonial) => testimonial.is_published).length
  const recentRequests = [...requests.results]
    .sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime())
    .slice(0, 5)

  const stats = [
    { label: 'Total Properties', value: properties.count, icon: House, sub: `${forSale} for sale · ${forRent} for rent` },
    { label: 'Active Agents', value: agents.count, icon: Users, sub: 'Across all listings' },
    { label: 'New Leads', value: newLeads, icon: Inbox, sub: `of ${requests.count} total requests` },
    { label: 'Published Testimonials', value: publishedTestimonials, icon: Star, sub: `${testimonials.count} total` },
  ]

  return (
    <div>
      <DashboardHeader username={user?.username} />

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

      <DashboardCharts />

      <section className="panel mb-[18px]">
        <div className="map-panel-head">
          <h3 className="text-[14.5px] font-semibold text-ink">Property Locations</h3>
          <div className="map-legend">
            <span><i className="bg-brass" />For Sale ({forSale})</span>
            <span><i className="bg-success" />For Rent ({forRent})</span>
            <span>Click a pin for details</span>
          </div>
        </div>
        <PropertyMap properties={properties.results} />
      </section>

      <div className={styles.dashboardBottom}>
        <section className="panel">
          <div className="panel-head">
            <h3>Recent Property Requests</h3>
            <Link href="/requests" className={styles.panelAction}>View all</Link>
          </div>
          <div className={styles.tableScroll}>
            <table className={styles.table}>
              <thead>
                <tr><th>Contact</th><th>Interested In</th><th>Goal</th><th>Received</th><th>Status</th></tr>
              </thead>
              <tbody>
                {recentRequests.length > 0 ? recentRequests.map((request) => (
                  <tr key={request.id}>
                    <td>
                      <div className="cell-primary">{request.name || 'Unnamed contact'}</div>
                      <div className="cell-sub">{request.email || request.phone_number || 'No contact details'}</div>
                    </td>
                    <td>{request.property_type || '—'}</td>
                    <td><span className="chip chip-brass">{request.goal || 'Not specified'}</span></td>
                    <td><span className="cell-sub">{formatDate(request.created_at)}</span></td>
                    <td><span className={`chip ${request.is_reviewed ? 'chip-success' : 'chip-danger'}`}>{request.is_reviewed ? 'Reviewed' : 'New'}</span></td>
                  </tr>
                )) : (
                  <tr><td colSpan={5} className={styles.emptyCell}>No property requests have been received yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <h3>Live Search Activity</h3>
            <Link href="/search" className={styles.panelAction}>View all</Link>
          </div>
          <div className={`panel-body ${styles.searchList}`}>
            {liveSearchActivity.map((query) => (
              <div className={styles.searchItem} key={query.id}>
                <div className={`stat-icon ${styles.searchIcon}`}><Search size={13} /></div>
                <div className={styles.searchCopy}>
                  <div className={`font-mono ${styles.searchText}`}>&quot;{query.searchText}&quot;</div>
                  <div className="cell-sub">{query.location} · {query.resultsCount} results · {formatDate(query.createdAt)}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
