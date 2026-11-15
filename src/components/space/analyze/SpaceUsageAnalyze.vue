<template>
  <AnalysisPanel
    title="使用概览"
    :description="aggregate ? '当前统计范围内的图片与存储用量' : '掌握空间用量，合理安排图片存储'"
    :loading="loading"
    :error="error"
    @retry="reload"
  >
    <div class="usage-grid">
      <section class="usage-item" aria-label="存储用量">
        <div class="metric-heading">
          <span>存储用量</span>
          <span v-if="sizePercent != null" class="usage-rate">
            已使用 {{ formatPercent(sizePercent) }}%
          </span>
        </div>
        <strong class="metric-value">{{ formatBytes(data?.usedSize) }}</strong>
        <template v-if="sizePercent != null">
          <a-progress
            :percent="Math.min(100, sizePercent)"
            :show-info="false"
            :stroke-color="sizePercent >= 90 ? '#d46b08' : '#1677ff'"
            :stroke-width="6"
            aria-label="存储容量使用率"
          />
          <p class="quota-info">
            <span>总容量 {{ formatBytes(data?.maxSize) }}</span>
            <span>{{
              sizePercent > 100 ? '已超出配额' : `剩余 ${formatBytes(remainingSize)}`
            }}</span>
          </p>
        </template>
        <p v-else class="quota-info">
          {{ aggregate ? '统计范围内的存储总量' : '暂无容量配额信息' }}
        </p>
      </section>
      <section class="usage-item" aria-label="图片数量">
        <div class="metric-heading">
          <span>图片数量</span>
          <span v-if="countPercent != null" class="usage-rate">
            已使用 {{ formatPercent(countPercent) }}%
          </span>
        </div>
        <div class="count-value">
          <strong class="metric-value">{{ formatCount(data?.usedCount) }}</strong
          ><span>张</span>
        </div>
        <template v-if="countPercent != null">
          <a-progress
            :percent="Math.min(100, countPercent)"
            :show-info="false"
            :stroke-color="countPercent >= 90 ? '#d46b08' : '#08979c'"
            :stroke-width="6"
            aria-label="图片数量配额使用率"
          />
          <p class="quota-info">
            <span>数量上限 {{ formatCount(data?.maxCount) }} 张</span>
            <span>{{
              countPercent > 100 ? '已超出配额' : `剩余 ${formatCount(remainingCount)} 张`
            }}</span>
          </p>
        </template>
        <p v-else class="quota-info">
          {{ aggregate ? '统计范围内的图片总数' : '暂无图片配额信息' }}
        </p>
      </section>
    </div>
    <div v-if="averageSize != null" class="usage-note">
      单张平均大小 <strong>{{ formatBytes(averageSize) }}</strong>
    </div>
  </AnalysisPanel>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { getSpaceUsageAnalyzeUsingPost } from '@/api/spaceAnalyzeController'
import AnalysisPanel from './AnalysisPanel.vue'
import { useAnalysisData } from './useAnalysisData'
import { formatBytes, formatCount, metricValue } from './chartOptions'

const props = withDefaults(
  defineProps<{ scope: API.SpaceUsageAnalyzeRequest; refreshKey?: number }>(),
  { refreshKey: 0 },
)
const aggregate = computed(() => props.scope.queryAll || props.scope.queryPublic)
const { data, loading, error, reload } = useAnalysisData(
  (signal) => getSpaceUsageAnalyzeUsingPost(props.scope, { signal }),
  [() => props.scope, () => props.refreshKey],
)

const percentage = (used: unknown, max: unknown) => {
  const usedValue = metricValue(used)
  const maxValue = metricValue(max)
  return usedValue != null && maxValue != null && maxValue > 0 ? (usedValue / maxValue) * 100 : null
}
const sizePercent = computed(() =>
  aggregate.value ? null : percentage(data.value?.usedSize, data.value?.maxSize),
)
const countPercent = computed(() =>
  aggregate.value ? null : percentage(data.value?.usedCount, data.value?.maxCount),
)
const remainingSize = computed(() =>
  Math.max(0, Number(data.value?.maxSize) - Number(data.value?.usedSize)),
)
const remainingCount = computed(() =>
  Math.max(0, Number(data.value?.maxCount) - Number(data.value?.usedCount)),
)
const averageSize = computed(() => {
  const size = metricValue(data.value?.usedSize)
  const count = metricValue(data.value?.usedCount)
  return size != null && count != null && count > 0 ? size / count : null
})
const formatPercent = (value: number) => value.toLocaleString('zh-CN', { maximumFractionDigits: 1 })
</script>

<style scoped>
.usage-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 32px;
}

.usage-item + .usage-item {
  padding-left: 32px;
  border-left: 1px solid #e2e8f0;
}

.metric-heading,
.quota-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 4px 12px;
  color: #64748b;
  font-size: 13px;
}

.metric-heading > span:first-child {
  color: #475569;
  font-size: 14px;
}

.metric-value {
  display: block;
  margin: 10px 0 12px;
  color: #172b4d;
  font-size: clamp(25px, 3vw, 34px);
  line-height: 1.2;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  overflow-wrap: anywhere;
}

.count-value {
  display: flex;
  align-items: baseline;
  gap: 8px;
  color: #64748b;
}

.quota-info {
  margin: 6px 0 0;
  font-size: 12px;
}

.usage-note {
  margin-top: 20px;
  border-top: 1px solid #edf1f6;
  padding-top: 12px;
  color: #64748b;
  font-size: 13px;
}

.usage-note strong {
  margin-left: 8px;
  color: #475569;
  font-weight: 500;
}

@media (max-width: 640px) {
  .usage-grid {
    grid-template-columns: minmax(0, 1fr);
    gap: 20px;
  }

  .usage-item + .usage-item {
    border-left: 0;
    border-top: 1px solid #edf1f6;
    padding: 20px 0 0;
  }
}
</style>
