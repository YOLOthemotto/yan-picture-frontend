<template>
  <AnalysisPanel
    title="分类构成"
    description="从图片数量或存储用量，了解内容分布"
    :loading="loading"
    :error="error"
    :empty="!data?.length"
    @retry="reload"
  >
    <template #extra>
      <a-segmented
        v-model:value="dimension"
        size="small"
        :options="dimensions"
        aria-label="分类统计指标"
      />
    </template>
    <div class="category-visual">
      <AnalysisChart
        :option="option"
        label="各图片分类的占比环形图，下方可查看明细"
        :height="250"
      />
      <div class="category-total" aria-hidden="true">
        <strong>{{ dimension === 'count' ? formatCount(total) : formatBytes(total) }}</strong>
        <span>{{ dimension === 'count' ? '图片总数 / 张' : '分类存储总量' }}</span>
      </div>
    </div>
    <ul class="category-legend" aria-label="分类图例">
      <li v-for="(item, index) in data" :key="index">
        <span class="legend-name"
          ><i :style="{ background: chartColors[index % chartColors.length] }" />{{
            item.category || '未分类'
          }}</span
        >
        <strong>{{
          dimension === 'count' ? `${formatCount(item.count)} 张` : formatBytes(item.totalSize)
        }}</strong>
      </li>
    </ul>
    <AnalysisDataTable
      caption="图片分类统计"
      :columns="['分类', '图片数量（张）', '存储用量']"
      :rows="rows"
    />
  </AnalysisPanel>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { EChartsOption } from 'echarts'
import { getSpaceCategoryAnalyzeUsingPost } from '@/api/spaceAnalyzeController'
import AnalysisPanel from './AnalysisPanel.vue'
import AnalysisChart from './AnalysisChart.vue'
import AnalysisDataTable from './AnalysisDataTable.vue'
import { useAnalysisData } from './useAnalysisData'
import { chartColors, chartTooltip, formatBytes, formatCount, metricValue } from './chartOptions'

const props = withDefaults(
  defineProps<{ scope: API.SpaceCategoryAnalyzeRequest; refreshKey?: number }>(),
  { refreshKey: 0 },
)
const dimension = ref<'count' | 'totalSize'>('count')
const dimensions = [
  { label: '图片数量', value: 'count' },
  { label: '存储用量', value: 'totalSize' },
]
const { data, loading, error, reload } = useAnalysisData(
  (signal) => getSpaceCategoryAnalyzeUsingPost(props.scope, { signal }),
  [() => props.scope, () => props.refreshKey],
)
const total = computed(() =>
  (data.value ?? []).reduce((sum, item) => sum + (metricValue(item[dimension.value]) ?? 0), 0),
)
const rows = computed(() =>
  (data.value ?? []).map((item) => [
    item.category || '未分类',
    formatCount(item.count),
    formatBytes(item.totalSize),
  ]),
)
const option = computed<EChartsOption>(() => ({
  color: chartColors,
  tooltip: {
    ...chartTooltip,
    trigger: 'item',
    valueFormatter: (value) =>
      dimension.value === 'count' ? `${formatCount(value)} 张` : formatBytes(value),
  },
  series: [
    {
      type: 'pie',
      radius: ['58%', '82%'],
      center: ['50%', '50%'],
      padAngle: 2,
      label: { show: false },
      itemStyle: { borderRadius: 5, borderColor: '#fff', borderWidth: 2 },
      emphasis: { scaleSize: 5 },
      stillShowZeroSum: false,
      data: (data.value ?? []).map((item) => ({
        name: item.category || '未分类',
        value: metricValue(item[dimension.value]) ?? 0,
      })),
    },
  ],
}))
</script>

<style scoped>
.category-visual {
  position: relative;
}

.category-total {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  pointer-events: none;
}

.category-total strong {
  max-width: 52%;
  color: #172b4d;
  font-size: 26px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  overflow-wrap: anywhere;
  text-align: center;
}

.category-total span {
  margin-top: 6px;
  color: #64748b;
  font-size: 12px;
}

.category-legend {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px 24px;
  max-height: 140px;
  margin: 10px 0 0;
  padding: 0;
  overflow: auto;
  list-style: none;
}

.category-legend li {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 10px;
  font-size: 12px;
}

.legend-name {
  min-width: 0;
  color: #475569;
  overflow-wrap: anywhere;
}

.legend-name i {
  display: inline-block;
  width: 8px;
  height: 8px;
  margin-right: 7px;
  border-radius: 2px;
}

.category-legend strong {
  flex-shrink: 0;
  color: #334155;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
}

@media (max-width: 420px) {
  .category-legend {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
