import { createRouter, createWebHistory } from 'vue-router'
import HomePage from '@/pages/HomePage.vue'
import UserLoginPage from '@/pages/user/UserLoginPage.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomePage,
    },
    {
      path: '/user/login',
      name: '用户登录',
      component: UserLoginPage,
    },
    {
      path: '/user/register',
      name: '用户注册',
      component: () => import('@/pages/user/UserRegisterPage.vue'),
    },
    {
      path: '/admin/userManager',
      name: '用户管理',
      component: () => import('@/pages/admin/UserMangerPage.vue'),
    },
    {
      path: '/admin/pictureManager',
      name: '图片管理',
      component: () => import('../pages/admin/PictureMangerPage.vue'),
    },
    {
      path: '/add_picture',
      name: '创建图片',
      component: () => import('@/pages/AddPicturePage.vue'),
    },
    {
      path: '/picture/:id',
      name: '图片详情',
      component: () => import('@/pages/PictureDetailPage.vue'),
      props: true
    },
    {
      path: '/about',
      name: 'about',
      // route level code-splitting
      // this generates a separate chunk (About.[hash].js) for this route
      // which is lazy-loaded when the route is visited.
      component: () => import('../views/AboutView.vue'),
    },
  ],
})

export default router
