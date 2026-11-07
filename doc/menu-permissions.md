# 导航菜单与页面权限

## 设计原则

内部页面的导航信息和访问规则集中声明在 `src/router/index.ts` 的路由 `meta` 中。顶部导航和侧边栏分别从路由配置生成，路由守卫也读取相同的元数据，避免菜单配置与路由权限各自维护、逐渐不一致。

菜单是否显示和页面是否允许访问是两个不同问题：

- `showInMenu`、`menuTitle`、`menuOrder`、`menuIcon` 控制页面是否进入顶部菜单以及菜单展示方式。
- `showInSider`、`siderTitle`、`siderOrder`、`siderIcon` 控制页面是否进入侧边栏以及菜单展示方式。`siderDisabled` 可以将尚未开放的菜单显示为禁用状态。
- `requiresAuth` 控制访问页面是否需要登录。
- `roles` 限制允许访问页面的用户角色，例如 `['admin']`。
- `src/router/permissions.ts` 中的 `canAccessRoute` 是菜单过滤和路由守卫共用的权限判断。

菜单隐藏只影响导航展示，不是安全边界。前端路由守卫可以改善访问体验，但后端仍必须校验受保护的接口和数据权限。

## 当前菜单和权限

| 页面 | 菜单 | 访问要求 |
| --- | --- | --- |
| 主页 `/` | 所有人可见 | 无需登录 |
| 创建图片 `/add_picture` | 登录用户可见 | 需要登录 |
| 用户管理 `/admin/userManager` | 管理员可见 | 需要登录，角色为 `admin` |
| 图片管理 `/admin/pictureManager` | 管理员可见 | 需要登录，角色为 `admin` |
| 登录、注册、图片详情等其他路由 | 不显示 | 未声明权限时不限制 |

未登录用户访问需要登录的页面时，会收到提示并跳转至登录页，同时通过 `redirect` 查询参数保留目标地址。登录后若用户角色不符合路由要求，会收到无权限提示并返回主页。

“其他”链接指向外部网站，不是 Vue Router 页面，因此仍在 `GlobaHeader.vue` 中作为独立的外部导航项维护，不参与内部路由权限判断。

## 侧边栏

主页 `/` 同时配置了顶部导航和侧边栏：顶部显示“主页”，侧边栏显示“公共图库”，两者使用不同的图标。`/my_space` 使用 `src/pages/MySpacePage.vue` 作为暂未开发的占位页面，侧边栏中的“我的空间”当前禁用，直接访问路由需要登录。

禁用的侧边栏项会对所有用户显示，但不可点击；启用后会按 `canAccessRoute` 过滤。开发完成后，替换占位页面的内容，移除 `/my_space` 路由中的 `siderDisabled: true`，并保留或调整 `requiresAuth` 等权限配置。

## 新增页面时

在 `src/router/index.ts` 注册页面。需要显示在顶部菜单的内部页面增加菜单元数据；需要登录或角色限制的页面同时声明相应访问规则。例如：

```ts
{
  path: '/example',
  name: '示例页面',
  component: () => import('@/pages/ExamplePage.vue'),
  meta: {
    showInMenu: true,
    menuTitle: '示例页面',
    menuOrder: 5,
    requiresAuth: true,
    roles: ['admin'],
  },
}
```

无需修改 `GlobaHeader.vue` 来重复注册内部菜单。若页面不应出现在导航中，省略 `showInMenu` 和菜单展示字段即可；若只要求登录，设置 `requiresAuth: true` 并省略 `roles`。
