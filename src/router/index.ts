import { createRouter, createWebHistory } from 'vue-router'
import { HomeOutlined, PictureOutlined, UserOutlined } from '@ant-design/icons-vue'
// import HomePage from '@/pages/HomePage.vue'
import HomeWaterfallPage from '@/pages/HomeWaterfallPage.vue'
import UserLoginPage from '@/pages/user/UserLoginPage.vue'
import '@/router/permissions'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    // 原首页路由（保留）
    //     {
    //       path: '/',
    //       name: 'home',
    //       component: HomePage,
    //       meta: {
    //         showInMenu: true,
    //         menuTitle: '主页',
    //         menuOrder: 1,
    //         menuIcon: HomeOutlined,
    //       },
    //     },
    {
      path: '/',
      name: 'home',
      component: HomeWaterfallPage,
      meta: {
        showInMenu: true,
        menuTitle: '主页',
        menuOrder: 1,
        menuIcon: HomeOutlined,
        showInSider: true,
        siderTitle: '公共图库',
        siderOrder: 1,
        siderIcon: PictureOutlined,
      },
    },
    {
      path: '/my_space',
      name: '我的空间',
      component: () => import('@/pages/MySpacePage.vue'),
      meta: {
        showInSider: true,
        siderTitle: '我的空间',
        siderOrder: 2,
        siderIcon: UserOutlined,
        requiresAuth: true,
      },
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
      meta: {
        showInMenu: true,
        menuTitle: '用户管理',
        menuOrder: 3,
        requiresAuth: true,
        roles: ['admin'],
      },
    },
    {
      path: '/admin/pictureManager',
      name: '图片管理',
      component: () => import('../pages/admin/PictureMangerPage.vue'),
      meta: {
        showInMenu: true,
        menuTitle: '图片管理',
        menuOrder: 4,
        requiresAuth: true,
        roles: ['admin'],
      },
    },
    {
      path: '/admin/spaceManager',
      name: '空间管理',
      component: () => import('../pages/admin/SpaceMangerPage.vue'),
      meta: {
        showInMenu: true,
        menuTitle: '空间管理',
        menuOrder: 5,
        requiresAuth: true,
        roles: ['admin'],
      },
    },
    {
      path: '/add_picture',
      name: '创建图片',
      component: () => import('@/pages/AddPicturePage.vue'),
      meta: {
        showInMenu: true,
        menuTitle: '创建图片',
        menuOrder: 2,
        requiresAuth: true,
      },
    },
    {
      path: '/add_space',
      name: '创建空间',
      component: () => import('@/pages/AddSpacePage.vue'),
      meta: {
        showInMenu: false,
        menuTitle: '创建空间',
        menuOrder: 2,
        requiresAuth: true,
      },
    },
    {
      path: '/add_picture/batch',
      name: '批量创建图片',
      component: () => import('@/pages/AddPictureBatchPage.vue'),
      meta: {
        showInMenu: false,
        menuTitle: '批量创建图片',
        menuOrder: 2,
        requiresAuth: true,
      },
    },
    {
      path: '/picture/:id',
      name: '图片详情',
      component: () => import('@/pages/PictureDetailPage.vue'),
      props: true,
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
