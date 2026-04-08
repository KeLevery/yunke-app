<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import WeekSelector from '../components/WeekSelector.vue'
import CourseCard from '../components/CourseCard.vue'
import EmptyState from '../components/EmptyState.vue'
import { loadCourses, saveCourses, loadPeriods } from '../utils/storage'
import { getCurrentWeekNumber, getCoursesForDay, DEFAULT_PERIODS, WEEK_DAYS, getWeekDateRange } from '../utils/schedule'

const props = defineProps({
  darkMode: Boolean
})

const emit = defineEmits(['toggleDark'])

const router = useRouter()
const allCourses = ref([])
const weekNumber = ref(getCurrentWeekNumber())
const periods = ref(DEFAULT_PERIODS)

onMounted(() => {
  allCourses.value = loadCourses() || []
  const customPeriods = loadPeriods()
  if (customPeriods) {
    periods.value = customPeriods
  }
})

const todayDayOfWeek = computed(() => {
  const d = new Date().getDay()
  return d === 0 ? 7 : d
})

const isCurrentWeek = computed(() => weekNumber.value === getCurrentWeekNumber())

const weekCourses = computed(() => {
  return WEEK_DAYS.map((_, dayIndex) => {
    return getCoursesForDay(allCourses.value, weekNumber.value, dayIndex + 1)
  })
})

const hasCourses = computed(() => {
  return weekCourses.value.some(day => day.length > 0)
})

const weekDates = computed(() => {
  const { monday } = getWeekDateRange(weekNumber.value)
  return WEEK_DAYS.map((_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d.getDate()
  })
})

const timeSections = computed(() => [
  { label: '上午', periods: periods.value.slice(0, 4) },
  { label: '下午', periods: periods.value.slice(4, 8) },
  { label: '晚上', periods: periods.value.slice(8, 12) }
])

function onWeekChange(week) {
  weekNumber.value = week
}

function onCourseClick(course) {
  router.push(`/course/edit/${course.id}`)
}

function goToAdd(dayOfWeek, startPeriod) {
  const query = {}
  if (dayOfWeek !== undefined) query.day = dayOfWeek
  if (startPeriod !== undefined) query.period = startPeriod
  router.push({ path: '/course/add', query })
}

function goToCourseList() {
  router.push('/courses')
}

function goToSettings() {
  router.push('/settings')
}

function isCellOccupied(dayIndex, periodIndex) {
  return weekCourses.value[dayIndex].some(c =>
    periodIndex + 1 >= c.startPeriod && periodIndex + 1 <= c.endPeriod
  )
}

const CELL_HEIGHT = 48
const SECTION_GAP = 8

function getCoursePosition(course) {
  let sectionOffset = 0
  if (course.startPeriod >= 9) {
    sectionOffset = 2
  } else if (course.startPeriod >= 5) {
    sectionOffset = 1
  }
  const indexInSection = course.startPeriod - (sectionOffset * 4 + 1)
  const top = sectionOffset * (CELL_HEIGHT * 4 + SECTION_GAP) + indexInSection * CELL_HEIGHT
  const height = (course.endPeriod - course.startPeriod + 1) * CELL_HEIGHT - 4
  return { top, height }
}

let touchStartX = 0
let touchStartY = 0

function onTouchStart(e) {
  touchStartX = e.touches[0].clientX
  touchStartY = e.touches[0].clientY
}

function onTouchEnd(e) {
  const diffX = e.changedTouches[0].clientX - touchStartX
  const diffY = e.changedTouches[0].clientY - touchStartY
  if (Math.abs(diffX) > 60 && Math.abs(diffX) > Math.abs(diffY)) {
    if (diffX < 0 && weekNumber.value < 25) {
      weekNumber.value++
    } else if (diffX > 0 && weekNumber.value > 1) {
      weekNumber.value--
    }
  }
}
</script>

<template>
  <div class="week-view">
    <!-- 顶部区域 -->
    <div class="week-view__top">
      <div class="week-view__brand">
        <span class="week-view__logo">☁</span>
        <span class="week-view__app-name">云课</span>
      </div>
      <div class="week-view__top-actions">
        <button class="week-view__dark-toggle" @click="emit('toggleDark')" :title="darkMode ? '切换亮色' : '切换暗色'">
          <svg v-if="darkMode" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
          <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
        </button>
        <button class="week-view__settings" @click="goToSettings">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
        </button>
      </div>
    </div>

    <WeekSelector :week-number="weekNumber" @change="onWeekChange" />

    <div class="timetable" @touchstart="onTouchStart" @touchend="onTouchEnd">
      <!-- 表头 -->
      <div class="timetable__header">
        <div class="timetable__header-time"></div>
        <div
          v-for="(day, i) in WEEK_DAYS"
          :key="i"
          class="timetable__header-day"
          :class="{ 'timetable__header-day--today': todayDayOfWeek === i + 1 && isCurrentWeek }"
        >
          <span class="timetable__day-label">{{ day }}</span>
          <span
            class="timetable__day-date"
            :class="{ 'timetable__day-date--today': todayDayOfWeek === i + 1 && isCurrentWeek }"
          >{{ weekDates[i] }}</span>
        </div>
      </div>

      <!-- 课程区域 -->
      <div class="timetable__body">
        <div class="timetable__time-col">
          <div
            v-for="section in timeSections"
            :key="section.label"
            class="timetable__time-section"
          >
            <div class="timetable__time-section-label">{{ section.label }}</div>
            <div
              v-for="p in section.periods"
              :key="p.period"
              class="timetable__time-cell"
            >
              <span class="timetable__period-num">{{ p.period }}</span>
              <span class="timetable__period-time">{{ p.start }}</span>
            </div>
          </div>
        </div>

        <div class="timetable__grid">
          <div
            v-for="(day, dayIndex) in WEEK_DAYS"
            :key="dayIndex"
            class="timetable__day-col"
            :class="{ 'timetable__day-col--today': todayDayOfWeek === dayIndex + 1 && isCurrentWeek }"
          >
            <div
              v-for="section in timeSections"
              :key="section.label"
              class="timetable__day-section"
            >
              <div
                v-for="p in section.periods"
                :key="p.period"
                class="timetable__cell"
                :class="{ 'timetable__cell--occupied': isCellOccupied(dayIndex, p.period - 1) }"
                @click="!isCellOccupied(dayIndex, p.period - 1) && goToAdd(dayIndex + 1, p.period)"
              >
                <svg v-if="!isCellOccupied(dayIndex, p.period - 1)" class="timetable__cell-plus" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              </div>
            </div>
            <div
              v-for="course in weekCourses[dayIndex]"
              :key="course.id"
              class="timetable__course-wrapper"
              :style="{
                top: getCoursePosition(course).top + 'px',
                height: getCoursePosition(course).height + 'px'
              }"
              @click="onCourseClick(course)"
            >
              <CourseCard :course="course" />
            </div>
          </div>
        </div>
      </div>
    </div>

    <EmptyState v-if="!hasCourses" @add="goToAdd()" />

    <nav class="bottom-nav">
      <button class="bottom-nav__item bottom-nav__item--active">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
          <line x1="16" y1="2" x2="16" y2="6"/>
          <line x1="8" y1="2" x2="8" y2="6"/>
          <line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
        <span>课表</span>
      </button>
      <button class="bottom-nav__add" @click="goToAdd()">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <line x1="12" y1="5" x2="12" y2="19"/>
          <line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
      </button>
      <button class="bottom-nav__item" @click="goToCourseList">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="8" y1="6" x2="21" y2="6"/>
          <line x1="8" y1="12" x2="21" y2="12"/>
          <line x1="8" y1="18" x2="21" y2="18"/>
          <line x1="3" y1="6" x2="3.01" y2="6"/>
          <line x1="3" y1="12" x2="3.01" y2="12"/>
          <line x1="3" y1="18" x2="3.01" y2="18"/>
        </svg>
        <span>列表</span>
      </button>
    </nav>
  </div>
</template>

<style scoped>
.week-view {
  display: flex;
  flex-direction: column;
  height: 100vh;
  height: 100dvh;
  background: var(--bg-primary);
  overflow: hidden;
}

.week-view__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  padding-top: max(10px, env(safe-area-inset-top));
  background: var(--bg-secondary);
}

.week-view__brand {
  display: flex;
  align-items: center;
  gap: 6px;
}

.week-view__logo {
  font-size: 22px;
}

.week-view__app-name {
  font-size: 18px;
  font-weight: 700;
  background: linear-gradient(135deg, var(--accent), #1A5276);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.week-view__top-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.week-view__dark-toggle,
.week-view__settings {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 10px;
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  cursor: pointer;
  transition: background 0.2s;
}

.week-view__dark-toggle:active,
.week-view__settings:active {
  background: var(--bg-hover);
}

/* 课表区域 */
.timetable {
  flex: 1;
  overflow: auto;
  -webkit-overflow-scrolling: touch;
  background: var(--bg-secondary);
}

.timetable__header {
  display: flex;
  position: sticky;
  top: 0;
  z-index: 10;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-primary);
}

.timetable__header-time {
  min-width: 44px;
  max-width: 44px;
}

.timetable__header-day {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px 0;
  gap: 2px;
}

.timetable__header-day--today {
  background: var(--accent-light);
}

.timetable__day-label {
  font-size: 11px;
  color: var(--text-tertiary);
  font-weight: 500;
}

.timetable__day-date {
  font-size: 15px;
  color: var(--text-secondary);
  font-weight: 600;
  width: 26px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: background 0.2s;
}

.timetable__day-date--today {
  background: var(--accent);
  color: #fff;
}

.timetable__body {
  display: flex;
  position: relative;
}

.timetable__time-col {
  min-width: 44px;
  max-width: 44px;
  flex-shrink: 0;
}

.timetable__time-section {
  display: flex;
  flex-direction: column;
}

.timetable__time-section-label {
  text-align: center;
  font-size: 9px;
  color: var(--text-tertiary);
  padding: 3px 0;
  font-weight: 600;
  letter-spacing: 1px;
}

.timetable__time-cell {
  height: 48px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1px;
}

.timetable__period-num {
  font-size: 10px;
  font-weight: 700;
  color: var(--text-tertiary);
}

.timetable__period-time {
  font-size: 8px;
  color: var(--text-tertiary);
  font-variant-numeric: tabular-nums;
}

.timetable__grid {
  display: flex;
  flex: 1;
}

.timetable__day-col {
  flex: 1;
  position: relative;
}

.timetable__day-col--today {
  background: var(--accent-light);
}

.timetable__day-section {
  display: flex;
  flex-direction: column;
}

.timetable__day-section + .timetable__day-section {
  margin-top: 8px;
}

.timetable__cell {
  height: 48px;
  border-right: 1px solid var(--border-cell);
  border-bottom: 1px solid var(--border-cell);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.15s;
  color: var(--text-placeholder);
}

.timetable__cell:not(.timetable__cell--occupied):active {
  background: var(--accent-light);
}

.timetable__cell--occupied {
  cursor: default;
}

.timetable__cell-plus {
  opacity: 0;
  transition: opacity 0.15s;
}

.timetable__cell:not(.timetable__cell--occupied):hover .timetable__cell-plus,
.timetable__cell:not(.timetable__cell--occupied):active .timetable__cell-plus {
  opacity: 1;
}

.timetable__course-wrapper {
  position: absolute;
  left: 2px;
  right: 2px;
  z-index: 5;
  cursor: pointer;
}

/* 底部导航 */
.bottom-nav {
  display: flex;
  align-items: center;
  justify-content: space-around;
  padding: 6px 20px;
  padding-bottom: max(6px, env(safe-area-inset-bottom));
  background: var(--bg-secondary);
  border-top: 1px solid var(--border-primary);
}

.bottom-nav__item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  background: none;
  border: none;
  color: var(--text-tertiary);
  font-size: 10px;
  cursor: pointer;
  padding: 4px 16px;
  transition: color 0.2s;
}

.bottom-nav__item--active {
  color: var(--accent);
}

.bottom-nav__add {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 52px;
  height: 52px;
  border-radius: 16px;
  background: linear-gradient(135deg, var(--accent), var(--accent-hover));
  color: #fff;
  border: none;
  box-shadow: 0 4px 20px rgba(74, 144, 217, 0.35);
  cursor: pointer;
  transition: transform 0.15s, box-shadow 0.15s;
  margin-top: -18px;
}

.bottom-nav__add:active {
  transform: scale(0.92);
  box-shadow: 0 2px 10px rgba(74, 144, 217, 0.25);
}
</style>
