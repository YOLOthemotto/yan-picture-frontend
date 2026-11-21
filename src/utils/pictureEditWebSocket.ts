import request from '@/request'
import {
  PICTURE_EDIT_MESSAGE_TYPE_ENUM,
  type PictureEditAction,
  type PictureEditMessage,
} from '@/constants/picture'

type PictureEditEvent =
  | (typeof PICTURE_EDIT_MESSAGE_TYPE_ENUM)[keyof typeof PICTURE_EDIT_MESSAGE_TYPE_ENUM]
  | 'open'
  | 'close'
  | 'error'

type PictureEditEventHandler = (data?: PictureEditMessage | Event | CloseEvent | Error) => void

const getWebSocketUrl = (pictureId: number) => {
  const apiBaseUrl = request.defaults.baseURL
  const baseUrl = apiBaseUrl || window.location.origin
  const url = new URL('/api/ws/picture/edit', baseUrl)
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
  url.searchParams.set('pictureId', String(pictureId))
  return url
}

export default class PictureEditWebSocket {
  private socket: WebSocket | null = null
  private suppressCloseEvent = false
  private readonly eventHandlers = new Map<PictureEditEvent, Set<PictureEditEventHandler>>()

  constructor(private readonly pictureId: number) {}

  connect() {
    if (
      this.socket?.readyState === WebSocket.CONNECTING ||
      this.socket?.readyState === WebSocket.OPEN
    ) {
      return
    }

    this.suppressCloseEvent = false
    this.socket = new WebSocket(getWebSocketUrl(this.pictureId))

    this.socket.onopen = () => {
      this.triggerEvent('open')
    }

    this.socket.onmessage = (event) => {
      try {
        const message =
          typeof event.data === 'string'
            ? (JSON.parse(event.data) as PictureEditMessage)
            : undefined
        if (!message?.type) throw new Error('协同编辑消息格式不完整')
        this.triggerEvent(message.type, message)
      } catch (error) {
        this.triggerEvent('error', error instanceof Error ? error : new Error(String(error)))
      }
    }

    this.socket.onclose = (event) => {
      if (!this.suppressCloseEvent) this.triggerEvent('close', event)
      this.socket = null
    }

    this.socket.onerror = (event) => {
      this.triggerEvent('error', event)
    }
  }

  disconnect() {
    if (!this.socket) return
    const socket = this.socket
    this.suppressCloseEvent = true
    this.socket = null
    if (socket.readyState === WebSocket.CONNECTING || socket.readyState === WebSocket.OPEN) {
      socket.close(1000, 'picture editor closed')
    }
  }

  sendMessage(message: PictureEditMessage) {
    if (this.socket?.readyState !== WebSocket.OPEN) return false
    this.socket.send(JSON.stringify(message))
    return true
  }

  sendAction(editAction: PictureEditAction) {
    return this.sendMessage({
      type: PICTURE_EDIT_MESSAGE_TYPE_ENUM.EDIT_ACTION,
      editAction,
    })
  }

  on(type: PictureEditEvent, handler: PictureEditEventHandler) {
    const handlers = this.eventHandlers.get(type) ?? new Set<PictureEditEventHandler>()
    handlers.add(handler)
    this.eventHandlers.set(type, handlers)
    return () => handlers.delete(handler)
  }

  private triggerEvent(
    type: PictureEditEvent,
    data?: PictureEditMessage | Event | CloseEvent | Error,
  ) {
    this.eventHandlers.get(type)?.forEach((handler) => handler(data))
  }
}
