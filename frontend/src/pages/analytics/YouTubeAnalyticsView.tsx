import { useMemo, useState } from 'react'

import { usePlatformMetrics, useMetricsSummary } from '../../hooks/api/metrics'

const numberFormatter = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 })
const percentFormatter = new Intl.NumberFormat('en-US', { style: 'percent', maximumFractionDigits: 2 })
const fullNumberFormatter = new Intl.NumberFormat('en-US')

type RangeOptionId = '12M' | '1M' | '7D'

type RangeOption = {
  id: RangeOptionId
  label: string
  days: number
}

const RANGE_OPTIONS: RangeOption[] = [
  { id: '12M', label: '12M', days: 365 },
  { id: '1M', label: '1M', days: 30 },
  { id: '7D', label: '7D', days: 7 },
]

const defaultSparklineSize = {
  width: 640,
  height: 200,
}

type SparklinePoint = {
  x: number
  y: number
}

const computeDelta = (current: number | null | undefined, previous: number | null | undefined) => {
  const currentValue = Number.isFinite(current ?? null) ? Number(current ?? 0) : 0
  const previousValue = Number.isFinite(previous ?? null) ? Number(previous ?? 0) : 0

  const delta = currentValue - previousValue
  if (!Number.isFinite(delta) || delta < 0) {
    return 0
  }

  return delta
}

function buildSparklinePath(values: Array<number>, { width, height }: typeof defaultSparklineSize): string | null {
  if (values.length === 0) {
    return null
  }

  if (values.every((value) => Number.isNaN(value))) {
    return null
  }

  const sanitizedValues = values.map((value) => (Number.isFinite(value) ? value : 0))
  const min = Math.min(...sanitizedValues)
  const max = Math.max(...sanitizedValues)

  if (sanitizedValues.length === 1 || min === max) {
    const midY = height / 2
    return `M0 ${midY} L${width} ${midY}`
  }

  const stepX = sanitizedValues.length > 1 ? width / (sanitizedValues.length - 1) : width

  const points: SparklinePoint[] = sanitizedValues.map((value, index) => {
    const normalized = (value - min) / (max - min)
    const x = Math.round(index * stepX * 1000) / 1000
    const y = Math.round((height - normalized * height) * 1000) / 1000
    return { x, y }
  })

  return points.reduce<string>((path, point, index) => {
    const command = index === 0 ? 'M' : 'L'
    return `${path}${command}${point.x} ${point.y} `
  }, '').trim()
}

const formatPercentValue = (value: number | null | undefined) => {
  if (value === null || value === undefined) {
    return '—'
  }

  const normalized = value > 1 ? value / 100 : value
  return percentFormatter.format(normalized)
}

type YouTubeAnalyticsViewProps = {
  platform: 'youtube' | 'instagram'
  isLoading: boolean
  hasErrors: boolean
  errorMessage: string | null
}

export function YouTubeAnalyticsView({ platform, isLoading, hasErrors, errorMessage }: YouTubeAnalyticsViewProps) {
  const [selectedRange, setSelectedRange] = useState<RangeOption>(RANGE_OPTIONS[0])

  const {
    data: summary,
    isLoading: summaryLoading,
    isError: summaryErrored,
  } = useMetricsSummary(platform)

  const {
    data: platformMetrics,
    isLoading: platformMetricsLoading,
    isError: platformMetricsErrored,
  } = usePlatformMetrics({
    platform,
    limit: 365,
  })

  const platformMetricsData =
    platform === 'youtube' ? platformMetrics?.metrics.youtube ?? [] : platformMetrics?.metrics.instagram ?? []

  const dailyMetrics = useMemo(() => {
    if (!platformMetricsData.length) {
      return []
    }

    return platformMetricsData.map((metric, index) => {
      const previous = index > 0 ? platformMetricsData[index - 1] : null

      return {
        fetchedAt: metric.fetchedAt,
        dailyViews: computeDelta(metric.viewCount, previous?.viewCount),
        dailyLikes: computeDelta(metric.likeCount, previous?.likeCount),
        dailyComments: computeDelta(metric.commentCount, previous?.commentCount),
        dailyShares: computeDelta(metric.shareCount, previous?.shareCount),
        engagementRate: metric.engagementRate ?? null,
        lifetimeViews: metric.viewCount ?? null,
        lifetimeLikes: metric.likeCount ?? null,
        lifetimeComments: metric.commentCount ?? null,
        lifetimeShares: metric.shareCount ?? null,
      }
    })
  }, [platformMetricsData])

  const filteredDailyMetrics = useMemo(() => {
    if (!dailyMetrics.length) {
      return []
    }

    const rangeDays = selectedRange.days
    const endDate = new Date(dailyMetrics[dailyMetrics.length - 1].fetchedAt)

    return dailyMetrics.filter((metric) => {
      const metricDate = new Date(metric.fetchedAt)
      const diffMs = endDate.getTime() - metricDate.getTime()
      const diffDays = diffMs / (1000 * 60 * 60 * 24)
      return diffDays <= rangeDays - 1
    })
  }, [dailyMetrics, selectedRange])

  const filteredSnapshots = useMemo(() => {
    if (!platformMetricsData.length) {
      return []
    }

    const rangeDays = selectedRange.days
    const endDate = new Date(platformMetricsData[platformMetricsData.length - 1].fetchedAt)

    return platformMetricsData.filter((metric) => {
      const metricDate = new Date(metric.fetchedAt)
      const diffMs = endDate.getTime() - metricDate.getTime()
      const diffDays = diffMs / (1000 * 60 * 60 * 24)
      return diffDays <= rangeDays - 1
    })
  }, [platformMetricsData, selectedRange])

  const sparklinePath = useMemo(() => {
    if (!filteredDailyMetrics.length) {
      return null
    }

    const values = filteredDailyMetrics.map((metric) => metric.dailyViews).filter((value) => Number.isFinite(value))
    if (!values.length) {
      return null
    }

    return buildSparklinePath(values, defaultSparklineSize)
  }, [filteredDailyMetrics])

  const latestSnapshot = filteredSnapshots.length ? filteredSnapshots[filteredSnapshots.length - 1] : null
  const latestDaily = filteredDailyMetrics.length ? filteredDailyMetrics[filteredDailyMetrics.length - 1] : null
  const previousDaily =
    filteredDailyMetrics.length > 1 ? filteredDailyMetrics[filteredDailyMetrics.length - 2] : null

  const dayOverDayDelta =
    latestDaily && previousDaily
      ? latestDaily.dailyViews - previousDaily.dailyViews
      : null

  const totalSnapshotRange =
    filteredDailyMetrics.length &&
    filteredDailyMetrics[0]?.fetchedAt &&
    filteredDailyMetrics[filteredDailyMetrics.length - 1]?.fetchedAt
      ? {
          start: new Date(filteredDailyMetrics[0].fetchedAt),
          end: new Date(filteredDailyMetrics[filteredDailyMetrics.length - 1].fetchedAt),
        }
      : null

  const rangeSummary = useMemo(() => {
    if (!filteredDailyMetrics.length) {
      return null
    }

    let totalViewCount = 0
    let totalLikeCount = 0
    let totalCommentCount = 0
    let totalShareCount = 0
    let engagementSum = 0
    let engagementCount = 0

    filteredDailyMetrics.forEach((metric) => {
      totalViewCount += metric.dailyViews
      totalLikeCount += metric.dailyLikes
      totalCommentCount += metric.dailyComments
      totalShareCount += metric.dailyShares

      if (metric.engagementRate !== null && metric.engagementRate !== undefined) {
        const normalized = metric.engagementRate > 1 ? metric.engagementRate / 100 : metric.engagementRate
        engagementSum += normalized
        engagementCount += 1
      }
    })

    return {
      totalViewCount,
      totalLikeCount,
      totalCommentCount,
      totalShareCount,
      averageEngagementRate: engagementCount > 0 ? engagementSum / engagementCount : 0,
      updatedAt: latestSnapshot?.fetchedAt ?? null,
    }
  }, [filteredDailyMetrics, latestSnapshot])

  const summarySource = useMemo(() => {
    if (rangeSummary) {
      return rangeSummary
    }

    if (summary) {
      return {
        totalViewCount: summary.totalViewCount ?? 0,
        totalLikeCount: summary.totalLikeCount ?? 0,
        totalCommentCount: summary.totalCommentCount ?? 0,
        totalShareCount: summary.totalShareCount ?? 0,
        averageEngagementRate: summary.averageEngagementRate ?? 0,
        updatedAt: summary.updatedAt ?? null,
      }
    }

    return null
  }, [rangeSummary, summary])

  const summaryCards = [
    {
      label: 'Views',
      value: summarySource?.totalViewCount ?? 0,
    },
    {
      label: 'Likes',
      value: summarySource?.totalLikeCount ?? 0,
    },
    {
      label: 'Comments',
      value: summarySource?.totalCommentCount ?? 0,
    },
  ]

  const viewIsLoading = isLoading || summaryLoading || platformMetricsLoading
  const viewHasErrors = hasErrors || summaryErrored || platformMetricsErrored

  return (
    <>
      <div className="flex flex-col items-start gap-3 text-xs uppercase tracking-[0.25em] text-slate-500 md:items-end md:text-right">
        <div className="flex flex-wrap gap-4">
          {summarySource?.updatedAt && (
            <span>Updated {new Date(summarySource.updatedAt).toLocaleDateString()}</span>
          )}
          <span>{platform.toUpperCase()}</span>
        </div>
        <div className="flex gap-2 text-[0.7rem] tracking-[0.35em]">
          {RANGE_OPTIONS.map((option) => {
            const isActive = option.id === selectedRange.id
            return (
              <button
                key={option.id}
                type="button"
                aria-pressed={isActive}
                onClick={() => setSelectedRange(option)}
                className={`rounded-full border px-3 py-1 transition ${
                  isActive
                    ? 'border-emerald-500/70 bg-emerald-500/20 text-emerald-100'
                    : 'border-slate-700/60 text-slate-400 hover:border-slate-500/60 hover:text-slate-200'
                }`}
              >
                {option.label}
              </button>
            )
          })}
        </div>
      </div>

      {viewIsLoading && (
        <article className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-8 text-sm text-slate-400">
          Loading analytics…
        </article>
      )}

      {viewHasErrors && !viewIsLoading && (
        <article className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-8 text-sm text-rose-200">
          {errorMessage ?? 'Unable to load analytics for this project.'}
        </article>
      )}

      {!viewIsLoading && !viewHasErrors && (
        <>
          <section className="grid gap-6 lg:grid-cols-3">
            {summaryCards.map((card) => (
              <article
                key={card.label}
                className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-6 shadow-[0_20px_80px_-40px_rgba(15,23,42,0.8)]"
              >
                <header className="text-xs uppercase tracking-[0.28em] text-slate-500">{card.label}</header>
                <p className="mt-5 text-3xl font-semibold tracking-tight text-white">
                  {card.formatter
                    ? card.formatter(card.value)
                    : numberFormatter.format(card.value ?? 0)}
                </p>
              </article>
            ))}
          </section>

          <section className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-8">
            <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-white">
                  {platform === 'youtube' ? 'YouTube' : 'Instagram'} View Trend
                </h2>
                <p className="text-xs text-slate-500">
                  Showing the last {selectedRange.label} window · {filteredDailyMetrics.length} daily snapshots
                  aggregated across all {platform === 'youtube' ? 'YouTube' : 'Instagram'} projects.
                </p>
              </div>
              {dayOverDayDelta !== null && (
                <span
                  className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.25em] ${
                    dayOverDayDelta >= 0
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100'
                      : 'border-rose-500/30 bg-rose-500/10 text-rose-200'
                  }`}
                >
                  Vs prev day {dayOverDayDelta >= 0 ? '+' : '-'}
                  {numberFormatter.format(Math.abs(dayOverDayDelta))}
                </span>
              )}
            </header>

            {sparklinePath ? (
              <div className="mt-6 overflow-hidden rounded-xl border border-slate-800/70 bg-slate-950/50 p-4">
                <svg
                  viewBox={`0 0 ${defaultSparklineSize.width} ${defaultSparklineSize.height}`}
                  className="h-64 w-full"
                  role="img"
                  aria-label={`Daily ${platform === 'youtube' ? 'YouTube' : 'Instagram'} view counts`}
                >
                  <defs>
                    <linearGradient id="sparklineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="rgba(16, 185, 129, 0.35)" />
                      <stop offset="100%" stopColor="rgba(16, 185, 129, 0)" />
                    </linearGradient>
                  </defs>
                  <path
                    d={`${sparklinePath} L${defaultSparklineSize.width} ${defaultSparklineSize.height} L0 ${defaultSparklineSize.height} Z`}
                    fill="url(#sparklineGradient)"
                  />
                  <path d={sparklinePath} fill="none" stroke="#34d399" strokeWidth={3} strokeLinecap="round" />
                </svg>
                <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
                  <span>
                    {totalSnapshotRange?.start
                      ? totalSnapshotRange.start.toLocaleDateString()
                      : '—'}
                  </span>
                  <span>
                    {totalSnapshotRange?.end
                      ? totalSnapshotRange.end.toLocaleDateString()
                      : '—'}
                  </span>
                </div>
              </div>
            ) : (
              <p className="mt-6 text-sm text-slate-400">
                No {platform === 'youtube' ? 'YouTube' : 'Instagram'} metrics available yet. Metrics populate
                automatically once data arrives from Supabase.
              </p>
            )}
          </section>

          <section className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-8">
            <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <h2 className="text-lg font-semibold tracking-tight text-white">Latest Daily Snapshot</h2>
              {latestSnapshot?.fetchedAt && (
                <span className="text-xs uppercase tracking-[0.28em] text-slate-500">
                  Captured {new Date(latestSnapshot.fetchedAt).toLocaleString()}
                </span>
              )}
            </header>

            {latestSnapshot ? (
              <dl className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                <div className="rounded-xl border border-slate-800/70 bg-slate-950/50 p-4">
                  <dt className="text-xs uppercase tracking-[0.25em] text-slate-500">Lifetime Views</dt>
                  <dd className="mt-2 text-xl font-semibold text-white">
                    {fullNumberFormatter.format(latestDaily?.lifetimeViews ?? latestSnapshot.viewCount ?? 0)}
                  </dd>
                </div>
                <div className="rounded-xl border border-slate-800/70 bg-slate-950/50 p-4">
                  <dt className="text-xs uppercase tracking-[0.25em] text-slate-500">Views (24h)</dt>
                  <dd className="mt-2 text-xl font-semibold text-white">
                    {fullNumberFormatter.format(latestDaily?.dailyViews ?? 0)}
                  </dd>
                </div>
                <div className="rounded-xl border border-slate-800/70 bg-slate-950/50 p-4">
                  <dt className="text-xs uppercase tracking-[0.25em] text-slate-500">Engagement Rate</dt>
                  <dd className="mt-2 text-xl font-semibold text-white">
                    {formatPercentValue(latestSnapshot.engagementRate)}
                  </dd>
                </div>
                <div className="rounded-xl border border-slate-800/70 bg-slate-950/50 p-4">
                  <dt className="text-xs uppercase tracking-[0.25em] text-slate-500">Total Likes</dt>
                  <dd className="mt-2 text-xl font-semibold text-white">
                    {fullNumberFormatter.format(latestSnapshot.likeCount ?? 0)}
                  </dd>
                </div>
                <div className="rounded-xl border border-slate-800/70 bg-slate-950/50 p-4">
                  <dt className="text-xs uppercase tracking-[0.25em] text-slate-500">Total Comments</dt>
                  <dd className="mt-2 text-xl font-semibold text-white">
                    {fullNumberFormatter.format(latestSnapshot.commentCount ?? 0)}
                  </dd>
                </div>
              </dl>
            ) : (
              <p className="mt-6 text-sm text-slate-400">
                Once {platform === 'youtube' ? 'YouTube' : 'Instagram'} metrics sync, the latest daily snapshot will
                appear here with engagement detail.
              </p>
            )}
          </section>
        </>
      )}
    </>
  )
}

