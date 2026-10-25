<template>
  <div id="userRegisterPage">
    <h2 class="title">用户注册</h2>
    <div class="desc">企业级智能协同云图库</div>
    <a-form :model="formState" autocomplete="off" @finish="handleSubmit">
      <a-form-item name="userAccount" :rules="[{ required: true, message: '请输入账号' }]">
        <a-input v-model:value="formState.userAccount" placeholder="请输入账号" />
      </a-form-item>

      <a-form-item
        name="userPassword"
        :rules="[
          { required: true, message: '请输入密码' },
          { min: 8, message: '密码长度不能少于8个字符' },
        ]"
      >
        <a-input-password v-model:value="formState.userPassword" placeholder="请输入密码" />
      </a-form-item>
      <a-form-item
        name="checkPassword"
        :rules="[
          { required: true, message: '请再次输入密码' },
          { min: 8, message: '密码长度不能少于8个字符' },
        ]"
      >
        <a-input-password v-model:value="formState.checkPassword" placeholder="请再次输入密码" />
      </a-form-item>
      <div class="tips">
        已有账号？
        <router-link to="/user/login">点击立即登录</router-link>
      </div>

      <a-form-item>
        <a-button type="primary" html-type="submit" style="width: 100%">注册</a-button>
      </a-form-item>
    </a-form>
  </div>
</template>
<script lang="ts" setup>
import { reactive } from 'vue'
import { loginUsingPost, registerUsingPost } from '@/api/userController.ts'
import { useLoginUserStore } from '@/stores/useLoginUserStore.ts'
import { message } from 'ant-design-vue'
import router from '@/router'

// 用于表单接收的值
const formState = reactive<API.UserRegisterRequest>({
  userAccount: '',
  userPassword: '',
  checkPassword: '',
})

const loginUserStore = useLoginUserStore()
/**
 * 提交表单
 * @param values
 */
const handleSubmit = async (values: any) => {
  try {
    if (formState.userPassword !== formState.checkPassword) {
      await message.error('两次输入的密码不一致')
      return
    }
    const res = await registerUsingPost(formState)
    console.log('请求结果' + res.data.code)
    if (res.data.code === 0 && res.data.data) {
      await loginUserStore.fetchLoginUser()
      await message.success('注册成功')
      await router.push({ path: '/user/login', replace: true })
    } else {
      await message.error('注册失败: ' + res.data.message)
    }
  } catch (error) {
    console.log(error)
  }
}
</script>

<style scoped>
#userRegisterPage {
  max-width: 400px;
  margin: 0 auto;
}

.title {
  text-align: center;
  margin-bottom: 16px;
}

.desc {
  color: #999;
  margin-bottom: 16px;
  font-size: 14px;
  text-align: center;
}

.tips {
  text-align: right;
  font-size: 13px;
  color: #999;
  margin-bottom: 16px;
}
</style>
