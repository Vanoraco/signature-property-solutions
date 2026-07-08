'use client'
import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { Building2, Users, MessageSquare, TrendingUp, TrendingDown } from 'lucide-react'

interface Stats {
  properties: number
  categories: number
  agents: number
  requests: number
  testimonials: number
  facilities: number
}

export default function DashboardPage() {
  const { data: properties } = useQuery({ queryKey: ['properties'], queryFn: () => api.get('/properties/?page_size=100').then(r => r.data) })
  const { data: categories } = useQuery({ queryKey: ['categories'], queryFn: () => api.get('/categories/').then(r => r.data) })
  const { data: agents } = useQuery({ queryKey: ['agents'], queryFn: () => api.get('/agents/').then(r => r.data) })
  const { data: requests } = useQuery({ queryKey: ['requests'], queryFn: () => api.get('/requests/').then(r => r.data) })

  const stats = [
    { label: 'Total Properties', value: properties?.count || 0, icon: Building2, trend: '+12%', up: true },
    { label: 'Active Agents', value: agents?.count || 0, icon: Users, trend: '+5%', up: true },
    { label: 'Property Requests', value: requests?.count || 0, icon: MessageSquare, trend: '+23%', up: true },
    { label: 'Categories', value: categories?.count || 0, icon: TrendingUp, trend: '0%', up: true },
  ]

  return (
    <div>
      <div className="mb-6">
        <p className="text-[11px] tracking-[1.5px] uppercase text-brass-dark font-semibold mb-1.5">Overview</p>
        <h1 className="font-display text-[28px] font-semibold text-ink">Dashboard</h1>
        <p className="text-text-soft text-[13.5px] mt-1">Welcome back. Here&apos;s what&apos;s happening with your properties.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-7">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <div key={stat.label} className="bg-card border border-border rounded-[10px] p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3.5">
                <div className="w-[34px] h-[34px] rounded-lg bg-brass-tint text-brass-dark flex items-center justify-center">
                  <Icon size={18} />
                </div>
                <span className={`text-[11.5px] font-semibold px-2 py-0.5 rounded-full ${stat.up ? 'bg-success-tint text-success' : 'bg-danger-tint text-danger'}`}>
                  {stat.trend}
                </span>
              </div>
              <div className="font-display text-[26px] font-semibold text-ink">{stat.value}</div>
              <div className="text-[12.5px] text-text-soft mt-0.5">{stat.label}</div>
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-card border border-border rounded-[10px] shadow-sm">
          <div className="px-5 py-4 border-b border-border-soft flex items-center justify-between">
            <h3 className="text-[14.5px] font-semibold text-ink">Recent Properties</h3>
          </div>
          <div className="divide-y divide-border-soft">
            {properties?.results?.slice(0, 5).map((p: any) => (
              <div key={p.id} className="px-5 py-3.5 flex items-center gap-3">
                {p.main_image ? (
                  <img src={p.main_image} alt={p.property_title} className="w-10 h-10 rounded-lg object-cover bg-border-soft" />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-border-soft" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-[13.3px] font-semibold text-ink truncate">{p.property_title}</div>
                  <div className="text-[11.5px] text-text-faint">{p.property_location}</div>
                </div>
                <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${p.property_status === 'For Sale' ? 'bg-brass-tint text-brass-dark' : 'bg-success-tint text-success'}`}>
                  {p.property_status}
                </span>
              </div>
            ))}
            {(!properties?.results || properties.results.length === 0) && (
              <div className="px-5 py-10 text-center text-text-faint text-[13px]">No properties yet</div>
            )}
          </div>
        </div>

        <div className="bg-card border border-border rounded-[10px] shadow-sm">
          <div className="px-5 py-4 border-b border-border-soft flex items-center justify-between">
            <h3 className="text-[14.5px] font-semibold text-ink">Recent Requests</h3>
          </div>
          <div className="divide-y divide-border-soft">
            {requests?.results?.slice(0, 5).map((r: any) => (
              <div key={r.id} className="px-5 py-3.5">
                <div className="flex items-center justify-between mb-1">
                  <div className="text-[13.3px] font-semibold text-ink">{r.name}</div>
                  <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${r.is_reviewed ? 'bg-success-tint text-success' : 'bg-danger-tint text-danger'}`}>
                    {r.is_reviewed ? 'Reviewed' : 'New'}
                  </span>
                </div>
                <div className="text-[12px] text-text-soft">{r.property_type} · {r.goal} · {r.location}</div>
              </div>
            ))}
            {(!requests?.results || requests.results.length === 0) && (
              <div className="px-5 py-10 text-center text-text-faint text-[13px]">No requests yet</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
