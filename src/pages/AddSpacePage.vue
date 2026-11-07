<template>
  <div id="addSpacePage">
    <h2 style="margin-bottom: 16px">
      {{ route.query?.id ? '修改空间' : '创建空间' }}
    </h2>
    <!-- 空间信息表单 -->
    <a-form name="spaceForm" layout="vertical" :model="spaceForm" @finish="handleSubmit">
      <a-form-item name="spaceName" label="空间名称">
        <a-input v-model:value="spaceForm.spaceName" placeholder="请输入空间名称" allow-clear />
      </a-form-item>
      <a-form-item name="spaceLevel" label="空间级别">
        <a-select
          v-model:value="spaceForm.spaceLevel"
          placeholder="请选择空间级别"
          style="min-width: 180px"
          allow-clear
          :options="SPACE_LEVEL_OPTIONS"
        />
      </a-form-item>
      <a-form-item>
        <a-button type="primary" html-type="submit" style="width: 100%" :loading="loading"
          >提交</a-button
        >
      </a-form-item>
    </a-form>
    <!-- 空间级别介绍 -->
    <a-card title="空间级别介绍" style="margin-top: 16px">
      <a-typography-paragraph>
        * 目前仅支持开通普通版,如需升级空间，请联系
        <a href="mailto:smshcynpy@163.com"> 严某 </a>
      </a-typography-paragraph>
      <a-typography-paragraph v-for="spaceLevel in spaceLevelList" :key="spaceLevel.value">
        {{ spaceLevel.text }}: 大小 {{ formatSize(spaceLevel.maxSize) }}，数量
        {{ spaceLevel.maxCount }}
      </a-typography-paragraph>
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { message } from 'ant-design-vue'
import {
  addSpaceUsingPost,
  editSpaceUsingPost,
  getSpaceVoByIdUsingGet,
  listSpaceLevelUsingGet,
  updateSpaceUsingPost,
} from '@/api/spaceController.ts'
import { useRoute, useRouter } from 'vue-router'
import { SPACE_LEVEL_OPTIONS } from '@/constants/space.ts'
import { formatSize } from '@/utils'
const space = ref<API.SpaceVO>()
const spaceLevelList = ref<API.SpaceLevel[]>()
const spaceForm = reactive<API.SpaceAddRequest | API.SpaceEditRequest>({})

const router = useRouter()
const loading = ref(false)

/**
 * 提交表单
 */
const handleSubmit = async () => {
  const spaceId = space.value?.id
  loading.value = true
  try {
    let res
    if (spaceId) {
      res = await updateSpaceUsingPost({ ...spaceForm, id: spaceId })
    } else {
      res = await addSpaceUsingPost({ ...spaceForm })
    }
    // 操作成功
    if (res.data.code === 0 && res.data.data) {
      await message.success('操作成功')
      // 跳转到空间详情页
      router.push({
        path: `/space/${res.data.data}`,
      })
    } else {
      await message.error('操作失败: ' + res.data.message)
    }
  } catch (error) {
    console.log(error)
  }
  loading.value = false
}

const fetchSpaceLevelList = async () => {
  try {
    const res = await listSpaceLevelUsingGet()
    if (res.data.code === 0 && res.data.data) {
      spaceLevelList.value = res.data.data
    } else {
      message.error('获取空间级别列表失败: ' + res.data.message)
    }
  } catch (error) {
    console.log(error)
  }
}

onMounted(() => {
  fetchSpaceLevelList()
})

const route = useRoute()
// 获取老数据
const getOldSpace = async () => {
  //获取 ID
  const id = route.query?.id
  if (id) {
    const res = await getSpaceVoByIdUsingGet({ id })
    if (res.data.code === 0 && res.data.data) {
      const data = res.data.data
      space.value = data
      spaceForm.spaceName = data.spaceName
      spaceForm.spaceLevel = data.spaceLevel
    } else {
      await message.error('获取空间信息失败: ' + res.data.message)
    }
  }
}

onMounted(() => {
  getOldSpace()
})
</script>

<style scoped>
#addSpacePage {
  max-width: 720px;
  margin: 0 auto;
}
</style>
