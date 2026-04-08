<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { loadCourses, deleteCourse, loadPeriods } from '../utils/storage'
import { WEEK_DAYS, DEFAULT_PERIODS, COURSE_COLORS, getCurrentWeekNumber, getCoursesForDay } from '../utils/schedule'

const router = useRouter()
const allCourses = ref([])
const periods = ref([...DEFAULT_PERIODS])
const showDeleteModal = ref(false)
const deleteTarget = ref(null)
const weekNumber = ref(getCurrentWeekNumber())
const selectedDay = ref(new Date().getDay() || 7)

onMounted(() => {
  refreshCourses()
  const custom = loadPeriods()
  if (custom) periods.value = custom
})

function refreshCourses() {
  allCourses.value = loadCourses() || []
}

const todayCourses = computed(() => {
  return getCoursesForDay(allCourses.value, weekNumber.value, selectedDay.value)
})

const isToday = computed(() => {
  return selectedDay.value === (new Date().getDay() || 7) && weekNumber.value === getCurrentWeekNumber()
})

function getColorName(color) {
  const c = COURSE_COLORS.find(c => c.value === color)
  return c ? c.name : ''
}

function getDayName(day) {
  return WEEK_DAYS[day - 1] || ''
}

function getTimeRange(start, end) {
  const s = periods.value.find(p => p.period === start)
  const e = periods.value.find(p => p.period === end)
  return s && e ? `${s.start}-${e.end}` : ''
}

function getPeriodLabel(start, end) {
  return `${start}-${end}节`
}

function selectDay(day) {
  selectedDay.value = day
}

function goToday() {
  selectedDay.value = new Date().getDay() || 7
  weekNumber.value = getCurrentWeekNumber()
}

function addCourse() {
  router.push({ path: '/course/add', query: { day: selectedDay.value } })
}

function editCourse(id) {
  router.push(`/course/edit/${id}`)
}

function confirmDelete(course) {
  deleteTarget.value = course
  showDeleteModal.value = true
}

function cancelDelete() {
  showDeleteModal.value = false
  deleteTarget.value = null
}

function doDelete() {
  if (deleteTarget.value) {
    deleteCourse(deleteTarget.value.id)
    refreshCourses()
  }
  showDeleteModal.value = false
  deleteTarget.value = null
}

function goBack() {
  router.push('/')
}
</script>

<template>
  <div class="course-list">
    <header class="course-list__header">
      <button class="course-list__back" @click="goBack">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
      </button>
      <h1 class="course-list__title">今日课程</h1>
      <button class="course-list__add-btn" @click="addCourse">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
      </button>
    </header>

    <!-- 星期选择 -->
    <div class="day-tabs">
      <button
        v-for="(day, i) in WEEK_DAYS"
        :key="i"
        class="day-tabs__item"
        :class="{
          'day-tabs__item--active': selectedDay === i + 1,
          'day-tabs__item--today': (new Date().getDay() || 7) === i + 1
        }"
        @click="selectDay(i + 1)"
      >{{ day }}</button>
      <button v-if="!isToday" class="day-tabs__today" @click="goToday">今天</button>
    </div>

    <div class="course-list__body">
      <!-- 空状态 -->
      <div v-if="todayCourses.length === 0" class="course-list__empty">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/>
        </svg>
        <p>{{ getDayName(selectedDay) }}没有课程</p>
        <button class="course-list__empty-add" @click="addCourse">添加课程</button>
      </div>

      <!-- 课程列表 -->
      <TransitionGroup name="list" tag="div" class="course-list__items">
        <div
          v-for="course in todayCourses"
          :key="course.id"
          class="course-item"
          :style="{ '--item-color': course.color }"
        >
          <div class="course-item__time-col">
            <span class="course-item__period">{{ getPeriodLabel(course.startPeriod, course.endPeriod) }}</span>
            <span class="course-item__time">{{ getTimeRange(course.startPeriod, course.endPeriod) }}</span>
          </div>
          <div class="course-item__color-bar"></div>
          <div class="course-item__content" @click="editCourse(course.id)">
            <div class="course-item__name">{{ course.name }}</div>
            <div class="course-item__detail">
              <span v-if="course.location">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                {{ course.location }}
              </span>
              <span v-if="course.teacher">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                {{ course.teacher }}
              </span>
            </div>
          </div>
          <button class="course-item__delete" @click.stop="confirmDelete(course)">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
          </button>
        </div>
      </TransitionGroup>
    </div>

    <Transition name="modal">
      <div v-if="showDeleteModal" class="modal-overlay" @click.self="cancelDelete">
        <div class="modal">
          <div class="modal__title">确认删除</div>
          <div class="modal__text">确定要删除「{{ deleteTarget?.name }}」吗？此操作不可撤销。</div>
          <div class="modal__actions">
            <button class="modal__btn modal__btn--cancel" @click="cancelDelete">取消</button>
            <button class="modal__btn modal__btn--danger" @click="doDelete">删除</button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.course-list {
  display: flex;
  flex-direction: column;
  height: 100vh;
  height: 100dvh;
  background: var(--bg-primary);
}

.course-list__header {
  display: flex;
  align-items: center;
  padding: 10px 16px;
  padding-top: max(10px, env(safe-area-inset-top));
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-primary);
  gap: 12px;
}

.course-list__back {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 10px;
  background: var(--bg-tertiary);
  color: var(--accent);
  cursor: pointer;
}

.course-list__title {
  flex: 1;
  font-size: 17px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
}

.course-list__add-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 10px;
  background: var(--accent);
  color: #fff;
  cursor: pointer;
}

/* 星期选择 */
.day-tabs {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-primary);
  gap: 4px;
  position: relative;
}

.day-tabs__item {
  flex: 1;
  padding: 8px 0;
  border: none;
  border-radius: 8px;
  background: transparent;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-tertiary);
  cursor: pointer;
  transition: all 0.2s;
  text-align: center;
}

.day-tabs__item--today {
  color: var(--accent);
  font-weight: 600;
}

.day-tabs__item--active {
  background: var(--accent);
  color: #fff;
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(74, 144, 217, 0.2);
}

.day-tabs__today {
  padding: 6px 10px;
  border: 1.5px solid var(--accent);
  border-radius: 6px;
  background: transparent;
  color: var(--accent);
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  margin-left: 4px;
  flex-shrink: 0;
}

.day-tabs__today:active {
  background: var(--accent);
  color: #fff;
}

.course-list__body {
  flex: 1;
  overflow: auto;
  padding: 12px 16px;
  -webkit-overflow-scrolling: touch;
}

.course-list__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 0;
  gap: 12px;
  color: var(--text-tertiary);
  font-size: 14px;
}

.course-list__empty-add {
  margin-top: 8px;
  padding: 8px 20px;
  border: 1.5px dashed var(--border-secondary);
  border-radius: 10px;
  background: transparent;
  color: var(--accent);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
}

.course-list__empty-add:active {
  background: var(--accent-light);
}

.course-list__items {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.course-item {
  display: flex;
  align-items: stretch;
  background: var(--bg-secondary);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: var(--shadow-card);
  transition: transform 0.2s;
}

.course-item:active { transform: scale(0.98); }

.course-item__time-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 12px 10px;
  min-width: 60px;
  gap: 2px;
}

.course-item__period {
  font-size: 13px;
  font-weight: 700;
  color: var(--item-color);
}

.course-item__time {
  font-size: 9px;
  color: var(--text-tertiary);
  font-variant-numeric: tabular-nums;
}

.course-item__color-bar {
  width: 4px;
  background: var(--item-color);
  flex-shrink: 0;
}

.course-item__content {
  flex: 1;
  padding: 12px 14px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.course-item__name {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
}

.course-item__detail {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: var(--text-secondary);
}

.course-item__detail span {
  display: flex;
  align-items: center;
  gap: 3px;
}

.course-item__delete {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  background: none;
  border: none;
  color: var(--danger);
  cursor: pointer;
  transition: background 0.2s;
  flex-shrink: 0;
}

.course-item__delete:active {
  background: var(--danger-bg);
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: var(--modal-overlay);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 24px;
}

.modal {
  background: var(--modal-bg);
  border-radius: 16px;
  padding: 24px;
  width: 100%;
  max-width: 320px;
  box-shadow: var(--shadow-elevated);
}

.modal__title { font-size: 17px; font-weight: 700; color: var(--text-primary); margin-bottom: 8px; }
.modal__text { font-size: 14px; color: var(--text-secondary); line-height: 1.5; margin-bottom: 20px; }
.modal__actions { display: flex; gap: 10px; }

.modal__btn {
  flex: 1;
  padding: 10px 0;
  border: none;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
}

.modal__btn--cancel { background: var(--bg-tertiary); color: var(--text-secondary); }
.modal__btn--danger { background: var(--danger); color: #fff; }

.list-enter-active, .list-leave-active { transition: all 0.3s ease; }
.list-enter-from { opacity: 0; transform: translateX(-20px); }
.list-leave-to { opacity: 0; transform: translateX(20px); }

.modal-enter-active, .modal-leave-active { transition: opacity 0.25s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
</style>
