<template>
  <a-modal
    :open="open"
    title="批量编辑图片"
    :confirm-loading="submitting"
    :closable="!submitting"
    :mask-closable="!submitting"
    :keyboard="!submitting"
    :cancel-button-props="{ disabled: submitting }"
    :ok-button-props="{ disabled: !selectedIds.length }"
    ok-text="保存修改"
    cancel-text="取消"
    :width="720"
    @ok="submit"
    @cancel="close"
  >
    <p class="scope-description">
      {{ scopeDescription }}；取消勾选可排除不需要修改的图片。已选择 {{ selectedIds.length }} 张。
    </p>
    <div class="picture-picker">
      <a-checkbox
        :checked="selectedIds.length === pictures.length && pictures.length > 0"
        :indeterminate="selectedIds.length > 0 && selectedIds.length < pictures.length"
        :disabled="submitting || !pictures.length"
        @change="toggleAll"
      >
        全选
      </a-checkbox>
      <div class="picture-grid">
        <div v-for="picture in pictures" :key="picture.id" class="picture-option">
          <a-checkbox
            :checked="picture.id != null && selectedIds.includes(picture.id)"
            :disabled="submitting || picture.id == null"
            :aria-label="`选择图片 ${picture.name || '未命名'}`"
            @change="togglePicture(picture.id)"
          />
          <a-image
            :src="picture.thumbnailUrl || picture.url"
            :alt="picture.name || '未命名图片'"
            :preview="false"
            :width="'100%'"
            :height="80"
          />
          <span class="picture-name" :title="picture.name">{{ picture.name || '未命名图片' }}</span>
        </div>
      </div>
    </div>
    <a-form layout="vertical" :model="form" :disabled="submitting" @finish="submit">
      <a-form-item
        label="名称规则"
        extra="动态占位符仅支持 {序号}，例如：风景-{序号}；留空则不修改名称。"
      >
        <a-input v-model:value="form.nameRule" placeholder="请输入名称规则" allow-clear />
      </a-form-item>
      <a-form-item label="分类" extra="留空则不修改分类。">
        <a-auto-complete
          v-model:value="form.category"
          :options="categoryOptions"
          placeholder="请输入或选择分类"
          allow-clear
        />
      </a-form-item>
      <a-form-item label="标签" extra="设置后将替换所选图片的原有标签；留空则不修改。">
        <a-select
          v-model:value="form.tags"
          :options="tagOptions"
          mode="tags"
          placeholder="请输入或选择标签"
          allow-clear
        />
      </a-form-item>
    </a-form>
  </a-modal>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import {
  editPictureByBatchUsingPost,
  listPictureTagCategoryUsingGet,
} from '@/api/pictureController'

const props = defineProps<{
  open: boolean
  spaceId: number | string
  pictures: API.PictureVO[]
  scopeDescription: string
}>()
const emit = defineEmits<{ close: []; saved: [] }>()
const selectedIds = ref<number[]>([])
const submitting = ref(false)
const form = reactive<{ nameRule: string; category: string; tags: string[] }>({
  nameRule: '',
  category: '',
  tags: [],
})
const categoryOptions = ref<{ label: string; value: string }[]>([])
const tagOptions = ref<{ label: string; value: string }[]>([])

watch(
  () => props.open,
  (open) => {
    if (!open) return
    selectedIds.value = props.pictures.flatMap((picture) =>
      picture.id != null ? [picture.id] : [],
    )
    Object.assign(form, { nameRule: '', category: '', tags: [] })
    void loadOptions()
  },
  { immediate: true },
)

const loadOptions = async () => {
  try {
    const res = await listPictureTagCategoryUsingGet()
    if (res.data.code !== 0 || !res.data.data) {
      message.error('获取分类和标签失败：' + (res.data.message || '请稍后重试'))
      return
    }
    categoryOptions.value = (res.data.data.categoryList ?? []).map((value) => ({
      label: value,
      value,
    }))
    tagOptions.value = (res.data.data.tagList ?? []).map((value) => ({ label: value, value }))
  } catch (error) {
    console.error('获取分类和标签失败:', error)
    message.error('获取分类和标签失败，请检查网络后重试')
  }
}

const togglePicture = (id?: number) => {
  if (id == null) return
  selectedIds.value = selectedIds.value.includes(id)
    ? selectedIds.value.filter((selectedId) => selectedId !== id)
    : [...selectedIds.value, id]
}

const toggleAll = () => {
  selectedIds.value =
    selectedIds.value.length === props.pictures.length
      ? []
      : props.pictures.flatMap((picture) => (picture.id != null ? [picture.id] : []))
}

const close = () => {
  if (!submitting.value) emit('close')
}

const submit = async () => {
  if (submitting.value) return
  if (!selectedIds.value.length) {
    message.warning('请至少选择一张图片')
    return
  }
  const nameRule = form.nameRule.trim()
  const category = form.category.trim()
  if (/[{}]/.test(nameRule.replace(/\{序号\}/g, ''))) {
    message.warning('名称规则仅支持 {序号} 占位符')
    return
  }
  if (!nameRule && !category && !form.tags.length) {
    message.warning('请至少填写一项要修改的内容')
    return
  }
  submitting.value = true
  try {
    const res = await editPictureByBatchUsingPost({
      spaceId: props.spaceId,
      pictureIdList: props.pictures.flatMap((picture) =>
        picture.id != null && selectedIds.value.includes(picture.id) ? [picture.id] : [],
      ),
      ...(nameRule ? { nameRule } : {}),
      ...(category ? { category } : {}),
      ...(form.tags.length ? { tags: [...form.tags] } : {}),
    })
    if (res.data.code !== 0 || !res.data.data) {
      message.error('批量编辑失败：' + (res.data.message || '请稍后重试'))
      return
    }
    message.success('批量编辑成功')
    emit('saved')
  } catch (error) {
    console.error('批量编辑失败:', error)
    message.error('批量编辑失败，请检查网络后重试')
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.scope-description {
  color: #595959;
}

.picture-picker {
  margin-bottom: 20px;
}

.picture-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(120px, 100%), 1fr));
  gap: 12px;
  max-height: 260px;
  overflow-y: auto;
  margin-top: 12px;
}

.picture-option {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 8px;
  align-items: center;
}

.picture-option :deep(.ant-image-img) {
  width: 100%;
  height: 80px;
  object-fit: contain;
  border-radius: 4px;
  background: #f0f0f0;
}

.picture-name {
  grid-column: 2;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
