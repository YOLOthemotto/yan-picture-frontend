<template>
  <a-modal
    :open="open"
    title="AI 扩图"
    :footer="null"
    :width="880"
    destroy-on-close
    @cancel="close"
  >
    <div class="outpainting">
      <div class="stage" :aria-busy="working">
        <img
          :src="showOriginal || !resultUrl ? picture.url : resultUrl"
          :alt="showOriginal || !resultUrl ? '原图' : '扩图结果'"
        />
        <span class="image-label">{{ showOriginal || !resultUrl ? '原图' : '扩图结果' }}</span>
      </div>

      <div v-if="resultUrl" class="result-bar">
        <div>
          <strong>扩图已完成</strong>
          <p>原图未被修改，可切换查看并下载结果。结果链接有效期为 24 小时，请及时下载。</p>
        </div>
        <div class="result-actions">
          <a-button :aria-pressed="showOriginal" @click="showOriginal = !showOriginal">
            {{ showOriginal ? '查看扩图结果' : '查看原图' }}
          </a-button>
          <a-button
            type="primary"
            @click="downloadImage(resultUrl, `${picture.name || '图片'}-扩图`)"
          >
            下载结果
          </a-button>
        </div>
      </div>
      <template v-else>
        <div class="settings">
          <div>
            <strong>向外延展画面</strong>
            <p>选择横向和纵向的扩展倍数，AI 将根据原图补全画面。</p>
            <p>
              原图需为公网可访问的 JPG、PNG、BMP、TIFF 或 WEBP，宽高均为 512–4096 像素，大小不超过
              10 MB。
            </p>
          </div>
          <div class="scale-controls">
            <label>
              横向倍数
              <a-select
                v-model:value="xScale"
                :disabled="working || !!taskId"
                :options="scaleOptions"
                aria-label="横向扩展倍数"
              />
            </label>
            <label>
              纵向倍数
              <a-select
                v-model:value="yScale"
                :disabled="working || !!taskId"
                :options="scaleOptions"
                aria-label="纵向扩展倍数"
              />
            </label>
          </div>
        </div>
        <div v-if="working" class="task-status" role="status" aria-live="polite">
          <a-spin size="small" />
          <div>
            <strong>{{ statusText }}</strong>
            <p>已等待 {{ elapsed }} 秒 · 生成需要一些时间，请保持此窗口打开。</p>
          </div>
        </div>
        <a-alert v-if="error" type="error" show-icon :message="error" class="task-error" />
        <div class="footer">
          <span>{{
            working || taskId
              ? '关闭窗口不会取消后台任务，且无法在此窗口找回结果。'
              : '生成结果不会自动保存，原图保持不变。'
          }}</span>
          <a-button v-if="taskId && !working" type="primary" @click="resumePolling"
            >继续查询</a-button
          >
          <a-button
            v-else
            type="primary"
            :loading="working"
            :disabled="xScale === 1 && yScale === 1"
            @click="createTask"
          >
            开始扩图
          </a-button>
        </div>
      </template>
    </div>
  </a-modal>
</template>

<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import { createOutPaintingTaskUsingPost, getOutPaintingTaskUsingGet } from '@/api/pictureController'
import { downloadImage } from '@/utils'

const props = defineProps<{ open: boolean; picture: API.PictureVO }>()
const emit = defineEmits<{ close: [] }>()
const scaleOptions = [1, 1.25, 1.5, 2].map((value) => ({ value, label: `${value}×` }))
const xScale = ref(1.5)
const yScale = ref(1.5)
const taskId = ref('')
const resultUrl = ref('')
const showOriginal = ref(false)
const working = ref(false)
const statusText = ref('正在提交任务')
const error = ref('')
const elapsed = ref(0)
let startedAt = 0
let generation = 0
let pollTimer: ReturnType<typeof setTimeout> | undefined
let clockTimer: ReturnType<typeof setInterval> | undefined
let controller: AbortController | undefined

const stop = () => {
  generation++
  clearTimeout(pollTimer)
  clearInterval(clockTimer)
  controller?.abort()
  controller = undefined
  working.value = false
}

const reset = () => {
  stop()
  taskId.value = ''
  resultUrl.value = ''
  showOriginal.value = false
  error.value = ''
  elapsed.value = 0
  xScale.value = 1.5
  yScale.value = 1.5
}

watch(
  () => props.open,
  (open) => {
    if (!open) reset()
  },
)
onBeforeUnmount(stop)

const close = () => emit('close')

const beginWaiting = () => {
  working.value = true
  error.value = ''
  startedAt = Date.now() - elapsed.value * 1000
  clockTimer = setInterval(() => {
    elapsed.value = Math.floor((Date.now() - startedAt) / 1000)
  }, 1000)
}

const poll = async (run: number) => {
  try {
    const res = await getOutPaintingTaskUsingGet(
      { taskId: taskId.value },
      { signal: controller?.signal },
    )
    if (run !== generation) return
    if (res.data.code !== 0 || !res.data.data?.output) {
      throw new Error(res.data.message || '未能获取任务状态')
    }
    const output = res.data.data.output
    switch (output.taskStatus) {
      case 'SUCCEEDED':
        if (!output.outputImageUrl) throw new Error('任务已完成，但未返回结果图片链接')
        resultUrl.value = output.outputImageUrl
        stop()
        return
      case 'FAILED':
      case 'CANCELED':
      case 'CANCELLED':
        taskId.value = ''
        throw new Error(output.message || '扩图任务未能完成，请重新尝试')
      case 'PENDING':
        statusText.value = '任务排队中'
        break
      case 'RUNNING':
        statusText.value = 'AI 正在延展画面'
        break
      case 'UNKNOWN':
        throw new Error(output.message || '任务不存在或状态未知，请稍后继续查询')
      default:
        throw new Error(output.message || `无法识别任务状态：${output.taskStatus || '空'}`)
    }
    if (Date.now() - startedAt >= 5 * 60 * 1000) {
      throw new Error('等待时间较长，已暂停自动查询。可继续查询任务结果。')
    }
    pollTimer = setTimeout(() => poll(run), 3000)
  } catch (cause) {
    if (run !== generation) return
    stop()
    error.value = cause instanceof Error ? cause.message : '查询失败，请继续查询任务结果'
  }
}

const createTask = async () => {
  if (!props.picture.id || working.value) return
  stop()
  elapsed.value = 0
  beginWaiting()
  statusText.value = '正在提交任务'
  controller = new AbortController()
  const run = generation
  try {
    const res = await createOutPaintingTaskUsingPost(
      { pictureId: props.picture.id, parameters: { xScale: xScale.value, yScale: yScale.value } },
      { signal: controller.signal },
    )
    if (run !== generation) return
    if (res.data.code !== 0 || !res.data.data?.output?.taskId) {
      throw new Error(res.data.data?.message || res.data.message || '提交失败，未返回任务编号')
    }
    taskId.value = res.data.data.output.taskId
    statusText.value = '正在查询任务状态'
    await poll(run)
  } catch (cause) {
    if (run !== generation) return
    stop()
    error.value = cause instanceof Error ? cause.message : '提交任务失败，请重试'
  }
}

const resumePolling = () => {
  if (!taskId.value || working.value) return
  stop()
  elapsed.value = 0
  beginWaiting()
  statusText.value = '正在查询任务状态'
  controller = new AbortController()
  void poll(generation)
}
</script>

<style scoped>
.outpainting {
  display: grid;
  gap: 18px;
}
.stage {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 260px;
  max-height: 55vh;
  overflow: hidden;
  border-radius: 8px;
  background: #f2f4f6;
}
.stage img {
  display: block;
  max-width: 100%;
  max-height: 55vh;
  object-fit: contain;
}
.image-label {
  position: absolute;
  top: 12px;
  left: 12px;
  padding: 4px 10px;
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.72);
  color: white;
  font-size: 12px;
}
.settings,
.result-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}
.settings strong,
.result-bar strong,
.task-status strong {
  color: #262626;
  font-size: 15px;
}
p {
  margin: 4px 0 0;
  color: #595959;
  line-height: 1.5;
}
.scale-controls,
.result-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}
.scale-controls label {
  display: grid;
  gap: 6px;
  color: #595959;
  font-size: 13px;
}
.scale-controls :deep(.ant-select) {
  width: 110px;
}
.task-status {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px;
  border: 1px solid #bae0ff;
  border-radius: 8px;
  background: #f0f8ff;
}
.task-error {
  margin: 0;
}
.footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}
.footer span {
  color: #595959;
  font-size: 13px;
}
@media (max-width: 600px) {
  .stage {
    min-height: 200px;
  }
  .settings,
  .result-bar,
  .footer {
    align-items: stretch;
    flex-direction: column;
  }
  .scale-controls label {
    flex: 1;
  }
  .scale-controls :deep(.ant-select) {
    width: 100%;
  }
}
</style>
