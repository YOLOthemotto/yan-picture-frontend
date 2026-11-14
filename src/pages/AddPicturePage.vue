<template>
  <div id="addPicturePage">
    <h2 v-if="!embedded" style="margin-bottom: 16px">
      {{ isEditing ? '修改图片' : '创建图片' }}
    </h2>
    <a-alert v-if="contextError" type="error" show-icon :message="contextError" />
    <a-spin v-else-if="contextLoading" tip="正在加载图片信息" />
    <template v-else>
      <a-alert v-if="targetSpaceId" type="info" show-icon class="space-notice">
        <template #message>
          {{ isEditing ? '图片所属空间' : '上传至空间' }}：
          {{ targetSpace?.spaceName || `空间 ID ${targetSpaceId}` }}
          <SpaceLevelBadge :level="targetSpace?.spaceLevel" />
        </template>
        <template #description>
          <div>空间 ID：{{ targetSpaceId }}</div>
          <div v-if="targetSpace?.maxSize != null && targetSpace.totalSize != null">
            剩余 {{ formatSize(Math.max(0, targetSpace.maxSize - targetSpace.totalSize)) }} · 已用
            {{ formatSize(targetSpace.totalSize) }} / {{ formatSize(targetSpace.maxSize) }}
          </div>
          <div v-else>容量信息暂不可用</div>
          <div v-if="targetSpace?.totalCount != null && targetSpace.maxCount != null">
            图片数量 {{ targetSpace.totalCount }} / {{ targetSpace.maxCount }}
          </div>
          <div v-if="embedded">上传图片后会立即保存，关闭弹窗不会撤销上传。</div>
        </template>
      </a-alert>
      <a-tabs v-model:activeKey="uploadType">
        <a-tab-pane
          key="file"
          tab="文件上传"
          :disabled="(uploadBusy && uploadType !== 'file') || submitting"
        >
          <!-- 图片上传组件 -->
          <PictureUpload
            :picture="picture"
            :space-id="targetSpaceId"
            :on-success="onSuccess"
            :disabled="submitting"
            @busy="setUploadBusy"
          />
        </a-tab-pane>
        <a-tab-pane
          key="url"
          tab="URL 上传"
          :disabled="(uploadBusy && uploadType !== 'url') || submitting"
        >
          <!-- URL 图片上传组件 -->
          <UrlPictureUpload
            :picture="picture"
            :space-id="targetSpaceId"
            :on-success="onSuccess"
            :disabled="submitting"
            @busy="setUploadBusy"
          />
        </a-tab-pane>
      </a-tabs>
      <div v-if="canEditImage" class="image-edit-action">
        <a-button :disabled="uploadBusy || submitting" @click="openImageEditor">
          <template #icon><PictureOutlined /></template>
          编辑画面
        </a-button>
        <span>
          {{
            isEditing
              ? '保存画面后会创建新图片，原图不受影响。'
              : '保存画面后会更新当前上传的图片。'
          }}
        </span>
      </div>
      <a-alert
        v-if="editingCopy"
        class="copy-notice"
        type="success"
        show-icon
        message="已上传编辑后的新图片"
        description="下方信息保存到新图片，原图片保持不变。关闭页面不会撤销已上传的图片。"
      />
      <a-form
        v-if="picture"
        name="pictureForm"
        layout="vertical"
        :model="pictureForm"
        @finish="handleSubmit"
      >
        <a-form-item name="name" label="名称">
          <a-input v-model:value="pictureForm.name" placeholder="请输入名称" allow-clear />
        </a-form-item>
        <a-form-item name="introduction" label="简介">
          <a-textarea
            v-model:value="pictureForm.introduction"
            placeholder="请输入简介"
            :autoSize="{ minRows: 2, maxRows: 5 }"
            allow-clear
          />
        </a-form-item>
        <a-form-item name="category" label="分类">
          <a-auto-complete
            :options="categoryOptions"
            v-model:value="pictureForm.category"
            placeholder="请选择分类"
            allow-clear
          />
        </a-form-item>
        <a-form-item name="tags" label="标签">
          <a-select
            :options="tagOptions"
            v-model:value="pictureForm.tags"
            mode="tags"
            placeholder="请选择标签"
            allow-clear
          />
        </a-form-item>
        <a-form-item>
          <a-button
            type="primary"
            html-type="submit"
            :loading="submitting"
            :disabled="uploadBusy"
            style="width: 100%"
          >
            {{ isEditing ? '保存修改' : '创建' }}
          </a-button>
        </a-form-item>
      </a-form>
      <a-modal
        :open="imageEditorOpen"
        title="编辑画面"
        :footer="null"
        :width="900"
        :closable="!imageEditorBusy"
        :mask-closable="!imageEditorBusy"
        :keyboard="!imageEditorBusy"
        destroy-on-close
        @cancel="closeImageEditor"
      >
        <ImageEditor
          v-if="imageEditorOpen && picture?.url"
          :src="picture.url"
          :name="picture.name"
          :format="picture.picFormat"
          :saving="imageEditorSaving"
          :replace="!isEditing"
          @busy="imageEditorBusy = $event"
          @cancel="closeImageEditor"
          @save="saveEditedImage"
        />
      </a-modal>
    </template>
  </div>
</template>

<script setup lang="ts">
import PictureUpload from '@/components/PictureUpload.vue'
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { message, type SelectProps } from 'ant-design-vue'
import { PictureOutlined } from '@ant-design/icons-vue'
import {
  editPictureUsingPost,
  getPictureVoByIdUsingGet,
  listPictureTagCategoryUsingGet,
  uploadPictureUsingPost,
} from '@/api/pictureController.ts'
import { useRoute, useRouter } from 'vue-router'
import UrlPictureUpload from '@/components/UrlPictureUpload.vue'
import { getSpaceVoByIdUsingGet } from '@/api/spaceController.ts'
import SpaceLevelBadge from '@/components/SpaceLevelBadge.vue'
import { formatSize } from '@/utils'
import ImageEditor from '@/components/ImageEditor.vue'
import { SPACE_TYPE_ENUM } from '@/constants/space'
import { useLoginUserStore } from '@/stores/useLoginUserStore'
const props = defineProps<{
  embedded?: boolean
  initialPictureId?: string
  initialSpaceId?: string
}>()
const emit = defineEmits<{ saved: []; changed: []; busy: [value: boolean] }>()
const picture = ref<API.PictureVO>()
const uploadType = ref<'file' | 'url'>('file')
const route = useRoute()
const rawPictureId = computed(() => (props.embedded ? props.initialPictureId : route.query.id))
const rawSpaceId = computed(() => (props.embedded ? props.initialSpaceId : route.query.spaceId))
const isEditing = computed(() => rawPictureId.value !== undefined)
const spaceId = computed(() => {
  const value = rawSpaceId.value
  if (typeof value !== 'string' || !/^\d+$/.test(value)) return undefined
  return /[1-9]/.test(value) ? value : undefined
})
const invalidSpaceId = computed(() => rawSpaceId.value !== undefined && spaceId.value === undefined)
const targetSpaceId = ref<string>()
const targetSpace = ref<API.SpaceVO>()
const contextLoading = ref(true)
const contextError = ref('')
const submitting = ref(false)
const uploadBusy = ref(false)
const imageEditorOpen = ref(false)
const imageEditorBusy = ref(false)
const imageEditorSaving = ref(false)
const editingCopy = ref(false)
const loginUserStore = useLoginUserStore()
const canEditImage = computed(() => {
  const ownerId = targetSpace.value?.userId ?? targetSpace.value?.user?.id
  const userId = loginUserStore.loginUser.id
  if (!picture.value?.id || !picture.value.url) return false
  if (!isEditing.value && targetSpaceId.value == null) {
    return picture.value.spaceId == null
  }
  return (
    picture.value.spaceId != null &&
    String(picture.value.spaceId) === targetSpaceId.value &&
    targetSpace.value?.spaceType === SPACE_TYPE_ENUM.PRIVATE &&
    ownerId != null &&
    userId != null &&
    String(ownerId) === String(userId)
  )
})
let contextGeneration = 0
let spaceGeneration = 0
const setUploadBusy = (value: boolean) => {
  uploadBusy.value = value
  emit('busy', value || submitting.value || imageEditorOpen.value)
}

const openImageEditor = () => {
  if (!canEditImage.value || uploadBusy.value || submitting.value) return
  imageEditorOpen.value = true
  emit('busy', true)
}

const closeImageEditor = () => {
  if (imageEditorBusy.value || imageEditorSaving.value) return
  imageEditorOpen.value = false
  emit('busy', uploadBusy.value || submitting.value)
}

const saveEditedImage = async (file: File) => {
  const currentPicture = picture.value
  if (!canEditImage.value || !currentPicture?.id) {
    message.error('图片或空间信息已变化，请重新打开图片编辑器')
    return
  }
  const replace = !isEditing.value
  const params: API.uploadPictureUsingPOSTParams = {
    spaceId: currentPicture.spaceId,
    ...(replace ? { id: currentPicture.id, picName: currentPicture.name } : {}),
  }
  const generation = contextGeneration
  imageEditorBusy.value = true
  imageEditorSaving.value = true
  try {
    const res = await uploadPictureUsingPost(params, {}, file)
    if (generation !== contextGeneration) return
    if (res.data.code !== 0 || !res.data.data) {
      message.error('保存画面失败：' + (res.data.message || '请稍后重试'))
      return
    }
    emit('changed')
    if (!res.data.data.id || !res.data.data.url) {
      message.error('图片已上传，但返回的图片信息不完整，请关闭后在空间中查看。')
      return
    }
    picture.value = res.data.data
    editingCopy.value = !replace
    imageEditorOpen.value = false
    emit('busy', uploadBusy.value || submitting.value)
    message.success(replace ? '图片画面已更新' : '已保存为新图片，原图未改变')
    if (targetSpaceId.value) void loadSpaceInfo(targetSpaceId.value, generation)
  } catch (error) {
    if (generation === contextGeneration) {
      console.error('保存画面失败:', error)
      message.error('保存画面失败，请检查网络后重试')
    }
  } finally {
    if (generation === contextGeneration) {
      imageEditorBusy.value = false
      imageEditorSaving.value = false
    }
  }
}

/**
 * 图片上传成功
 * @param newPicture
 */
const onSuccess = (newPicture: API.PictureVO) => {
  picture.value = newPicture
  pictureForm.name = newPicture.name
  emit('changed')
  if (targetSpaceId.value) void loadSpaceInfo(targetSpaceId.value, contextGeneration)
}

const pictureForm = reactive<API.PictureEditRequest>({})

const router = useRouter()

/**
 * 提交表单
 * @param values
 */
const handleSubmit = async (values: API.PictureEditRequest) => {
  if (submitting.value || uploadBusy.value) return
  const pictureId = picture.value?.id
  if (!pictureId) {
    await message.error('请先上传图片')
    return
  }
  submitting.value = true
  emit('busy', true)
  try {
    const res = await editPictureUsingPost({ id: pictureId, ...values })
    // 操作成功
    if (res.data.code === 0 && res.data.data) {
      message.success(isEditing.value ? '修改成功' : '创建成功')
      if (props.embedded) {
        emit('saved')
      } else {
        router.push({ path: `/picture/${pictureId}` })
      }
    } else {
      await message.error((isEditing.value ? '修改失败: ' : '创建失败: ') + res.data.message)
    }
  } catch (error) {
    console.error('保存图片失败:', error)
    await message.error('保存图片失败，请检查网络后重试')
  } finally {
    submitting.value = false
    emit('busy', uploadBusy.value || imageEditorOpen.value)
  }
}

const categoryOptions = ref<SelectProps['options']>([])
const tagOptions = ref<SelectProps['options']>([])

/**
 * 获取标签和分类选项
 * @param values
 */
const getTagAndCategoryOptions = async () => {
  try {
    const res = await listPictureTagCategoryUsingGet()
    // 操作成功
    if (res.data.code === 0 && res.data.data) {
      tagOptions.value = (res.data.data.tagList ?? []).map((data: string) => {
        return {
          value: data,
          label: data,
        }
      })
      categoryOptions.value = (res.data.data.categoryList ?? []).map((data: string) => {
        return {
          value: data,
          label: data,
        }
      })
    } else {
      await message.error('获取标签失败: ' + res.data.message)
    }
  } catch (error) {
    console.error('获取标签和分类失败:', error)
    await message.error('获取标签和分类失败，请检查网络后重试')
  }
}

onMounted(() => {
  getTagAndCategoryOptions()
})

const loadContext = async () => {
  const generation = ++contextGeneration
  contextLoading.value = true
  contextError.value = ''
  targetSpaceId.value = undefined
  targetSpace.value = undefined
  picture.value = undefined
  editingCopy.value = false
  imageEditorOpen.value = false
  imageEditorBusy.value = false
  imageEditorSaving.value = false
  Object.assign(pictureForm, {
    name: undefined,
    tags: undefined,
    introduction: undefined,
    category: undefined,
  })

  if (invalidSpaceId.value) {
    contextError.value = '空间 ID 无效，无法上传图片。请返回空间详情页重试。'
    contextLoading.value = false
    return
  }

  const rawId = rawPictureId.value
  if (isEditing.value) {
    if (typeof rawId !== 'string' || !/^\d+$/.test(rawId) || !/[1-9]/.test(rawId)) {
      contextError.value = '图片 ID 无效，请返回图片详情页重试。'
      contextLoading.value = false
      return
    }
    try {
      const res = await getPictureVoByIdUsingGet({ id: rawId })
      if (generation !== contextGeneration) return
      if (res.data.code !== 0 || !res.data.data?.id) {
        contextError.value = '获取图片失败：' + (res.data.message || '请返回图片详情页重试。')
        contextLoading.value = false
        return
      }
      const data = res.data.data
      const actualSpaceId = data.spaceId != null ? String(data.spaceId) : undefined
      if (spaceId.value && spaceId.value !== actualSpaceId) {
        contextError.value = '指定空间与图片所属空间不一致，请返回图片详情页重试。'
        contextLoading.value = false
        return
      }
      targetSpaceId.value = actualSpaceId
      picture.value = data
      Object.assign(pictureForm, {
        name: data.name,
        tags: data.tags,
        introduction: data.introduction,
        category: data.category,
      })
    } catch (error) {
      if (generation !== contextGeneration) return
      console.error('获取图片失败:', error)
      contextError.value = '获取图片失败，请检查网络后返回图片详情页重试。'
      contextLoading.value = false
      return
    }
  } else {
    targetSpaceId.value = spaceId.value
  }
  contextLoading.value = false

  if (targetSpaceId.value) {
    await loadSpaceInfo(targetSpaceId.value, generation)
  }
}

async function loadSpaceInfo(id: string, generation: number) {
  const requestId = ++spaceGeneration
  try {
    const res = await getSpaceVoByIdUsingGet({ id })
    if (generation !== contextGeneration || requestId !== spaceGeneration) return
    if (res.data.code === 0 && res.data.data) {
      targetSpace.value = res.data.data
    } else {
      targetSpace.value = undefined
      console.error('获取空间信息失败:', res.data.message)
      message.warning('无法获取空间信息，请核对显示的空间 ID。')
    }
  } catch (error) {
    if (generation !== contextGeneration || requestId !== spaceGeneration) return
    targetSpace.value = undefined
    console.error('获取空间信息失败:', error)
    message.warning('无法获取空间信息，请核对显示的空间 ID。')
  }
}

watch(() => [rawPictureId.value, rawSpaceId.value], loadContext, { immediate: true })
onBeforeUnmount(() => {
  contextGeneration++
})
</script>

<style scoped>
#addPicturePage {
  max-width: 720px;
  margin: 0 auto;
}

.space-notice {
  margin-bottom: 16px;
  overflow-wrap: anywhere;
}

.image-edit-action {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px 12px;
  margin: 0 0 16px;
}

.image-edit-action > span {
  color: #595959;
}

.copy-notice {
  margin-bottom: 16px;
}
</style>
