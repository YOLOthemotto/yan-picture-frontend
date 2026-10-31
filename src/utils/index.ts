import { saveAs } from 'file-saver'

/**
 * 格式化文件大小
 * @param size 文件大小，单位为字节
 * @returns 格式化后的文件大小字符串
 */
export function formatSize(size: number): string {
  if (size < 1024) {
    return size + ' B'
  } else if (size < 1024 * 1024) {
    return (size / 1024).toFixed(2) + ' KB'
  } else if (size < 1024 * 1024 * 1024) {
    return (size / (1024 * 1024)).toFixed(2) + ' MB'
  } else {
    return (size / (1024 * 1024 * 1024)).toFixed(2) + ' GB'
  }
}

/**
 * 下载图片
 * @param url 图片的 URL
 * @param filename 下载后的文件名
 */
export function downloadImage(url?: string, filename?: string) {
  if (!url) {
    console.error('下载图片失败: URL 为空')
    return
  }
  saveAs(url, filename)
}
