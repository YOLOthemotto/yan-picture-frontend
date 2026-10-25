import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { getCurrentUserUsingGet } from '@/api/userController.ts'

/**
 * 存储登录信息的状态
 */
export const useLoginUserStore = defineStore('loginUser', () => {
  const loginUser = ref<API.LoginUserVO>({
    userName: '未登录',
  })

  async function fetchLoginUser() {
    // 调用后端登录接口
    const res = await getCurrentUserUsingGet()
    if (res.data.code === 0 && res.data.data) {
      loginUser.value = res.data.data
    }
  }

  /**
   * 设置登录用户
   * @param newLoginUser 用户信息
   */
  function setLoginUser(newLoginUser: API.LoginUserVO) {
    loginUser.value = newLoginUser
  }

  return { loginUser, setLoginUser, fetchLoginUser }
})
