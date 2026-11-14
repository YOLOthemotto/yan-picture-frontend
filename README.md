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

### Type-Check, Compile and Minify for Production

```sh
npm run build
```

### Lint with [ESLint](https://eslint.org/)

```sh
npm run lint
```
