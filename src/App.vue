<template>
  <div id="app">
    <basic-layout />
  </div>
</template>

<script setup lang="ts">
import BasicLayout from '@/layouts/BasicLayout.vue'
import { healthUsingGet } from '@/api/jiankangjiancha.ts'
import { useRouter } from 'vue-router'
import { useLoginUserStore } from '@/stores/useLoginUserStore.ts'

const loginUserStore = useLoginUserStore()

loginUserStore.fetchLoginUser()

healthUsingGet().then((response) => {
  console.log(response)
})
</script>
<style scoped>

</style>
