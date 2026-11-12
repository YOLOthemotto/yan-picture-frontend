<template>
  <div class="picture-waterfall-list">
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
            <span
              v-if="picture.picFormat"
              class="format-badge"
              :class="{ 'format-badge--left': $slots['cover-action'] }"
            >
              {{ picture.picFormat.toUpperCase() }}
            </span>
            <div v-if="$slots['cover-action']" class="cover-action" @click.stop>
              <slot name="cover-action" :picture="picture" />
            </div>
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
            <div v-if="$slots.actions" class="picture-actions" @click.stop>
              <slot name="actions" :picture="picture" />
            </div>
          </div>
        </div>
      </div>
    </div>

    <a-empty
      v-if="!loading && dataList.length === 0"
      :description="emptyDescription ?? '暂无图片'"
    />
    <div class="load-more">
      <a-spin v-if="loading" />
      <a-button v-else-if="hasMore" @click="loadMore">加载更多</a-button>
      <span v-else-if="dataList.length > 0" class="no-more">已经到底啦</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

const props = defineProps<{
  dataList: API.PictureVO[]
  loading: boolean
  hasMore: boolean
  emptyDescription?: string
}>()
const emit = defineEmits<{
  loadMore: []
}>()

const columnCount = ref(5)
const updateColumnCount = () => {
  const w = window.innerWidth
  columnCount.value = w <= 480 ? 1 : w <= 768 ? 2 : w <= 1200 ? 3 : w <= 1600 ? 4 : 5
}

// 按预估高度把图片分配到最矮的一列，使各列高度尽量均衡
const columns = computed(() => {
  const cols: API.PictureVO[][] = Array.from({ length: columnCount.value }, () => [])
  const heights = new Array(columnCount.value).fill(0)
  props.dataList.forEach((pic) => {
    const i = heights.indexOf(Math.min(...heights))
    cols[i].push(pic)
    heights[i] += 1 / (pic.picScale || 1) + 0.45
  })
  return cols
})

const loadMore = () => {
  if (props.loading || !props.hasMore) return
  emit('loadMore')
}

// 滚动到底部自动加载
const onScroll = () => {
  const nearBottom =
    window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 300
  if (nearBottom) loadMore()
}

const router = useRouter()
const doClickPicture = (picture: API.PictureVO) => {
  router.push({ path: `/picture/${picture.id}` })
}

onMounted(() => {
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

.format-badge--left {
  right: auto;
  left: 8px;
}

.cover-action {
  position: absolute;
  top: 8px;
  right: 8px;
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

.picture-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid #f0f0f0;
  cursor: default;
}

.load-more {
  text-align: center;
  padding: 16px 0;
}

.no-more {
  color: #bfbfbf;
}
</style>
