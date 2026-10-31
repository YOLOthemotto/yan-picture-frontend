<template>
  <div id="userRegisterPage">
    <div class="auth-card">
      <div class="auth-aside">
        <div class="auth-brand">
          <img src="../../assets/logo.png" alt="" class="brand-logo" />
          <div>
            <div class="brand-title">严某的专属图库</div>
            <div class="brand-desc">企业级智能协同云图库</div>
          </div>
        </div>
        <div class="auth-art" aria-hidden="true"></div>
      </div>

      <div class="auth-form-panel">
        <h2 class="title">用户注册</h2>
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
            <a-input-password
              v-model:value="formState.checkPassword"
              placeholder="请再次输入密码"
            />
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
    </div>
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
  width: 100%;
  margin: 0 auto;
}

#userRegisterPage .auth-card {
  display: grid;
  grid-template-columns: 0.88fr 1.12fr;
  width: min(920px, 100%);
  min-height: 500px;
  margin: 24px auto;
  overflow: hidden;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 20px;
  box-shadow: 0 20px 55px rgba(15, 23, 42, 0.08);
}

#userRegisterPage .auth-aside {
  position: relative;
  isolation: isolate;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  overflow: hidden;
  padding: 40px;
  background: linear-gradient(145deg, #eaf3ff 0%, #f5f8ff 58%, #e8f1ff 100%);
}

#userRegisterPage .auth-brand {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 14px;
}

#userRegisterPage .brand-logo {
  width: 52px;
  height: 52px;
  padding: 5px;
  background: #fff;
  border: 1px solid rgba(9, 88, 217, 0.08);
  border-radius: 15px;
  object-fit: contain;
  box-shadow: 0 8px 20px rgba(9, 88, 217, 0.1);
}

#userRegisterPage .brand-title {
  color: #172b4d;
  font-size: 17px;
  font-weight: 700;
  letter-spacing: 0.01em;
}

#userRegisterPage .brand-desc {
  margin-top: 5px;
  color: #526783;
  font-size: 13px;
}

#userRegisterPage .auth-art {
  position: absolute;
  right: -78px;
  bottom: -96px;
  width: 340px;
  height: 340px;
  border: 1px solid rgba(9, 88, 217, 0.12);
  border-radius: 50%;
  background: radial-gradient(circle at 35% 32%, rgba(22, 119, 255, 0.16), transparent 62%);
}

#userRegisterPage .auth-art::before,
#userRegisterPage .auth-art::after {
  position: absolute;
  content: '';
  border: 1px solid rgba(9, 88, 217, 0.13);
  border-radius: 50%;
}

#userRegisterPage .auth-art::before {
  inset: 30px;
}

#userRegisterPage .auth-art::after {
  inset: 62px;
  background: rgba(255, 255, 255, 0.3);
}

#userRegisterPage .auth-form-panel {
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 48px clamp(36px, 5vw, 64px);
}

#userRegisterPage .auth-form-panel :deep(.ant-form) {
  width: 100%;
  max-width: 390px;
  margin: 0 auto;
}

#userRegisterPage .auth-form-panel :deep(.ant-form-item) {
  margin-bottom: 20px;
}

#userRegisterPage .auth-form-panel :deep(.ant-input),
#userRegisterPage .auth-form-panel :deep(.ant-input-affix-wrapper) {
  min-height: 46px;
  border-radius: 10px;
}

#userRegisterPage .auth-form-panel :deep(.ant-btn) {
  height: 46px;
  border-radius: 10px;
  font-weight: 600;
}

.title {
  margin: 0 0 30px;
  color: #172b4d;
  font-size: 28px;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.tips {
  text-align: right;
  font-size: 13px;
  color: #64748b;
  margin-bottom: 16px;
}

.tips a {
  font-weight: 600;
}

@media (max-width: 700px) {
  #userRegisterPage .auth-card {
    grid-template-columns: 1fr;
    min-height: 0;
    margin: 12px auto;
    border-radius: 16px;
  }

  #userRegisterPage .auth-aside {
    min-height: 112px;
    padding: 22px 26px;
  }

  #userRegisterPage .brand-logo {
    width: 46px;
    height: 46px;
    border-radius: 13px;
  }

  #userRegisterPage .auth-art {
    right: -180px;
    bottom: -250px;
    width: 340px;
    height: 340px;
  }

  #userRegisterPage .auth-form-panel {
    padding: 30px 26px 26px;
  }

  #userRegisterPage .title {
    margin-bottom: 24px;
    font-size: 25px;
  }
}

@media (max-width: 420px) {
  #userRegisterPage .auth-aside {
    padding-inline: 20px;
  }

  #userRegisterPage .auth-form-panel {
    padding-inline: 20px;
  }
}
</style>
