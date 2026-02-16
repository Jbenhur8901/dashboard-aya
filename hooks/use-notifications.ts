import { useEffect, useState } from 'react'

export type AppNotificationTone = 'success' | 'warning' | 'info'

export type AppNotification = {
  id: string
  title: string
  description: string
  createdAt: string
  read: boolean
  tone: AppNotificationTone
}

type NotificationsState = {
  notifications: AppNotification[]
}

let notificationCount = 0
const listeners: Array<(state: NotificationsState) => void> = []
let memoryState: NotificationsState = { notifications: [] }

function genId() {
  notificationCount = (notificationCount + 1) % Number.MAX_SAFE_INTEGER
  return notificationCount.toString()
}

function emit(next: NotificationsState) {
  memoryState = next
  listeners.forEach((listener) => listener(memoryState))
}

function addNotification(input: Omit<AppNotification, 'id' | 'read'>) {
  const notification: AppNotification = {
    ...input,
    id: genId(),
    read: false,
  }

  emit({
    notifications: [notification, ...memoryState.notifications].slice(0, 50),
  })
}

function markAllAsRead() {
  emit({
    notifications: memoryState.notifications.map((notification) => ({
      ...notification,
      read: true,
    })),
  })
}

function markAsRead(id: string) {
  emit({
    notifications: memoryState.notifications.map((notification) =>
      notification.id === id ? { ...notification, read: true } : notification
    ),
  })
}

function useNotifications() {
  const [state, setState] = useState<NotificationsState>(memoryState)

  useEffect(() => {
    listeners.push(setState)
    return () => {
      const index = listeners.indexOf(setState)
      if (index > -1) listeners.splice(index, 1)
    }
  }, [])

  const unreadCount = state.notifications.filter((notification) => !notification.read).length

  return {
    notifications: state.notifications,
    unreadCount,
    addNotification,
    markAllAsRead,
    markAsRead,
  }
}

export { useNotifications, addNotification, markAllAsRead, markAsRead }
