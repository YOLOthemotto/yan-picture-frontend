<template>
  <div id="spaceMangerPage">
    <a-flex class="page-toolbar" justify="space-between" align="middle" wrap="wrap" gap="small">
      <h2>空间管理</h2>
      <a-space>
        <a-button href="/add_space" target="_blank">创建个人空间</a-button>
        <a-button type="primary" href="/add_team_space" target="_blank">
          创建团队空间
        </a-button>
      </a-space>
    </a-flex>
    <!-- 搜索框 -->
    <a-form class="space-search-form" layout="inline" :model="searchParams" @finish="doSearch">
      <a-form-item label="空间名称">
        <a-input v-model:value="searchParams.spaceName" placeholder="请输入空间名称" allow-clear />
      </a-form-item>
      <a-form-item name="spaceLevel" label="空间级别">
        <a-select
          v-model:value="searchParams.spaceLevel"
          placeholder="请选择空间级别"
          style="min-width: 180px"
          allow-clear
          :options="SPACE_LEVEL_OPTIONS"
        />
      </a-form-item>
      <a-form-item name="spaceType" label="空间类型">
        <a-select
          v-model:value="searchParams.spaceType"
          placeholder="全部类型"
          style="min-width: 160px"
          allow-clear
          :options="SPACE_TYPE_OPTIONS"
        />
      </a-form-item>
      <a-form-item label="用户 ID">
        <a-input v-model:value="searchParams.userId" placeholder="请输入用户 ID" allow-clear />
      </a-form-item>
      <a-form-item class="search-form-action">
        <a-button type="primary" html-type="submit">
          <template #icon><SearchOutlined /></template>
          搜索
        </a-button>
      </a-form-item>
    </a-form>
    <!-- 表格 -->
    <a-table
      :columns="columns"
      :data-source="dataList"
      :pagination="pagination"
      @change="doTableChange"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.dataIndex === 'spaceLevel'">
          <SpaceLevelBadge :level="record.spaceLevel" />
        </template>
        <template v-if="column.dataIndex === 'spaceType'">
          <a-tag :color="record.spaceType === SPACE_TYPE_ENUM.TEAM ? 'blue' : 'default'">
            {{ SPACE_TYPE_MAP[record.spaceType] || '未知类型' }}
          </a-tag>
        </template>
        <template v-if="column.dataIndex === 'spaceUseInfo'">
          <div>大小：{{ formatSize(record.totalSize) }} / {{ formatSize(record.maxSize) }}</div>
          <div>数量：{{ record.totalCount }} / {{ record.maxCount }}</div>
        </template>
        <template v-if="column.dataIndex === 'createTime'">
          {{ dayjs(record.createTime).format('YYYY-MM-DD HH:mm:ss') }}
        </template>
        <template v-if="column.dataIndex === 'editTime'">
          {{ dayjs(record.editTime).format('YYYY-MM-DD HH:mm:ss') }}
        </template>
        <template v-else-if="column.key === 'action'">
          <a-space style="justify-content: center; width: 100%" wrap>
            <a-button type="link" :href="`/add_space?id=${record.id}`" target="_blank">
              编辑
            </a-button>
            <a-button type="link" danger @click="doDelete(record.id)"> 删除 </a-button>
          </a-space>
        </template>
      </template>
    </a-table>
  </div>
</template>
<script lang="ts" setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { message, type TablePaginationConfig } from 'ant-design-vue'
import { SearchOutlined } from '@ant-design/icons-vue'
import { deleteSpaceUsingPost, listSpaceByPageUsingPost } from '@/api/spaceController.ts'
import dayjs from 'dayjs'
import {
  SPACE_LEVEL_OPTIONS,
  SPACE_TYPE_OPTIONS,
  SPACE_TYPE_ENUM,
  SPACE_TYPE_MAP,
} from '@/constants/space.ts'
import SpaceLevelBadge from '@/components/SpaceLevelBadge.vue'
import { formatSize } from '@/utils'

const columns = [
  {
    title: 'id',
    dataIndex: 'id',
    width: 80,
  },
  {
    title: '空间名称',
    dataIndex: 'spaceName',
  },
  {
    title: '空间级别',
    dataIndex: 'spaceLevel',
  },
  {
    title: '空间类别',
    dataIndex: 'spaceType',
  },
  {
    title: '使用情况',
    dataIndex: 'spaceUseInfo',
  },
  {
    title: '用户ID',
    dataIndex: 'userId',
    width: 80,
  },
  {
    title: '创建时间',
    dataIndex: 'createTime',
  },
  {
    title: '编辑时间',
    dataIndex: 'editTime',
  },
  {
    title: '操作',
    key: 'action',
  },
]

//定义数据
const dataList = ref<API.Space[]>([])
const total = ref(0)

// 搜索条件
const searchParams = reactive<API.SpaceQueryRequest>({
  current: 1,
  pageSize: 10,
})

// 获取数据
const fetchData = async () => {
  const res = await listSpaceByPageUsingPost({ ...searchParams })
  if (res.data.code === 0 && res.data.data) {
    dataList.value = res.data.data.records ?? []
    total.value = res.data.data.total ?? 0
  } else {
    message.error(res.data.message)
  }
}

//页面加载时加载一次数据
onMounted(() => {
  fetchData()
})

//分页参数
const pagination = computed(() => {
  return {
    current: searchParams.current,
    pageSize: searchParams.pageSize,
    total: total.value,
    showSizeChanger: true,
    showTotal: (total: number) => `共 ${total} 条数据`,
  }
})

// 表格分页变化
const doTableChange = (page: TablePaginationConfig) => {
  searchParams.current = page.current ?? 1
  searchParams.pageSize = page.pageSize ?? 10
  fetchData()
}

// 搜索数据
const doSearch = () => {
  searchParams.current = 1
  fetchData()
}

// 删除数据
const doDelete = async (id: number) => {
  if (!id) {
    return
  }
  const res = await deleteSpaceUsingPost({ id })
  if (res.data.code === 0) {
    message.success('删除成功')
    fetchData()
  } else {
    message.error(res.data.message)
  }
}
</script>

<style scoped>
.page-toolbar {
  min-height: 40px;
  margin-bottom: 20px;
}

.page-toolbar h2 {
  margin: 0;
}

.space-search-form {
  display: flex;
  align-items: flex-end;
  flex-wrap: wrap;
  gap: 12px 16px;
  margin-bottom: 20px;
  padding: 18px 20px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background: #fff;
}

.space-search-form :deep(.ant-form-item) {
  margin: 0;
}

.space-search-form :deep(.ant-form-item-control-input) {
  min-height: 32px;
}

.search-form-action {
  margin-left: auto !important;
}

@media (max-width: 900px) {
  .space-search-form {
    align-items: stretch;
  }

  .space-search-form :deep(.ant-form-item) {
    flex: 1 1 260px;
  }

  .space-search-form :deep(.ant-form-item-control),
  .space-search-form :deep(.ant-input),
  .space-search-form :deep(.ant-select) {
    width: 100%;
  }

  .search-form-action {
    flex-basis: 100% !important;
  }

  .search-form-action :deep(.ant-btn) {
    width: 100%;
  }
}

@media (max-width: 520px) {
  .page-toolbar :deep(.ant-space) {
    width: 100%;
  }

  .page-toolbar :deep(.ant-btn) {
    flex: 1;
  }
}
</style>
