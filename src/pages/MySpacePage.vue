<template>
  <div id="mySpacePage">
    <div class="loading-state" aria-live="polite">
      <a-spin size="large" />
      <p>正在打开个人空间</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useLoginUserStore } from '@/stores/useLoginUserStore.ts'
import { listSpaceVoByPageUsingPost } from '@/api/spaceController.ts'
import { message } from 'ant-design-vue'
import { onMounted } from 'vue'
import { SPACE_TYPE_ENUM } from '@/constants/space'

const router = useRouter()
const loginUserStore = useLoginUserStore()

// 检查用户是否有空间
const checkUserSpace = async () => {
  const loginUser = loginUserStore.loginUser
  if (!loginUser.id) {
    await router.replace('/user/login')
    return
  }

  // 如果用户已登录获取该用户已创建的空间
  const res = await listSpaceVoByPageUsingPost({
    current: 1,
    pageSize: 1,
    userId: loginUser.id,
    spaceType: SPACE_TYPE_ENUM.PRIVATE,
  })

  if (res.data.code === 0) {
    const records = res.data.data?.records ?? []
    if (records.length > 0) {
      const space = records[0]
      // 如果用户有空间，跳转到第一个空间的详情页
      await router.replace(`/space/${space.id}`)
    } else {
      // 如果用户没有空间，跳转到创建空间页面
      await router.replace('/add_space')
      await message.warn('您还没有个人空间，请先创建')
    }
  } else {
    await message.error('加载个人空间失败，' + res.data.message)
    console.error('获取用户空间失败:', res.data.message)
  }
}

onMounted(() => {
  checkUserSpace()
})
</script>

<style scoped>
#mySpacePage {
  max-width: 720px;
  margin: 0 auto;
}

.loading-state {
  display: grid;
  place-items: center;
  min-height: 320px;
  color: #64748b;
}

.loading-state p {
  margin-top: 16px;
}
</style>
