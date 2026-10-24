import { ref, computed } from 'vue'
import { defineStore } from 'pinia'

/**
 * 存储登录信息的状态
 */
export const useLoginUserStore = defineStore('loginUser', () => {
  const loginUser = ref<any>({
    userName: '未登录',
  })

  async function fetchLoginUser() {
    // 后端暂无接口
  }

  /**
   * 设置登录用户
   * @param newLoginUser 用户信息
   */
  function setLoginUser(newLoginUser: string) {
    loginUser.value = newLoginUser
  }

  return { loginUser, setLoginUser, fetchLoginUser }
})
