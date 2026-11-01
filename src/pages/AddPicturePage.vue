<template>
  <div id="addPicturePage">
    <h2 style="margin-bottom: 16px">
      {{ route.query?.id ? '修改图片' : '创建图片' }}
    </h2>
    <!-- 选择上传方式 -->
    <a-tabs v-model:activeKey="uploadType">
      <a-tab-pane key="file" tab="文件上传">
        <!-- 图片上传组件 -->
        <PictureUpload :picture="picture" :on-success="onSuccess" />
      </a-tab-pane>
      <a-tab-pane key="url" tab="URL 上传">
        <!-- URL 图片上传组件 -->
        <UrlPictureUpload :picture="picture" :on-success="onSuccess" />
      </a-tab-pane>
    </a-tabs>
    <!-- 图片信息表单 -->
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
        <a-button type="primary" html-type="submit" style="width: 100%">创建</a-button>
      </a-form-item>
    </a-form>
  </div>
</template>

<script setup lang="ts">
import PictureUpload from '@/components/PictureUpload.vue'
import { onMounted, reactive, ref } from 'vue'
import { message, type SelectProps } from 'ant-design-vue'
import {
  editPictureUsingPost,
  getPictureVoByIdUsingGet,
  listPictureTagCategoryUsingGet,
} from '@/api/pictureController.ts'
import { useRoute, useRouter } from 'vue-router'
import UrlPictureUpload from '@/components/UrlPictureUpload.vue'
const picture = ref<API.PictureVO>()
const uploadType = ref<'file' | 'url'>('file')

/**
 * 图片上传成功
 * @param newPicture
 */
const onSuccess = (newPicture: API.PictureVO) => {
  picture.value = newPicture
  pictureForm.name = newPicture.name
}

const pictureForm = reactive<API.PictureEditRequest>({})

const router = useRouter()

/**
 * 提交表单
 * @param values
 */
const handleSubmit = async (values: any) => {
  const pictureId = picture.value?.id
  if (!pictureId) {
    await message.error('请先上传图片')
    return
  }
  try {
    const res = await editPictureUsingPost({ id: pictureId, ...values })
    // 操作成功
    if (res.data.code === 0 && res.data.data) {
      await message.success('创建成功')
      // 跳转到图片详情页
      router.push({
        path: `/picture/${pictureId}`,
      })
    } else {
      await message.error('创建失败: ' + res.data.message)
    }
  } catch (error) {
    console.log(error)
  }
}

const categoryOptions = ref<SelectProps['options']>([])
const tagOptions = ref<SelectProps['options']>([])

/**
 * 获取标签和分类选项
 * @param values
 */
const getTagAndCategoryOptions = async () => {
  {
    const res = await listPictureTagCategoryUsingGet()
    try {
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
      console.log(error)
    }
  }
}

onMounted(() => {
  getTagAndCategoryOptions()
})

const route = useRoute()
// 获取老数据
const getOldPicture = async () => {
  //获取 ID
  const id = route.query?.id
  if (id) {
    const res = await getPictureVoByIdUsingGet({ id })
    if (res.data.code === 0 && res.data.data) {
      const data = res.data.data
      picture.value = data
      pictureForm.name = data.name
      pictureForm.tags = data.tags
      pictureForm.introduction = data.introduction
      pictureForm.category = data.category
    } else {
      await message.error('获取图片失败: ' + res.data.message)
    }
  }
}

onMounted(() => {
  getOldPicture()
})
</script>

<style scoped>
#addPicturePage {
  max-width: 720px;
  margin: 0 auto;
}
</style>
