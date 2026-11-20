import { ref } from 'vue'
import { defineStore } from 'pinia'
import { listMyTeamSpaceUsingPost } from '@/api/spaceUserController'
import { useLoginUserStore } from '@/stores/useLoginUserStore'
import { SPACE_TYPE_ENUM } from '@/constants/space'

export const useTeamSpaceStore = defineStore('teamSpace', () => {
  const teamSpaces = ref<API.SpaceUserVO[]>([])
  const loading = ref(false)
  const error = ref('')
  let generation = 0

  const clear = () => {
    generation++
    teamSpaces.value = []
    loading.value = false
    error.value = ''
  }

  const loadTeamSpaces = async (force = false) => {
    const loginUserStore = useLoginUserStore()
    if (!loginUserStore.loginUser.id) {
      clear()
      return
    }
    if (loading.value && !force) return

    const requestGeneration = ++generation
    loading.value = true
    error.value = ''
    try {
      const res = await listMyTeamSpaceUsingPost()
      if (requestGeneration !== generation) return
      if (res.data.code !== 0 || !Array.isArray(res.data.data)) {
        throw new Error(res.data.message || '加载失败，请稍后重试')
      }

      const uniqueSpaces = new Map<string, API.SpaceUserVO>()
      for (const membership of res.data.data) {
        if (
          membership.space?.id != null &&
          membership.space.spaceType === SPACE_TYPE_ENUM.TEAM
        ) {
          uniqueSpaces.set(String(membership.space.id), membership)
        }
      }
      teamSpaces.value = [...uniqueSpaces.values()]
    } catch (cause) {
      if (requestGeneration === generation) {
        console.error('获取团队空间失败:', cause)
        teamSpaces.value = []
        error.value = cause instanceof Error ? cause.message : '加载失败，请稍后重试'
      }
    } finally {
      if (requestGeneration === generation) loading.value = false
    }
  }

  return { teamSpaces, loading, error, clear, loadTeamSpaces }
})
