import { useMemo, useState } from 'react'

import { usePlatformMetrics, useMetricsSummary, useInstagramAccountInsights } from '../../hooks/api/metrics'

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

type SelectedMetric = 'views' | 'likes' | 'comments' | 'followers'

export function YouTubeAnalyticsView({ platform, isLoading, hasErrors, errorMessage }: YouTubeAnalyticsViewProps) {
  const [selectedRange, setSelectedRange] = useState<RangeOption>(RANGE_OPTIONS[0])
  const [selectedMetric, setSelectedMetric] = useState<SelectedMetric>('views')

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

  // Fetch Instagram account insights when followers metric is selected
  const {
    data: accountInsights,
    isLoading: accountInsightsLoading,
    isError: accountInsightsErrored,
  } = useInstagramAccountInsights({
    metric: 'follower_count',
    limit: 365,
    enabled: platform === 'instagram' && selectedMetric === 'followers',
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

  // Get chart data based on selected metric
  const chartData = useMemo(() => {
    if (platform === 'instagram' && selectedMetric === 'followers') {
      // Use account insights for followers
      if (!accountInsights?.insights.length) {
        return []
      }

      const rangeDays = selectedRange.days
      const endDate = new Date(accountInsights.insights[accountInsights.insights.length - 1].fetchedAt)

      return accountInsights.insights
        .filter((insight) => {
          const insightDate = new Date(insight.fetchedAt)
          const diffMs = endDate.getTime() - insightDate.getTime()
          const diffDays = diffMs / (1000 * 60 * 60 * 24)
          return diffDays <= rangeDays - 1
        })
        .map((insight, index, arr) => {
          const previous = index > 0 ? arr[index - 1] : null
          return {
            fetchedAt: insight.fetchedAt,
            value: insight.value,
            dailyValue: previous ? insight.value - previous.value : 0,
          }
        })
    } else {
      // Use post-level metrics for views, likes, comments
      if (!filteredDailyMetrics.length) {
        return []
      }

      return filteredDailyMetrics.map((metric) => {
        let value = 0
        let dailyValue = 0

        switch (selectedMetric) {
          case 'views':
            value = metric.lifetimeViews ?? 0
            dailyValue = metric.dailyViews
            break
          case 'likes':
            value = metric.lifetimeLikes ?? 0
            dailyValue = metric.dailyLikes
            break
          case 'comments':
            value = metric.lifetimeComments ?? 0
            dailyValue = metric.dailyComments
            break
          default:
            value = metric.lifetimeViews ?? 0
            dailyValue = metric.dailyViews
        }

        return {
          fetchedAt: metric.fetchedAt,
          value,
          dailyValue,
        }
      })
    }
  }, [platform, selectedMetric, filteredDailyMetrics, accountInsights, selectedRange])

  const sparklinePath = useMemo(() => {
    if (!chartData.length) {
      return null
    }

    // For followers, show absolute values. For others, show daily changes
    const values = chartData.map((point) =>
      selectedMetric === 'followers' ? point.value : point.dailyValue,
    ).filter((value) => Number.isFinite(value))
    
    if (!values.length) {
      return null
    }

    return buildSparklinePath(values, defaultSparklineSize)
  }, [chartData, selectedMetric])

  const latestSnapshot = filteredSnapshots.length ? filteredSnapshots[filteredSnapshots.length - 1] : null
  const latestDaily = filteredDailyMetrics.length ? filteredDailyMetrics[filteredDailyMetrics.length - 1] : null
  const previousDaily =
    filteredDailyMetrics.length > 1 ? filteredDailyMetrics[filteredDailyMetrics.length - 2] : null

  const dayOverDayDelta = useMemo(() => {
    if (selectedMetric === 'followers' && chartData.length >= 2) {
      const latest = chartData[chartData.length - 1]
      const previous = chartData[chartData.length - 2]
      return latest.value - previous.value
    }

    if (latestDaily && previousDaily) {
      switch (selectedMetric) {
        case 'views':
          return latestDaily.dailyViews - previousDaily.dailyViews
        case 'likes':
          return latestDaily.dailyLikes - previousDaily.dailyLikes
        case 'comments':
          return latestDaily.dailyComments - previousDaily.dailyComments
        default:
          return latestDaily.dailyViews - previousDaily.dailyViews
      }
    }

    return null
  }, [selectedMetric, latestDaily, previousDaily, chartData])

  const totalSnapshotRange =
    chartData.length && chartData[0]?.fetchedAt && chartData[chartData.length - 1]?.fetchedAt
      ? {
          start: new Date(chartData[0].fetchedAt),
          end: new Date(chartData[chartData.length - 1].fetchedAt),
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
    // Follower count is account-level, not post-level, so always get it from summary
    const followerCount = summary?.followerCount ?? null

    if (rangeSummary) {
      return {
        ...rangeSummary,
        followerCount,
      }
    }

    if (summary) {
      return {
        totalViewCount: summary.totalViewCount ?? 0,
        totalLikeCount: summary.totalLikeCount ?? 0,
        totalCommentCount: summary.totalCommentCount ?? 0,
        totalShareCount: summary.totalShareCount ?? 0,
        averageEngagementRate: summary.averageEngagementRate ?? 0,
        updatedAt: summary.updatedAt ?? null,
        followerCount,
      }
    }

    return null
  }, [rangeSummary, summary])

  const summaryCards = [
    {
      label: 'Views',
      value: summarySource?.totalViewCount ?? 0,
      metric: 'views' as SelectedMetric,
    },
    {
      label: 'Likes',
      value: summarySource?.totalLikeCount ?? 0,
      metric: 'likes' as SelectedMetric,
    },
    {
      label: 'Comments',
      value: summarySource?.totalCommentCount ?? 0,
      metric: 'comments' as SelectedMetric,
    },
    // Add Followers card only for Instagram
    ...(platform === 'instagram'
      ? [
          {
            label: 'Followers',
            value: summarySource?.followerCount ?? 0,
            metric: 'followers' as SelectedMetric,
          },
        ]
      : []),
  ]

  const viewIsLoading =
    isLoading ||
    summaryLoading ||
    platformMetricsLoading ||
    (platform === 'instagram' && selectedMetric === 'followers' && accountInsightsLoading)
  const viewHasErrors =
    hasErrors ||
    summaryErrored ||
    platformMetricsErrored ||
    (platform === 'instagram' && selectedMetric === 'followers' && accountInsightsErrored)

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
          <section className={`grid gap-6 ${platform === 'instagram' ? 'lg:grid-cols-4' : 'lg:grid-cols-3'}`}>
            {summaryCards.map((card) => {
              const isSelected = selectedMetric === card.metric
              return (
                <button
                  key={card.label}
                  type="button"
                  onClick={() => setSelectedMetric(card.metric)}
                  className={`rounded-2xl border p-6 text-left shadow-[0_20px_80px_-40px_rgba(15,23,42,0.8)] transition ${
                    isSelected
                      ? 'border-emerald-500/70 bg-emerald-500/10'
                      : 'border-slate-800/80 bg-slate-900/40 hover:border-slate-700/80'
                  }`}
                >
                  <header className="text-xs uppercase tracking-[0.28em] text-slate-500">{card.label}</header>
                  <p className="mt-5 text-3xl font-semibold tracking-tight text-white">
                    {card.formatter
                      ? card.formatter(card.value)
                      : numberFormatter.format(card.value ?? 0)}
                  </p>
                </button>
              )
            })}
          </section>

          <section className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-8">
            <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-white">
                  {platform === 'youtube' ? 'YouTube' : 'Instagram'}{' '}
                  {selectedMetric === 'views'
                    ? 'View'
                    : selectedMetric === 'likes'
                      ? 'Like'
                      : selectedMetric === 'comments'
                        ? 'Comment'
                        : 'Follower'}{' '}
                  Trend
                </h2>
                <p className="text-xs text-slate-500">
                  Showing the last {selectedRange.label} window · {chartData.length} daily snapshots
                  {selectedMetric === 'followers'
                    ? ' for account-level metrics'
                    : ` aggregated across all ${platform === 'youtube' ? 'YouTube' : 'Instagram'} projects`}
                  .
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
                  aria-label={`Daily ${platform === 'youtube' ? 'YouTube' : 'Instagram'} ${selectedMetric} trend`}
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
                No {platform === 'youtube' ? 'YouTube' : 'Instagram'}{' '}
                {selectedMetric === 'followers' ? 'follower' : selectedMetric} metrics available yet. Metrics
                populate automatically once data arrives from Supabase.
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

