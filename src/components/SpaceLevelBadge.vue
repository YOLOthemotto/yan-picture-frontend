<template>
  <a-tag v-if="level != null && SPACE_LEVEL_MAP[level]" :color="colors[level]">
    <component :is="icons[level]" aria-hidden="true" />
    {{ SPACE_LEVEL_MAP[level] }}
  </a-tag>
  <a-tag v-else-if="level != null">空间级别 {{ level }}</a-tag>
</template>

<script setup lang="ts">
import { AppstoreOutlined, CrownOutlined, StarOutlined } from '@ant-design/icons-vue'
import type { Component } from 'vue'
import { SPACE_LEVEL_ENUM, SPACE_LEVEL_MAP } from '@/constants/space'

defineProps<{ level?: number }>()

const colors: Record<number, string> = {
  [SPACE_LEVEL_ENUM.COMMON]: 'default',
  [SPACE_LEVEL_ENUM.PROFESSIONAL]: 'blue',
  [SPACE_LEVEL_ENUM.FLAGSHIP]: 'gold',
}
const icons: Record<number, Component> = {
  [SPACE_LEVEL_ENUM.COMMON]: AppstoreOutlined,
  [SPACE_LEVEL_ENUM.PROFESSIONAL]: StarOutlined,
  [SPACE_LEVEL_ENUM.FLAGSHIP]: CrownOutlined,
}
</script>
