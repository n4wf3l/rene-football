/* Mirrors AnalysisController::metrics() shape. */
export type MetricGroup = 'identite' | 'stats' | 'tracking' | 'scouting'

export interface MetricDefinition {
  key: string
  label: string
  /** Optional group used to render an `<optgroup>` in the metric select. */
  group?: MetricGroup
  /** True if dividing by minutes_played / 90 produces a meaningful "per 90" rate. */
  per90?: boolean
  /** Unit suffix used in tooltips ("%", "km", "km/h"). */
  unit?: string
}

export interface AnalysisMetrics {
  numeric: MetricDefinition[]
  categorical: MetricDefinition[]
}

/* Mirrors AnalysisController::percentiles() shape. Each player slug maps to
   a record { metric_key → 0..100 }. Higher is always "better" (the controller
   pre-inverts cards). */
export interface AnalysisPercentiles {
  category_size: Record<string, number>
  percentiles: Record<string, Record<string, number>>
}
