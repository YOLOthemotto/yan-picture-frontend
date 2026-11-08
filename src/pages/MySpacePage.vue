<template>
  <div id="mySpacePage">
    <p>正在加载中请稍后</p>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useLoginUserStore } from '@/stores/useLoginUserStore.ts'
import { listSpaceVoByPageUsingPost } from '@/api/spaceController.ts'
import { message } from 'ant-design-vue'
import { onMounted } from 'vue'

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
  })

  if (res.data.code === 0) {
    if (res.data.data?.records?.length > 0) {
      const space = res.data.data.records[0]
      // 如果用户有空间，跳转到第一个空间的详情页
      await router.replace(`/space/${space.id}`)
    } else {
      // 如果用户没有空间，跳转到创建空间页面
      await router.replace('/add_space')
      await message.warn('您还没有创建空间，请先创建空间')
    }
  } else {
    await message.error('加载我的空间失败，' + res.data.message)
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
</style>
