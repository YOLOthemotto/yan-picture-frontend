<template>
  <section class="analysis-panel" :aria-label="title" :aria-busy="loading">
    <header class="panel-heading">
      <div class="panel-title">
        <h2>{{ title }}</h2>
        <p v-if="description">{{ description }}</p>
      </div>
      <div v-if="$slots.extra" class="panel-controls"><slot name="extra" /></div>
    </header>
    <div v-if="$slots.filters" class="panel-filters"><slot name="filters" /></div>
    <div v-if="loading" class="panel-state" role="status">
      <a-spin />
      <span>正在加载{{ title }}</span>
    </div>
    <div v-else-if="error" class="panel-state">
      <a-alert type="error" show-icon :message="error">
        <template #action><a-button size="small" @click="$emit('retry')">重试</a-button></template>
      </a-alert>
    </div>
    <div v-else-if="empty" class="panel-state">
      <a-empty :image="Empty.PRESENTED_IMAGE_SIMPLE" :description="emptyText" />
    </div>
    <slot v-else />
  </section>
</template>

<script setup lang="ts">
import { Empty } from 'ant-design-vue'

withDefaults(
  defineProps<{
    title: string
    description?: string
    loading: boolean
    error: string
    empty?: boolean
    emptyText?: string
  }>(),
  { emptyText: '当前范围暂无统计数据' },
)
defineEmits<{ retry: [] }>()
</script>

<style scoped>
.analysis-panel {
  min-width: 0;
  padding: 24px;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: #fff;
}

.panel-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px 16px;
  margin-bottom: 20px;
}

.panel-title {
  min-width: 0;
}

.panel-title h2 {
  margin: 0;
  color: #1e293b;
  font-size: 17px;
  font-weight: 600;
}

.panel-title p {
  margin: 5px 0 0;
  color: #64748b;
  font-size: 13px;
}

.panel-controls {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  max-width: 100%;
}

.panel-filters {
  margin-bottom: 16px;
}

.panel-state {
  display: flex;
  min-height: 250px;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 14px;
  color: #64748b;
}

.panel-state :deep(.ant-alert) {
  width: 100%;
}

@media (max-width: 600px) {
  .analysis-panel {
    padding: 18px 16px;
  }
}
</style>
