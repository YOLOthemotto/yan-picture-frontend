import router from '@/router'
import { canAccessRoute } from '@/router/permissions'
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

  if (!canAccessRoute(to.meta, loginUser)) {
    if (to.meta.requiresAuth && !loginUser?.id) {
      await message.error('请先登录')
      next({
        path: '/user/login',
        query: { redirect: to.fullPath },
      })
      return
    }

    await message.error('暂无权限访问')
    next('/')
    return
  }

  next()
})
