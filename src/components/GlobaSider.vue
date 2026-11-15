<template>
  <div id="globalSider" v-if="loginUserStore.loginUser.id">
    <a-layout-sider
      v-model:collapsed="collapsed"
      width="200"
      breakpoint="lg"
      :collapsed-width="isMobile ? 0 : 80"
      theme="light"
      collapsible
      @breakpoint="isMobile = $event"
    >
      <a-menu
        id="global-sider-menu"
        :selectedKeys="current"
        mode="inline"
        :items="items"
        @click="handleMenuClick"
      />
      <template #trigger>
        <button
          type="button"
          class="collapse-button"
          :aria-label="collapsed ? '展开侧边菜单' : '收起侧边菜单'"
          :title="collapsed ? '展开侧边菜单' : '收起侧边菜单'"
          :aria-expanded="!collapsed"
          aria-controls="global-sider-menu"
        >
          <MenuUnfoldOutlined v-if="collapsed" />
          <MenuFoldOutlined v-else />
        </button>
      </template>
    </a-layout-sider>
  </div>
</template>
<script lang="ts" setup>
import { computed, h, ref } from 'vue'
import { MenuFoldOutlined, MenuUnfoldOutlined } from '@ant-design/icons-vue'
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
const collapsed = ref(false)
const isMobile = ref(false)

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
  height: 100%;
  background: white;
}

#globalSider :deep(.ant-layout-sider-children) {
  height: 100%;
  overflow-y: auto;
  overscroll-behavior-y: contain;
}

#globalSider :deep(.ant-layout-sider-trigger) {
  position: absolute;
  bottom: 0;
  border-top: 1px solid #e2e8f0;
}

.collapse-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  font-size: 18px;
  cursor: pointer;
}

.collapse-button:hover {
  background: #f1f5f9;
}

.collapse-button:focus-visible {
  outline: 2px solid #0958d9;
  outline-offset: -3px;
}
</style>
