<template>
  <AnalysisPanel
    v-if="isAdmin"
    title="空间存储排行"
    description="全站空间的存储用量，仅管理员可查看"
    :loading="loading"
    :error="error"
    :empty="!data?.length"
    empty-text="暂时还没有空间排行数据"
    @retry="reload"
  >
    <template #extra>
      <a-select
        v-model:value="topN"
        :options="rankOptions"
        aria-label="空间排行展示数量"
        class="rank-select"
      />
    </template>
    <AnalysisChart
      :option="option"
      label="空间存储用量排行榜，下方可查看空间名称、存储用量与图片数量"
      :height="Math.max(260, (data?.length ?? 0) * 42)"
    />
    <AnalysisDataTable
      caption="全站空间存储排行"
      :columns="['排名', '空间', '存储用量', '图片数量（张）']"
      :rows="rows"
    />
  </AnalysisPanel>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { EChartsOption } from 'echarts'
import { getSpaceRankAnalyzeUsingPost } from '@/api/spaceAnalyzeController'
import { useLoginUserStore } from '@/stores/useLoginUserStore'
import AnalysisPanel from './AnalysisPanel.vue'
import AnalysisChart from './AnalysisChart.vue'
import AnalysisDataTable from './AnalysisDataTable.vue'
import { useAnalysisData } from './useAnalysisData'
import { chartTooltip, formatBytes, formatCount, metricValue } from './chartOptions'

const props = withDefaults(defineProps<{ refreshKey?: number }>(), { refreshKey: 0 })
const loginUserStore = useLoginUserStore()
const isAdmin = computed(() => loginUserStore.loginUser.userRole === 'admin')
const topN = ref(10)
const rankOptions = [5, 10, 20].map((value) => ({ label: `前 ${value} 名`, value }))
const { data, loading, error, reload } = useAnalysisData(
  (signal) => getSpaceRankAnalyzeUsingPost({ topN: topN.value }, { signal }),
  [topN, () => props.refreshKey],
  () => isAdmin.value,
)
const rows = computed(() =>
  (data.value ?? []).map((item, index) => [
    index + 1,
    item.spaceName || '未命名空间',
    formatBytes(item.totalSize),
    formatCount(item.totalCount),
  ]),
)
const option = computed<EChartsOption>(() => ({
  grid: { left: 8, right: 94, top: 12, bottom: 28, containLabel: true },
  tooltip: {
    ...chartTooltip,
    trigger: 'axis',
    axisPointer: { type: 'shadow' },
    valueFormatter: (value) => formatBytes(value),
  },
  xAxis: {
    type: 'value',
    axisLabel: { color: '#64748b', formatter: (value: number) => formatBytes(value) },
    splitLine: { lineStyle: { color: '#edf1f6', type: 'dashed' } },
  },
  yAxis: {
    type: 'category',
    inverse: true,
    data: (data.value ?? []).map(
      (item, index) => `${index + 1}. ${item.spaceName || '未命名空间'}`,
    ),
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: { color: '#475569', width: 140, overflow: 'truncate' },
  },
  series: [
    {
      name: '存储用量',
      type: 'bar',
      barMaxWidth: 18,
      itemStyle: { borderRadius: [0, 4, 4, 0] },
      label: {
        show: true,
        position: 'right',
        color: '#475569',
        formatter: ({ value }) => formatBytes(value),
      },
      data: (data.value ?? []).map((item, index) => ({
        value: metricValue(item.totalSize),
        itemStyle: { color: index === 0 ? '#1677ff' : '#69a8ff' },
      })),
    },
  ],
  media: [
    {
      query: { maxWidth: 460 },
      option: {
        grid: { right: 76 },
        yAxis: { axisLabel: { width: 76, fontSize: 11 } },
        xAxis: { splitNumber: 2, axisLabel: { fontSize: 10 } },
      },
    },
  ],
}))
</script>

<style scoped>
.rank-select {
  min-width: 112px;
}
</style>
