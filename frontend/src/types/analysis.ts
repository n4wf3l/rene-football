/* Mirrors AnalysisController::metrics() shape. */
export interface MetricDefinition {
  key: string
  label: string
}

export interface AnalysisMetrics {
  numeric: MetricDefinition[]
  categorical: MetricDefinition[]
}
