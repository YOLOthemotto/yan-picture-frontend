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
import { computed, h, ref, watch } from 'vue'
import {
  LoadingOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  ReloadOutlined,
  TeamOutlined,
} from '@ant-design/icons-vue'
import type { MenuProps } from 'ant-design-vue'
import { type RouteMeta, type RouteRecordRaw, useRoute, useRouter } from 'vue-router'
import { canAccessRoute } from '@/router/permissions'
import { useLoginUserStore } from '@/stores/useLoginUserStore'
import { useTeamSpaceStore } from '@/stores/useTeamSpaceStore'
import { SPACE_ROLE_MAP } from '@/constants/space'

type SiderRoute = RouteRecordRaw & {
  meta: RouteMeta & { showInSider: true; siderTitle: string }
}

const isSiderRoute = (route: RouteRecordRaw): route is SiderRoute =>
  Boolean(route.meta?.showInSider && route.meta.siderTitle)

const router = useRouter()
const route = useRoute()
const loginUserStore = useLoginUserStore()
const teamSpaceStore = useTeamSpaceStore()
const collapsed = ref(false)
const isMobile = ref(false)

const siderRoutes = computed(() =>
  router.options.routes
    .filter(isSiderRoute)
    .filter((item) => item.meta.siderDisabled || canAccessRoute(item.meta, loginUserStore.loginUser))
    .sort((left, right) => (left.meta.siderOrder ?? 0) - (right.meta.siderOrder ?? 0)),
)

const staticItems = computed<MenuProps['items']>(() =>
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

const teamItems = computed<MenuProps['items']>(() => {
  if (teamSpaceStore.loading) {
    return [
      {
        key: 'team-space-loading',
        label: '正在加载团队空间',
        icon: () => h(LoadingOutlined, { spin: true }),
        disabled: true,
      },
    ]
  }
  if (teamSpaceStore.error) {
    return [
      {
        key: 'team-space-retry',
        label: '团队空间加载失败，重试',
        title: teamSpaceStore.error,
        icon: () => h(ReloadOutlined),
      },
    ]
  }
  if (!teamSpaceStore.teamSpaces.length) {
    return [
      {
        key: 'team-space-empty',
        label: '暂未加入团队空间',
        icon: () => h(TeamOutlined),
        disabled: true,
      },
    ]
  }

  return teamSpaceStore.teamSpaces.flatMap((membership) => {
    const space = membership.space
    if (space?.id == null) return []
    const role = membership.spaceRole ? SPACE_ROLE_MAP[membership.spaceRole] : ''
    return [
      {
        key: `team-space:${space.id}`,
        label: space.spaceName || '未命名团队空间',
        title: role ? `${space.spaceName || '未命名团队空间'} · ${role}` : space.spaceName,
        icon: () => h(TeamOutlined),
      },
    ]
  })
})

const items = computed<MenuProps['items']>(() => [
  ...(staticItems.value ?? []),
  {
    type: 'group',
    key: 'team-space-group',
    label: '我的团队空间',
    children: teamItems.value,
  },
])

const teamSpaceMenuKey = computed(() => {
  const id = String(route.params.id ?? '')
  if (!id) return undefined
  return teamSpaceStore.teamSpaces.some((membership) => String(membership.space?.id) === id)
    ? `team-space:${id}`
    : undefined
})

const current = computed(() => {
  if (teamSpaceMenuKey.value && route.path.startsWith('/space/')) return [teamSpaceMenuKey.value]
  const querySpaceId = route.query.spaceId
  if (typeof querySpaceId === 'string') {
    const matchingKey = `team-space:${querySpaceId}`
    if (
      teamSpaceStore.teamSpaces.some(
        (membership) => String(membership.space?.id) === querySpaceId,
      )
    ) {
      return [matchingKey]
    }
  }
  const activePath = route.meta.activeSiderPath ?? route.path
  if (route.path.startsWith('/space/')) return ['/my_space']
  return siderRoutes.value.some((item) => item.path === activePath) ? [activePath] : []
})

const handleMenuClick = ({ key }: { key: string }) => {
  if (key === 'team-space-retry') {
    void teamSpaceStore.loadTeamSpaces(true)
    return
  }
  if (key.startsWith('team-space:')) {
    router.push(`/space/${key.slice('team-space:'.length)}`)
    return
  }
  const target = siderRoutes.value.find((item) => item.path === key && !item.meta.siderDisabled)
  if (target) {
    router.push(target.path)
  }
}

watch(
  () => loginUserStore.loginUser.id,
  (id) => {
    if (id) void teamSpaceStore.loadTeamSpaces()
    else teamSpaceStore.clear()
  },
  { immediate: true },
)
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

#globalSider :deep(.ant-menu-item-group-title) {
  padding-top: 20px;
  color: #64748b;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.04em;
}

#globalSider :deep(.ant-menu-item) {
  border-radius: 7px;
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
