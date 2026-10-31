<template>
  <div id="globalHeader">
    <a-row :wrap="false">
      <a-col flex="200px">
        <router-link class="globaHeader-link" to="/">
          <div class="title-bar">
            <img src="../assets/logo.png" alt="logo" class="logo" />
            <div class="title">严某的专属图库</div>
          </div>
        </router-link>
      </a-col>
      <a-col flex="auto">
        <a-menu
          v-model:selectedKeys="current"
          mode="horizontal"
          :items="items"
          @click="handleMenuClick"
        />
      </a-col>
      <!-- 用户信息展示栏 -->
      <a-col flex="120px">
        <div v-if="loginUserStore.loginUser.id" class="user-login-status">
          <a-dropdown>
            <a-space>
              <a-avatar :src="loginUserStore.loginUser.userAvatar" />
              {{ loginUserStore.loginUser.userName ?? '无名' }}
            </a-space>
            <template #overlay>
              <a-menu>
                <a-menu-item @click="doLogout">
                  <LogoutOutlined />
                  退出登录
                </a-menu-item>
              </a-menu>
            </template>
          </a-dropdown>
        </div>
        <div v-else class="user-login-status">
          <a-button type="primary" href="/user/login">登录</a-button>
        </div>
      </a-col>
    </a-row>
  </div>
</template>
<script lang="ts" setup>
import { computed, h, ref } from 'vue'
import { LogoutOutlined } from '@ant-design/icons-vue'
import { type MenuProps, message } from 'ant-design-vue'
import { type RouteMeta, type RouteRecordRaw, useRouter } from 'vue-router'
import { canAccessRoute } from '@/router/permissions'
import { useLoginUserStore } from '@/stores/useLoginUserStore.ts'
import { logoutUsingPost } from '@/api/userController.ts'

type MenuRoute = RouteRecordRaw & {
  meta: RouteMeta & { showInMenu: true; menuTitle: string }
}

const isMenuRoute = (route: RouteRecordRaw): route is MenuRoute =>
  Boolean(route.meta?.showInMenu && route.meta.menuTitle)

const router = useRouter() // 获取路由实例
const loginUserStore = useLoginUserStore()

const items = computed<MenuProps['items']>(() => {
  const routeItems = router.options.routes
    .filter(isMenuRoute)
    .filter((route) => canAccessRoute(route.meta, loginUserStore.loginUser))
    .sort((left, right) => (left.meta.menuOrder ?? 0) - (right.meta.menuOrder ?? 0))
    .map((route) => {
      const icon = route.meta.menuIcon

      return {
        key: route.path,
        label: route.meta.menuTitle,
        title: route.meta.menuTitle,
        ...(icon ? { icon: () => h(icon) } : {}),
      }
    })

  return [
    ...routeItems,
    {
      key: 'external:other',
      label: h(
        'a',
        { href: 'https://www.baidu.com', target: '_blank', rel: 'noopener noreferrer' },
        '其他',
      ),
      title: '其他',
    },
  ]
})

// 当前选中的菜单项
const current = ref<string[]>([])
router.afterEach((to) => {
  current.value = [to.path]
})

// 路由跳转事件
const handleMenuClick = ({ key }: { key: string }) => {
  if (typeof key !== 'string' || key.startsWith('external:')) {
    return
  }

  router.push({ path: key })
}

const doLogout = async () => {
  const res = await logoutUsingPost()
  if (res.data.code === 0) {
    loginUserStore.setLoginUser({
      userName: '未登录',
    })
    message.success(res.data.message)
    router.push({ path: '/user/login', replace: true })
  } else {
    message.error('退出登录失败：' + res.data.message)
  }
}
</script>
<style scoped>
#globalHeader .title-bar {
  display: flex;
  align-items: center;
}
#globalHeader .logo {
  width: 40px;
  height: 40px;
  margin-right: 8px;
}
#globalHeader .title {
  font-size: 18px;
  font-weight: bold;
  color: black;
  margin-left: 8px;
}
</style>
