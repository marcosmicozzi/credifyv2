import { useMemo, useState } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, type PieLabelRenderProps } from 'recharts'

import { ApiError } from '../../lib/apiClient'
import { useRoleImpact, type RoleImpactParams } from '../../hooks/api/metrics'

const COLORS = [
  '#34d399', // emerald-400
  '#60a5fa', // blue-400
  '#f472b6', // pink-400
  '#fbbf24', // amber-400
  '#a78bfa', // violet-400
  '#fb7185', // rose-400
  '#4ade80', // green-400
  '#38bdf8', // sky-400
  '#f87171', // red-400
  '#fbbf24', // amber-400
]

const numberFormatter = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 })
const fullNumberFormatter = new Intl.NumberFormat('en-US')

type ImpactByRoleProps = {
  platform: 'youtube' | 'instagram' | 'all'
}

export function ImpactByRole({ platform }: ImpactByRoleProps) {
  const [groupBy, setGroupBy] = useState<'role' | 'category'>('role')
  const [metric, setMetric] = useState<'views' | 'likes' | 'comments' | 'projects'>('views')
  const [dateRange, setDateRange] = useState<'7d' | '28d' | '90d' | 'all'>('all')
  const [mode, setMode] = useState<'full' | 'share_weighted'>('full')

  const params: RoleImpactParams = useMemo(
    () => ({
      groupBy,
      metric,
      platform: platform === 'all' ? 'all' : platform,
      dateRange,
      mode,
    }),
    [groupBy, metric, platform, dateRange, mode],
  )

  const { data, isLoading, isError, error } = useRoleImpact(params)

  // Sort data by value descending and group small slices into "Other"
  const chartData = useMemo(() => {
    if (!data?.data || data.data.length === 0) {
      return []
    }

    const sorted = [...data.data].sort((a, b) => b.value - a.value)
    const topN = 8 // Show top 8 slices
    const topSlices = sorted.slice(0, topN)
    const otherSlices = sorted.slice(topN)

    if (otherSlices.length === 0) {
      return topSlices
    }

    const otherTotal = otherSlices.reduce((sum, slice) => sum + slice.value, 0)
    const otherPercentage = otherSlices.reduce((sum, slice) => sum + slice.percentage, 0)

    return [
      ...topSlices,
      {
        label: 'Other',
        value: otherTotal,
        percentage: otherPercentage,
      },
    ]
  }, [data])

  type ChartDataPoint = {
    label: string
    value: number
    percentage: number
  }

  const CustomTooltip = ({
    active,
    payload,
  }: {
    active?: boolean
    payload?: Array<{ name: string; value: number; payload: ChartDataPoint }>
  }) => {
    if (!active || !payload || payload.length === 0) {
      return null
    }

    const data = payload[0].payload
    const metricLabel = metric.charAt(0).toUpperCase() + metric.slice(1)

    return (
      <div className="rounded-lg border border-slate-700/60 bg-slate-900/95 p-3 shadow-lg">
        <p className="text-sm font-semibold text-white">{data.label}</p>
        <p className="mt-1 text-xs text-slate-300">
          {fullNumberFormatter.format(data.value)} {metricLabel}
        </p>
        <p className="text-xs text-slate-400">{data.percentage.toFixed(1)}% of total</p>
      </div>
    )
  }

  const renderLabel = (props: PieLabelRenderProps) => {
    const payload = props.payload as ChartDataPoint | undefined
    const percentage = payload?.percentage ?? (props.percent ? props.percent * 100 : 0)
    if (percentage < 3) {
      return '' // Don't show labels for very small slices
    }
    return `${percentage.toFixed(0)}%`
  }

  if (isLoading) {
    return (
      <article className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-8">
        <div className="text-sm text-slate-400">Loading impact by role...</div>
      </article>
    )
  }

  if (isError) {
    let errorMessage = 'Failed to load impact by role data.'
    let errorDetails: string | null = null

    if (error instanceof ApiError) {
      if (error.status === 404) {
        errorMessage = 'Role impact endpoint not found. Please check your backend deployment.'
        errorDetails = `Route: ${error.message}`
      } else if (error.status === 401 || error.status === 403) {
        errorMessage = 'Authentication required. Please sign in again.'
      } else if (error.status >= 500) {
        errorMessage = 'Server error. Please try again later.'
        errorDetails = error.message
      } else {
        errorMessage = error.message || 'Failed to load impact by role data.'
        if (error.body && typeof error.body === 'object' && 'details' in error.body) {
          errorDetails = JSON.stringify(error.body.details, null, 2)
        }
      }
    } else if (error instanceof Error) {
      errorMessage = error.message
    }

    return (
      <article className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-8">
        <div className="space-y-2">
          <div className="text-sm font-semibold text-rose-200">{errorMessage}</div>
          {errorDetails && (
            <details className="mt-2">
              <summary className="cursor-pointer text-xs text-rose-300/80 hover:text-rose-300">
                Error details
              </summary>
              <pre className="mt-2 overflow-auto rounded border border-rose-500/20 bg-rose-950/30 p-2 text-xs text-rose-200/80">
                {errorDetails}
              </pre>
            </details>
          )}
        </div>
      </article>
    )
  }

  if (!data || data.data.length === 0) {
    return (
      <article className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-8">
        <div className="text-sm text-slate-400">No data available for the selected filters.</div>
      </article>
    )
  }

  return (
    <article className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-8">
      <header className="mb-6 flex flex-col gap-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-white">Impact by Role</h2>
          <p className="mt-1 text-xs text-slate-500">
            Distribution of {metric} across your {groupBy === 'role' ? 'roles' : 'categories'}
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          {/* Group By Control */}
          <div className="flex items-center gap-2">
            <label className="text-xs uppercase tracking-[0.25em] text-slate-500">Group by:</label>
            <div className="flex gap-1 rounded-lg border border-slate-700/60 bg-slate-800/50 p-1">
              <button
                type="button"
                onClick={() => setGroupBy('role')}
                className={`rounded px-3 py-1 text-xs font-medium transition ${
                  groupBy === 'role'
                    ? 'bg-emerald-500/20 text-emerald-100'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Role
              </button>
              <button
                type="button"
                onClick={() => setGroupBy('category')}
                className={`rounded px-3 py-1 text-xs font-medium transition ${
                  groupBy === 'category'
                    ? 'bg-emerald-500/20 text-emerald-100'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Category
              </button>
            </div>
          </div>

          {/* Metric Selector */}
          <div className="flex items-center gap-2">
            <label className="text-xs uppercase tracking-[0.25em] text-slate-500">Metric:</label>
            <select
              value={metric}
              onChange={(e) => setMetric(e.target.value as typeof metric)}
              className="rounded-lg border border-slate-700/60 bg-slate-800/50 px-3 py-1 text-xs font-medium text-white transition hover:border-slate-500/60"
            >
              <option value="views">Views</option>
              <option value="likes">Likes</option>
              <option value="comments">Comments</option>
              <option value="projects">Projects</option>
            </select>
          </div>

          {/* Date Range */}
          <div className="flex items-center gap-2">
            <label className="text-xs uppercase tracking-[0.25em] text-slate-500">Date range:</label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as typeof dateRange)}
              className="rounded-lg border border-slate-700/60 bg-slate-800/50 px-3 py-1 text-xs font-medium text-white transition hover:border-slate-500/60"
            >
              <option value="7d">Last 7 days</option>
              <option value="28d">Last 28 days</option>
              <option value="90d">Last 90 days</option>
              <option value="all">All time</option>
            </select>
          </div>

          {/* Mode Toggle (hidden for now since share_weighted isn't fully implemented) */}
          {false && (
            <div className="flex items-center gap-2">
              <label className="text-xs uppercase tracking-[0.25em] text-slate-500">Mode:</label>
              <div className="flex gap-1 rounded-lg border border-slate-700/60 bg-slate-800/50 p-1">
                <button
                  type="button"
                  onClick={() => setMode('full')}
                  className={`rounded px-3 py-1 text-xs font-medium transition ${
                    mode === 'full'
                      ? 'bg-emerald-500/20 text-emerald-100'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Full Impact
                </button>
                <button
                  type="button"
                  onClick={() => setMode('share_weighted')}
                  className={`rounded px-3 py-1 text-xs font-medium transition ${
                    mode === 'share_weighted'
                      ? 'bg-emerald-500/20 text-emerald-100'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Share Weighted
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Chart */}
        <div className="flex-1">
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={renderLabel}
                outerRadius={120}
                innerRadius={60}
                fill="#8884d8"
                dataKey="value"
              >
                {chartData.map((_entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Legend/Table */}
        <div className="lg:w-64">
          <div className="rounded-xl border border-slate-800/70 bg-slate-950/50 p-4">
            <h3 className="mb-3 text-xs uppercase tracking-[0.25em] text-slate-500">Breakdown</h3>
            <div className="space-y-2">
              {chartData.map((entry, index) => (
                <div key={entry.label} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="text-xs text-slate-300">{entry.label}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-semibold text-white">
                      {numberFormatter.format(entry.value)}
                    </div>
                    <div className="text-xs text-slate-500">{entry.percentage.toFixed(1)}%</div>
                  </div>
                </div>
              ))}
            </div>
            {data.total > 0 && (
              <div className="mt-4 border-t border-slate-800/70 pt-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-400">Total</span>
                  <span className="text-xs font-semibold text-white">
                    {numberFormatter.format(data.total)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </article>
  )
}

