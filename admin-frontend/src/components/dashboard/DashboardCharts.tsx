'use client'

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { deviceSplit, requestTrend, topSearches, trafficSources, visitorTrend } from './analytics'
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
const trafficChartData = trafficSources

function VisitorLegend() {
  return (
    <div className={styles.visitorLegend}>
      <span><i style={{ borderColor: 'var(--text)' }} />Unique Visitors</span>
      <span><i style={{ borderColor: 'var(--brass)' }} />Page Views</span>
    </div>
  )
}

export default function DashboardCharts() {
  const latest = requestTrend.at(-1)?.count ?? 0
  const previous = requestTrend.at(-2)?.count ?? 0
  const change = previous ? Math.round(((latest - previous) / previous) * 100) : 0

  return (
    <div className="charts-grid">
      <section className="panel">
        <div className={`panel-head ${styles.panelHead}`}>
          <h3>Property Requests — Week over Week</h3>
          <span className={`stat-trend ${change >= 0 ? 'trend-up' : 'trend-down'}`}>
            {change >= 0 ? '+' : ''}{change}% vs last week
          </span>
        </div>
        <div className="chart-card" role="img" aria-label="Property requests by week">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={requestTrend} margin={{ top: 4, right: 4, bottom: 0, left: -16 }}>
              <CartesianGrid stroke="var(--border-soft)" vertical={false} />
              <XAxis dataKey="label" axisLine={false} tickLine={false} tick={axisTick} />
              <YAxis domain={[0, 14]} ticks={[0, 2, 4, 6, 8, 10, 12, 14]} allowDecimals={false} axisLine={false} tickLine={false} tick={axisTick} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'var(--border-soft)' }} />
              <Bar dataKey="count" name="Property Requests" fill="var(--brass)" radius={[6, 6, 0, 0]} maxBarSize={32} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="panel">
        <div className={`panel-head ${styles.panelHead}`}>
          <h3>Website Visitors &amp; Page Views</h3>
          <span className="count-chip">Last 14 days</span>
        </div>
        <div className="chart-card" role="img" aria-label="Unique visitors and page views over the last 14 days">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={visitorTrend} margin={{ top: 4, right: 8, bottom: 0, left: -12 }}>
              <CartesianGrid stroke="var(--border-soft)" vertical={false} />
              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={axisTick} interval={2} />
              <YAxis domain={[0, 800]} ticks={[0, 200, 400, 600, 800]} axisLine={false} tickLine={false} tick={axisTick} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend
                verticalAlign="bottom"
                content={<VisitorLegend />}
              />
              <Area type="monotone" dataKey="visitors" name="Unique Visitors" stroke="var(--text)" strokeWidth={2} fill="var(--silver-tint)" fillOpacity={0.55} dot={{ r: 2 }} activeDot={{ r: 4 }} isAnimationActive={false} />
              <Line type="monotone" dataKey="pageviews" name="Page Views" stroke="var(--brass)" strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 4 }} isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="panel">
        <div className={`panel-head ${styles.panelHead}`}>
          <h3>What Visitors Are Searching For</h3>
          <span className="count-chip">By search volume</span>
        </div>
        <div className="chart-card" role="img" aria-label="Most frequent property searches">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={topSearches} layout="vertical" margin={{ top: 0, right: 12, bottom: 0, left: 0 }}>
              <CartesianGrid stroke="var(--border-soft)" horizontal={false} />
              <XAxis type="number" domain={[0, 50]} ticks={[0, 10, 20, 30, 40, 50]} allowDecimals={false} axisLine={false} tickLine={false} tick={axisTick} />
              <YAxis dataKey="term" type="category" width={160} axisLine={false} tickLine={false} tick={{ ...axisTick, fontSize: 10 }} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'var(--border-soft)' }} />
              <Bar dataKey="count" name="Searches" fill="var(--silver)" radius={[0, 6, 6, 0]} maxBarSize={22} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="panel">
        <div className={`panel-head ${styles.panelHead}`}>
          <h3>Traffic Sources</h3>
          <span className="count-chip">Last 30 days</span>
        </div>
        <div className={`chart-card ${styles.trafficCard}`}>
          <div className={styles.trafficChart} role="img" aria-label="Traffic sources by percentage">
            <div className={styles.trafficPlot}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={trafficChartData} dataKey="value" nameKey="source" startAngle={90} endAngle={-270} innerRadius="55%" outerRadius="78%" paddingAngle={0} isAnimationActive={false}>
                    {trafficChartData.map((entry) => <Cell key={entry.source} fill={entry.color} stroke="none" />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className={styles.trafficLegend}>
              {trafficSources.map((entry) => (
                <span key={entry.source}><i style={{ background: entry.color }} />{entry.source}</span>
              ))}
            </div>
          </div>
          <div className={styles.deviceMetrics} aria-label="Visitor devices">
            {deviceSplit.map((entry) => (
              <div key={entry.device}>
                <div className={styles.deviceLabel}>
                  <span>{entry.device}</span>
                  <strong>{entry.value}%</strong>
                </div>
                <div className={styles.deviceTrack}>
                  <span style={{ width: `${entry.value}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
