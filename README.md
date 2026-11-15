# yan-picture-frontend

This template should help get you started developing with Vue 3 in Vite.

## Recommended IDE Setup

[VSCode](https://code.visualstudio.com/) + [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur).

## Type Support for `.vue` Imports in TS

TypeScript cannot handle type information for `.vue` imports by default, so we replace the `tsc` CLI with `vue-tsc` for type checking. In editors, we need [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) to make the TypeScript language service aware of `.vue` types.

## Customize configuration

See [Vite Configuration Reference](https://vite.dev/config/).

## Project Setup

```sh
npm install
```

### Compile and Hot-Reload for Development

```sh
npm run dev
```

### 图片编辑跨域配置

直接编辑空间图片需要图片所在的腾讯云 COS 存储桶（以及使用的 CDN）允许前端页面的 Origin 跨域读取图片。配置 CORS 时，允许实际使用的前端 Origin 和 GET 方法，并确保图片响应返回对应的 `Access-Control-Allow-Origin`。仅能在浏览器中预览或下载图片并不代表允许画布读取。

如果暂时无法配置，编辑弹窗提供下载原图并选择本地文件的方式；保存仍会上传为新图片。

### 图库数据分析

从侧边栏「数据分析」或空间详情页进入。普通用户默认查看自己的空间；管理员可以切换指定空间、公共图库和全部图库，并查看全站空间存储排行。

分析页地址为 `/space_analyze`，支持 `spaceId`、`queryPublic=1` 和 `queryAll=1` 查询参数。空间 ID 使用字符串传递，避免长整数精度丢失。权限最终由后端校验。

`src/components/space/analyze/` 中的六个 `Space*Analyze.vue` 组件各自调用对应的统计接口，统一接收 `scope` 和 `refreshKey`（全站排行仅接收 `refreshKey`），可独立复用。上传趋势支持日 / 周 / 月及用户 ID 筛选，分类图支持数量 / 用量切换，标签以词云展示；图表同时提供可展开的数据明细。

图表使用 ECharts 与 echarts-wordcloud，按路由加载。每个组件独立处理加载、空数据和重试，统计范围切换时会取消旧请求。

### Type-Check, Compile and Minify for Production

```sh
npm run build
```

### Lint with [ESLint](https://eslint.org/)

```sh
npm run lint
```
