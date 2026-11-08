<template>
  <div id="pictureWaterfallList">
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

    <PictureWaterfallList
      :data-list="dataList"
      :loading="loading"
      :has-more="hasMore"
      @load-more="loadMore"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import {
  listPictureTagCategoryUsingGet,
  listPictureVoByCursorUsingPost,
} from '@/api/pictureController.ts'
import { message } from 'ant-design-vue'
import PictureWaterfallList from '@/components/PictureWaterfallList.vue'

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

const getTagAndCategoryOptions = async () => {
  const res = await listPictureTagCategoryUsingGet()
  if (res.data.code === 0 && res.data.data) {
    tagList.value = res.data.data.tagList ?? []
    categoryList.value = res.data.data.categoryList ?? []
  } else {
    message.error('获取标签失败: ' + res.data.message)
  }
}

onMounted(() => {
  fetchData()
  getTagAndCategoryOptions()
})
</script>

<style scoped>
#pictureWaterfallList {
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
</style>
