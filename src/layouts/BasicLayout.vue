<template>
  <div id="basicLayout">
    <a-layout style="min-height: 100vh">
      <a-layout-header class="header">
        <globa-header />
      </a-layout-header>
      <a-layout>
        <globa-sider class="sider" />
        <a-layout-content class="content">
          <router-view />
        </a-layout-content>
      </a-layout>
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
import GlobaSider from '@/components/GlobaSider.vue'
</script>

<style scoped>
#basicLayout .header {
  padding-inline: 20px 0;
  background-color: white;
  color: unset;
  margin-bottom: 1px;
}

#basicLayout .content {
  padding: 28px;
  background: #f1f5f9;
  min-height: calc(100vh - 64px - 70px);
  margin-bottom: 28px; /* 留出底部固定 footer 的空间 */
}

#basicLayout .footer {
  background-color: rgba(255, 255, 255, 0.96);
  border-top: 1px solid #e2e8f0;
  box-shadow: 0 -4px 16px rgba(15, 23, 42, 0.04);
  padding: 14px 20px;
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  text-align: center;
}

#basicLayout .footer a {
  color: #475569;
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0.02em;
  text-decoration: none;
  transition: color 0.2s ease;
}

#basicLayout .sider {
  background-color: white;
  border-right: 1px solid #e2e8f0;
  box-shadow: 4px 0 16px rgba(15, 23, 42, 0.04);
}

#basicLayout :deep(.ant-menu-root) {
  border-right: none !important;
  box-shadow: none !important;
  border-inline-end: none !important;
}

#basicLayout .footer a:hover {
  color: #0958d9;
  text-decoration: underline;
  text-underline-offset: 3px;
}

#basicLayout .footer a:focus-visible {
  border-radius: 2px;
  outline: 2px solid #0958d9;
  outline-offset: 3px;
}
</style>
