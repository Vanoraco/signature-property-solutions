'use client'

import { useQuery } from '@tanstack/react-query'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { analyticsQueryOptions } from '@/lib/admin-queries'
import styles from './Dashboard.module.css'

const tooltipStyle = {
  background: 'var(--card)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  boxShadow: 'var(--shadow-md)',
  color: 'var(--text)',
  fontSize: 12,
}

const axisTick = { fill: 'var(--text-faint)', fontSize: 10.5 }
const STATUS_COLORS = [
  'var(--danger)',
  'var(--silver)',
  'var(--brass)',
  'var(--silver)',
  'var(--success)',
  'var(--text-faint)',
]
const GOAL_COLORS = ['var(--brass)', 'var(--success)', 'var(--silver)', 'var(--text-faint)']

function EmptyChart({ label }: { label: string }) {
  return <div className={styles.emptyChart}>{label}</div>
}

function Donut({ data }: { data: { label: string; count: number }[] }) {
  const total = data.reduce((sum, entry) => sum + entry.count, 0)
  if (total === 0) return <EmptyChart label="No requests yet" />
  return (
    <PieChart>
      <Pie
        data={data}
        dataKey="count"
        nameKey="label"
        startAngle={90}
        endAngle={-270}
        innerRadius="58%"
        outerRadius="80%"
        paddingAngle={1}
        isAnimationActive={false}
      >
        {data.map((entry, index) => (
          <Cell key={entry.label} fill={GOAL_COLORS[index % GOAL_COLORS.length]} stroke="none" />
        ))}
      </Pie>
      <Tooltip contentStyle={tooltipStyle} />
    </PieChart>
  )
}

function countChange(current: number, previous: number) {
  if (!previous) return { label: current > 0 ? '—' : '—', positive: true }
  const delta = Math.round(((current - previous) / previous) * 100)
  return { label: `${delta >= 0 ? '+' : ''}${delta}%`, positive: delta >= 0 }
}

export default function DashboardCharts() {
  const analyticsQuery = useQuery(analyticsQueryOptions)
  const data = analyticsQuery.data

  if (analyticsQuery.isLoading || !data) {
    return (
      <div className="charts-grid" role="status" aria-label="Loading dashboard analytics">
        {[0, 1, 2, 3].map(index => (
          <section key={index} className="panel h-[300px] animate-pulse" aria-hidden="true" />
        ))}
      </div>
    )
  }

  const weeks = data.weeks ?? []
  const status = data.by_status ?? []
  const goals = data.by_goal ?? []
  const terms = data.top_terms ?? []

  const trend = countChange(weeks.at(-1)?.count ?? 0, weeks.at(-2)?.count ?? 0)

  return (
    <div className="charts-grid">
      <section className="panel">
        <div className={`panel-head ${styles.panelHead}`}>
          <h3>Property Requests — Week over Week</h3>
          <span className={`stat-trend ${trend.positive ? 'trend-up' : 'trend-down'}`}>
            {trend.label} vs last week
          </span>
        </div>
        <div className="chart-card" role="img" aria-label="Property requests by week">
          {weeks.every(week => week.count === 0) ? (
            <EmptyChart label="No requests recorded yet" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeks} margin={{ top: 4, right: 4, bottom: 0, left: -16 }}>
                <CartesianGrid stroke="var(--border-soft)" vertical={false} />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={axisTick} />
                <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={axisTick} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'var(--border-soft)' }} />
                <Bar dataKey="count" name="Property Requests" fill="var(--brass)" radius={[6, 6, 0, 0]} maxBarSize={32} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      <section className="panel">
        <div className={`panel-head ${styles.panelHead}`}>
          <h3>Leads by Status</h3>
          <span className="count-chip">Pipeline</span>
        </div>
        <div className="chart-card" role="img" aria-label="Property requests by pipeline status">
          {status.every(entry => entry.count === 0) ? (
            <EmptyChart label="No leads yet" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={status} margin={{ top: 4, right: 4, bottom: 0, left: -16 }}>
                <CartesianGrid stroke="var(--border-soft)" vertical={false} />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ ...axisTick, fontSize: 9.5 }} />
                <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={axisTick} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'var(--border-soft)' }} />
                <Bar dataKey="count" name="Leads" radius={[6, 6, 0, 0]} maxBarSize={28} isAnimationActive={false}>
                  {status.map((entry, index) => (
                    <Cell key={entry.label} fill={STATUS_COLORS[index % STATUS_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      <section className="panel">
        <div className={`panel-head ${styles.panelHead}`}>
          <h3>Requests by Goal</h3>
          <span className="count-chip">{goals.reduce((sum, entry) => sum + entry.count, 0)} total</span>
        </div>
        <div className="chart-card" role="img" aria-label="Property requests by goal">
          <ResponsiveContainer width="100%" height="100%">
            <Donut data={goals} />
          </ResponsiveContainer>
        </div>
        <div className={styles.trafficLegend}>
          {goals.map((entry, index) => (
            <span key={entry.label}><i style={{ background: GOAL_COLORS[index % GOAL_COLORS.length] }} />{entry.label} ({entry.count})</span>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className={`panel-head ${styles.panelHead}`}>
          <h3>What Visitors Are Searching For</h3>
          <span className="count-chip">Last 30 days</span>
        </div>
        <div className="chart-card" role="img" aria-label="Most frequent property searches">
          {terms.length === 0 ? (
            <EmptyChart label="No searches logged yet" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={terms} layout="vertical" margin={{ top: 0, right: 12, bottom: 0, left: 0 }}>
                <CartesianGrid stroke="var(--border-soft)" horizontal={false} />
                <XAxis type="number" allowDecimals={false} axisLine={false} tickLine={false} tick={axisTick} />
                <YAxis dataKey="term" type="category" width={160} axisLine={false} tickLine={false} tick={{ ...axisTick, fontSize: 10 }} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'var(--border-soft)' }} />
                <Bar dataKey="count" name="Searches" fill="var(--silver)" radius={[0, 6, 6, 0]} maxBarSize={22} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>
    </div>
  )
}