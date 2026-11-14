<template>
  <div class="image-editor">
    <p class="editor-hint">
      {{
        replace
          ? '拖动选区裁剪图片，保存后会更新当前上传的图片。'
          : '拖动选区裁剪图片，保存后会在当前空间创建新图片，原图保持不变。'
      }}
    </p>
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
      <a-button :disabled="!ready || busy" @click="cropper?.rotate(-90)">左旋转</a-button>
      <a-button :disabled="!ready || busy" @click="cropper?.rotate(90)">右旋转</a-button>
      <a-button :disabled="!ready || busy" @click="flipHorizontal">水平翻转</a-button>
      <a-button :disabled="!ready || busy" @click="cropper?.zoom(0.1)">放大</a-button>
      <a-button :disabled="!ready || busy" @click="cropper?.zoom(-0.1)">缩小</a-button>
      <a-button :disabled="!ready || busy" @click="reset">重置</a-button>
    </div>
    <div class="editor-footer">
      <a-button :disabled="busy" @click="emit('cancel')">取消</a-button>
      <a-button type="primary" :disabled="!ready" :loading="busy" @click="save">
        {{ replace ? '保存画面' : '保存为新图片' }}
      </a-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, shallowRef, watch } from 'vue'
import Cropper from 'cropperjs'
import 'cropperjs/dist/cropper.css'
import { downloadImage } from '@/utils'

const props = defineProps<{
  src: string
  name?: string
  format?: string
  saving?: boolean
  replace?: boolean
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
let horizontalScale = 1
let disposed = false
let loadController: AbortController | undefined

const setImageSource = (blob: Blob, local: boolean) => {
  cropper.value?.destroy()
  cropper.value = undefined
  if (source.value) URL.revokeObjectURL(source.value)
  source.value = URL.createObjectURL(blob)
  usingLocalFile.value = local
  ready.value = false
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

const initializeEditor = () => {
  if (!imageElement.value) return
  cropper.value?.destroy()
  cropper.value = new Cropper(imageElement.value, {
    viewMode: 1,
    autoCropArea: 1,
    background: true,
    responsive: true,
    ready() {
      ready.value = true
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

const flipHorizontal = () => {
  horizontalScale = -horizontalScale
  cropper.value?.scaleX(horizontalScale)
}

const reset = () => {
  cropper.value?.reset()
  horizontalScale = 1
}

const save = () => {
  if (!cropper.value || busy.value) return
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

onBeforeUnmount(() => {
  disposed = true
  cropper.value?.destroy()
  if (source.value) URL.revokeObjectURL(source.value)
})
</script>

<style scoped>
.editor-hint {
  color: #595959;
  margin-bottom: 12px;
}

.editor-stage {
  position: relative;
  height: min(52vh, 480px);
  min-height: 240px;
  background: #f0f0f0;
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

.editor-error {
  margin-top: 12px;
}

.editor-recovery {
  margin-top: 12px;
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

.editor-toolbar,
.editor-footer {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 16px;
}

.editor-footer {
  justify-content: flex-end;
}
</style>
