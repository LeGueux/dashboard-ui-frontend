export interface WeatherChartPoint {
  x: number
  y: number
  timeLocal: string
  temperature: number
  kind?: 'observed' | 'forecast'
  label?: string
}

export interface WeatherChartGeometry {
  chartWidth: number
  chartLeft: number
  chartRight: number
  labelX: number
  observed: string
  forecast: string
  primaryForecast: string
  spread: string
  modelPaths: Array<{ id: string, path: string, color: string, dash: string }>
  points: WeatherChartPoint[]
  observedPoints: WeatherChartPoint[]
  primaryPoints: WeatherChartPoint[]
  axisPoints: Array<{ x: number, timeLocal: string, label?: string | null }>
  yAxisPoints: Array<{ value: number, y: number }>
  betLines: Array<{ temperature: number, y: number, labelY: number, label: string }>
  betBands: Array<{ id: string, title: string, outcome: string, low: number, high: number, top: number, bottom: number, centerY: number, labelY: number, color: string }>
  betChartRight: number
  boundaryX: number | null
  midnightX: number | null
  midnightLabelX: number | null
  afterMidnightX: number | null
  peakPoint: WeatherChartPoint | null
}
