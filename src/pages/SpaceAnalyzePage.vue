<template>
  <main id="spaceAnalyzePage">
    <RouterLink class="back-link" :to="scope?.spaceId != null ? `/space/${scope.spaceId}` : '/'">
      <ArrowLeftOutlined aria-hidden="true" />
      {{ scope?.spaceId != null ? '返回空间' : '返回图库' }}
    </RouterLink>
    <header class="analysis-heading">
      <div>
        <h1>图库数据分析</h1>
        <p>从容量、内容与上传趋势，了解图库的使用情况。</p>
      </div>
      <a-button :disabled="contextLoading || !scope" @click="refreshKey++">
        <template #icon><ReloadOutlined /></template>
        刷新数据
      </a-button>
    </header>

    <section class="analysis-toolbar" aria-label="分析统计范围">
      <div class="scope-control">
        <span class="control-label">统计范围</span>
        <a-segmented
          v-if="isAdmin"
          :value="mode"
          :options="scopeOptions"
          :disabled="contextLoading"
          aria-label="切换统计范围"
          @change="changeScope"
        />
        <strong v-else>个人空间</strong>
        <span v-if="scope" class="scope-caption">{{ scopeCaption }}</span>
      </div>
      <form v-if="isAdmin" class="space-filter" @submit.prevent="openSpace">
        <label for="analysis-space-id">指定空间</label>
        <a-input
          id="analysis-space-id"
          v-model:value="spaceIdDraft"
          placeholder="输入空间 ID"
          :aria-describedby="spaceIdError ? 'analysis-space-id-error' : undefined"
        />
        <a-button html-type="submit" :disabled="contextLoading">查看</a-button>
        <p v-if="spaceIdError" id="analysis-space-id-error" class="validation-error" role="alert">
          {{ spaceIdError }}
        </p>
      </form>
    </section>

    <div v-if="contextLoading" class="context-state" role="status">
      <a-spin size="large" />
      <p>正在加载统计范围</p>
    </div>
    <a-result
      v-else-if="contextError"
      :status="forbidden ? '403' : 'error'"
      title="无法查看数据分析"
      :sub-title="contextError"
    >
      <template #extra>
        <a-button v-if="!forbidden" type="primary" @click="loadContext">重试</a-button>
        <RouterLink v-else to="/space_analyze"
          ><a-button type="primary">查看个人空间</a-button></RouterLink
        >
      </template>
    </a-result>
    <div v-else-if="noSpace" class="context-state">
      <a-empty description="你还没有个人空间，创建空间后即可查看分析" />
      <RouterLink to="/add_space"><a-button type="primary">创建个人空间</a-button></RouterLink>
    </div>
    <template v-else-if="scope">
      <SpaceUsageAnalyze :scope="scope" :refresh-key="refreshKey" />
      <div class="analysis-grid">
        <SpaceUserAnalyze class="trend-panel" :scope="scope" :refresh-key="refreshKey" />
        <SpaceTagAnalyze class="tag-panel" :scope="scope" :refresh-key="refreshKey" />
        <SpaceCategoryAnalyze class="category-panel" :scope="scope" :refresh-key="refreshKey" />
        <SpaceSizeAnalyze class="size-panel" :scope="scope" :refresh-key="refreshKey" />
        <SpaceRankAnalyze v-if="isAdmin" class="rank-panel" :refresh-key="refreshKey" />
      </div>
    </template>
  </main>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, shallowRef, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeftOutlined, ReloadOutlined } from '@ant-design/icons-vue'
import { getSpaceVoByIdUsingGet, listSpaceVoByPageUsingPost } from '@/api/spaceController'
import { useLoginUserStore } from '@/stores/useLoginUserStore'
import SpaceUsageAnalyze from '@/components/space/analyze/SpaceUsageAnalyze.vue'
import SpaceCategoryAnalyze from '@/components/space/analyze/SpaceCategoryAnalyze.vue'
import SpaceTagAnalyze from '@/components/space/analyze/SpaceTagAnalyze.vue'
import SpaceSizeAnalyze from '@/components/space/analyze/SpaceSizeAnalyze.vue'
import SpaceUserAnalyze from '@/components/space/analyze/SpaceUserAnalyze.vue'
import SpaceRankAnalyze from '@/components/space/analyze/SpaceRankAnalyze.vue'
import { isValidIdentifier } from '@/components/space/analyze/chartOptions'
import { SPACE_TYPE_ENUM } from '@/constants/space'

type ScopeMode = 'space' | 'public' | 'all'
const route = useRoute()
const router = useRouter()
const loginUserStore = useLoginUserStore()
const isAdmin = computed(() => loginUserStore.loginUser.userRole === 'admin')
const scope = shallowRef<API.SpaceUsageAnalyzeRequest>()
const space = shallowRef<API.SpaceVO>()
const mode = ref<ScopeMode>('space')
const contextLoading = ref(false)
const contextError = ref('')
const forbidden = ref(false)
const noSpace = ref(false)
const refreshKey = ref(0)
const spaceIdDraft = ref('')
const spaceIdError = ref('')
let controller: AbortController | undefined
let generation = 0

const currentSpaceId = computed(() => {
  const id = route.query.spaceId
  if (typeof id === 'string' && isValidIdentifier(id)) return id
  return space.value?.id != null ? String(space.value.id) : undefined
})
const scopeOptions = computed(() => [
  ...(currentSpaceId.value ? [{ label: '指定空间', value: 'space' }] : []),
  { label: '公共图库', value: 'public' },
  { label: '全部图库', value: 'all' },
])
const scopeCaption = computed(() =>
  mode.value === 'all'
    ? '公共图库与所有空间'
    : mode.value === 'public'
      ? '公共图库内的图片'
      : space.value?.spaceName || '未命名空间',
)

const readFlag = (name: string) => {
  const value = route.query[name]
  if (value == null || value === '0' || value === 'false') return false
  if (value === '1' || value === 'true') return true
  throw new Error('统计范围参数无效，请重新选择范围')
}

const loadContext = async () => {
  const current = ++generation
  controller?.abort()
  const activeController = new AbortController()
  controller = activeController
  contextLoading.value = true
  contextError.value = ''
  forbidden.value = false
  noSpace.value = false
  scope.value = undefined
  space.value = undefined
  spaceIdError.value = ''
  try {
    const queryAll = readFlag('queryAll')
    const queryPublic = readFlag('queryPublic')
    if (queryAll && queryPublic) throw new Error('请只选择一个统计范围')
    if ((queryAll || queryPublic) && !isAdmin.value) {
      forbidden.value = true
      throw new Error('只有管理员可以查看公共图库或全部图库的分析，请查看自己的空间')
    }
    const requestedSpaceId = route.query.spaceId
    mode.value =
      queryAll || (!requestedSpaceId && !queryPublic && isAdmin.value)
        ? 'all'
        : queryPublic
          ? 'public'
          : 'space'
    if (mode.value !== 'space') {
      scope.value = mode.value === 'all' ? { queryAll: true } : { queryPublic: true }
      spaceIdDraft.value = typeof requestedSpaceId === 'string' ? requestedSpaceId : ''
      return
    }

    let resolvedSpace: API.SpaceVO | undefined
    if (requestedSpaceId == null) {
      const response = await listSpaceVoByPageUsingPost(
        {
          current: 1,
          pageSize: 1,
          userId: loginUserStore.loginUser.id,
          spaceType: SPACE_TYPE_ENUM.PRIVATE,
        },
        { signal: activeController.signal },
      )
      if (current !== generation) return
      if (response.data.code !== 0 || !response.data.data) {
        throw new Error(response.data.message || '加载个人空间失败，请重试')
      }
      resolvedSpace = response.data.data.records?.[0]
      if (!resolvedSpace) {
        noSpace.value = true
        return
      }
    } else {
      if (typeof requestedSpaceId !== 'string' || !isValidIdentifier(requestedSpaceId)) {
        throw new Error('空间 ID 无效，请从空间页面进入数据分析')
      }
      const response = await getSpaceVoByIdUsingGet(
        { id: requestedSpaceId },
        { signal: activeController.signal },
      )
      if (current !== generation) return
      if (response.data.code !== 0 || !response.data.data) {
        forbidden.value = response.data.code === 40300
        throw new Error(response.data.message || '空间不存在或没有访问权限')
      }
      resolvedSpace = response.data.data
    }
    if (resolvedSpace.id == null || !isValidIdentifier(String(resolvedSpace.id))) {
      throw new Error('空间信息不完整，请重试')
    }
    space.value = resolvedSpace
    const selectedId =
      typeof requestedSpaceId === 'string' ? requestedSpaceId : String(resolvedSpace.id)
    spaceIdDraft.value = selectedId
    scope.value = { spaceId: selectedId }
  } catch (cause) {
    if (current !== generation || activeController.signal.aborted) return
    console.error('加载分析统计范围失败:', cause)
    contextError.value = cause instanceof Error ? cause.message : '加载统计范围失败，请重试'
  } finally {
    if (current === generation) contextLoading.value = false
  }
}

const changeScope = (value: string | number) => {
  const spaceId = currentSpaceId.value
  router.push({
    path: '/space_analyze',
    query: {
      ...(spaceId ? { spaceId } : {}),
      ...(value === 'all' ? { queryAll: '1' } : value === 'public' ? { queryPublic: '1' } : {}),
    },
  })
}
const openSpace = () => {
  const id = spaceIdDraft.value.trim()
  if (!isValidIdentifier(id)) {
    spaceIdError.value = '请输入有效的正整数空间 ID'
    return
  }
  spaceIdError.value = ''
  router.push({ path: '/space_analyze', query: { spaceId: id } })
}

watch([() => route.query, () => loginUserStore.loginUser.id, isAdmin], loadContext, {
  immediate: true,
})
onBeforeUnmount(() => {
  generation++
  controller?.abort()
})
</script>

<style scoped>
#spaceAnalyzePage {
  max-width: 1480px;
  min-width: 0;
  margin: 0 auto 24px;
  color: #1e293b;
}

.back-link {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  margin-bottom: 18px;
  color: #475569;
  font-size: 13px;
}

.back-link:hover {
  color: #0958d9;
}

.back-link:focus-visible {
  outline: 2px solid #1677ff;
  outline-offset: 4px;
}

.analysis-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 24px;
}

.analysis-heading h1 {
  margin: 0;
  color: #172b4d;
  font-size: clamp(24px, 3vw, 30px);
  font-weight: 600;
}

.analysis-heading p {
  margin: 8px 0 0;
  color: #526278;
  font-size: 14px;
}

.analysis-heading > :deep(.ant-btn) {
  flex-shrink: 0;
}

.analysis-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 16px 24px;
  margin-bottom: 24px;
}

.scope-control,
.space-filter {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  min-width: 0;
  font-size: 13px;
}

.control-label,
.space-filter label {
  color: #475569;
}

.scope-caption {
  color: #526278;
  overflow-wrap: anywhere;
}

.scope-control strong {
  font-weight: 500;
}

.space-filter {
  max-width: 100%;
}

.space-filter :deep(.ant-input) {
  flex: 1 1 140px;
  width: 180px;
  min-width: 0;
  max-width: 220px;
}

.validation-error {
  flex-basis: 100%;
  margin: 0;
  color: #cf1322;
}

.context-state {
  display: flex;
  min-height: 360px;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 16px;
  color: #526278;
}

.analysis-grid {
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  gap: 20px;
  margin-top: 20px;
  align-items: start;
}

.trend-panel {
  grid-column: span 8;
}

.tag-panel {
  grid-column: span 4;
}

.category-panel,
.size-panel {
  grid-column: span 6;
}

.rank-panel {
  grid-column: 1 / -1;
}

@media (max-width: 1100px) {
  .trend-panel,
  .size-panel {
    grid-column: 1 / -1;
  }

  .tag-panel,
  .category-panel {
    grid-column: span 6;
  }
}

@media (max-width: 720px) {
  .analysis-heading {
    align-items: flex-start;
    flex-wrap: wrap;
  }

  .analysis-grid {
    gap: 16px;
    margin-top: 16px;
  }

  .analysis-grid > * {
    grid-column: 1 / -1;
  }
}
</style>
