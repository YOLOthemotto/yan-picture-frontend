<template>
  <div id="homeWaterfallPage">
    <div class="search-bar">
      <a-input-search
        v-model:value="searchParams.searchText"
        placeholder="从海量图片中搜索"
        enter-button="搜索"
        size="large"
        @search="doSearch"
      />
    </div>
    <a-tabs v-model:activeKey="selectedCategory" centered @change="doSearch">
      <a-tab-pane tab="全部" key="all" />
      <a-tab-pane v-for="category in categoryList" :key="category" :tab="category" />
    </a-tabs>
    <div class="tag-bar">
      <a-space :size="[0, 8]" wrap>
        <a-checkable-tag
          v-for="(tag, index) in tagList"
          :key="tag"
          v-model:checked="selectedTagList[index]"
          @change="doSearch"
        >
          {{ tag }}
        </a-checkable-tag>
      </a-space>
    </div>

    <!-- 瀑布流 -->
    <div class="waterfall">
      <div v-for="(column, colIndex) in columns" :key="colIndex" class="waterfall-column">
      <div
        v-for="picture in column"
        :key="picture.id"
        class="waterfall-item"
        @click="doClickPicture(picture)"
      >
        <div class="cover" :style="{ background: picture.picColor || '#f0f0f0' }">
          <img
            :src="picture.thumbnailUrl || picture.url"
            :alt="picture.name"
            loading="lazy"
            :style="{ aspectRatio: picture.picScale ? String(picture.picScale) : 'auto' }"
          />
          <div class="overlay">
            <div class="overlay-name">{{ picture.name }}</div>
            <div v-if="picture.introduction" class="overlay-intro">
              {{ picture.introduction }}
            </div>
          </div>
          <span v-if="picture.picFormat" class="format-badge">
            {{ picture.picFormat.toUpperCase() }}
          </span>
        </div>
        <div class="info">
          <div class="title">{{ picture.name }}</div>
          <div class="tags">
            <a-tag color="green">{{ picture.category ?? '默认' }}</a-tag>
            <a-tag v-for="tag in (picture.tags ?? []).slice(0, 3)" :key="tag">{{ tag }}</a-tag>
          </div>
          <div class="meta">
            <div class="author">
              <a-avatar :size="20" :src="picture.user?.userAvatar">
                {{ (picture.user?.userName ?? '?').charAt(0) }}
              </a-avatar>
              <span class="author-name">{{ picture.user?.userName ?? '匿名用户' }}</span>
            </div>
            <span v-if="picture.picWidth && picture.picHeight" class="size">
              {{ picture.picWidth }}×{{ picture.picHeight }}
            </span>
          </div>
        </div>
      </div>
      </div>
    </div>

    <a-empty v-if="!loading && dataList.length === 0" description="暂无图片" />
    <div class="load-more">
      <a-spin v-if="loading" />
      <a-button v-else-if="hasMore" @click="loadMore">加载更多</a-button>
      <span v-else-if="dataList.length > 0" class="no-more">已经到底啦</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import {
  listPictureTagCategoryUsingGet,
  listPictureVoByCursorUsingPost,
} from '@/api/pictureController.ts'
import { message } from 'ant-design-vue'
import { useRouter } from 'vue-router'

const dataList = ref<API.PictureVO[]>([])
const hasMore = ref(true)
const cursor = reactive<{ lastCreateTime?: number; lastId?: number }>({})
const loading = ref(false)

const searchParams = reactive<API.PictureQueryRequest>({})
const PAGE_SIZE = 20

const categoryList = ref<string[]>([])
const selectedCategory = ref<string>('all')
const tagList = ref<string[]>([])
const selectedTagList = ref<boolean[]>([])

const columnCount = ref(5)
const updateColumnCount = () => {
  const w = window.innerWidth
  columnCount.value = w <= 480 ? 1 : w <= 768 ? 2 : w <= 1200 ? 3 : w <= 1600 ? 4 : 5
}

// 按预估高度把图片分配到最矮的一列，使各列高度尽量均衡
const columns = computed(() => {
  const cols: API.PictureVO[][] = Array.from({ length: columnCount.value }, () => [])
  const heights = new Array(columnCount.value).fill(0)
  dataList.value.forEach((pic) => {
    const i = heights.indexOf(Math.min(...heights))
    cols[i].push(pic)
    heights[i] += 1 / (pic.picScale || 1) + 0.45
  })
  return cols
})

// append 为 true 时追加数据，否则重置游标并替换
const fetchData = async (append = false) => {
  loading.value = true
  if (!append) {
    cursor.lastCreateTime = undefined
    cursor.lastId = undefined
  }
  const params: API.PictureCursorQueryRequest = {
    ...searchParams,
    tags: [],
    size: PAGE_SIZE,
    lastCreateTime: cursor.lastCreateTime,
    lastId: cursor.lastId,
  }
  if (selectedCategory.value && selectedCategory.value !== 'all') {
    params.category = selectedCategory.value
  }
  selectedTagList.value.forEach((checked, index) => {
    if (checked) params.tags!.push(tagList.value[index])
  })
  try {
    const res = await listPictureVoByCursorUsingPost(params)
    if (res.data.code === 0 && res.data.data) {
      const data = res.data.data
      const records = data.records ?? []
      dataList.value = append ? [...dataList.value, ...records] : records
      hasMore.value = !!data.hasMore
      cursor.lastCreateTime = data.nextCreateTime
      cursor.lastId = data.nextId
    } else {
      message.error(res.data.message)
    }
  } finally {
    loading.value = false
  }
}

const doSearch = () => {
  fetchData()
}

const loadMore = () => {
  if (loading.value || !hasMore.value) return
  fetchData(true)
}

// 滚动到底部自动加载
const onScroll = () => {
  const nearBottom =
    window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 300
  if (nearBottom) loadMore()
}

const getTagAndCategoryOptions = async () => {
  const res = await listPictureTagCategoryUsingGet()
  if (res.data.code === 0 && res.data.data) {
    tagList.value = res.data.data.tagList ?? []
    categoryList.value = res.data.data.categoryList ?? []
  } else {
    message.error('获取标签失败: ' + res.data.message)
  }
}

const router = useRouter()
const doClickPicture = (picture: API.PictureVO) => {
  router.push({ path: `/picture/${picture.id}` })
}

onMounted(() => {
  fetchData()
  getTagAndCategoryOptions()
  updateColumnCount()
  window.addEventListener('resize', updateColumnCount)
  window.addEventListener('scroll', onScroll, { passive: true })
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', onScroll)
  window.removeEventListener('resize', updateColumnCount)
})
</script>

<style scoped>
#homeWaterfallPage {
  margin-bottom: 16px;
}

.search-bar {
  max-width: 480px;
  margin: 0 auto 16px;
}

.tag-bar {
  margin-bottom: 16px;
  text-align: center;
}

.waterfall {
  display: flex;
  justify-content: center;
  align-items: flex-start;
  gap: 16px;
}

.waterfall-column {
  flex: 1 1 0;
  min-width: 0;
  max-width: 320px;
}

.waterfall-item {
  margin-bottom: 16px;
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
  transition:
    transform 0.25s,
    box-shadow 0.25s;
}

.waterfall-item:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
}

.cover {
  position: relative;
  overflow: hidden;
}

.cover img {
  display: block;
  width: 100%;
  height: auto;
  transition: transform 0.4s;
}

.waterfall-item:hover .cover img {
  transform: scale(1.05);
}

.overlay {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 24px 12px 10px;
  color: #fff;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.7), transparent);
  opacity: 0;
  transition: opacity 0.25s;
}

.waterfall-item:hover .overlay {
  opacity: 1;
}

.overlay-name {
  font-weight: 600;
}

.overlay-intro {
  font-size: 12px;
  opacity: 0.85;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.format-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  padding: 0 6px;
  font-size: 11px;
  line-height: 20px;
  color: #fff;
  background: rgba(0, 0, 0, 0.45);
  border-radius: 4px;
}

.info {
  padding: 10px 12px 12px;
}

.title {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 6px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.tags {
  margin-bottom: 8px;
  display: flex;
  flex-wrap: wrap;
  gap: 4px 0;
}

.meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: #8c8c8c;
}

.author {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.author-name {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.load-more {
  text-align: center;
  padding: 16px 0;
}

.no-more {
  color: #bfbfbf;
}
</style>
