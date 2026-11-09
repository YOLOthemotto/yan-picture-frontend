<template>
  <details class="picture-search" open>
    <summary class="filter-toggle">
      <span class="filter-label">
        <span>搜索条件</span>
        <span v-if="appliedFilterCount" class="filter-count">
          已应用 {{ appliedFilterCount }} 项
        </span>
      </span>
      <span class="toggle-action">
        <span class="expand-label">展开</span>
        <span class="collapse-label">收起</span>
        <DownOutlined class="toggle-icon" aria-hidden="true" />
      </span>
    </summary>
    <a-form
      class="picture-search-form"
      layout="vertical"
      :model="form"
      :disabled="disabled"
      @finish="doSearch"
    >
      <div class="filter-grid">
        <a-form-item label="关键词" class="keyword-field">
          <a-input v-model:value="form.searchText" placeholder="从名称和简介搜索" allow-clear />
        </a-form-item>
        <a-form-item label="分类">
          <a-select
            v-model:value="form.category"
            :options="categoryOptions"
            :loading="optionsLoading"
            :disabled="disabled || optionsLoading || !!optionsError"
            placeholder="全部分类"
            show-search
            option-filter-prop="label"
            allow-clear
          />
        </a-form-item>
        <a-form-item label="标签">
          <a-select
            v-model:value="form.tags"
            :options="tagOptions"
            :loading="optionsLoading"
            :disabled="disabled || optionsLoading || !!optionsError"
            mode="multiple"
            placeholder="选择标签"
            option-filter-prop="label"
            :max-tag-count="2"
            allow-clear
          />
        </a-form-item>
        <a-form-item label="宽度">
          <a-input-number
            v-model:value="form.picWidth"
            :min="1"
            :precision="0"
            placeholder="像素"
          />
        </a-form-item>
        <a-form-item label="高度">
          <a-input-number
            v-model:value="form.picHeight"
            :min="1"
            :precision="0"
            placeholder="像素"
          />
        </a-form-item>
        <a-form-item label="编辑时间">
          <a-range-picker
            v-model:value="dateRange"
            :ranges="datePresets"
            show-time
            format="YYYY-MM-DD HH:mm:ss"
            :placeholder="['开始时间', '结束时间']"
            @open-change="refreshDatePresets"
          />
        </a-form-item>
      </div>
      <div v-if="optionsError" class="options-error" role="alert">
        {{ optionsError }}
        <a-button type="link" size="small" :disabled="disabled" @click="loadOptions">重试</a-button>
      </div>
      <div class="filter-actions">
        <a-button type="primary" html-type="submit">搜索图片</a-button>
        <a-button html-type="button" @click="reset">重置</a-button>
      </div>
    </a-form>
  </details>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import dayjs, { type Dayjs } from 'dayjs'
import { DownOutlined } from '@ant-design/icons-vue'
import { listPictureTagCategoryUsingGet } from '@/api/pictureController'

const props = defineProps<{
  initialValues?: API.PictureQueryRequest
  disabled?: boolean
}>()
const emit = defineEmits<{ search: [filters: API.PictureQueryRequest] }>()
const countFilters = (filters?: API.PictureQueryRequest) =>
  [
    !!filters?.searchText?.trim(),
    !!filters?.category?.trim(),
    !!filters?.tags?.length,
    filters?.picWidth != null,
    filters?.picHeight != null,
    !!(filters?.startEditTime || filters?.endEditTime),
  ].filter(Boolean).length
const appliedFilterCount = ref(countFilters(props.initialValues))
const categoryOptions = ref<{ label: string; value: string }[]>([])
const tagOptions = ref<{ label: string; value: string }[]>([])
const optionsLoading = ref(false)
const optionsError = ref('')

const loadOptions = async () => {
  if (optionsLoading.value) return
  optionsLoading.value = true
  optionsError.value = ''
  try {
    const res = await listPictureTagCategoryUsingGet()
    if (res.data.code !== 0 || !res.data.data) {
      optionsError.value = `获取分类和标签失败：${res.data.message || '请稍后重试'}`
      return
    }
    categoryOptions.value = (res.data.data.categoryList ?? []).map((value) => ({
      label: value,
      value,
    }))
    tagOptions.value = (res.data.data.tagList ?? []).map((value) => ({ label: value, value }))
  } catch (error) {
    console.error('获取分类和标签失败:', error)
    optionsError.value = '获取分类和标签失败，请检查网络后重试。'
  } finally {
    optionsLoading.value = false
  }
}
onMounted(loadOptions)

const form = reactive<API.PictureQueryRequest>({
  searchText: props.initialValues?.searchText,
  category: props.initialValues?.category,
  tags: props.initialValues?.tags?.slice(),
  picWidth: props.initialValues?.picWidth,
  picHeight: props.initialValues?.picHeight,
})
const dateRange = ref<[Dayjs, Dayjs] | undefined>(
  props.initialValues?.startEditTime && props.initialValues?.endEditTime
    ? [dayjs(props.initialValues.startEditTime), dayjs(props.initialValues.endEditTime)]
    : undefined,
)
const recentDays = (days: number): [Dayjs, Dayjs] => {
  const today = dayjs()
  return [today.subtract(days - 1, 'day').startOf('day'), today.endOf('day')]
}
const datePresets = ref<Record<string, [Dayjs, Dayjs]>>({})
const refreshDatePresets = (open: boolean) => {
  if (!open) return
  datePresets.value = {
    今天: recentDays(1),
    最近7天: recentDays(7),
    最近30天: recentDays(30),
  }
}

const doSearch = () => {
  const filters: API.PictureQueryRequest = {
    searchText: form.searchText?.trim() || undefined,
    category: form.category?.trim() || undefined,
    tags: form.tags?.length ? [...form.tags] : undefined,
    picWidth: form.picWidth ?? undefined,
    picHeight: form.picHeight ?? undefined,
    startEditTime: dateRange.value?.[0].toISOString(),
    endEditTime: dateRange.value?.[1].toISOString(),
  }
  appliedFilterCount.value = countFilters(filters)
  emit('search', filters)
}

const reset = () => {
  Object.assign(form, {
    searchText: undefined,
    category: undefined,
    tags: undefined,
    picWidth: undefined,
    picHeight: undefined,
  })
  dateRange.value = undefined
  appliedFilterCount.value = 0
  emit('search', {})
}
</script>

<style scoped>
.picture-search {
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid #f0f0f0;
}

.filter-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 40px;
  list-style: none;
  cursor: pointer;
  color: #262626;
  font-weight: 500;
}

.filter-toggle::-webkit-details-marker {
  display: none;
}

.filter-toggle:hover .toggle-action {
  color: #4096ff;
}

.filter-toggle:focus-visible {
  outline: 2px solid #1677ff;
  outline-offset: 2px;
}

.filter-label {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 8px;
}

.filter-count {
  color: #595959;
  font-size: 12px;
  font-weight: normal;
}

.toggle-action {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  color: #1677ff;
  font-weight: normal;
}

.collapse-label,
.picture-search[open] .expand-label {
  display: none;
}

.picture-search[open] .collapse-label {
  display: inline;
}

.picture-search[open] .toggle-icon {
  transform: rotate(180deg);
}

.picture-search-form {
  margin-top: 8px;
}

.filter-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 16px;
}

.filter-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}

.keyword-field {
  grid-column: span 2;
}

.filter-grid :deep(.ant-form-item) {
  min-width: 0;
  margin: 0;
}

.filter-grid :deep(.ant-picker),
.filter-grid :deep(.ant-select),
.filter-grid :deep(.ant-input-number) {
  width: 100%;
}

.filter-grid :deep(.ant-form-item:last-child) {
  grid-column: span 2;
}

.options-error {
  margin-top: 12px;
  color: #a8071a;
}

@media (max-width: 900px) {
  .filter-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
