import type { Component } from 'vue'
import type { RouteMeta } from 'vue-router'

declare module 'vue-router' {
  interface RouteMeta {
    showInMenu?: boolean
    menuTitle?: string
    menuOrder?: number
    menuIcon?: Component
    requiresAuth?: boolean
    roles?: string[]
  }
}

export function canAccessRoute(meta: RouteMeta, loginUser?: API.LoginUserVO) {
  const isLoggedIn = Boolean(loginUser?.id)

  if (meta.requiresAuth && !isLoggedIn) {
    return false
  }

  return !(meta.roles?.length && (!isLoggedIn || !meta.roles.includes(loginUser?.userRole ?? '')));


}
