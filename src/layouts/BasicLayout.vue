<template>
  <div id="basicLayout">
    <a-layout style="min-height: 100vh">
      <a-layout-header class="header">
        <globa-header />
      </a-layout-header>
      <a-layout-content class="content">
        <router-view />
      </a-layout-content>
      <a-layout-footer class="footer">
        <a href="https://www.baidu.com" target="_blank" rel="noopener noreferrer">
          严某的前端学习项目
        </a>
      </a-layout-footer>
    </a-layout>
  </div>
</template>

<script setup lang="ts">
import GlobaHeader from '@/components/GlobaHeader.vue'
</script>

<style scoped>
#basicLayout .header {
  padding-inline: 20px 0;
  background-color: white;
  color: unset;
  margin-bottom: 16px;
}

#basicLayout .content {
  padding: 24px;
  background: #f1f5f9;
  min-height: calc(100vh - 64px - 70px);
  margin-bottom: 28px; /* 留出底部固定 footer 的空间 */
}

#basicLayout .footer {
  background-color: #efefef;
  padding: 16px;
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  text-align: center;
}
</style>
