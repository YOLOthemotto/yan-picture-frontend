/**
 * 图片审核状态
 */
export const PIC_REVIEW_STATUS_ENUM = {
  REVIEWING: 0,
  PASS: 1,
  REJECT: 2,
}

/**
 * 图片审核状态文案
 */
export const PIC_REVIEW_STATUS_MAP = {
  0: '待审核',
  1: '通过',
  2: '拒绝',
}

/**
 * 图片审核下拉表单选项
 */
export const PIC_REVIEW_STATUS_OPTIONS = Object.keys(PIC_REVIEW_STATUS_MAP).map((key) => {
  return {
    label: PIC_REVIEW_STATUS_MAP[key],
    value: key,
  }
})

/**
 * 图片编辑消息类型枚举
 */
export const PICTURE_EDIT_MESSAGE_TYPE_ENUM = {
  INFO: 'INFO',
  ERROR: 'ERROR',
  ENTER_EDIT: 'ENTER_EDIT',
  EXIT_EDIT: 'EXIT_EDIT',
  EDIT_ACTION: 'EDIT_ACTION',
} as const

/**
 * 图片编辑消息类型映射
 */
export const PICTURE_EDIT_MESSAGE_TYPE_MAP = {
  INFO: '发送通知',
  ERROR: '发送错误',
  ENTER_EDIT: '进入编辑状态',
  EXIT_EDIT: '退出编辑状态',
  EDIT_ACTION: '执行编辑操作',
}

/**
 * 图片编辑操作枚举
 */
export const PICTURE_EDIT_ACTION_ENUM = {
  ZOOM_IN: 'ZOOM_IN',
  ZOOM_OUT: 'ZOOM_OUT',
  ROTATE_LEFT: 'ROTATE_LEFT',
  ROTATE_RIGHT: 'ROTATE_RIGHT',
} as const

/**
 * 图片编辑操作映射
 */
export const PICTURE_EDIT_ACTION_MAP = {
  ZOOM_IN: '放大操作',
  ZOOM_OUT: '缩小操作',
  ROTATE_LEFT: '左旋操作',
  ROTATE_RIGHT: '右旋操作',
}

export type PictureEditAction =
  (typeof PICTURE_EDIT_ACTION_ENUM)[keyof typeof PICTURE_EDIT_ACTION_ENUM]

export type PictureEditMessageType =
  (typeof PICTURE_EDIT_MESSAGE_TYPE_ENUM)[keyof typeof PICTURE_EDIT_MESSAGE_TYPE_ENUM]

export type PictureEditState = {
  rotation: number
  zoom: number
  version: number
}

export type PictureEditMessage = {
  type: PictureEditMessageType
  requestId?: string
  message?: string
  success?: boolean
  editAction?: PictureEditAction
  action?: PictureEditAction
  pictureEditAction?: PictureEditAction
  state?: PictureEditState
  pictureState?: PictureEditState
  version?: number
  rotation?: number
  zoom?: number
  userId?: number | string
  userName?: string
  userAccount?: string
  editorName?: string
  editorAccount?: string
  editUserName?: string
  editorUserName?: string
  user?: PictureEditUser | null
  editor?: PictureEditUser | null
  editUser?: PictureEditUser | null
  loginUser?: PictureEditUser | null
}

type PictureEditUser = {
  id?: number | string
  userName?: string
  userAccount?: string
}
