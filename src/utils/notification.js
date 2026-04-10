import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'
import { loadCourses, loadPeriods } from './storage'
import { getCurrentWeekNumber, DEFAULT_PERIODS } from './schedule'

const NOTIFICATION_ENABLED_KEY = 'yunke_notification_enabled'
const NOTIFICATION_MINUTES_KEY = 'yunke_notification_minutes'

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
  if (!Capacitor.isNativePlatform()) return false
  try {
    const result = await LocalNotifications.requestPermissions()
    return result.display === 'granted'
  } catch (e) {
    console.warn('请求通知权限失败:', e)
    return false
  }
}

/**
 * 检查通知权限
 */
export async function checkNotificationPermission() {
  if (!Capacitor.isNativePlatform()) return false
  try {
    const result = await LocalNotifications.checkPermissions()
    return result.display === 'granted'
  } catch (e) {
    return false
  }
}

/**
 * 取消所有已安排的通知
 */
export async function cancelAllNotifications() {
  if (!Capacitor.isNativePlatform()) return
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
 * 调度所有课程的通知
 */
export async function scheduleAllNotifications() {
  if (!Capacitor.isNativePlatform()) return
  if (!isNotificationEnabled()) return

  const granted = await checkNotificationPermission()
  if (!granted) return

  await cancelAllNotifications()

  const courses = loadCourses() || []
  const periods = loadPeriods() || DEFAULT_PERIODS
  const weekNumber = getCurrentWeekNumber()
  const advanceMinutes = getNotificationMinutes()
  const now = new Date()

  const notifications = []
  const todayDayOfWeek = now.getDay() === 0 ? 7 : now.getDay()

  // 只为当天及之后7天的课程安排通知（避免过多通知）
  for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
    const targetDate = new Date(now)
    targetDate.setDate(now.getDate() + dayOffset)
    const targetDayOfWeek = targetDate.getDay() === 0 ? 7 : targetDate.getDay()

    // 获取当天有课的课程
    const dayCourses = courses.filter(c =>
      c.dayOfWeek === targetDayOfWeek &&
      c.weeks && c.weeks.includes(weekNumber)
    )

    for (const course of dayCourses) {
      const startPeriod = periods.find(p => p.period === course.startPeriod)
      if (!startPeriod) continue

      // 解析开始时间
      const [hours, minutes] = startPeriod.start.split(':').map(Number)
      const courseStart = new Date(targetDate)
      courseStart.setHours(hours, minutes, 0, 0)

      // 提前提醒时间
      const notifyAt = new Date(courseStart.getTime() - advanceMinutes * 60 * 1000)

      // 只安排未来的通知
      if (notifyAt <= now) continue

      // Android 通知 ID 范围限制
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
        largeIcon: 'ic_launcher',
        fullScreenIntent: true
      })
    }
  }

  // 批量调度（每次最多64条，Android限制）
  if (notifications.length > 0) {
    try {
      // 分批处理
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
  if (!Capacitor.isNativePlatform()) return

  try {
    // 注册通知动作类型
    await LocalNotifications.registerActionTypes({
      types: []
    })
  } catch (e) {
    // 忽略
  }

  if (isNotificationEnabled()) {
    await scheduleAllNotifications()
  }
}
