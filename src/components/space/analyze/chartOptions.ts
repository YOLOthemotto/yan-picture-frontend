import type { EChartsOption } from 'echarts'
import { formatSize } from '@/utils'

export const chartColors = ['#1677ff', '#08979c', '#597ef7', '#d48806', '#c05485', '#5b8c00']

export const chartTooltip = {
  confine: true,
  renderMode: 'richText' as const,
  backgroundColor: '#172b4d',
  borderWidth: 0,
  padding: [10, 14],
  textStyle: { color: '#fff', fontSize: 13 },
}

export const chartGrid = { left: 8, right: 20, top: 36, bottom: 8, containLabel: true }

export const countAxis = {
  type: 'value' as const,
  minInterval: 1,
  name: '图片数（张）',
  nameTextStyle: { color: '#64748b', align: 'left' as const },
  axisLabel: { color: '#64748b' },
  splitLine: { lineStyle: { color: '#edf1f6', type: 'dashed' as const } },
}

export type WordCloudChartOption = Omit<EChartsOption, 'series'> & {
  series: {
    type: 'wordCloud'
    shape: string
    gridSize: number
    sizeRange: [number, number]
    rotationRange: [number, number]
    drawOutOfBound: boolean
    shrinkToFit: boolean
    layoutAnimation: boolean
    textStyle: {
      fontFamily: string
      fontWeight: number
      color: (params: { dataIndex: number }) => string
    }
    data: { name: string; value: number }[]
  }[]
}

export type AnalysisChartOption = EChartsOption | WordCloudChartOption

export function metricValue(value: unknown): number | null {
  if (value == null || value === '') return null
  const number = Number(value)
  return Number.isFinite(number) && number >= 0 ? number : null
}

export function formatCount(value: unknown): string {
  const number = metricValue(value)
  return number == null ? '—' : number.toLocaleString('zh-CN')
}

export function formatBytes(value: unknown): string {
  const number = metricValue(value)
  return number == null ? '—' : formatSize(number)
}

export function isValidIdentifier(value: string): boolean {
  return /^[1-9]\d{0,18}$/.test(value) && BigInt(value) <= 9223372036854775807n
}
