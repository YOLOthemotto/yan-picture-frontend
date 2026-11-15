import { onScopeDispose, ref, shallowRef, watch, type WatchSource } from 'vue'
import { isAxiosError } from 'axios'

type AnalysisResponse<T> = {
  data: { code?: number; data?: T; message?: string }
}

export function useAnalysisData<T>(
  request: (signal: AbortSignal) => Promise<AnalysisResponse<T>>,
  sources: WatchSource[],
  enabled: () => boolean = () => true,
) {
  const data = shallowRef<T>()
  const loading = ref(false)
  const error = ref('')
  let controller: AbortController | undefined
  let generation = 0

  const reload = async () => {
    const current = ++generation
    controller?.abort()
    data.value = undefined
    error.value = ''
    loading.value = false
    if (!enabled()) return

    const activeController = new AbortController()
    controller = activeController
    loading.value = true
    try {
      const response = await request(activeController.signal)
      if (current !== generation) return
      if (response.data.code !== 0 || response.data.data == null) {
        throw new Error(response.data.message || '未能获取统计数据，请重试')
      }
      data.value = response.data.data
    } catch (cause) {
      if (current !== generation || activeController.signal.aborted) return
      console.error('加载图库分析失败:', cause)
      error.value = isAxiosError<{ message?: string }>(cause)
        ? cause.response?.data?.message || '网络连接失败，请检查网络后重试'
        : cause instanceof Error
          ? cause.message
          : '加载统计数据失败，请重试'
    } finally {
      if (current === generation) loading.value = false
    }
  }

  watch([...sources, enabled], reload, { immediate: true, deep: true })
  onScopeDispose(() => {
    generation++
    controller?.abort()
  })

  return { data, loading, error, reload }
}
