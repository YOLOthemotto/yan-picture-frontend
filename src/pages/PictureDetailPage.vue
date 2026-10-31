<template>
  <div id="pictureDetailPage">
    <a-row :gutter="[16, 16]">
      <!-- 图片预览-->
      <a-col :xs="24" :md="16" :xl="18">
        <a-card title="图片预览" class="preview-card">
          <div class="preview-wrapper">
            <a-image :src="picture.url" class="preview-image" />
          </div>
        </a-card>
      </a-col>
      <!-- 图片信息-->
      <a-col :xs="24" :md="8" :xl="6">
        <a-card title="图片信息">
          <!-- 图片信息内容 -->
          <a-descriptions :column="1" size="small" :label-style="{ width: '72px', color: '#888' }">
            <a-descriptions-item label="作者">
              <a-space>
                <a-avatar :size="24" :src="picture.user?.userAvatar" />
                <div>{{ picture.user?.userName }}</div>
              </a-space>
            </a-descriptions-item>
            <a-descriptions-item label="名称">
              {{ picture.name ?? '未命名' }}
            </a-descriptions-item>
            <a-descriptions-item label="简介">
              {{ picture.introduction ?? '-' }}
            </a-descriptions-item>
            <a-descriptions-item label="分类">
              {{ picture.category ?? '默认' }}
            </a-descriptions-item>
            <a-descriptions-item label="标签">
              <a-tag v-for="tag in picture.tags" :key="tag">
                {{ tag }}
              </a-tag>
            </a-descriptions-item>
            <a-descriptions-item label="格式">
              {{ picture.picFormat ?? '-' }}
            </a-descriptions-item>
            <a-descriptions-item label="宽度">
              {{ picture.picWidth ?? '-' }}
            </a-descriptions-item>
            <a-descriptions-item label="高度">
              {{ picture.picHeight ?? '-' }}
            </a-descriptions-item>
            <a-descriptions-item label="宽高比">
              {{ picture.picScale ?? '-' }}
            </a-descriptions-item>
            <a-descriptions-item label="大小">
              {{ formatSize(picture.picSize) }}
            </a-descriptions-item>
          </a-descriptions>
          <!-- 图片操作 -->
          <a-space wrap class="actions">
            <a-button type="primary" @click="doDownload">
              免费下载
              <template #icon>
                <DownloadOutlined />
              </template>
            </a-button>
            <a-button :icon="h(EditOutlined)" type="default" @click="doEdit" :disabled="!canEdit">
              编辑
            </a-button>
            <a-button
              :icon="h(DeleteOutlined)"
              danger
              type="default"
              @click="doDelete"
              :disabled="!canEdit"
            >
              删除
            </a-button>
          </a-space>
        </a-card>
      </a-col>
    </a-row>
  </div>
</template>

<script setup lang="ts">
import { computed, h, onMounted, ref } from 'vue'
import { deletePictureUsingPost, getPictureVoByIdUsingGet } from '@/api/pictureController.ts'
import { message } from 'ant-design-vue'
import { downloadImage, formatSize } from '@/utils'
import { EditOutlined, DeleteOutlined, DownloadOutlined } from '@ant-design/icons-vue'
import { useLoginUserStore } from '@/stores/useLoginUserStore.ts'
import { useRouter } from 'vue-router'

interface Props {
  id: number | string
}

const props = defineProps<Props>()
const picture = ref<API.PictureVO>({})
const loginUserStore = useLoginUserStore()

const canEdit = computed(() => {
  // 编辑逻辑
  const loginUser = loginUserStore.loginUser
  // 未登录不可编辑
  if (!loginUser.id) {
    return false
  }
  // 只有本人或管理员可以编辑
  const user = picture.value.user || {}
  return loginUser.id === user.id || loginUser.userRole === 'admin'
})

// 获取图片详情
const fetchPictureDetail = async () => {
  try {
    const res = await getPictureVoByIdUsingGet({ id: props.id })
    if (res.data.code === 0 && res.data.data) {
      picture.value = res.data.data
    } else {
      await message.error('获取图片详情失败: ' + res.data.message)
    }
  } catch (error) {
    await message.error('获取图片详情失败: ' + error)
  }
}
const router = useRouter()

const doDownload = () => {
  if (!picture.value.url) {
    message.error('图片链接不存在，无法下载')
    return
  }
  const fileName = picture.value.name || '未命名'
  const fileUrl = picture.value.url
  downloadImage(fileUrl, fileName)
}

// 编辑图片
const doEdit = () => {
  router.push(`/add_picture?id=${picture.value.id}`)
}

// 删除数据
const doDelete = async () => {
  const id = picture.value.id
  if (!id) {
    return
  }
  const res = await deletePictureUsingPost({ id })
  if (res.data.code === 0) {
    message.success('删除成功')
  } else {
    message.error(res.data.message)
  }
}

onMounted(() => {
  fetchPictureDetail()
})
</script>

<style scoped>
#pictureDetailPage {
  margin-bottom: 16px;
}

.preview-card {
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
}

.preview-card :deep(.ant-card-head) {
  border-bottom: none;
  font-weight: 600;
}

.preview-card :deep(.ant-card-head-title) {
  display: flex;
  align-items: center;
  gap: 8px;
}

.preview-card :deep(.ant-card-head-title)::before {
  content: '';
  width: 4px;
  height: 16px;
  border-radius: 2px;
  background: #1677ff;
}

.preview-card :deep(.ant-card-body) {
  padding-top: 0;
}

.preview-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 300px;
  padding: 16px;
  background: #f5f5f5;
  background-size: 20px 20px;
  background-position: 0 0, 10px 10px;
  border-radius: 8px;
}

.preview-wrapper :deep(.ant-image) {
  display: flex;
  justify-content: center;
}

.preview-wrapper :deep(.preview-image img),
.preview-wrapper :deep(.ant-image-img) {
  max-width: 100%;
  max-height: 70vh;
  width: auto;
  object-fit: contain;
  border-radius: 4px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}

.actions {
  justify-content: center;
  width: 100%;
  margin-top: 16px;
}
</style>
