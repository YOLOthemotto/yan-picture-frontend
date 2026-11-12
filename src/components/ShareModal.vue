<template>
  <a-modal
    :open="open"
    title="分享图片"
    :footer="null"
    destroy-on-close
    @cancel="emit('update:open', false)"
  >
    <div class="share-content">
      <template v-if="url">
        <div class="qr-code">
          <a-qrcode :value="url" :size="192" :bordered="false" include-margin />
        </div>
        <p class="qr-hint">使用手机扫码查看图片</p>
        <label class="url-label" for="share-image-url">图片地址</label>
        <a-input id="share-image-url" class="share-url" :value="url" readonly>
          <template #addonAfter>
            <a-typography-text :copyable="{ text: url }">
              <template #copyableIcon="{ copied }">
                <span class="copy-action">
                  <CheckOutlined v-if="copied" />
                  <CopyOutlined v-else />
                  {{ copied ? '已复制' : '复制地址' }}
                </span>
              </template>
            </a-typography-text>
          </template>
        </a-input>
        <p class="privacy-hint">获得链接的人可能可以直接查看图片，请谨慎分享。</p>
      </template>
      <a-empty v-else description="图片地址不可用，无法分享" />
    </div>
  </a-modal>
</template>

<script setup lang="ts">
import { CheckOutlined, CopyOutlined } from '@ant-design/icons-vue'

defineProps<{
  open: boolean
  url?: string
}>()
const emit = defineEmits<{
  'update:open': [value: boolean]
}>()
</script>

<style scoped>
.share-content {
  padding: 8px 0;
}

.qr-code {
  display: flex;
  justify-content: center;
}

.qr-hint {
  margin: 4px 0 24px;
  text-align: center;
  color: #595959;
}

.url-label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
}

.share-url :deep(.ant-input) {
  color: #595959;
}

.share-url :deep(.ant-input-group-addon) {
  padding: 0 12px;
  background: #fff;
}

.share-url :deep(.ant-typography-copy) {
  margin: 0;
}

.copy-action {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
}

.privacy-hint {
  margin: 12px 0 0;
  color: #595959;
  font-size: 12px;
}
</style>
