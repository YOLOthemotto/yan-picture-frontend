import router from '@/router'
import { useLoginUserStore } from '@/stores/useLoginUserStore.ts'
import { message } from 'ant-design-vue'

let fistFetchLoginUser = true

router.beforeEach(async (to, from, next) => {
  const loginUserStore = useLoginUserStore()
  let loginUser = loginUserStore.loginUser
  if (fistFetchLoginUser) {
    await loginUserStore.fetchLoginUser()
    loginUser = loginUserStore.loginUser
    fistFetchLoginUser = false
  }

  const toUrl = to.path

  // 管理员才能访问 /admin 开头的页面
  if (toUrl.startsWith('/admin') && (!loginUser || loginUser?.userRole !== 'admin')) {
    await message.error('暂无权限访问')
    next(`/user/login?redirect=${to.fullPath}`)
    return
  }
  next()
})
