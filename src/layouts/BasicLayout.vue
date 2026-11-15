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
#basicLayout {
  --layout-header-height: 64px;
  --layout-footer-height: 50px;
}

#basicLayout .header {
  position: sticky;
  top: 0;
  z-index: 100;
  flex-shrink: 0;
  height: var(--layout-header-height);
  padding-inline: 20px 0;
  background-color: white;
  color: unset;
  margin-bottom: 1px;
}

#basicLayout .content {
  padding: 28px;
  background: #f1f5f9;
  min-height: calc(100vh - var(--layout-header-height) - 70px);
  margin-bottom: var(--layout-footer-height);
}

#basicLayout .footer {
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  height: var(--layout-footer-height);
  background-color: rgba(255, 255, 255, 0.96);
  border-top: 1px solid #e2e8f0;
  box-shadow: 0 -4px 16px rgba(15, 23, 42, 0.04);
  padding: 14px 20px;
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 100;
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
  position: sticky;
  top: calc(var(--layout-header-height) + 1px);
  z-index: 10;
  align-self: flex-start;
  flex-shrink: 0;
  height: calc(100vh - var(--layout-header-height) - var(--layout-footer-height) - 1px);
  height: calc(100dvh - var(--layout-header-height) - var(--layout-footer-height) - 1px);
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
