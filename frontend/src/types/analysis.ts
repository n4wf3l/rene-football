/* Mirrors AnalysisController::metrics() shape. */
export interface MetricDefinition {
  key: string
  label: string
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
