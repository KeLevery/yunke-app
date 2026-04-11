<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { loadCourses, loadPeriods } from '../utils/storage'
import { getCurrentWeekNumber, DEFAULT_PERIODS } from '../utils/schedule'
import { isNotificationEnabled, getNotificationMinutes, sendImmediateNotification } from '../utils/notification'

const props = defineProps({
  darkMode: { type: Boolean, default: false }
})

// ========== 核心状态 ==========
const visible = ref(false)
const expanded = ref(false)
const course = ref(null)
const countdown = ref(0)
const courseStartTime = ref(null)

// ========== 关闭状态记忆（解决关不掉问题） ==========
const dismissedCourses = new Set()
let lastNotifiedCourseId = null

// ========== 定时器引用 ==========
let checkTimer = null
let countdownTimer = null

// ========== 计算属性 ==========
const courseColor = computed(() => course.value?.color || '#4A90D9')

const countdownText = computed(() => {
  if (countdown.value <= 0) return '已开始'
  if (countdown.value === 1) return '1 分钟后上课'
  return `${countdown.value} 分钟后上课`
})

const periodInfo = computed(() => {
  if (!course.value) return ''
  const periods = loadPeriods() || DEFAULT_PERIODS
  const startP = periods.find(p => p.period === course.value.startPeriod)
  const endP = periods.find(p => p.period === course.value.endPeriod)
  if (startP && endP) {
    return `${startP.start}–${endP.end} · 第${course.value.startPeriod}-${course.value.endPeriod}节`
  }
  return `第${course.value.startPeriod}-${course.value.endPeriod}节`
})

// ========== 课程检测逻辑 ==========

function findNextCourse() {
  try {
    if (!isNotificationEnabled()) return null

    const courses = loadCourses() || []
    if (courses.length === 0) return null

    const now = new Date()
    const todayDayOfWeek = now.getDay() === 0 ? 7 : now.getDay()
    const weekNumber = getCurrentWeekNumber()

    // 筛选当天有课的课程
    const dayCourses = courses
      .filter(c =>
        c.dayOfWeek === todayDayOfWeek &&
        c.weeks && c.weeks.includes(weekNumber)
      )
      .sort((a, b) => a.startPeriod - b.startPeriod)

    if (dayCourses.length === 0) return null

    const periods = loadPeriods() || DEFAULT_PERIODS

    // 找到下一节未来课程（或正在进行的课程）
    for (const c of dayCourses) {
      const startP = periods.find(p => p.period === c.startPeriod)
      if (!startP) continue

      const [hours, minutes] = startP.start.split(':').map(Number)
      const cs = new Date(now)
      cs.setHours(hours, minutes, 0, 0)

      // 允许提前5分钟内显示"即将开始"
      const threshold = new Date(cs.getTime() + 5 * 60 * 1000)

      if (threshold >= now) {
        return { ...c, _startTime: cs }
      }
    }

    return null
  } catch (e) {
    console.warn('FluidCloud: 检测课程失败', e)
    return null
  }
}

function checkAndShow() {
  try {
    const advanceMinutes = getNotificationMinutes()
    const now = Date.now()
    const nextCourse = findNextCourse()

    if (!nextCourse || !nextCourse._startTime) {
      hideCloud()
      return
    }

    // 检查用户是否已手动关闭此课程
    const courseId = nextCourse.id || `${nextCourse.name}-${nextCourse.startPeriod}`
    if (dismissedCourses.has(courseId)) {
      return
    }

    const diffMs = nextCourse._startTime.getTime() - now
    const diffMin = Math.ceil(diffMs / 60000)

    // 在提醒窗口内：[advanceMinutes + 2, 5] 即将/刚要开始时展示
    const showWindowStart = advanceMinutes + 2

    if (diffMin <= showWindowStart && diffMin > -30) {
      if (!visible.value) {
        course.value = nextCourse
        courseStartTime.value = nextCourse._startTime
        visible.value = true
        expanded.value = false

        // 首次展示时发送即时通知（解决没有系统通知的问题）
        if (lastNotifiedCourseId !== courseId) {
          lastNotifiedCourseId = courseId
          sendImmediateNotification(nextCourse, diffMin)
        }
      }
      countdown.value = Math.max(0, diffMin)
    } else {
      hideCloud()
    }
  } catch (e) {
    console.warn('FluidCloud: 检查失败', e)
  }
}

function hideCloud() {
  if (visible.value) {
    visible.value = false
    expanded.value = false
    course.value = null
    countdown.value = 0
    courseStartTime.value = null
  }
}

function dismiss() {
  // 记录当前课程为"已手动关闭"
  if (course.value) {
    const courseId = course.value.id || `${course.value.name}-${course.value.startPeriod}`
    dismissedCourses.add(courseId)
  }
  visible.value = false
  expanded.value = false
}

// ========== 倒计时更新 ==========

function updateCountdown() {
  if (!visible.value || !courseStartTime.value) return
  const now = Date.now()
  const diffMin = Math.ceil((courseStartTime.value.getTime() - now) / 60000)
  countdown.value = Math.max(0, diffMin)

  // 超过课程开始后3分钟自动消失（并清理关闭标记）
  if (countdown.value < -3) {
    if (course.value) {
      const courseId = course.value.id || `${course.value.name}-${course.value.startPeriod}`
      dismissedCourses.delete(courseId)
    }
    hideCloud()
  }
}

// ========== 交互处理 ==========

function toggleExpand() {
  expanded.value = !expanded.value
}

function handleTouchStart(e) {
  // 如果触摸的是关闭按钮，不拦截，让 click 事件正常触发
  if (e.target.closest('.fluid-cloud__close')) return
  e.preventDefault()
  touchStartX.value = e.touches[0].clientX
  touchStartY.value = e.touches[0].clientY
}

function handleTouchEnd(e) {
  if (e.target.closest('.fluid-cloud__close')) return
  const dx = e.changedTouches[0].clientX - touchStartX.value
  const dy = Math.abs(e.changedTouches[0].clientY - touchStartY.value)
  if (Math.abs(dx) > 60 && dy < 40) {
    dismiss()
  }
}
const touchStartX = ref(0)
const touchStartY = ref(0)

// ========== 生命周期 ==========
onMounted(() => {
  checkAndShow()
  checkTimer = setInterval(checkAndShow, 30000)
  countdownTimer = setInterval(updateCountdown, 15000)

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      clearInterval(checkTimer)
      clearInterval(countdownTimer)
      checkTimer = null
      countdownTimer = null
    } else {
      checkAndShow()
      if (!checkTimer) checkTimer = setInterval(checkAndShow, 30000)
      if (!countdownTimer) countdownTimer = setInterval(updateCountdown, 15000)
    }
  })
})

onBeforeUnmount(() => {
  if (checkTimer) clearInterval(checkTimer)
  if (countdownTimer) clearInterval(countdownTimer)
})
</script>

<template>
  <Teleport to="body">
    <Transition name="fluid">
      <div
        v-if="visible"
        class="fluid-cloud"
        :class="{ 'fluid-cloud--expanded': expanded, 'fluid-cloud--dark': darkMode }"
        :style="{ '--fc-color': courseColor }"
        @click="toggleExpand"
        @touchstart="handleTouchStart"
        @touchend="handleTouchEnd"
      >
        <!-- 收缩态 Pill -->
        <div v-if="!expanded" class="fluid-cloud__pill">
          <span class="fluid-cloud__dot"></span>
          <span class="fluid-cloud__name">{{ course?.name || '课程提醒' }}</span>
          <span class="fluid-cloud__cd">{{ countdownText }}</span>
          <button class="fluid-cloud__close" @click.stop="dismiss" aria-label="关闭">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <!-- 展开态 Card -->
        <div v-else class="fluid-cloud__card">
          <button class="fluid-cloud__close fluid-cloud__close--card" @click.stop="dismiss" aria-label="关闭">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>

          <div class="fluid-cloud__card-header">
            <span class="fluid-cloud__card-icon">📚</span>
            <div class="fluid-cloud__card-title-wrap">
              <span class="fluid-cloud__card-name">{{ course?.name || '未命名课程' }}</span>
              <span class="fluid-cloud__card-period">{{ periodInfo }}</span>
            </div>
          </div>

          <div class="fluid-cloud__card-body">
            <div v-if="course?.location" class="fluid-cloud__info-row">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              <span>{{ course.location }}</span>
            </div>
            <div v-if="course?.teacher" class="fluid-cloud__info-row">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              <span>{{ course.teacher }}</span>
            </div>
          </div>

          <div class="fluid-cloud__card-footer">
            <div class="fluid-cloud__countdown-box">
              <span class="fluid-cloud__countdown-num">{{ countdown }}</span>
              <span class="fluid-cloud__countdown-unit">分钟后</span>
            </div>
            <span class="fluid-cloud__countdown-hint">点击收起</span>
          </div>

          <!-- 底部颜色指示条 -->
          <div class="fluid-cloud__color-bar"></div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* ========== 容器 ========== */
.fluid-cloud {
  position: fixed;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9999;
  padding-top: max(8px, env(safe-area-inset-top));
  pointer-events: auto;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  -webkit-tap-highlight-color: transparent;
  user-select: none;
}

/* ========== 收缩态 Pill ========== */
.fluid-cloud__pill {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  min-width: 200px;
  max-width: calc(100vw - 32px);
  height: 44px;
  border-radius: 22px;
  background: rgba(0, 0, 0, 0.62);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  color: #ffffff;
  box-shadow:
    0 4px 24px rgba(0, 0, 0, 0.25),
    0 0 0 0.5px rgba(255, 255, 255, 0.1),
    0 0 20px color-mix(in srgb, var(--fc-color) 18%, transparent);
  animation: fluid-breathe 3s ease-in-out infinite;
  cursor: pointer;
  transition: box-shadow 0.3s ease;
}

.fluid-cloud--dark .fluid-cloud__pill {
  background: rgba(30, 35, 50, 0.78);
  box-shadow:
    0 4px 28px rgba(0, 0, 0, 0.45),
    0 0 0 0.5px rgba(255, 255, 255, 0.06),
    0 0 24px color-mix(in srgb, var(--fc-color) 15%, transparent);
}

.fluid-cloud__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--fc-color);
  box-shadow: 0 0 8px var(--fc-color);
  flex-shrink: 0;
  animation: dot-pulse 2s ease-in-out infinite;
}

.fluid-cloud__name {
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.02em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 120px;
}

.fluid-cloud__cd {
  font-size: 11px;
  font-weight: 500;
  opacity: 0.85;
  margin-left: auto;
  white-space: nowrap;
  letter-spacing: 0.01em;
}

.fluid-cloud__close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border: none;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.12);
  color: rgba(255, 255, 255, 0.65);
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.2s, color 0.2s;
  padding: 0;
}

.fluid-cloud__close:hover,
.fluid-cloud__close:active {
  background: rgba(255, 255, 255, 0.22);
  color: #fff;
}

/* ========== 展开态 Card ========== */
.fluid-cloud__card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 300px;
  max-width: calc(100vw - 32px);
  padding: 18px 18px 14px;
  border-radius: 20px;
  background: rgba(0, 0, 0, 0.68);
  backdrop-filter: blur(26px) saturate(180%);
  -webkit-backdrop-filter: blur(26px) saturate(180%);
  color: #ffffff;
  box-shadow:
    0 8px 40px rgba(0, 0, 0, 0.32),
    0 0 0 0.5px rgba(255, 255, 255, 0.08),
    0 0 36px color-mix(in srgb, var(--fc-color) 14%, transparent);
  cursor: pointer;
  overflow: hidden;
}

.fluid-cloud--dark .fluid-cloud__card {
  background: rgba(22, 28, 42, 0.82);
  box-shadow:
    0 8px 48px rgba(0, 0, 0, 0.55),
    0 0 0 0.5px rgba(255, 255, 255, 0.05),
    0 0 32px color-mix(in srgb, var(--fc-color) 12%, transparent);
}

.fluid-cloud__close--card {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 1;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.55);
}

.fluid-cloud__close--card:hover,
.fluid-cloud__close--card:active {
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
}

/* 卡片头部 */
.fluid-cloud__card-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding-right: 24px;
}

.fluid-cloud__card-icon {
  font-size: 22px;
  line-height: 1;
  flex-shrink: 0;
}

.fluid-cloud__card-title-wrap {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.fluid-cloud__card-name {
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 0.01em;
  line-height: 1.25;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.fluid-cloud__card-period {
  font-size: 11.5px;
  font-weight: 400;
  opacity: 0.72;
  letter-spacing: 0.01em;
}

/* 信息行 */
.fluid-cloud__card-body {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.fluid-cloud__info-row {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 12.5px;
  font-weight: 400;
  opacity: 0.82;
  line-height: 1.4;
}

.fluid-cloud__info-row svg {
  flex-shrink: 0;
  opacity: 0.75;
}

/* 底部倒计时区 */
.fluid-cloud__card-footer {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  padding-top: 6px;
}

.fluid-cloud__countdown-box {
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.fluid-cloud__countdown-num {
  font-size: 32px;
  font-weight: 800;
  letter-spacing: -1px;
  line-height: 1;
  color: var(--fc-color);
  text-shadow: 0 0 16px color-mix(in srgb, var(--fc-color) 35%, transparent);
}

.fluid-cloud__countdown-unit {
  font-size: 13px;
  font-weight: 600;
  opacity: 0.8;
}

.fluid-cloud__countdown-hint {
  font-size: 11px;
  opacity: 0.45;
  font-weight: 400;
}

/* 颜色指示条 */
.fluid-cloud__color-bar {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, transparent 0%, var(--fc-color) 30%, var(--fc-color) 70%, transparent 100%);
  border-radius: 0 0 20px 20px;
  opacity: 0.85;
}

/* ========== 动画 ========== */
@keyframes fluid-breathe {
  0%, 100% {
    box-shadow:
      0 4px 24px rgba(0, 0, 0, 0.25),
      0 0 0 0.5px rgba(255, 255, 255, 0.1),
      0 0 20px color-mix(in srgb, var(--fc-color) 18%, transparent);
  }
  50% {
    box-shadow:
      0 6px 30px rgba(0, 0, 0, 0.28),
      0 0 0 0.5px rgba(255, 255, 255, 0.14),
      0 0 28px color-mix(in srgb, var(--fc-color) 28%, transparent);
  }
}

@keyframes dot-pulse {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.65;
    transform: scale(0.85);
  }
}

/* 进出过渡 */
.fluid-enter-active {
  transition: all 0.45s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.fluid-leave-active {
  transition: all 0.28s ease-in;
}

.fluid-enter-from {
  opacity: 0;
  transform: translateX(-50%) translateY(-120%) scale(0.75);
}

.fluid-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-16px) scale(0.92);
}
</style>
