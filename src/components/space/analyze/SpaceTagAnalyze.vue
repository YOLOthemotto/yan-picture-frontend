<template>
  <AnalysisPanel
    title="标签词云"
    description="文字越大，使用该标签的图片越多"
    :loading="loading"
    :error="error"
    :empty="!words.length"
    empty-text="当前范围还没有使用标签"
    @retry="reload"
  >
    <template #extra
      ><span v-if="data" class="tag-count">{{ formatCount(data.length) }} 个标签</span></template
    >
    <AnalysisChart
      :option="option"
      label="按标签使用次数排列的词云，下方可查看所有标签与次数"
      :height="300"
    />
    <p v-if="leadingTag" class="leading-tag">
      最常使用 <strong>{{ leadingTag.name }}</strong
      ><span>{{ formatCount(leadingTag.value) }} 张图片</span>
    </p>
    <AnalysisDataTable caption="标签使用统计" :columns="['标签', '图片数量（张）']" :rows="rows" />
  </AnalysisPanel>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import 'echarts-wordcloud'
import { getSpaceTagAnalyzeUsingPost } from '@/api/spaceAnalyzeController'
import AnalysisPanel from './AnalysisPanel.vue'
import AnalysisChart from './AnalysisChart.vue'
import AnalysisDataTable from './AnalysisDataTable.vue'
import { useAnalysisData } from './useAnalysisData'
import {
  chartColors,
  chartTooltip,
  formatCount,
  metricValue,
  type WordCloudChartOption,
} from './chartOptions'

const props = withDefaults(
  defineProps<{ scope: API.SpaceTagAnalyzeRequest; refreshKey?: number }>(),
  { refreshKey: 0 },
)
const { data, loading, error, reload } = useAnalysisData(
  (signal) => getSpaceTagAnalyzeUsingPost(props.scope, { signal }),
  [() => props.scope, () => props.refreshKey],
)
const words = computed(() =>
  (data.value ?? [])
    .flatMap((item) => {
      const name = item.tag
      const value = metricValue(item.count)
      return name?.trim() && value != null && value > 0 ? [{ name, value }] : []
    })
    .sort((left, right) => right.value - left.value),
)
const leadingTag = computed(() => words.value[0])
const rows = computed(() =>
  (data.value ?? []).map((item) => [item.tag || '未命名标签', formatCount(item.count)]),
)
const option = computed<WordCloudChartOption>(() => ({
  tooltip: {
    ...chartTooltip,
    valueFormatter: (value: unknown) => `${formatCount(value)} 张图片`,
  },
  series: [
    {
      type: 'wordCloud',
      shape: 'circle',
      gridSize: 8,
      sizeRange: [15, 58],
      rotationRange: [0, 0],
      drawOutOfBound: false,
      shrinkToFit: true,
      layoutAnimation: false,
      textStyle: {
        fontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif',
        fontWeight: 600,
        color: ({ dataIndex }) => chartColors[dataIndex % chartColors.length]!,
      },
      data: words.value,
    },
  ],
}))
</script>

<style scoped>
.tag-count {
  color: #64748b;
  font-size: 12px;
}

.leading-tag {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 5px 8px;
  margin: 10px 0 0;
  color: #64748b;
  font-size: 12px;
}

.leading-tag strong {
  color: #0958d9;
  font-weight: 500;
  overflow-wrap: anywhere;
}
</style>
