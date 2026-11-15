<template>
  <AnalysisPanel
    title="上传趋势"
    description="按时间查看图片上传数量，支持指定用户"
    :loading="loading"
    :error="error"
    :empty="!data?.length"
    empty-text="当前筛选条件下还没有上传记录"
    @retry="reload"
  >
    <template #extra>
      <a-segmented
        v-model:value="timeDimension"
        size="small"
        :options="dimensions"
        aria-label="上传统计时间维度"
      />
    </template>
    <template #filters>
      <form class="user-filter" @submit.prevent="applyUser">
        <label :for="inputId">用户 ID</label>
        <a-input
          :id="inputId"
          v-model:value="userIdDraft"
          placeholder="留空查看全部用户"
          allow-clear
          :aria-describedby="validationError ? `${inputId}-error` : undefined"
        />
        <a-button html-type="submit">筛选用户</a-button>
        <a-button v-if="appliedUserId" type="link" @click="resetUser">重置</a-button>
        <p v-if="validationError" :id="`${inputId}-error`" class="validation-error" role="alert">
          {{ validationError }}
        </p>
      </form>
    </template>
    <template #default>
      <div class="trend-summary">
        <span
          >统计期上传 <strong>{{ formatCount(totalCount) }}</strong> 张</span
        >
        <span v-if="appliedUserId" class="applied-user">用户 {{ appliedUserId }}</span>
      </div>
      <AnalysisChart
        :option="option"
        label="按所选时间维度统计的图片上传数量折线图，下方可查看明细"
        :height="260"
      />
      <AnalysisDataTable
        caption="图片上传趋势统计"
        :columns="['时间', '上传数量（张）']"
        :rows="rows"
      />
    </template>
  </AnalysisPanel>
</template>

<script setup lang="ts">
import { computed, ref, useId } from 'vue'
import type { EChartsOption } from 'echarts'
import { getSpaceUserAnalyzeUsingPost } from '@/api/spaceAnalyzeController'
import AnalysisPanel from './AnalysisPanel.vue'
import AnalysisChart from './AnalysisChart.vue'
import AnalysisDataTable from './AnalysisDataTable.vue'
import { useAnalysisData } from './useAnalysisData'
import {
  chartGrid,
  chartTooltip,
  countAxis,
  formatCount,
  isValidIdentifier,
  metricValue,
} from './chartOptions'

const props = withDefaults(
  defineProps<{ scope: API.SpaceUsageAnalyzeRequest; refreshKey?: number }>(),
  { refreshKey: 0 },
)
const inputId = `analysis-user-${useId()}`
const timeDimension = ref<'day' | 'week' | 'month'>('day')
const dimensions = [
  { label: '日', value: 'day' },
  { label: '周', value: 'week' },
  { label: '月', value: 'month' },
]
const userIdDraft = ref('')
const appliedUserId = ref<string>()
const validationError = ref('')
const { data, loading, error, reload } = useAnalysisData(
  (signal) =>
    getSpaceUserAnalyzeUsingPost(
      { ...props.scope, timeDimension: timeDimension.value, userId: appliedUserId.value },
      { signal },
    ),
  [() => props.scope, () => props.refreshKey, timeDimension, appliedUserId],
)
const periods = computed(() =>
  [...(data.value ?? [])].sort((left, right) =>
    (left.period ?? '').localeCompare(right.period ?? '', 'zh-CN', { numeric: true }),
  ),
)
const totalCount = computed(() =>
  periods.value.reduce((sum, item) => sum + (metricValue(item.count) ?? 0), 0),
)
const rows = computed(() =>
  periods.value.map((item) => [item.period || '未知时间', formatCount(item.count)]),
)
const option = computed<EChartsOption>(() => ({
  grid: chartGrid,
  tooltip: {
    ...chartTooltip,
    trigger: 'axis',
    valueFormatter: (value) => `${formatCount(value)} 张`,
  },
  xAxis: {
    type: 'category',
    boundaryGap: false,
    data: periods.value.map((item) => item.period || '未知时间'),
    axisLine: { lineStyle: { color: '#dce4ee' } },
    axisTick: { show: false },
    axisLabel: { color: '#64748b', hideOverlap: true, fontSize: 11 },
  },
  yAxis: countAxis,
  series: [
    {
      name: '上传图片',
      type: 'line',
      smooth: 0.2,
      showSymbol: periods.value.length <= 20,
      symbolSize: 6,
      lineStyle: { width: 3, color: '#1677ff' },
      itemStyle: { color: '#1677ff' },
      areaStyle: { color: '#1677ff', opacity: 0.07 },
      data: periods.value.map((item) => metricValue(item.count)),
    },
  ],
}))

const applyUser = () => {
  const id = userIdDraft.value.trim()
  if (id && !isValidIdentifier(id)) {
    validationError.value = '请输入有效的正整数用户 ID'
    return
  }
  validationError.value = ''
  appliedUserId.value = id || undefined
}
const resetUser = () => {
  userIdDraft.value = ''
  appliedUserId.value = undefined
  validationError.value = ''
}
</script>

<style scoped>
.trend-summary {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px 16px;
  color: #64748b;
  font-size: 13px;
}

.trend-summary strong {
  margin: 0 5px;
  color: #172b4d;
  font-size: 22px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.applied-user {
  overflow-wrap: anywhere;
}

.user-filter {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  font-size: 13px;
  color: #475569;
}

.user-filter :deep(.ant-input-affix-wrapper) {
  flex: 1 1 140px;
  max-width: 200px;
}

.validation-error {
  flex-basis: 100%;
  margin: 0;
  color: #cf1322;
}
</style>
