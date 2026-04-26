import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'
import { loadCourses, loadPeriods } from './storage'
import { getCurrentWeekNumber, getWeekNumberForDate, DEFAULT_PERIODS } from './schedule'

const NOTIFICATION_ENABLED_KEY = 'yunke_notification_enabled'
const NOTIFICATION_MINUTES_KEY = 'yunke_notification_minutes'

// 浏览器端定时通知的 setTimeout ID 存储
const browserTimers = []

/**
 * 检查通知是否启用
 */
export function isNotificationEnabled() {
  return localStorage.getItem(NOTIFICATION_ENABLED_KEY) === 'true'
}

/**
 * 设置通知开关
 */
export function setNotificationEnabled(enabled) {
  localStorage.setItem(NOTIFICATION_ENABLED_KEY, enabled ? 'true' : 'false')
  if (enabled) {
    scheduleAllNotifications()
  } else {
    cancelAllNotifications()
  }
}

/**
 * 获取提前提醒分钟数
 */
export function getNotificationMinutes() {
  const val = localStorage.getItem(NOTIFICATION_MINUTES_KEY)
  return val ? parseInt(val) : 20
}

/**
 * 设置提前提醒分钟数
 */
export function setNotificationMinutes(minutes) {
  localStorage.setItem(NOTIFICATION_MINUTES_KEY, String(minutes))
  if (isNotificationEnabled()) {
    scheduleAllNotifications()
  }
}

/**
 * 请求通知权限
 */
export async function requestNotificationPermission() {
  if (Capacitor.isNativePlatform()) {
    try {
      const result = await LocalNotifications.requestPermissions()
      return result.display === 'granted'
    } catch (e) {
      console.warn('请求通知权限失败:', e)
      return false
    }
  }

  // 浏览器端
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  const result = await Notification.requestPermission()
  return result === 'granted'
}

/**
 * 检查通知权限
 */
export async function checkNotificationPermission() {
  if (Capacitor.isNativePlatform()) {
    try {
      const result = await LocalNotifications.checkPermissions()
      return result.display === 'granted'
    } catch (e) {
      return false
    }
  }

  // 浏览器端
  return 'Notification' in window && Notification.permission === 'granted'
}

/**
 * 取消所有已安排的通知
 */
export async function cancelAllNotifications() {
  if (Capacitor.isNativePlatform()) {
    try {
      const pending = await LocalNotifications.getPending()
      if (pending.notifications.length > 0) {
        await LocalNotifications.cancel(pending)
      }
    } catch (e) {
      console.warn('取消通知失败:', e)
    }
  }

  // 浏览器端：清除所有 setTimeout
  for (const timerId of browserTimers) {
    clearTimeout(timerId)
  }
  browserTimers.length = 0
}

/**
 * 在浏览器端显示通知
 */
function showBrowserNotification(title, body) {
  try {
    const n = new Notification(title, {
      body,
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      tag: 'yunke-course-reminder',
      renotify: true
    })
    n.onclick = () => {
      window.focus()
      n.close()
    }
    // 5秒后自动关闭
    setTimeout(() => n.close(), 5000)
  } catch (e) {
    console.warn('浏览器通知显示失败:', e)
  }
}

/**
 * 调度所有课程的通知
 */
export async function scheduleAllNotifications() {
  if (!isNotificationEnabled()) return

  if (Capacitor.isNativePlatform()) {
    await scheduleNativeNotifications()
  } else {
    scheduleBrowserNotifications()
  }
}

/**
 * 原生平台调度通知
 */
async function scheduleNativeNotifications() {
  const granted = await checkNotificationPermission()
  if (!granted) return

  await cancelNativeNotifications()

  const courses = loadCourses() || []
  const periods = loadPeriods() || DEFAULT_PERIODS
  const advanceMinutes = getNotificationMinutes()
  const now = new Date()

  const notifications = []

  // 只为当天及之后7天的课程安排通知（避免过多通知）
  for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
    const targetDate = new Date(now)
    targetDate.setDate(now.getDate() + dayOffset)
    const targetDayOfWeek = targetDate.getDay() === 0 ? 7 : targetDate.getDay()
    const targetWeekNumber = getWeekNumberForDate(targetDate)

    const dayCourses = courses.filter(c =>
      c.dayOfWeek === targetDayOfWeek &&
      c.weeks && c.weeks.includes(targetWeekNumber)
    )

    for (const course of dayCourses) {
      const startPeriod = periods.find(p => p.period === course.startPeriod)
      if (!startPeriod) continue

      const [hours, minutes] = startPeriod.start.split(':').map(Number)
      const courseStart = new Date(targetDate)
      courseStart.setHours(hours, minutes, 0, 0)

      const notifyAt = new Date(courseStart.getTime() - advanceMinutes * 60 * 1000)

      if (notifyAt <= now) continue

      const notifId = (dayOffset * 100 + course.startPeriod) % 2147483647

      notifications.push({
        id: notifId,
        title: `📚 即将上课：${course.name || '未命名课程'}`,
        body: buildNotificationBody(course, startPeriod, advanceMinutes),
        schedule: { at: notifyAt },
        sound: undefined,
        attachments: undefined,
        actionTypeId: '',
        extra: null,
        smallIcon: 'ic_stat_icon',
        largeIcon: 'ic_launcher'
      })
    }
  }

  if (notifications.length > 0) {
    try {
      const batchSize = 60
      for (let i = 0; i < notifications.length; i += batchSize) {
        const batch = notifications.slice(i, i + batchSize)
        await LocalNotifications.schedule({ notifications: batch })
      }
    } catch (e) {
      console.warn('调度通知失败:', e)
    }
  }
}

/**
 * 浏览器端调度通知（使用 setTimeout 模拟）
 * 注意：页面关闭后通知不会触发，仅适用于调试
 */
function scheduleBrowserNotifications() {
  // 先清除旧的定时器
  for (const timerId of browserTimers) {
    clearTimeout(timerId)
  }
  browserTimers.length = 0

  if (!('Notification' in window) || Notification.permission !== 'granted') return

  const courses = loadCourses() || []
  const periods = loadPeriods() || DEFAULT_PERIODS
  const weekNumber = getCurrentWeekNumber()
  const advanceMinutes = getNotificationMinutes()
  const now = new Date()

  // 只为今天的课程安排通知
  const todayDayOfWeek = now.getDay() === 0 ? 7 : now.getDay()

  const dayCourses = courses.filter(c =>
    c.dayOfWeek === todayDayOfWeek &&
    c.weeks && c.weeks.includes(weekNumber)
  )

  for (const course of dayCourses) {
    const startPeriod = periods.find(p => p.period === course.startPeriod)
    if (!startPeriod) continue

    const [hours, minutes] = startPeriod.start.split(':').map(Number)
    const courseStart = new Date(now)
    courseStart.setHours(hours, minutes, 0, 0)

    const notifyAt = new Date(courseStart.getTime() - advanceMinutes * 60 * 1000)

    const diffMs = notifyAt.getTime() - now.getTime()
    if (diffMs <= 0) continue

    const title = `📚 即将上课：${course.name || '未命名课程'}`
    const body = buildNotificationBody(course, startPeriod, advanceMinutes)

    const timerId = setTimeout(() => {
      showBrowserNotification(title, body)
      // 完成后从数组中移除
      const idx = browserTimers.indexOf(timerId)
      if (idx !== -1) browserTimers.splice(idx, 1)
    }, diffMs)

    browserTimers.push(timerId)
  }
}

/**
 * 取消原生平台通知
 */
async function cancelNativeNotifications() {
  try {
    const pending = await LocalNotifications.getPending()
    if (pending.notifications.length > 0) {
      await LocalNotifications.cancel(pending)
    }
  } catch (e) {
    console.warn('取消通知失败:', e)
  }
}

/**
 * 发送即时通知（流体云展示时调用）
 */
export async function sendImmediateNotification(course, diffMin) {
  if (!isNotificationEnabled()) return

  const granted = await checkNotificationPermission()
  if (!granted) return

  const minutesText = diffMin <= 0 ? '即将开始' : `${diffMin}分钟后开始`
  const title = `📚 即将上课：${course.name || '未命名课程'}`
  const body = [
    course.location ? `📍 ${course.location}` : '',
    course.teacher ? `👤 ${course.teacher}` : '',
    minutesText
  ].filter(Boolean).join(' · ')

  if (Capacitor.isNativePlatform()) {
    try {
      await LocalNotifications.schedule({
        notifications: [{
          id: -1,
          title,
          body,
          schedule: { at: new Date() },
          sound: undefined,
          smallIcon: 'ic_stat_icon',
          largeIcon: 'ic_launcher'
        }]
      })
    } catch (e) {
      console.warn('发送即时通知失败:', e)
    }
  } else {
    showBrowserNotification(title, body)
  }
}

/**
 * 构建通知正文
 */
function buildNotificationBody(course, startPeriod, advanceMinutes) {
  const parts = []
  if (course.location) parts.push(`📍 ${course.location}`)
  if (course.teacher) parts.push(`👤 ${course.teacher}`)
  parts.push(`🕐 ${startPeriod.start} 开始`)
  parts.push(`${advanceMinutes}分钟后上课`)
  return parts.join(' · ')
}

/**
 * 初始化通知（应用启动时调用）
 */
export async function initNotifications() {
  if (Capacitor.isNativePlatform()) {
    try {
      await LocalNotifications.registerActionTypes({
        types: []
      })
    } catch (e) {
      // 忽略
    }

    if (isNotificationEnabled()) {
      await scheduleAllNotifications()
    }
  } else {
    // 浏览器端：如果已启用通知且已有权限，调度定时通知
    if (isNotificationEnabled() && 'Notification' in window && Notification.permission === 'granted') {
      scheduleBrowserNotifications()
    }
  }
}
