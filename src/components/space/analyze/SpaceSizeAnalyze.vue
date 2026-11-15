<template>
  <AnalysisPanel
    title="图片大小分布"
    description="按文件大小分组，观察图片的体积结构"
    :loading="loading"
    :error="error"
    :empty="!data?.length || !hasPictures"
    empty-text="当前范围还没有图片大小数据"
    @retry="reload"
  >
    <AnalysisChart
      :option="option"
      label="不同文件大小区间的图片数量柱状图，下方可查看明细"
      :height="300"
    />
    <AnalysisDataTable
      caption="图片大小区间统计"
      :columns="['文件大小区间', '图片数量（张）']"
      :rows="rows"
    />
  </AnalysisPanel>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { EChartsOption } from 'echarts'
import { getSpaceSizeAnalyzeUsingPost } from '@/api/spaceAnalyzeController'
import AnalysisPanel from './AnalysisPanel.vue'
import AnalysisChart from './AnalysisChart.vue'
import AnalysisDataTable from './AnalysisDataTable.vue'
import { useAnalysisData } from './useAnalysisData'
import { chartGrid, chartTooltip, countAxis, formatCount, metricValue } from './chartOptions'

const props = withDefaults(
  defineProps<{ scope: API.SpaceSizeAnalyzeRequest; refreshKey?: number }>(),
  { refreshKey: 0 },
)
const { data, loading, error, reload } = useAnalysisData(
  (signal) => getSpaceSizeAnalyzeUsingPost(props.scope, { signal }),
  [() => props.scope, () => props.refreshKey],
)
const hasPictures = computed(() => data.value?.some((item) => (metricValue(item.count) ?? 0) > 0))
const rows = computed(() =>
  (data.value ?? []).map((item) => [item.sizeRange || '未知区间', formatCount(item.count)]),
)
const option = computed<EChartsOption>(() => ({
  grid: chartGrid,
  tooltip: {
    ...chartTooltip,
    trigger: 'axis',
    axisPointer: { type: 'shadow' },
    valueFormatter: (value) => `${formatCount(value)} 张`,
  },
  xAxis: {
    type: 'category',
    data: (data.value ?? []).map((item) => item.sizeRange || '未知区间'),
    axisLine: { lineStyle: { color: '#dce4ee' } },
    axisTick: { show: false },
    axisLabel: { color: '#64748b', fontSize: 11, interval: 0 },
  },
  yAxis: countAxis,
  series: [
    {
      type: 'bar',
      barMaxWidth: 42,
      itemStyle: { color: '#1677ff', borderRadius: [5, 5, 0, 0] },
      label: { show: true, position: 'top', color: '#475569', fontSize: 12 },
      data: (data.value ?? []).map((item) => metricValue(item.count)),
    },
  ],
  media: [
    {
      query: { maxWidth: 400 },
      option: { xAxis: { axisLabel: { rotate: 25, fontSize: 10 } } },
    },
  ],
}))
</script>
