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
      <section class="search-panel" aria-label="搜索图片">
        <div class="search-panel-header">
          <div class="search-heading">
            <SearchOutlined aria-hidden="true" />
            <span>搜索图片</span>
          </div>
          <div class="search-modes" role="group" aria-label="搜索方式">
            <a-button
              :class="{ 'search-mode-active': searchMode === 'filters' }"
              :disabled="deleting"
              :aria-pressed="searchMode === 'filters'"
              @click="setSearchMode('filters')"
              >条件搜索</a-button
            >
            <a-button
              :class="{ 'search-mode-active': searchMode === 'color' }"
              :disabled="deleting"
              :aria-pressed="searchMode === 'color'"
              @click="setSearchMode('color')"
              >颜色搜索</a-button
            >
          </div>
        </div>
        <PictureSerachForm
          v-if="searchMode === 'filters'"
          :initial-values="searchFilters"
          :disabled="deleting"
          @search="searchPictures"
        />
        <form v-else class="color-search" @submit.prevent="submitColorSearch">
          <div class="color-controls">
            <span>选择颜色</span>
            <a-popover v-model:open="colorPickerOpen" trigger="click" placement="bottomLeft">
              <template #content>
                <Sketch
                  :model-value="selectedColor"
                  :preset-colors="presetColors"
                  disable-alpha
                  @update:model-value="updateSelectedColor"
                />
              </template>
              <a-button
                :disabled="deleting"
                :aria-label="`选择颜色，当前 ${selectedColor.toUpperCase()}`"
                :aria-expanded="colorPickerOpen"
              >
                <span class="color-swatch" :style="{ backgroundColor: selectedColor }"></span>
                {{ selectedColor.toUpperCase() }}
              </a-button>
            </a-popover>
            <a-button type="primary" html-type="submit" :disabled="deleting">搜索颜色</a-button>
          </div>
          <p>颜色搜索与条件搜索相互独立，不会组合筛选。</p>
          <p v-if="appliedColor" class="applied-color">
            当前结果颜色：<span
              class="color-swatch"
              :style="{ backgroundColor: appliedColor }"
            ></span>
            {{ appliedColor.toUpperCase() }}
          </p>
        </form>
      </section>
      <div v-if="canManagePictures" class="batch-toolbar">
        <a-button
          type="primary"
          ghost
          :disabled="pictureLoading || deleting || !dataList.length"
          @click="openBatchEdit"
        >
          批量编辑
        </a-button>
        <span v-if="selectedPictureIds.length">已勾选 {{ selectedPictureIds.length }} 张</span>
        <span v-else>
          {{
            searchMode === 'filters'
              ? '未勾选时默认编辑最近加载的一页'
              : '未勾选时默认编辑当前颜色搜索结果'
          }}
        </span>
        <a-button v-if="selectedPictureIds.length" type="link" @click="selectedPictureIds = []">
          清空勾选
        </a-button>
      </div>
      <div class="picture-results" :aria-busy="pictureLoading">
        <a-alert v-if="pictureError" type="error" show-icon class="picture-error">
          <template #message>{{ pictureError }}</template>
          <template #action>
            <a-button size="small" @click="retryPictures">重试</a-button>
          </template>
        </a-alert>
        <a-spin :spinning="pictureLoading && currentPage === 1" tip="正在搜索图片">
          <a-empty
            v-if="searchMode === 'color' && !appliedColor && !pictureLoading"
            description="请选择颜色并点击搜索"
          />
          <PictureWaterfallList
            v-else-if="!pictureError || (searchMode === 'filters' && currentPage > 1)"
            :data-list="dataList"
            :loading="pictureLoading"
            :has-more="hasMore && !pictureError"
            :empty-description="
              searchMode === 'color'
                ? '没有找到相近颜色的图片'
                : hasFilters
                  ? '没有符合条件的图片'
                  : '暂无图片'
            "
            @load-more="loadMore"
          >
            <template v-if="canManagePictures" #cover-action="{ picture }">
              <a-checkbox
                class="picture-selection"
                :class="{
                  'picture-selection--checked':
                    picture.id != null && selectedPictureIds.includes(picture.id),
                }"
                :checked="picture.id != null && selectedPictureIds.includes(picture.id)"
                :disabled="picture.id == null || deleting"
                :aria-label="`勾选图片 ${picture.name || '未命名'}`"
                @change="togglePictureSelection(picture.id)"
              />
            </template>
            <template #actions="{ picture }">
              <div class="picture-action-groups">
                <div v-if="canManagePictures" class="picture-edit-actions">
                  <a-button
                    v-if="canEditImage"
                    type="text"
                    class="picture-action--edit"
                    :disabled="!picture.url || deleting"
                    :aria-label="`编辑画面 ${picture.name || '未命名'}`"
                    @click="openImageEditor(picture)"
                  >
                    <template #icon><PictureOutlined /></template>
                    编辑画面
                  </a-button>
                  <a-button
                    v-if="canEditImage"
                    type="text"
                    class="picture-action--edit"
                    :disabled="!picture.id || !picture.url || deleting"
                    :aria-label="`AI 扩图 ${picture.name || '未命名'}`"
                    @click="openOutPainting(picture)"
                  >
                    <template #icon><PictureOutlined /></template>
                    AI 扩图
                  </a-button>
                  <a-button
                    type="text"
                    class="picture-action--edit"
                    :disabled="!picture.id || deleting"
                    :aria-label="`编辑图片信息 ${picture.name || '未命名'}`"
                    @click="editPicture(picture)"
                  >
                    <template #icon><EditOutlined /></template>
                    编辑信息
                  </a-button>
                </div>
                <div class="picture-utility-actions">
                  <a-button
                    type="text"
                    class="picture-action--share"
                    :disabled="!picture.url || deleting"
                    :aria-label="`分享图片 ${picture.name || '未命名'}`"
                    title="分享"
                    @click="sharePicture(picture)"
                  >
                    <template #icon><ShareAltOutlined /></template>
                    <span class="utility-label">分享</span>
                  </a-button>
                  <a-button
                    type="text"
                    class="picture-action--search"
                    :disabled="!picture.id || deleting"
                    :aria-label="`以图搜图 ${picture.name || '未命名'}`"
                    title="以图搜图"
                    @click="searchByPicture(picture)"
                  >
                    <template #icon><SearchOutlined /></template>
                    <span class="utility-label">以图搜图</span>
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
                      type="text"
                      danger
                      :disabled="!picture.id || deleting"
                      :aria-label="`删除图片 ${picture.name || '未命名'}`"
                      title="删除"
                    >
                      <template #icon><DeleteOutlined /></template>
                      <span class="utility-label">删除</span>
                    </a-button>
                  </a-popconfirm>
                </div>
              </div>
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
      :focus-trigger-after-close="false"
      :width="720"
      destroy-on-close
      @cancel="closePictureModal"
      @after-close="restorePictureFocus"
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
    <BatchEditPictureModal
      :key="String(props.id)"
      :open="batchModalOpen"
      :space-id="String(props.id)"
      :pictures="batchPictures"
      :scope-description="batchScopeDescription"
      @close="batchModalOpen = false"
      @saved="batchSaved"
    />
    <a-modal
      :open="imageEditorOpen"
      title="编辑画面"
      :footer="null"
      :width="900"
      :closable="!imageEditorBusy"
      :mask-closable="!imageEditorBusy"
      :keyboard="!imageEditorBusy"
      :focus-trigger-after-close="false"
      destroy-on-close
      @cancel="closeImageEditor"
      @after-close="restoreImageEditorFocus"
    >
      <ImageEditor
        v-if="imageEditorOpen && imageToEdit?.url"
        :src="imageToEdit.url"
        :name="imageToEdit.name"
        :format="imageToEdit.picFormat"
        :saving="imageEditorSaving"
        @busy="imageEditorBusy = $event"
        @cancel="closeImageEditor"
        @save="saveEditedImage"
      />
    </a-modal>
    <OutPaintingModal
      v-if="outPaintingPicture"
      :open="outPaintingOpen"
      :picture="outPaintingPicture"
      @close="outPaintingOpen = false"
    />
    <ShareModal v-model:open="shareModalOpen" :url="sharePictureUrl" />
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  PictureOutlined,
  SearchOutlined,
  ShareAltOutlined,
} from '@ant-design/icons-vue'
import { Sketch } from '@ckpack/vue-color'
import { getSpaceVoByIdUsingGet } from '@/api/spaceController.ts'
import {
  deletePictureUsingPost,
  listPictureVoByPageUsingPost,
  searchPictureByColorUsingPost,
  uploadPictureUsingPost,
} from '@/api/pictureController.ts'
import PictureWaterfallList from '@/components/PictureWaterfallList.vue'
import AddPicturePage from '@/pages/AddPicturePage.vue'
import SpaceLevelBadge from '@/components/SpaceLevelBadge.vue'
import { useLoginUserStore } from '@/stores/useLoginUserStore'
import { formatSize } from '@/utils'
import PictureSerachForm from '@/components/PictureSerachForm.vue'
import ShareModal from '@/components/ShareModal.vue'
import BatchEditPictureModal from '@/components/BatchEditPictureModal.vue'
import ImageEditor from '@/components/ImageEditor.vue'
import OutPaintingModal from '@/components/OutPaintingModal.vue'
import { SPACE_TYPE_ENUM } from '@/constants/space'
import '@/assets/picture-actions.css'

const props = defineProps<{ id: number | string }>()
const router = useRouter()
const loginUserStore = useLoginUserStore()
const space = ref<API.SpaceVO>()
const spaceLoading = ref(false)
const spaceError = ref('')
const dataList = ref<API.PictureVO[]>([])
const currentPagePictures = ref<API.PictureVO[]>([])
const selectedPictureIds = ref<number[]>([])
const batchModalOpen = ref(false)
const batchPictures = ref<API.PictureVO[]>([])
const batchScopeDescription = ref('')
const searchFilters = ref<API.PictureQueryRequest>({})
const searchMode = ref<'filters' | 'color'>('filters')
const selectedColor = ref('#1677ff')
const appliedColor = ref('')
const colorPickerOpen = ref(false)
const presetColors = [
  '#D0021B',
  '#F5A623',
  '#F8E71C',
  '#8B572A',
  '#7ED321',
  '#417505',
  '#BD10E0',
  '#9013FE',
  '#4A90E2',
  '#50E3C2',
  '#B8E986',
  '#000000',
  '#4A4A4A',
  '#9B9B9B',
  '#FFFFFF',
]
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
const imageEditorOpen = ref(false)
const imageEditorBusy = ref(false)
const imageEditorSaving = ref(false)
const imageToEdit = ref<API.PictureVO>()
const outPaintingOpen = ref(false)
const outPaintingPicture = ref<API.PictureVO>()
let pictureModalTrigger: HTMLElement | null = null
let imageEditorTrigger: HTMLElement | null = null
const shareModalOpen = ref(false)
const sharePictureUrl = ref('')
let generation = 0
let pictureGeneration = 0

const canManagePictures = computed(() => {
  const ownerId = space.value?.userId ?? space.value?.user?.id
  const userId = loginUserStore.loginUser.id
  return ownerId != null && userId != null && String(ownerId) === String(userId)
})
const canEditImage = computed(
  () => canManagePictures.value && space.value?.spaceType === SPACE_TYPE_ENUM.PRIVATE,
)

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
  currentPagePictures.value = []
  selectedPictureIds.value = []
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
    if (searchMode.value === 'color') {
      if (appliedColor.value) await loadColorPictures()
    } else {
      hasMore.value = true
      await loadMore()
    }
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
  if (searchMode.value !== 'filters' || pictureLoading.value || deleting.value || !hasMore.value)
    return
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
    currentPagePictures.value = records
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

const loadColorPictures = async () => {
  if (searchMode.value !== 'color' || !appliedColor.value || pictureLoading.value || deleting.value)
    return
  const requestGeneration = generation
  const requestPictureGeneration = pictureGeneration
  pictureLoading.value = true
  pictureError.value = ''
  try {
    const res = await searchPictureByColorUsingPost({
      spaceId: String(props.id),
      picColor: appliedColor.value,
    })
    if (requestGeneration !== generation || requestPictureGeneration !== pictureGeneration) return
    if (res.data.code !== 0 || !Array.isArray(res.data.data)) {
      pictureError.value = '颜色搜索失败：' + (res.data.message || '请稍后重试')
      return
    }
    dataList.value = res.data.data
    currentPagePictures.value = res.data.data
  } catch (error) {
    if (requestGeneration === generation && requestPictureGeneration === pictureGeneration) {
      console.error('颜色搜索失败:', error)
      pictureError.value = '颜色搜索失败，请检查网络后重试'
    }
  } finally {
    if (requestGeneration === generation && requestPictureGeneration === pictureGeneration)
      pictureLoading.value = false
  }
}

const refreshSpace = async () => {
  const id = space.value?.id
  if (id == null) {
    message.error('空间信息不可用，请刷新页面重试')
    return
  }
  const requestGeneration = generation
  const requestPictureGeneration = ++pictureGeneration
  const mode = searchMode.value
  const pagesToRefresh = Math.max(1, currentPage.value - 1)
  const filters = { ...searchFilters.value }
  const color = appliedColor.value
  pictureLoading.value = true
  pictureError.value = ''

  const isCurrent = () =>
    requestGeneration === generation && requestPictureGeneration === pictureGeneration

  try {
    const spaceRequest = getSpaceVoByIdUsingGet({ id })
    const picturesRequest = async () => {
      if (mode === 'color') {
        if (!color) return { records: [], lastPage: [], nextPage: 1, hasMore: false }
        const res = await searchPictureByColorUsingPost({ spaceId: id, picColor: color })
        if (res.data.code !== 0 || !Array.isArray(res.data.data)) {
          throw new Error(res.data.message || '颜色搜索失败')
        }
        return { records: res.data.data, lastPage: res.data.data, nextPage: 1, hasMore: false }
      }

      const records: API.PictureVO[] = []
      let lastPage: API.PictureVO[] = []
      let nextPage = 1
      let more = false
      for (let page = 1; page <= pagesToRefresh; page++) {
        const res = await listPictureVoByPageUsingPost({
          ...filters,
          spaceId: id,
          current: page,
          pageSize,
        })
        if (!isCurrent()) return
        if (res.data.code !== 0 || !res.data.data) {
          throw new Error(res.data.message || '获取空间图片失败')
        }
        const result = res.data.data
        const pageRecords = result.records ?? []
        if (pageRecords.length || page === 1) lastPage = pageRecords
        records.push(...pageRecords)
        nextPage = page + 1
        more =
          pageRecords.length > 0 &&
          (result.total != null ? records.length < result.total : pageRecords.length === pageSize)
        if (!more) break
      }
      return { records, lastPage, nextPage, hasMore: more }
    }

    const [spaceResponse, pictures] = await Promise.all([spaceRequest, picturesRequest()])
    if (!isCurrent() || !pictures) return
    if (spaceResponse.data.code !== 0 || !spaceResponse.data.data) {
      throw new Error(spaceResponse.data.message || '获取空间信息失败')
    }
    space.value = spaceResponse.data.data
    dataList.value = pictures.records
    currentPagePictures.value = pictures.lastPage
    currentPage.value = pictures.nextPage
    hasMore.value = pictures.hasMore
    selectedPictureIds.value = selectedPictureIds.value.filter((id) =>
      pictures.records.some((picture) => picture.id === id),
    )
  } catch (error) {
    if (isCurrent()) {
      console.error('刷新空间失败:', error)
      message.error('刷新空间失败，请检查网络后重试')
    }
  } finally {
    if (isCurrent()) pictureLoading.value = false
  }
}

const resetPictureResults = () => {
  pictureGeneration++
  dataList.value = []
  currentPagePictures.value = []
  selectedPictureIds.value = []
  pictureError.value = ''
  pictureLoading.value = false
  currentPage.value = 1
  hasMore.value = false
}

const setSearchMode = (mode: 'filters' | 'color') => {
  if (mode === searchMode.value || deleting.value) return
  colorPickerOpen.value = false
  searchMode.value = mode
  resetPictureResults()
  if (mode === 'filters') {
    hasMore.value = true
    void loadMore()
  } else if (appliedColor.value) {
    void loadColorPictures()
  }
}

const updateSelectedColor = ({ hex }: { hex: string }) => {
  selectedColor.value = hex
}

const submitColorSearch = () => {
  if (deleting.value) return
  colorPickerOpen.value = false
  appliedColor.value = selectedColor.value
  resetPictureResults()
  void loadColorPictures()
}

const retryPictures = () => {
  if (searchMode.value === 'color') void loadColorPictures()
  else void loadMore()
}

const searchPictures = (filters: API.PictureQueryRequest) => {
  searchFilters.value = filters
  resetPictureResults()
  hasMore.value = true
  void loadMore()
}

const togglePictureSelection = (id?: number) => {
  if (id == null) return
  selectedPictureIds.value = selectedPictureIds.value.includes(id)
    ? selectedPictureIds.value.filter((selectedId) => selectedId !== id)
    : [...selectedPictureIds.value, id]
}

const openBatchEdit = () => {
  if (!canManagePictures.value || pictureLoading.value || deleting.value) return
  const hasSelection = selectedPictureIds.value.length > 0
  batchPictures.value = (
    hasSelection
      ? dataList.value.filter(
          (picture) => picture.id != null && selectedPictureIds.value.includes(picture.id),
        )
      : currentPagePictures.value
  ).filter((picture) => picture.id != null)
  if (!batchPictures.value.length) {
    message.warning('没有可编辑的图片')
    return
  }
  batchScopeDescription.value = hasSelection
    ? '当前范围为已勾选的图片'
    : searchMode.value === 'filters'
      ? '当前范围为最近加载的一页图片'
      : '当前范围为颜色搜索结果'
  batchModalOpen.value = true
}

const batchSaved = () => {
  batchModalOpen.value = false
  selectedPictureIds.value = []
  void refreshSpace()
}

const searchByPicture = (picture: API.PictureVO) => {
  if (!picture.id || deleting.value) return
  void router.push({ name: '以图搜图', params: { id: String(picture.id) } })
}

const sharePicture = (picture: API.PictureVO) => {
  if (!picture.url || deleting.value) return
  sharePictureUrl.value = picture.url
  shareModalOpen.value = true
}

const createPicture = () => {
  if (!space.value) {
    message.error('空间尚未加载')
    return
  }
  editingPictureId.value = undefined
  pictureModalTrigger = document.activeElement instanceof HTMLElement ? document.activeElement : null
  pictureModalChanged.value = false
  pictureModalOpen.value = true
}

const editPicture = (picture: API.PictureVO) => {
  if (!picture.id || !canManagePictures.value || deleting.value) return
  pictureModalTrigger = document.activeElement instanceof HTMLElement ? document.activeElement : null
  editingPictureId.value = String(picture.id)
  pictureModalChanged.value = false
  pictureModalOpen.value = true
}

const openImageEditor = (picture: API.PictureVO) => {
  if (!picture.url || !canEditImage.value || deleting.value) return
  imageEditorTrigger = document.activeElement instanceof HTMLElement ? document.activeElement : null
  imageToEdit.value = picture
  imageEditorOpen.value = true
}

const openOutPainting = (picture: API.PictureVO) => {
  if (!picture.id || !picture.url || !canEditImage.value || deleting.value) return
  outPaintingPicture.value = picture
  outPaintingOpen.value = true
}

const restorePictureFocus = () => {
  if (pictureModalTrigger?.isConnected) pictureModalTrigger.focus({ preventScroll: true })
  pictureModalTrigger = null
}

const restoreImageEditorFocus = () => {
  if (imageEditorTrigger?.isConnected) imageEditorTrigger.focus({ preventScroll: true })
  imageEditorTrigger = null
}

const closeImageEditor = () => {
  if (imageEditorBusy.value) return
  imageEditorOpen.value = false
  imageToEdit.value = undefined
}

const saveEditedImage = async (file: File) => {
  const spaceId = space.value?.id
  if (!canEditImage.value || spaceId == null || String(spaceId) !== String(props.id)) {
    message.error('空间信息已变化，请重新打开图片编辑器')
    return
  }
  const requestGeneration = generation
  imageEditorBusy.value = true
  imageEditorSaving.value = true
  try {
    const res = await uploadPictureUsingPost({ spaceId }, {}, file)
    if (requestGeneration !== generation) return
    if (res.data.code !== 0 || !res.data.data) {
      message.error('保存新图片失败：' + (res.data.message || '请稍后重试'))
      return
    }
    imageEditorOpen.value = false
    imageToEdit.value = undefined
    outPaintingOpen.value = false
    outPaintingPicture.value = undefined
    message.success('已保存为新图片，原图未改变')
    imageEditorBusy.value = false
    imageEditorSaving.value = false
    await refreshSpace()
  } catch (error) {
    if (requestGeneration === generation) {
      console.error('保存新图片失败:', error)
      message.error('保存新图片失败，请检查网络后重试')
    }
  } finally {
    if (requestGeneration === generation) {
      imageEditorBusy.value = false
      imageEditorSaving.value = false
    }
  }
}

const closePictureModal = () => {
  if (pictureModalBusy.value) return
  pictureModalOpen.value = false
  if (pictureModalChanged.value) {
    pictureModalChanged.value = false
    void refreshSpace()
  }
}

const pictureSaved = () => {
  pictureModalOpen.value = false
  pictureModalChanged.value = false
  void refreshSpace()
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
    await refreshSpace()
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
    searchMode.value = 'filters'
    selectedColor.value = '#1677ff'
    appliedColor.value = ''
    colorPickerOpen.value = false
    pictureModalOpen.value = false
    pictureModalBusy.value = false
    pictureModalChanged.value = false
    imageEditorOpen.value = false
    imageToEdit.value = undefined
    imageEditorBusy.value = false
    imageEditorSaving.value = false
    batchModalOpen.value = false
    batchPictures.value = []
    shareModalOpen.value = false
    sharePictureUrl.value = ''
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

.search-panel {
  margin-bottom: 24px;
  padding: 16px;
  border: 1px solid #e8eef5;
  border-radius: 10px;
  background: #f7f9fc;
}

.search-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 12px;
}

.search-heading {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  color: #262626;
}

.search-heading :deep(.anticon) {
  color: #1677ff;
}

.search-modes {
  display: inline-flex;
  gap: 2px;
  padding: 3px;
  border-radius: 8px;
  background: #e8edf4;
}

.search-modes :deep(.ant-btn) {
  border: 0;
  box-shadow: none;
  background: transparent;
  color: #595959;
}

.search-modes :deep(.ant-btn.search-mode-active) {
  color: #0958d9;
  background: #fff;
  font-weight: 600;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.color-controls {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.color-search {
  padding: 12px;
  border: 1px solid #d9e3f0;
  border-radius: 8px;
  background: #fff;
}

.color-controls > span {
  margin-right: 4px;
  font-weight: 500;
}

.color-controls button .color-swatch {
  display: inline-block;
  vertical-align: middle;
  margin-right: 6px;
}

.color-search p {
  margin: 10px 0 0;
  color: #595959;
}

.applied-color {
  display: flex;
  align-items: center;
  gap: 6px;
}

.color-swatch {
  width: 16px;
  height: 16px;
  border: 1px solid #d9d9d9;
  border-radius: 3px;
}

.picture-error {
  margin-bottom: 16px;
}

.batch-toolbar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
  color: #595959;
}

.picture-selection {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  margin: 0;
  border-radius: 8px;
  background: transparent;
  opacity: 0;
  transition: opacity 0.2s;
}

.picture-selection :deep(.ant-checkbox:not(.ant-checkbox-disabled) .ant-checkbox-inner) {
  border-color: #fff;
  background: rgba(0, 0, 0, 0.35);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.5);
}

.picture-selection :deep(.ant-checkbox-checked:not(.ant-checkbox-disabled) .ant-checkbox-inner) {
  border-color: #1677ff;
  background: rgba(22, 119, 255, 0.85);
}

.picture-selection--checked,
.picture-results :deep(.waterfall-item:hover) .picture-selection,
.picture-results :deep(.waterfall-item:focus-within) .picture-selection {
  opacity: 1;
}

@media (hover: none) {
  .picture-selection {
    opacity: 1;
  }
}

.picture-action-groups {
  container-type: inline-size;
  width: 100%;
}

.picture-edit-actions,
.picture-utility-actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 4px;
}

.picture-utility-actions {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.picture-edit-actions + .picture-utility-actions {
  margin-top: 4px;
}

.picture-action-groups :deep(.ant-btn) {
  min-width: 0;
  height: 36px;
  padding-inline: 4px;
}

@container (max-width: 230px) {
  .picture-utility-actions :deep(.ant-btn) {
    flex-direction: column;
    justify-content: center;
    height: 48px;
    gap: 2px;
    font-size: 11px;
    line-height: 1;
  }

  .picture-utility-actions :deep(.ant-btn-icon + span) {
    margin-inline-start: 0;
  }
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
