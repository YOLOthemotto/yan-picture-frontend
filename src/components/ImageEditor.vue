<template>
  <div class="image-editor">
    <div
      v-if="collaborationEnabled"
      class="collaboration-status"
      :class="`collaboration-status--${collaborationState}`"
      role="status"
      aria-live="polite"
    >
      <span class="status-indicator" aria-hidden="true"></span>
      <div>
        <strong>{{ collaborationTitle }}</strong>
        <span>{{ collaborationNotice }}</span>
      </div>
      <a-button v-if="canRequestEdit" size="small" type="link" @click="requestEdit">
        {{ collaborationState === 'disconnected' ? '重新连接' : '接手编辑' }}
      </a-button>
    </div>
    <div class="editor-context">
      <p>
        {{
          collaborationEnabled
            ? canInteract
              ? '旋转与缩放会实时同步给正在查看的成员。'
              : '当前图片由其他成员编辑，你可以实时观看调整结果。'
            : replace
              ? '拖动选区裁剪图片，保存后会更新当前上传的图片。'
              : '拖动选区裁剪图片，保存后会在当前空间创建新图片，原图保持不变。'
        }}
      </p>
      <span v-if="ready && imageDimensions">{{ imageDimensions }}</span>
    </div>
    <div class="editor-stage">
      <img
        v-if="source"
        ref="imageElement"
        :src="source"
        :alt="`编辑图片 ${name || '未命名'}`"
        @load="initializeEditor"
        @error="loadFailed"
      />
      <a-spin v-if="!ready && !error" class="editor-loading" tip="正在加载图片" />
    </div>
    <a-alert v-if="error" class="editor-error" type="error" show-icon :message="error" />
    <div v-if="loadError" class="editor-recovery">
      <p>图片服务未允许跨域读取时，可以先下载原图，再选择下载的文件继续编辑。</p>
      <a-button @click="downloadImage(src, name || '图片')">下载原图</a-button>
      <label class="local-file-button">
        <input type="file" accept="image/*" :disabled="busy" @change="selectLocalImage" />
        选择本地原图
      </label>
    </div>
    <div class="editor-toolbar" role="group" aria-label="图片编辑工具">
      <a-button
        :disabled="!canInteract"
        @click="performEditAction(PICTURE_EDIT_ACTION_ENUM.ROTATE_LEFT)"
      >
        左旋转
      </a-button>
      <a-button
        :disabled="!canInteract"
        @click="performEditAction(PICTURE_EDIT_ACTION_ENUM.ROTATE_RIGHT)"
      >
        右旋转
      </a-button>
      <a-button
        :disabled="!canInteract"
        @click="performEditAction(PICTURE_EDIT_ACTION_ENUM.ZOOM_IN)"
      >
        放大
      </a-button>
      <a-button
        :disabled="!canInteract"
        @click="performEditAction(PICTURE_EDIT_ACTION_ENUM.ZOOM_OUT)"
      >
        缩小
      </a-button>
      <template v-if="!collaborationEnabled">
        <a-button :disabled="!canInteract" @click="flipHorizontal">水平翻转</a-button>
        <a-button :disabled="!canInteract" @click="reset">重置</a-button>
      </template>
    </div>
    <div class="editor-footer">
      <span class="editor-footer-hint">
        {{ collaborationEnabled ? (canInteract ? '仅你可编辑' : '只读观摩') : '调整完成后保存' }}
      </span>
      <a-button :disabled="busy" @click="cancel">取消</a-button>
      <a-button type="primary" :disabled="!canInteract" :loading="busy" @click="save">
        {{ replace ? '保存画面' : '保存为新图片' }}
      </a-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import Cropper from 'cropperjs'
import 'cropperjs/dist/cropper.css'
import { downloadImage } from '@/utils'
import {
  PICTURE_EDIT_ACTION_ENUM,
  PICTURE_EDIT_MESSAGE_TYPE_ENUM,
  type PictureEditAction,
  type PictureEditMessage,
  type PictureEditState,
} from '@/constants/picture'
import PictureEditWebSocket from '@/utils/pictureEditWebSocket'
import { useLoginUserStore } from '@/stores/useLoginUserStore'

const props = defineProps<{
  src: string
  name?: string
  format?: string
  saving?: boolean
  replace?: boolean
  pictureId?: number
  collaborative?: boolean
}>()
const emit = defineEmits<{ save: [file: File]; cancel: []; busy: [value: boolean] }>()
const imageElement = ref<HTMLImageElement>()
const cropper = shallowRef<Cropper>()
const source = ref('')
const usingLocalFile = ref(false)
const ready = ref(false)
const exporting = ref(false)
const busy = computed(() => exporting.value || !!props.saving)
const error = ref('')
const loadError = ref(false)
const currentEditorName = ref('')
const collaborationEnabled = computed(() => Boolean(props.collaborative && props.pictureId != null))
const collaborationState = ref<
  'connecting' | 'requesting' | 'editing' | 'locked' | 'released' | 'disconnected'
>('connecting')
const collaborationNotice = ref('正在连接协同编辑服务')
let horizontalScale = 1
let disposed = false
let loadController: AbortController | undefined
let editSocket: PictureEditWebSocket | undefined
let requestTimer: ReturnType<typeof setTimeout> | undefined
let pendingEnterRequestId = ''
let hasRenderedEditState = false
let latestEditState = {
  rotation: 0,
  zoom: 1,
  version: 0,
} satisfies PictureEditState

const canInteract = computed(
  () =>
    ready.value &&
    !busy.value &&
    (!collaborationEnabled.value || collaborationState.value === 'editing'),
)
const canRequestEdit = computed(
  () =>
    collaborationEnabled.value && ['released', 'disconnected'].includes(collaborationState.value),
)
const collaborationTitle = computed(() => {
  if (
    currentEditorName.value &&
    (collaborationState.value === 'editing' || collaborationState.value === 'locked')
  ) {
    return `${currentEditorName.value} 正在编辑`
  }
  switch (collaborationState.value) {
    case 'editing':
      return '协同编辑中'
    case 'locked':
      return '只读观摩'
    case 'released':
      return '编辑位已释放'
    case 'disconnected':
      return '连接已中断'
    default:
      return '正在进入编辑'
  }
})
const imageDimensions = computed(() => {
  const data = cropper.value?.getImageData()
  if (!data?.naturalWidth || !data?.naturalHeight) return ''
  return `${data.naturalWidth} × ${data.naturalHeight}`
})

const setImageSource = (blob: Blob, local: boolean) => {
  cropper.value?.destroy()
  cropper.value = undefined
  if (source.value) URL.revokeObjectURL(source.value)
  source.value = URL.createObjectURL(blob)
  usingLocalFile.value = local
  ready.value = false
  hasRenderedEditState = false
  loadError.value = false
  error.value = ''
  horizontalScale = 1
}

watch(
  () => props.src,
  async (src, _previous, onCleanup) => {
    const controller = new AbortController()
    loadController = controller
    onCleanup(() => controller.abort())
    cropper.value?.destroy()
    cropper.value = undefined
    if (source.value) URL.revokeObjectURL(source.value)
    source.value = ''
    ready.value = false
    loadError.value = false
    error.value = ''
    try {
      const response = await fetch(src, {
        mode: 'cors',
        credentials: 'same-origin',
        cache: 'no-store',
        signal: controller.signal,
      })
      if (!response.ok) throw new Error(`图片请求失败 (${response.status})`)
      const blob = await response.blob()
      if (!controller.signal.aborted) setImageSource(blob, false)
    } catch (cause) {
      if (controller.signal.aborted) return
      console.error('读取原图失败:', cause)
      loadFailed()
    }
  },
  { immediate: true },
)

const syncEditorInteraction = () => {
  if (!cropper.value || !ready.value) return
  if (canInteract.value) cropper.value.enable()
  else cropper.value.disable()
}

watch(canInteract, syncEditorInteraction)

const initializeEditor = () => {
  if (!imageElement.value) return
  cropper.value?.destroy()
  const naturalAspectRatio =
    imageElement.value.naturalWidth > 0 && imageElement.value.naturalHeight > 0
      ? imageElement.value.naturalWidth / imageElement.value.naturalHeight
      : undefined
  cropper.value = new Cropper(imageElement.value, {
    viewMode: 1,
    autoCropArea: 1,
    aspectRatio: collaborationEnabled.value ? naturalAspectRatio : undefined,
    background: true,
    responsive: true,
    dragMode: collaborationEnabled.value ? 'none' : 'crop',
    cropBoxMovable: !collaborationEnabled.value,
    cropBoxResizable: !collaborationEnabled.value,
    zoomOnWheel: !collaborationEnabled.value,
    toggleDragModeOnDblclick: !collaborationEnabled.value,
    ready() {
      ready.value = true
      applyEditState(latestEditState)
    },
  })
}

const loadFailed = () => {
  ready.value = false
  loadError.value = true
  error.value = usingLocalFile.value
    ? '本地图片加载失败，请选择浏览器支持的图片文件。'
    : '无法读取原图进行编辑。'
}

const selectLocalImage = (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  if (!file.type.startsWith('image/')) {
    error.value = '请选择图片文件。'
    return
  }
  loadController?.abort()
  setImageSource(file, true)
}

const applyEditAction = (action: PictureEditAction) => {
  if (!cropper.value) return
  const shouldDisableAfter = collaborationEnabled.value && collaborationState.value !== 'editing'
  cropper.value.enable()
  switch (action) {
    case PICTURE_EDIT_ACTION_ENUM.ZOOM_IN:
      cropper.value.zoom(0.1)
      break
    case PICTURE_EDIT_ACTION_ENUM.ZOOM_OUT:
      cropper.value.zoom(-0.1)
      break
    case PICTURE_EDIT_ACTION_ENUM.ROTATE_LEFT:
      cropper.value.rotate(-90)
      break
    case PICTURE_EDIT_ACTION_ENUM.ROTATE_RIGHT:
      cropper.value.rotate(90)
      break
  }
  if (shouldDisableAfter) cropper.value.disable()
}

const performEditAction = (action: PictureEditAction) => {
  if (!canInteract.value) return
  if (!collaborationEnabled.value) {
    applyEditAction(action)
    return
  }
  if (!editSocket?.sendAction(action)) {
    applyEditState(latestEditState)
    collaborationState.value = 'disconnected'
    collaborationNotice.value = '网络连接已中断，画面已恢复；请重新连接后继续。'
  }
}

const flipHorizontal = () => {
  if (!canInteract.value) return
  horizontalScale = -horizontalScale
  cropper.value?.scaleX(horizontalScale)
}

const reset = () => {
  if (!canInteract.value) return
  cropper.value?.reset()
  horizontalScale = 1
}

const messageFromEvent = (data: unknown) => {
  if (!data || typeof data !== 'object' || !('type' in data)) return undefined
  return data as PictureEditMessage
}

const stateFromMessage = (message?: PictureEditMessage): PictureEditState | undefined => {
  const state = message?.state ?? message?.pictureState
  if (state) return state
  if (
    Number.isFinite(message?.rotation) &&
    Number.isFinite(message?.zoom) &&
    Number.isFinite(message?.version)
  ) {
    return {
      rotation: message.rotation as number,
      zoom: message.zoom as number,
      version: message.version as number,
    }
  }
  return undefined
}

const applyEditState = (state: PictureEditState) => {
  const rotation = Number(state.rotation)
  const zoom = Number(state.zoom)
  const version = Number(state.version)
  if (!Number.isFinite(rotation) || !Number.isFinite(zoom) || !Number.isFinite(version)) return
  if (version < latestEditState.version) return
  const normalizedState = {
    rotation: ((rotation % 360) + 360) % 360,
    zoom: Math.max(0.1, zoom),
    version,
  }
  const visualStateUnchanged =
    hasRenderedEditState &&
    latestEditState.rotation === normalizedState.rotation &&
    latestEditState.zoom === normalizedState.zoom
  latestEditState = normalizedState
  if (visualStateUnchanged) return
  if (!ready.value || !cropper.value) return
  cropper.value.enable()
  cropper.value.reset()
  cropper.value.rotate(latestEditState.rotation)
  if (collaborationEnabled.value && imageElement.value?.naturalWidth) {
    const naturalAspectRatio = imageElement.value.naturalWidth / imageElement.value.naturalHeight
    cropper.value.setAspectRatio(
      latestEditState.rotation % 180 === 0 ? naturalAspectRatio : 1 / naturalAspectRatio,
    )
  }
  const fitRatio = cropper.value.getImageData().ratio
  cropper.value.zoomTo(fitRatio * latestEditState.zoom)
  syncEditorInteraction()
  hasRenderedEditState = true
}

const extractEditorName = (message?: PictureEditMessage) => {
  const editor = message?.editor ?? message?.editUser ?? message?.user ?? message?.loginUser
  const explicitName =
    message?.editorName ||
    message?.editUserName ||
    message?.editorUserName ||
    message?.userName ||
    editor?.userName ||
    message?.editorAccount ||
    message?.userAccount ||
    editor?.userAccount
  if (explicitName) return explicitName.trim()

  const notice = message?.message?.trim()
  if (!notice) return ''
  const matched =
    notice.match(
      /(?:用户(?:名)?|成员)\s*[：:\s]+\s*([^，,。；;\n]+?)(?=\s*(?:正在|开始|进入|编辑|已))/u,
    ) ??
    notice.match(/^([^：:，,。；;\s]+?)\s*(?:正在编辑|已?进入编辑(?:状态)?)/u) ??
    notice.match(/^([^：:，,。；;\s]+?)\s+退出(?:了)?编辑/u) ??
    notice.match(/(?:由|被)\s*([^，,。；;\n]+?)\s*(?:正在)?编辑/u) ??
    notice.match(/当前编辑者\s*[：:]\s*([^，,。；;\n]+)/u)
  return matched?.[1]?.replace(/^用户/u, '').trim() ?? ''
}

const loginUserStore = useLoginUserStore()

const isCurrentUserMessage = (message?: PictureEditMessage) => {
  const messageUserId = message?.userId ?? message?.editor?.id ?? message?.editUser?.id
  if (messageUserId != null && loginUserStore.loginUser.id != null) {
    return String(messageUserId) === String(loginUserStore.loginUser.id)
  }
  const messageName = extractEditorName(message)
  const currentName = loginUserStore.loginUser.userName
  if (messageName && currentName && currentName !== '未登录') {
    return messageName === currentName || messageName === loginUserStore.loginUser.userAccount
  }
  return undefined
}

const clearRequestTimer = () => {
  if (requestTimer) clearTimeout(requestTimer)
  requestTimer = undefined
}

const enterEditing = (message?: PictureEditMessage) => {
  clearRequestTimer()
  currentEditorName.value =
    extractEditorName(message) || loginUserStore.loginUser.userName || '当前用户'
  collaborationState.value = 'editing'
  collaborationNotice.value = '你已获得编辑权，其他成员将实时看到调整。'
  const state = stateFromMessage(message)
  if (state) applyEditState(state)
}

const editActionFromMessage = (message?: PictureEditMessage) => {
  const action =
    message?.editAction ?? message?.action ?? message?.pictureEditAction ?? message?.message
  return action && Object.values(PICTURE_EDIT_ACTION_ENUM).includes(action as PictureEditAction)
    ? (action as PictureEditAction)
    : undefined
}

const sendEnterEdit = () => {
  collaborationState.value = 'requesting'
  collaborationNotice.value = '正在确认当前图片是否有人编辑'
  pendingEnterRequestId = crypto.randomUUID()
  if (
    !editSocket?.sendMessage({
      type: PICTURE_EDIT_MESSAGE_TYPE_ENUM.ENTER_EDIT,
      requestId: pendingEnterRequestId,
    })
  ) {
    collaborationState.value = 'disconnected'
    collaborationNotice.value = '无法发送编辑请求，请检查连接后重试。'
    return
  }
  clearRequestTimer()
  requestTimer = setTimeout(() => {
    if (collaborationState.value !== 'requesting') return
    editSocket?.disconnect()
    collaborationState.value = 'disconnected'
    collaborationNotice.value = '编辑权确认超时，请重新连接后再试。'
  }, 4000)
}

const releaseEdit = () => {
  clearRequestTimer()
  if (collaborationState.value === 'editing' || collaborationState.value === 'requesting') {
    editSocket?.sendMessage({ type: PICTURE_EDIT_MESSAGE_TYPE_ENUM.EXIT_EDIT })
  }
}

const initializeCollaboration = () => {
  if (!collaborationEnabled.value || props.pictureId == null) return
  collaborationState.value = 'connecting'
  collaborationNotice.value = '正在连接协同编辑服务'
  latestEditState = { rotation: 0, zoom: 1, version: 0 }
  hasRenderedEditState = false
  editSocket = new PictureEditWebSocket(props.pictureId)

  editSocket.on('open', () => {
    if (!disposed) sendEnterEdit()
  })
  editSocket.on(PICTURE_EDIT_MESSAGE_TYPE_ENUM.INFO, (data) => {
    const message = messageFromEvent(data)
    const state = stateFromMessage(message)
    if (state) applyEditState(state)
    collaborationNotice.value = message?.message || collaborationNotice.value
    if (message?.editor) {
      currentEditorName.value = extractEditorName(message) || '其他成员'
      if (collaborationState.value !== 'editing') collaborationState.value = 'locked'
    } else if (message && 'editor' in message && message.editor === null) {
      if (collaborationState.value === 'locked') collaborationState.value = 'released'
      currentEditorName.value = ''
    }
  })
  editSocket.on(PICTURE_EDIT_MESSAGE_TYPE_ENUM.ENTER_EDIT, (data) => {
    const message = messageFromEvent(data)
    const state = stateFromMessage(message)
    if (state) applyEditState(state)
    if (collaborationState.value === 'requesting') {
      const isOwnResponse =
        message?.requestId === pendingEnterRequestId &&
        message?.success === true &&
        isCurrentUserMessage(message) !== false
      if (!isOwnResponse) {
        clearRequestTimer()
        collaborationState.value = 'locked'
        currentEditorName.value = extractEditorName(message) || '其他成员'
        collaborationNotice.value = message?.message || '其他成员抢先获得编辑权。'
      } else {
        pendingEnterRequestId = ''
        enterEditing(message)
      }
      return
    }
    if (collaborationState.value !== 'editing') {
      collaborationState.value = 'locked'
      currentEditorName.value = extractEditorName(message)
      collaborationNotice.value = message?.message || '其他成员正在编辑，调整会自动同步到此处。'
    }
  })
  editSocket.on(PICTURE_EDIT_MESSAGE_TYPE_ENUM.EXIT_EDIT, (data) => {
    const message = messageFromEvent(data)
    const state = stateFromMessage(message)
    if (state) applyEditState(state)
    if (
      message?.success === true &&
      message.editor == null &&
      collaborationState.value !== 'editing'
    ) {
      clearRequestTimer()
      collaborationState.value = 'released'
      currentEditorName.value = ''
      collaborationNotice.value = message?.message || '编辑位已释放，你可以接手继续编辑。'
    } else if (message?.editor) {
      currentEditorName.value = extractEditorName(message) || '其他成员'
      collaborationState.value = 'locked'
      collaborationNotice.value = message?.message || '当前图片仍由其他成员编辑。'
    }
  })
  editSocket.on(PICTURE_EDIT_MESSAGE_TYPE_ENUM.ERROR, (data) => {
    const message = messageFromEvent(data)
    const state = stateFromMessage(message)
    if (state) applyEditState(state)
    clearRequestTimer()
    if (message?.editor && isCurrentUserMessage(message) === true) {
      currentEditorName.value = extractEditorName(message) || currentEditorName.value
      collaborationState.value = 'editing'
    } else {
      collaborationState.value = 'locked'
      currentEditorName.value = extractEditorName(message)
      collaborationNotice.value =
        message?.message || '当前已有成员正在编辑，请以只读模式查看调整结果。'
    }
  })
  editSocket.on(PICTURE_EDIT_MESSAGE_TYPE_ENUM.EDIT_ACTION, (data) => {
    const message = messageFromEvent(data)
    const editAction = editActionFromMessage(message)
    const state = stateFromMessage(message)
    if (state) applyEditState(state)
    else if (
      collaborationState.value !== 'editing' &&
      editAction &&
      Object.values(PICTURE_EDIT_ACTION_ENUM).includes(editAction)
    )
      applyEditAction(editAction)
    currentEditorName.value = extractEditorName(message) || currentEditorName.value
  })
  editSocket.on('error', () => {
    if (disposed) return
    clearRequestTimer()
    if (collaborationState.value !== 'locked') {
      collaborationState.value = 'disconnected'
      collaborationNotice.value = '协同编辑连接出现问题，请重新连接后继续。'
    }
  })
  editSocket.on('close', (event) => {
    if (disposed) return
    clearRequestTimer()
    collaborationState.value = 'disconnected'
    currentEditorName.value = ''
    collaborationNotice.value =
      event instanceof CloseEvent && event.code === 1000
        ? '协同编辑已结束。'
        : '协同编辑连接已断开，请重新连接。'
  })
  editSocket.connect()
}

const requestEdit = () => {
  if (collaborationState.value === 'disconnected') {
    editSocket?.disconnect()
    initializeCollaboration()
    return
  }
  sendEnterEdit()
}

const cancel = () => {
  releaseEdit()
  emit('cancel')
}

const save = () => {
  if (!cropper.value || !canInteract.value) return
  error.value = ''
  exporting.value = true
  emit('busy', true)
  try {
    const canvas = cropper.value.getCroppedCanvas()
    if (!canvas || !canvas.width || !canvas.height) throw new Error('裁剪区域为空')
    const isJpeg = /^(jpe?g)$/i.test(props.format || '')
    const mimeType = isJpeg ? 'image/jpeg' : 'image/png'
    canvas.toBlob(
      (blob) => {
        if (disposed) return
        exporting.value = false
        emit('busy', false)
        if (!blob) {
          error.value = '图片导出失败，请调整选区后重试。'
          return
        }
        const baseName = (props.name || '图片').replace(/\.[^.]+$/, '')
        emit(
          'save',
          new File([blob], `${baseName}-编辑.${isJpeg ? 'jpg' : 'png'}`, { type: mimeType }),
        )
      },
      mimeType,
      0.92,
    )
  } catch (cause) {
    console.error('图片导出失败:', cause)
    error.value = '图片导出失败，请检查图片服务的跨域配置后重试。'
    exporting.value = false
    emit('busy', false)
  }
}

onMounted(initializeCollaboration)
onBeforeUnmount(() => {
  disposed = true
  releaseEdit()
  editSocket?.disconnect()
  cropper.value?.destroy()
  if (source.value) URL.revokeObjectURL(source.value)
})
</script>

<style scoped>
.image-editor {
  min-width: 0;
}

.collaboration-status {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
  padding: 9px 12px;
  border: 1px solid #d9e3f0;
  border-radius: 8px;
  background: #f7f9fc;
}

.collaboration-status > div {
  display: flex;
  flex: 1;
  min-width: 0;
  flex-direction: column;
  gap: 2px;
}

.collaboration-status strong {
  color: #1f2937;
  font-size: 13px;
}

.collaboration-status span:not(.status-indicator) {
  color: #595959;
  font-size: 12px;
}

.status-indicator {
  flex: 0 0 auto;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #1677ff;
  box-shadow: 0 0 0 3px rgba(22, 119, 255, 0.14);
}

.collaboration-status--locked .status-indicator,
.collaboration-status--released .status-indicator {
  background: #d97706;
  box-shadow: 0 0 0 3px rgba(217, 119, 6, 0.14);
}

.collaboration-status--disconnected .status-indicator {
  background: #dc2626;
  box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.14);
}

.editor-context {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 10px;
}

.editor-context p {
  margin: 0;
  color: #595959;
  font-size: 13px;
}

.editor-context span {
  flex: 0 0 auto;
  color: #7a7a7a;
  font-size: 12px;
}

.editor-stage {
  position: relative;
  height: min(43vh, 380px);
  min-height: 220px;
  overflow: hidden;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #eef1f5;
}

.editor-stage img {
  display: block;
  max-width: 100%;
}

.editor-loading {
  position: absolute;
  inset: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.editor-error,
.editor-recovery {
  margin-top: 10px;
}

.editor-recovery p {
  margin-bottom: 8px;
  color: #595959;
}

.local-file-button {
  display: inline-flex;
  align-items: center;
  min-height: 32px;
  margin-left: 8px;
  padding: 4px 15px;
  color: #1677ff;
  border: 1px solid #1677ff;
  border-radius: 6px;
  cursor: pointer;
}

.local-file-button:focus-within {
  outline: 2px solid #91caff;
  outline-offset: 2px;
}

.local-file-button input {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
}

.editor-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}

.editor-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid #f0f0f0;
}

.editor-footer-hint {
  margin-right: auto;
  color: #7a7a7a;
  font-size: 12px;
}

@media (max-width: 560px) {
  .editor-context {
    align-items: flex-start;
    flex-direction: column;
    gap: 4px;
  }

  .editor-stage {
    height: 36vh;
    min-height: 200px;
  }

  .editor-toolbar {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .editor-toolbar :deep(.ant-btn) {
    width: 100%;
  }

  .editor-footer {
    flex-wrap: wrap;
  }

  .editor-footer-hint {
    width: 100%;
  }
}
</style>
