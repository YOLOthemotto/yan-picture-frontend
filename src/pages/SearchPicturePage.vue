<template>
  <div class="search-picture-page">
    <a-button class="back-button" @click="goBack">
      <template #icon><ArrowLeftOutlined /></template>
      返回空间
    </a-button>

    <a-result v-if="pictureError" status="error" title="无法加载原图" :sub-title="pictureError">
      <template #extra>
        <a-button type="primary" @click="loadPicture">重试</a-button>
      </template>
    </a-result>
    <template v-else>
      <section class="source-section" aria-labelledby="source-title">
        <div class="section-heading">
          <h1 id="source-title">以图搜图</h1>
          <p>根据这张图片查找相似图片</p>
        </div>
        <a-skeleton v-if="pictureLoading" active />
        <div v-else-if="picture" class="source-picture">
          <a-image
            v-if="picture.url || picture.thumbnailUrl"
            :src="picture.url || picture.thumbnailUrl"
            :alt="picture.name || '搜索原图'"
          />
          <a-empty v-else description="原图暂不可用" />
          <div class="source-info">
            <span>搜索原图</span>
            <strong>{{ picture.name || '未命名图片' }}</strong>
            <p v-if="picture.introduction">{{ picture.introduction }}</p>
          </div>
        </div>
      </section>

      <section v-if="picture" class="results-section" aria-labelledby="results-title">
        <div class="results-heading">
          <h2 id="results-title">搜索结果</h2>
          <span v-if="!searchLoading && !searchError">找到 {{ results.length }} 张图片</span>
        </div>
        <a-alert v-if="searchError" type="error" show-icon :message="searchError">
          <template #action>
            <a-button size="small" @click="search">重试</a-button>
          </template>
        </a-alert>
        <div v-else-if="searchLoading" class="loading-state" role="status">
          <a-spin />
          <span>正在搜索相似图片，请稍候</span>
        </div>
        <a-empty v-else-if="results.length === 0" description="没有找到相似图片" />
        <div v-else class="results-grid">
          <div v-for="(result, index) in results" :key="index" class="result-item">
            <a
              v-if="safeUrl(result.fromUrl)"
              :href="safeUrl(result.fromUrl)"
              target="_blank"
              rel="noopener noreferrer"
              :aria-label="`打开第 ${index + 1} 张图片的来源网页（新窗口）`"
            >
              <img
                v-if="safeUrl(result.thumbUrl)"
                :src="safeUrl(result.thumbUrl)"
                :alt="`相似图片 ${index + 1}`"
                loading="lazy"
              />
              <span v-else class="missing-image">缩略图不可用</span>
              <span class="result-link">查看来源 ↗</span>
            </a>
            <template v-else>
              <img
                v-if="safeUrl(result.thumbUrl)"
                :src="safeUrl(result.thumbUrl)"
                :alt="`相似图片 ${index + 1}`"
                loading="lazy"
              />
              <span v-else class="missing-image">缩略图不可用</span>
              <span class="result-unavailable">来源链接不可用</span>
            </template>
          </div>
        </div>
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeftOutlined } from '@ant-design/icons-vue'
import { getPictureVoByIdUsingGet, searchPictureByPictureUsingPost } from '@/api/pictureController'

const props = defineProps<{ id: string | number }>()
const router = useRouter()
const picture = ref<API.PictureVO>()
const pictureLoading = ref(false)
const pictureError = ref('')
const searchLoading = ref(false)
const searchError = ref('')
const results = ref<API.ImageSearchResult[]>([])
let generation = 0
let searchGeneration = 0

const safeUrl = (value?: string) => {
  if (!value) return undefined
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : undefined
  } catch {
    return undefined
  }
}

const goBack = () => {
  if (picture.value?.spaceId) {
    void router.push({ name: '空间详情', params: { id: String(picture.value.spaceId) } })
  } else {
    void router.push('/my_space')
  }
}

const search = async () => {
  const currentGeneration = generation
  const currentSearch = ++searchGeneration
  searchLoading.value = true
  searchError.value = ''
  results.value = []
  try {
    const res = await searchPictureByPictureUsingPost(
      { pictureId: String(props.id) },
      { timeout: 30000 },
    )
    if (currentGeneration !== generation || currentSearch !== searchGeneration) return
    if (res.data.code !== 0 || !Array.isArray(res.data.data)) {
      searchError.value = res.data.message || '搜索失败，请稍后重试'
      return
    }
    results.value = res.data.data
  } catch (error) {
    if (currentGeneration !== generation || currentSearch !== searchGeneration) return
    console.error('以图搜图失败:', error)
    searchError.value = '搜索失败，请检查网络后重试'
  } finally {
    if (currentGeneration === generation && currentSearch === searchGeneration) {
      searchLoading.value = false
    }
  }
}

const loadPicture = async () => {
  const currentGeneration = ++generation
  searchGeneration++
  picture.value = undefined
  pictureError.value = ''
  results.value = []
  searchError.value = ''
  searchLoading.value = false
  const id = String(props.id)
  if (!/^\d+$/.test(id) || !/[1-9]/.test(id)) {
    pictureLoading.value = false
    pictureError.value = '图片 ID 无效'
    return
  }
  pictureLoading.value = true
  try {
    const res = await getPictureVoByIdUsingGet({ id })
    if (currentGeneration !== generation) return
    if (res.data.code !== 0 || !res.data.data) {
      pictureError.value = res.data.message || '请稍后重试'
      return
    }
    picture.value = res.data.data
    void search()
  } catch (error) {
    if (currentGeneration !== generation) return
    console.error('获取搜索原图失败:', error)
    pictureError.value = '获取原图失败，请检查网络后重试'
  } finally {
    if (currentGeneration === generation) pictureLoading.value = false
  }
}

watch(() => props.id, loadPicture, { immediate: true })
onBeforeUnmount(() => {
  generation++
  searchGeneration++
})
</script>

<style scoped>
.search-picture-page {
  margin-bottom: 32px;
}

.back-button {
  margin-bottom: 24px;
}

.section-heading h1,
.results-heading h2 {
  margin: 0;
  font-weight: 600;
}

.section-heading h1 {
  font-size: 24px;
}

.section-heading p {
  margin: 6px 0 20px;
  color: #595959;
}

.source-picture {
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 20px;
  background: #f5f5f5;
  border-radius: 12px;
}

.source-picture :deep(.ant-image) {
  flex: 0 0 auto;
  max-width: 100%;
}

.source-picture :deep(.ant-image-img) {
  display: block;
  width: auto;
  max-width: 240px;
  max-height: 220px;
  object-fit: contain;
  border-radius: 6px;
}

.source-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
  gap: 6px;
}

.source-info span,
.results-heading span {
  color: #595959;
}

.source-info strong {
  font-size: 18px;
  overflow-wrap: anywhere;
}

.source-info p {
  margin: 0;
  color: #595959;
  overflow-wrap: anywhere;
}

.results-section {
  margin-top: 32px;
}

.results-heading {
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 16px;
}

.results-heading h2 {
  font-size: 20px;
}

.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  min-height: 180px;
  color: #595959;
}

.results-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 16px;
}

.result-item {
  min-width: 0;
  overflow: hidden;
  background: #f5f5f5;
  border-radius: 12px;
}

.result-item a {
  display: block;
  color: #1677ff;
}

.result-item img,
.missing-image {
  display: block;
  width: 100%;
  height: 190px;
  object-fit: contain;
  background: #f5f5f5;
}

.missing-image {
  display: grid;
  place-items: center;
  color: #595959;
}

.result-link,
.result-unavailable {
  display: block;
  padding: 10px 12px;
  background: #fff;
}

.result-unavailable {
  color: #595959;
}

@media (max-width: 600px) {
  .source-picture {
    align-items: flex-start;
    flex-direction: column;
    gap: 16px;
  }

  .source-picture :deep(.ant-image-img) {
    max-width: 100%;
    max-height: 200px;
  }

  .results-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
  }

  .result-item img,
  .missing-image {
    height: 150px;
  }
}
</style>
