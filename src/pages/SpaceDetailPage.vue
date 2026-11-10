<template>
  <div id="spaceDetailPage">
    <a-spin v-if="spaceLoading" />
    <a-result v-else-if="spaceError" status="error" title="无法加载空间" :sub-title="spaceError">
      <template #extra>
        <a-button type="primary" @click="loadSpace">重试</a-button>
      </template>
    </a-result>
    <template v-else-if="space">
      <header class="space-header">
        <div class="space-heading">
          <div class="space-title">
            <h1>{{ space.spaceName || '未命名空间' }}</h1>
            <SpaceLevelBadge :level="space.spaceLevel" />
          </div>
          <p>管理这个空间里的图片</p>
        </div>
        <section class="space-usage" aria-label="空间容量">
          <div class="usage-heading">
            <span>空间容量</span>
            <strong v-if="remainingSize !== undefined">剩余 {{ formatSize(remainingSize) }}</strong>
            <strong v-else>容量信息暂不可用</strong>
          </div>
          <a-progress
            v-if="usagePercent !== undefined"
            :percent="usagePercent"
            :show-info="false"
          />
          <p v-if="space.totalSize != null && space.maxSize != null">
            已用 {{ formatSize(space.totalSize) }} / {{ formatSize(space.maxSize) }}
          </p>
        </section>
        <a-button class="create-picture" type="primary" @click="createPicture">
          <template #icon><PlusOutlined /></template>
          创建图片
        </a-button>
      </header>

      <div class="pictures-heading">
        <h2>空间图片</h2>
        <span v-if="space.totalCount != null">{{ space.totalCount }} 张</span>
      </div>
      <PictureSerachForm
        :initial-values="searchFilters"
        :disabled="deleting"
        @search="searchPictures"
      />
      <div class="picture-results" :aria-busy="pictureLoading">
        <a-alert v-if="pictureError" type="error" show-icon class="picture-error">
          <template #message>{{ pictureError }}</template>
          <template #action>
            <a-button size="small" @click="loadMore">重试</a-button>
          </template>
        </a-alert>
        <a-spin :spinning="pictureLoading && currentPage === 1" tip="正在搜索图片">
          <PictureWaterfallList
            v-if="!pictureError || currentPage > 1"
            :data-list="dataList"
            :loading="pictureLoading"
            :has-more="hasMore && !pictureError"
            :empty-description="hasFilters ? '没有符合条件的图片' : '暂无图片'"
            @load-more="loadMore"
          >
            <template #actions="{ picture }">
              <a-space>
                <a-button
                  type="link"
                  size="small"
                  :disabled="!picture.id || deleting"
                  :aria-label="`以图搜图 ${picture.name || '未命名'}`"
                  @click="searchByPicture(picture)"
                >
                  以图搜图
                </a-button>
                <a-button
                  v-if="canManagePictures"
                  type="link"
                  size="small"
                  :disabled="!picture.id || deleting"
                  :aria-label="`编辑图片 ${picture.name || '未命名'}`"
                  @click="editPicture(picture)"
                >
                  编辑
                </a-button>
                <a-popconfirm
                  v-if="canManagePictures"
                  title="确定删除这张图片吗？"
                  ok-text="删除"
                  cancel-text="取消"
                  :disabled="!picture.id || deleting"
                  @confirm="deletePicture(picture)"
                >
                  <a-button
                    type="link"
                    danger
                    size="small"
                    :disabled="!picture.id || deleting"
                    :aria-label="`删除图片 ${picture.name || '未命名'}`"
                  >
                    删除
                  </a-button>
                </a-popconfirm>
              </a-space>
            </template>
          </PictureWaterfallList>
        </a-spin>
      </div>
    </template>
    <a-modal
      :open="pictureModalOpen"
      :title="editingPictureId ? '编辑图片' : '创建图片'"
      :footer="null"
      :closable="!pictureModalBusy"
      :mask-closable="!pictureModalBusy"
      :keyboard="!pictureModalBusy"
      :width="720"
      destroy-on-close
      @cancel="closePictureModal"
    >
      <AddPicturePage
        v-if="pictureModalOpen"
        embedded
        :initial-picture-id="editingPictureId"
        :initial-space-id="String(props.id)"
        @busy="pictureModalBusy = $event"
        @changed="pictureModalChanged = true"
        @saved="pictureSaved"
      />
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { PlusOutlined } from '@ant-design/icons-vue'
import { getSpaceVoByIdUsingGet } from '@/api/spaceController.ts'
import { deletePictureUsingPost, listPictureVoByPageUsingPost } from '@/api/pictureController.ts'
import PictureWaterfallList from '@/components/PictureWaterfallList.vue'
import AddPicturePage from '@/pages/AddPicturePage.vue'
import SpaceLevelBadge from '@/components/SpaceLevelBadge.vue'
import { useLoginUserStore } from '@/stores/useLoginUserStore'
import { formatSize } from '@/utils'
import PictureSerachForm from '@/components/PictureSerachForm.vue'

const props = defineProps<{ id: number | string }>()
const router = useRouter()
const loginUserStore = useLoginUserStore()
const space = ref<API.SpaceVO>()
const spaceLoading = ref(false)
const spaceError = ref('')
const dataList = ref<API.PictureVO[]>([])
const searchFilters = ref<API.PictureQueryRequest>({})
const hasFilters = computed(() =>
  Object.values(searchFilters.value).some((value) => value != null && value !== ''),
)
const pictureLoading = ref(false)
const pictureError = ref('')
const hasMore = ref(false)
const currentPage = ref(1)
const pageSize = 20
const deleting = ref(false)
const pictureModalOpen = ref(false)
const pictureModalBusy = ref(false)
const pictureModalChanged = ref(false)
const editingPictureId = ref<string>()
let generation = 0
let pictureGeneration = 0

const canManagePictures = computed(() => {
  const ownerId = space.value?.userId ?? space.value?.user?.id
  const userId = loginUserStore.loginUser.id
  return ownerId != null && userId != null && String(ownerId) === String(userId)
})

const remainingSize = computed(() => {
  if (space.value?.maxSize == null || space.value.totalSize == null) return undefined
  return Math.max(0, space.value.maxSize - space.value.totalSize)
})
const usagePercent = computed(() => {
  if (space.value?.maxSize == null || space.value.totalSize == null) return undefined
  if (space.value.maxSize <= 0) return 0
  return Math.min(100, Math.max(0, Math.round((space.value.totalSize / space.value.maxSize) * 100)))
})

const loadSpace = async () => {
  const requestGeneration = ++generation
  pictureGeneration++
  const id = String(props.id)
  space.value = undefined
  spaceError.value = ''
  dataList.value = []
  pictureError.value = ''
  pictureLoading.value = false
  currentPage.value = 1
  hasMore.value = false
  if (!/^\d+$/.test(id) || !/[1-9]/.test(id)) {
    spaceLoading.value = false
    spaceError.value = '空间 ID 无效'
    return
  }
  spaceLoading.value = true
  try {
    const res = await getSpaceVoByIdUsingGet({ id })
    if (requestGeneration !== generation) return
    if (res.data.code !== 0 || !res.data.data) {
      spaceError.value = res.data.message || '请稍后重试'
      return
    }
    space.value = res.data.data
    hasMore.value = true
    await loadMore()
  } catch (error) {
    if (requestGeneration === generation) {
      console.error('获取空间详情失败:', error)
      spaceError.value = '获取空间详情失败，请检查网络后重试'
    }
  } finally {
    if (requestGeneration === generation) spaceLoading.value = false
  }
}

const loadMore = async () => {
  if (pictureLoading.value || deleting.value || !hasMore.value) return
  const requestGeneration = generation
  const requestPictureGeneration = pictureGeneration
  const page = currentPage.value
  pictureLoading.value = true
  pictureError.value = ''
  try {
    const res = await listPictureVoByPageUsingPost({
      ...searchFilters.value,
      spaceId: String(props.id),
      current: page,
      pageSize,
    })
    if (requestGeneration !== generation || requestPictureGeneration !== pictureGeneration) return
    if (res.data.code !== 0 || !res.data.data) {
      pictureError.value = '获取空间图片失败：' + (res.data.message || '请稍后重试')
      return
    }
    const result = res.data.data
    const records = result.records ?? []
    dataList.value = page === 1 ? records : [...dataList.value, ...records]
    hasMore.value =
      records.length > 0 &&
      (result.total != null ? dataList.value.length < result.total : records.length === pageSize)
    currentPage.value = page + 1
  } catch (error) {
    if (requestGeneration === generation && requestPictureGeneration === pictureGeneration) {
      console.error('获取空间图片失败:', error)
      pictureError.value = '获取空间图片失败，请检查网络后重试'
    }
  } finally {
    if (requestGeneration === generation && requestPictureGeneration === pictureGeneration)
      pictureLoading.value = false
  }
}

const searchPictures = (filters: API.PictureQueryRequest) => {
  searchFilters.value = filters
  pictureGeneration++
  pictureError.value = ''
  pictureLoading.value = false
  currentPage.value = 1
  hasMore.value = true
  void loadMore()
}

const searchByPicture = (picture: API.PictureVO) => {
  if (!picture.id || deleting.value) return
  void router.push({ name: '以图搜图', params: { id: String(picture.id) } })
}

const createPicture = () => {
  if (!space.value) {
    message.error('空间尚未加载')
    return
  }
  editingPictureId.value = undefined
  pictureModalChanged.value = false
  pictureModalOpen.value = true
}

const editPicture = (picture: API.PictureVO) => {
  if (!picture.id || !canManagePictures.value || deleting.value) return
  editingPictureId.value = String(picture.id)
  pictureModalChanged.value = false
  pictureModalOpen.value = true
}

const closePictureModal = () => {
  if (pictureModalBusy.value) return
  pictureModalOpen.value = false
  if (pictureModalChanged.value) {
    pictureModalChanged.value = false
    void loadSpace()
  }
}

const pictureSaved = () => {
  pictureModalOpen.value = false
  pictureModalChanged.value = false
  void loadSpace()
}

const deletePicture = async (picture: API.PictureVO) => {
  if (!picture.id || !canManagePictures.value || deleting.value) return
  const requestGeneration = generation
  deleting.value = true
  try {
    const res = await deletePictureUsingPost({ id: picture.id })
    if (requestGeneration !== generation) return
    if (res.data.code !== 0 || !res.data.data) {
      message.error('删除图片失败：' + (res.data.message || '请稍后重试'))
      return
    }
    message.success('图片已删除')
    deleting.value = false
    await loadSpace()
  } catch (error) {
    if (requestGeneration === generation) {
      console.error('删除图片失败:', error)
      message.error('删除图片失败，请检查网络后重试')
    }
  } finally {
    deleting.value = false
  }
}

watch(
  () => props.id,
  () => {
    searchFilters.value = {}
    pictureModalOpen.value = false
    pictureModalBusy.value = false
    pictureModalChanged.value = false
    void loadSpace()
  },
  { immediate: true },
)
onBeforeUnmount(() => {
  generation++
})
</script>

<style scoped>
#spaceDetailPage {
  margin-bottom: 16px;
}

.space-header {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(220px, 360px) auto;
  grid-template-areas: 'heading usage action';
  align-items: center;
  gap: 16px 32px;
  margin-bottom: 24px;
  padding-bottom: 24px;
  border-bottom: 1px solid #f0f0f0;
}

.space-heading {
  grid-area: heading;
  min-width: 0;
}

.space-heading h1 {
  margin: 0 0 4px;
  font-size: 24px;
  overflow-wrap: anywhere;
}

.space-title {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.space-heading p,
.space-usage p {
  margin: 0;
  color: #595959;
}

.space-usage {
  grid-area: usage;
  min-width: 0;
}

.create-picture {
  grid-area: action;
}

.usage-heading,
.pictures-heading {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 16px;
}

.space-usage p {
  font-size: 12px;
}

.pictures-heading {
  justify-content: flex-start;
  margin-bottom: 16px;
}

.pictures-heading h2 {
  margin: 0;
  font-size: 18px;
}

.pictures-heading span {
  color: #595959;
}

.picture-error {
  margin-bottom: 16px;
}

.picture-results {
  min-height: 100vh;
}

@media (max-width: 768px) {
  .space-header {
    grid-template-columns: minmax(0, 1fr) auto;
    grid-template-areas:
      'heading action'
      'usage usage';
    gap: 12px 16px;
  }

  .space-usage {
    max-width: 360px;
  }
}

@media (max-width: 360px) {
  .space-header {
    grid-template-columns: minmax(0, 1fr);
    grid-template-areas:
      'heading'
      'usage'
      'action';
  }

  .create-picture {
    justify-self: start;
  }
}
</style>
