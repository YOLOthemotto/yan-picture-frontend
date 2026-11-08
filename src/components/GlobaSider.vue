<template>
  <div id="globalSider" v-if="loginUserStore.loginUser.id">
    <a-layout-sider width="200" breakpoint="lg" collapsed-width="0">
      <a-menu
        :selectedKeys="current"
        mode="inline"
        :items="items"
        @click="handleMenuClick"
      />
    </a-layout-sider>
  </div>
</template>
<script lang="ts" setup>
import { computed, h } from 'vue'
import type { MenuProps } from 'ant-design-vue'
import { type RouteMeta, type RouteRecordRaw, useRoute, useRouter } from 'vue-router'
import { canAccessRoute } from '@/router/permissions'
import { useLoginUserStore } from '@/stores/useLoginUserStore'

type SiderRoute = RouteRecordRaw & {
  meta: RouteMeta & { showInSider: true; siderTitle: string }
}

const isSiderRoute = (route: RouteRecordRaw): route is SiderRoute =>
  Boolean(route.meta?.showInSider && route.meta.siderTitle)

const router = useRouter()
const route = useRoute()
const loginUserStore = useLoginUserStore()

const siderRoutes = computed(() =>
  router.options.routes
    .filter(isSiderRoute)
    .filter((item) => item.meta.siderDisabled || canAccessRoute(item.meta, loginUserStore.loginUser))
    .sort((left, right) => (left.meta.siderOrder ?? 0) - (right.meta.siderOrder ?? 0)),
)

const items = computed<MenuProps['items']>(() =>
  siderRoutes.value.map((item) => {
    const icon = item.meta.siderIcon

    return {
      key: item.path,
      label: item.meta.siderTitle,
      title: item.meta.siderDisabled ? `${item.meta.siderTitle}（暂未开放）` : item.meta.siderTitle,
      disabled: item.meta.siderDisabled,
      ...(icon ? { icon: () => h(icon) } : {}),
    }
  }),
)

const current = computed(() => {
  const activePath = route.meta.activeSiderPath ?? route.path
  return siderRoutes.value.some((item) => item.path === activePath) ? [activePath] : []
})

const handleMenuClick = ({ key }: { key: string }) => {
  const target = siderRoutes.value.find((item) => item.path === key && !item.meta.siderDisabled)
  if (target) {
    router.push(target.path)
  }
}
</script>
<style scoped>
#globalSider :deep(.ant-layout-sider) {
  background: white;
}
</style>
