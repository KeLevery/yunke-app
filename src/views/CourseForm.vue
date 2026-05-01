<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { addCourse, updateCourse, getCourseById, deleteCourse, getHistory, addHistoryItem, loadPeriods, savePeriods, removeHistoryItem as removeHistoryFromStorage } from '../utils/storage'
import { WEEK_DAYS, DEFAULT_PERIODS, COURSE_COLORS, createNextPeriod, renumberPeriods } from '../utils/schedule'

const router = useRouter()
const route = useRoute()
const isEdit = computed(() => route.name === 'CourseEdit')
const editId = computed(() => route.params.id)

const periods = ref([...DEFAULT_PERIODS])

const form = ref({
  name: '',
  location: '',
  teacher: '',
  dayOfWeek: 1,
  startPeriod: 1,
  endPeriod: 2,
  weeks: [],
  color: '#4A90D9'
})

const history = ref({
  name: [],
  location: [],
  teacher: []
})

onMounted(() => {
  const customPeriods = loadPeriods()
  if (customPeriods) periods.value = customPeriods

  history.value = {
    name: getHistory('name'),
    location: getHistory('location'),
    teacher: getHistory('teacher')
  }

  if (route.query.day) form.value.dayOfWeek = parseInt(route.query.day)
  if (route.query.period) {
    form.value.startPeriod = parseInt(route.query.period)
    form.value.endPeriod = parseInt(route.query.period)
  }

  if (isEdit.value && editId.value) {
    const course = getCourseById(editId.value)
    if (course) form.value = { ...form.value, ...course }
  }
})

watch(() => form.value.startPeriod, (val) => {
  if (form.value.endPeriod < val) form.value.endPeriod = val
})

function selectColor(color) { form.value.color = color }
function selectDay(day) { form.value.dayOfWeek = day }

function toggleWeek(week) {
  const idx = form.value.weeks.indexOf(week)
  if (idx !== -1) form.value.weeks.splice(idx, 1)
  else form.value.weeks.push(week)
  form.value.weeks.sort((a, b) => a - b)
}

function selectWeekRange(start, end) {
  form.value.weeks = []
  for (let i = start; i <= end; i++) form.value.weeks.push(i)
}

const showWeekModal = ref(false)
const showDeleteModal = ref(false)
const showPeriodModal = ref(false)

function openWeekModal() { showWeekModal.value = true }
function confirmWeeks() { showWeekModal.value = false }
function openPeriodModal() { showPeriodModal.value = true }

function savePeriodSettings() {
  periods.value = renumberPeriods(periods.value)
  savePeriods(periods.value)
  normalizeSelectedPeriodBounds()
  showPeriodModal.value = false
}

function updatePeriodTime(index, field, value) {
  periods.value[index][field] = value
}

function addPeriod() {
  periods.value = [...periods.value, createNextPeriod(periods.value)]
}

function removeLastPeriod() {
  if (periods.value.length <= 1) return
  periods.value = renumberPeriods(periods.value.slice(0, -1))
  normalizeSelectedPeriodBounds()
}

function normalizeSelectedPeriodBounds() {
  const maxPeriod = periods.value[periods.value.length - 1]?.period || 1
  if (form.value.startPeriod > maxPeriod) form.value.startPeriod = maxPeriod
  if (form.value.endPeriod > maxPeriod) form.value.endPeriod = maxPeriod
  if (form.value.endPeriod < form.value.startPeriod) form.value.endPeriod = form.value.startPeriod
}

function save() {
  const data = { ...form.value }
  // 名称如果为空则显示默认名称
  if (!data.name.trim()) data.name = '未命名课程'
  if (isEdit.value) {
    updateCourse(editId.value, data)
  } else {
    addCourse(data)
  }
  router.push('/')
}

function confirmDelete() { showDeleteModal.value = true }

function doDelete() {
  if (isEdit.value && editId.value) deleteCourse(editId.value)
  showDeleteModal.value = false
  router.push('/')
}

function goBack() { router.back() }

const isFormValid = computed(() => form.value.weeks.length > 0)

// ========== 历史选择弹窗 ==========
const showHistoryModal = ref(false)
const historyField = ref('')
const historySearch = ref('')
const historyFieldLabel = { name: '课程名称', location: '上课地点', teacher: '任课教师' }
const historyFieldIcon = {
  name: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>',
  location: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>',
  teacher: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>'
}

function openHistoryPicker(field) {
  historyField.value = field
  historySearch.value = ''
  showHistoryModal.value = true
}

function selectHistoryItem(value) {
  form.value[historyField.value] = value
  showHistoryModal.value = false
}

function removeHistoryItem(type, value) {
  const list = history.value[type]
  const idx = list.indexOf(value)
  if (idx !== -1) {
    list.splice(idx, 1)
    removeHistoryFromStorage(type, value)
  }
}

const filteredHistory = computed(() => {
  const list = history.value[historyField.value] || []
  const keyword = historySearch.value.trim().toLowerCase()
  if (!keyword) return list
  return list.filter(item => item.toLowerCase().includes(keyword))
})

const hasHistory = (field) => (history.value[field] || []).length > 0
</script>

<template>
  <div class="course-form">
    <header class="course-form__header">
      <button class="course-form__back" @click="goBack">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
      </button>
      <h1 class="course-form__title">{{ isEdit ? '编辑课程' : '添加课程' }}</h1>
      <div style="width: 36px"></div>
    </header>

    <div class="course-form__body">
      <!-- 课程名称 -->
      <div class="form-group">
        <label class="form-label">课程名称 <span class="form-optional">选填</span></label>
        <div class="form-input-wrap">
          <input v-model="form.name" class="form-input" type="text" placeholder="如：高等数学（不填则默认未命名课程）" maxlength="20" />
          <button v-if="hasHistory('name')" class="form-input__picker" @click="openHistoryPicker('name')">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
        </div>
      </div>

      <!-- 上课地点 -->
      <div class="form-group">
        <label class="form-label">上课地点 <span class="form-optional">选填</span></label>
        <div class="form-input-wrap">
          <input v-model="form.location" class="form-input" type="text" placeholder="如：教学楼A-301" maxlength="30" />
          <button v-if="hasHistory('location')" class="form-input__picker" @click="openHistoryPicker('location')">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
        </div>
      </div>

      <!-- 任课教师 -->
      <div class="form-group">
        <label class="form-label">任课教师 <span class="form-optional">选填</span></label>
        <div class="form-input-wrap">
          <input v-model="form.teacher" class="form-input" type="text" placeholder="如：张教授" maxlength="20" />
          <button v-if="hasHistory('teacher')" class="form-input__picker" @click="openHistoryPicker('teacher')">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
        </div>
      </div>

      <!-- 星期选择 -->
      <div class="form-group">
        <label class="form-label">上课星期</label>
        <div class="day-selector">
          <button
            v-for="(day, i) in WEEK_DAYS"
            :key="i"
            class="day-selector__item"
            :class="{ 'day-selector__item--active': form.dayOfWeek === i + 1 }"
            @click="selectDay(i + 1)"
          >{{ day.replace('周', '') }}</button>
        </div>
      </div>

      <!-- 节次选择 -->
      <div class="form-group">
        <div class="form-label-row">
          <label class="form-label">上课节次</label>
          <button class="form-link" @click="openPeriodModal">自定义时间</button>
        </div>
        <div class="period-selector">
          <div class="period-selector__item">
            <span class="period-selector__label">开始</span>
            <select v-model="form.startPeriod" class="form-select">
              <option v-for="p in periods" :key="p.period" :value="p.period">第{{ p.period }}节 ({{ p.start }})</option>
            </select>
          </div>
          <span class="period-selector__dash">—</span>
          <div class="period-selector__item">
            <span class="period-selector__label">结束</span>
            <select v-model="form.endPeriod" class="form-select">
              <option v-for="p in periods" :key="p.period" :value="p.period" :disabled="p.period < form.startPeriod">第{{ p.period }}节 ({{ p.end }})</option>
            </select>
          </div>
        </div>
      </div>

      <!-- 上课周次 -->
      <div class="form-group">
        <label class="form-label">上课周次</label>
        <button class="form-week-btn" @click="openWeekModal">
          <span v-if="form.weeks.length === 0" class="form-week-btn__placeholder">点击选择周次</span>
          <span v-else class="form-week-btn__value">已选 {{ form.weeks.length }} 周</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </div>

      <!-- 颜色选择 -->
      <div class="form-group">
        <label class="form-label">课程颜色</label>
        <div class="color-selector">
          <button
            v-for="c in COURSE_COLORS"
            :key="c.value"
            class="color-selector__item"
            :class="{ 'color-selector__item--active': form.color === c.value }"
            :style="{ background: c.value }"
            :title="c.name"
            @click="selectColor(c.value)"
          >
            <svg v-if="form.color === c.value" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          </button>
        </div>
      </div>

      <button v-if="isEdit" class="form-delete-btn" @click="confirmDelete">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        删除课程
      </button>
    </div>

    <div class="course-form__footer">
      <button class="form-save-btn" :disabled="!isFormValid" @click="save">
        {{ isEdit ? '保存修改' : '添加课程' }}
      </button>
    </div>

    <!-- 历史选择弹窗 -->
    <Transition name="modal">
      <div v-if="showHistoryModal" class="modal-overlay" @click.self="showHistoryModal = false">
        <div class="modal">
          <div class="modal__handle"></div>
          <div class="modal__title">选择{{ historyFieldLabel[historyField] }}</div>

          <div class="history-search">
            <svg class="history-search__icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input v-model="historySearch" class="history-search__input" type="text" placeholder="搜索历史记录..." />
            <button v-if="historySearch" class="history-search__clear" @click="historySearch = ''">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>

          <div class="history-list">
            <div v-if="filteredHistory.length === 0" class="history-list__empty">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><line x1="8" y1="15" x2="16" y2="15"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>
              <span>{{ historySearch ? '没有匹配的记录' : '暂无历史记录' }}</span>
            </div>
            <div
              v-for="(item, index) in filteredHistory"
              :key="item"
              class="history-list__item"
              :style="{ '--stagger-index': index }"
              :class="{ 'history-list__item--active': form[historyField] === item }"
              @click="selectHistoryItem(item)"
            >
              <div class="history-list__left">
                <span class="history-list__icon" v-html="historyFieldIcon[historyField]"></span>
                <span class="history-list__text">{{ item }}</span>
              </div>
              <div class="history-list__right">
                <svg v-if="form[historyField] === item" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                <button class="history-list__delete" @click.stop="removeHistoryItem(historyField, item)">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
            </div>
          </div>

          <button class="modal__confirm-btn" @click="showHistoryModal = false">关闭</button>
        </div>
      </div>
    </Transition>

    <!-- 周次选择弹窗 -->
    <Transition name="modal">
      <div v-if="showWeekModal" class="modal-overlay" @click.self="confirmWeeks">
        <div class="modal">
          <div class="modal__handle"></div>
          <div class="modal__title">选择上课周次</div>
          <div class="modal__quick">
            <button @click="selectWeekRange(1, 16)">1-16周</button>
            <button @click="selectWeekRange(1, 18)">1-18周</button>
            <button @click="form.weeks = []">清空</button>
          </div>
          <div class="week-grid">
            <button v-for="w in 25" :key="w" class="week-grid__item" :class="{ 'week-grid__item--active': form.weeks.includes(w) }" @click="toggleWeek(w)">{{ w }}</button>
          </div>
          <button class="modal__confirm-btn" @click="confirmWeeks">确定</button>
        </div>
      </div>
    </Transition>

    <!-- 自定义时间弹窗 -->
    <Transition name="modal">
      <div v-if="showPeriodModal" class="modal-overlay" @click.self="showPeriodModal = false">
        <div class="modal">
          <div class="modal__handle"></div>
          <div class="modal__title">自定义上课时间</div>
          <div class="period-edit-list">
            <div class="period-edit-tools">
              <span class="period-edit-tools__count">共 {{ periods.length }} 节</span>
              <div class="period-edit-tools__actions">
                <button class="period-edit-tools__btn" @click="addPeriod">增加一节</button>
                <button class="period-edit-tools__btn" :disabled="periods.length <= 1" @click="removeLastPeriod">删除最后一节</button>
              </div>
            </div>
            <div v-for="(p, idx) in periods" :key="idx" class="period-edit-item">
              <span class="period-edit-item__num">第{{ p.period }}节</span>
              <div class="period-edit-item__times">
                <input :value="p.start" class="period-edit-item__input" type="time" @input="updatePeriodTime(idx, 'start', $event.target.value)" />
                <span class="period-edit-item__sep">—</span>
                <input :value="p.end" class="period-edit-item__input" type="time" @input="updatePeriodTime(idx, 'end', $event.target.value)" />
              </div>
            </div>
          </div>
          <button class="modal__confirm-btn" @click="savePeriodSettings">保存</button>
        </div>
      </div>
    </Transition>

    <!-- 删除确认弹窗 -->
    <Transition name="modal">
      <div v-if="showDeleteModal" class="modal-overlay" @click.self="showDeleteModal = false">
        <div class="modal">
          <div class="modal__title">确认删除</div>
          <div class="modal__text">确定要删除「{{ form.name }}」吗？此操作不可撤销。</div>
          <div class="modal__actions">
            <button class="modal__btn modal__btn--cancel" @click="showDeleteModal = false">取消</button>
            <button class="modal__btn modal__btn--danger" @click="doDelete">删除</button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.course-form {
  display: flex;
  flex-direction: column;
  height: 100vh;
  height: 100dvh;
  background: var(--bg-primary);
}

.course-form__header {
  display: flex;
  align-items: center;
  padding: 10px 16px;
  padding-top: max(10px, env(safe-area-inset-top));
  background: var(--glass-bg);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border-bottom: 1px solid var(--glass-border);
  gap: 12px;
  animation: fadeInUp 0.35s cubic-bezier(0.22, 1, 0.36, 1) both;
}

.course-form__back {
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
  transition: background 0.2s;
}

.course-form__back:active { background: var(--bg-hover); }

.course-form__title {
  flex: 1;
  font-size: 17px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
  text-align: center;
}

.course-form__body {
  flex: 1;
  overflow: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  -webkit-overflow-scrolling: touch;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
  animation: fadeInUp 0.4s cubic-bezier(0.22, 1, 0.36, 1) both;
}

/* 交错入场动画 */
.form-group:nth-child(1) { animation-delay: 0.03s; }
.form-group:nth-child(2) { animation-delay: 0.06s; }
.form-group:nth-child(3) { animation-delay: 0.09s; }
.form-group:nth-child(4) { animation-delay: 0.12s; }
.form-group:nth-child(5) { animation-delay: 0.15s; }
.form-group:nth-child(6) { animation-delay: 0.18s; }
.form-group:nth-child(7) { animation-delay: 0.21s; }

.form-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
  padding-left: 2px;
}

.form-optional {
  font-size: 11px;
  font-weight: 400;
  color: var(--text-tertiary);
}

.form-label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.form-link {
  background: none;
  border: none;
  color: var(--accent);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  padding: 0;
  transition: color 0.2s, transform 0.15s;
}

.form-link:active {
  color: var(--accent-hover);
  transform: scale(0.94);
}

.form-input-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.form-input {
  padding: 11px 14px;
  border: 1.5px solid var(--border-secondary);
  border-radius: 10px;
  font-size: 15px;
  color: var(--text-primary);
  background: var(--bg-secondary);
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s, transform 0.2s;
  width: 100%;
  flex: 1;
  padding-right: 40px;
}

.form-input::placeholder { color: var(--text-placeholder); }
.form-input:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px rgba(74, 144, 217, 0.1);
  transform: translateY(-1px);
}

.form-input__picker {
  position: absolute;
  right: 4px;
  top: 50%;
  transform: translateY(-50%);
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: var(--bg-tertiary);
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.15s;
}

.form-input__picker:active {
  background: var(--bg-hover);
}

.day-selector { display: flex; gap: 5px; }

.day-selector__item {
  flex: 1;
  padding: 8px 2px;
  border: 1.5px solid var(--border-secondary);
  border-radius: 10px;
  background: var(--bg-secondary);
  font-size: 13px;
  color: var(--text-tertiary);
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.22, 1, 0.36, 1);
  text-align: center;
  font-weight: 500;
}

.day-selector__item--active {
  border-color: var(--accent);
  background: var(--accent);
  color: #fff;
  box-shadow: 0 2px 8px rgba(74, 144, 217, 0.25);
  transform: scale(1.05);
}

.period-selector { display: flex; align-items: center; gap: 8px; }
.period-selector__item { flex: 1; display: flex; flex-direction: column; gap: 4px; }
.period-selector__label { font-size: 11px; color: var(--text-tertiary); font-weight: 500; }
.period-selector__dash { font-size: 18px; color: var(--text-placeholder); margin-top: 18px; }

.form-select {
  padding: 10px 12px;
  border: 1.5px solid var(--border-secondary);
  border-radius: 10px;
  font-size: 14px;
  color: var(--text-primary);
  background: var(--bg-secondary);
  outline: none;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2395a5a6' stroke-width='2.5' xmlns='http://www.w3.org/2000/svg'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  padding-right: 32px;
  width: 100%;
}

.form-select:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px rgba(74, 144, 217, 0.1);
}

.form-week-btn {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 11px 14px;
  border: 1.5px solid var(--border-secondary);
  border-radius: 10px;
  background: var(--bg-secondary);
  color: var(--text-secondary);
  cursor: pointer;
  transition: border-color 0.2s, transform 0.15s, box-shadow 0.2s;
}

.form-week-btn:active {
  border-color: var(--accent);
  transform: scale(0.99);
  box-shadow: 0 2px 8px rgba(74, 144, 217, 0.12);
}
.form-week-btn__placeholder { font-size: 15px; color: var(--text-placeholder); }
.form-week-btn__value { font-size: 15px; color: var(--accent); font-weight: 600; }

.color-selector { display: flex; gap: 8px; flex-wrap: wrap; }

.color-selector__item {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  border: 2.5px solid transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.25s cubic-bezier(0.22, 1, 0.36, 1), border-color 0.2s, box-shadow 0.2s;
}

.color-selector__item--active {
  border-color: var(--text-primary);
  transform: scale(1.2);
  box-shadow: 0 3px 12px rgba(0,0,0,0.2);
}

.color-selector__item:active {
  transform: scale(0.9);
}

.form-delete-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 12px;
  border: 1.5px solid var(--danger-border);
  border-radius: 10px;
  background: var(--danger-bg);
  color: var(--danger);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  margin-top: 8px;
  transition: transform 0.15s, background 0.2s;
}

.form-delete-btn:active {
  transform: scale(0.98);
  background: rgba(231, 76, 60, 0.12);
}

.course-form__footer {
  padding: 12px 16px;
  padding-bottom: max(12px, env(safe-area-inset-bottom));
  background: var(--glass-bg);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border-top: 1px solid var(--glass-border);
  position: relative;
  z-index: 6;
  animation: fadeInUp 0.38s cubic-bezier(0.22, 1, 0.36, 1) 0.06s both;
}

.form-save-btn {
  width: 100%;
  padding: 14px 0;
  border: none;
  border-radius: 12px;
  background: linear-gradient(135deg, var(--accent), var(--accent-hover));
  color: #fff;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s, transform 0.2s, box-shadow 0.2s;
  box-shadow: 0 4px 16px rgba(74, 144, 217, 0.3);
  position: relative;
  overflow: hidden;
}

.form-save-btn::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, transparent 30%, rgba(255,255,255,0.15) 50%, transparent 70%);
  transform: translateX(-100%);
  transition: transform 0.6s ease;
}
.form-save-btn:not(:disabled):hover::after {
  transform: translateX(100%);
}

.form-save-btn:disabled { opacity: 0.45; cursor: not-allowed; box-shadow: none; }
.form-save-btn:not(:disabled):active { transform: scale(0.97); box-shadow: 0 2px 8px rgba(74, 144, 217, 0.2); }

/* ========== 弹窗 ========== */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: var(--modal-overlay);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 0 16px;
}

.modal {
  background: var(--modal-bg);
  border-radius: 20px;
  padding: 20px 20px 24px;
  width: 100%;
  max-width: 400px;
  max-height: 80vh;
  overflow: auto;
  animation: modalSpringIn 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.modal__handle {
  width: 36px;
  height: 4px;
  border-radius: 2px;
  background: var(--border-secondary);
  margin: 0 auto 16px;
}

@keyframes modalSpringIn {
  0% { transform: translateY(40px) scale(0.9); opacity: 0; }
  60% { transform: translateY(-4px) scale(1.01); opacity: 1; }
  100% { transform: translateY(0) scale(1); opacity: 1; }
}

.modal__title { font-size: 17px; font-weight: 700; color: var(--text-primary); margin-bottom: 16px; }
.modal__text { font-size: 14px; color: var(--text-secondary); line-height: 1.5; margin-bottom: 20px; }
.modal__actions { display: flex; gap: 10px; }

.modal__btn {
  flex: 1;
  padding: 11px 0;
  border: none;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
}

.modal__btn--cancel { background: var(--bg-tertiary); color: var(--text-secondary); }
.modal__btn--danger { background: var(--danger); color: #fff; }

.modal__quick { display: flex; gap: 8px; margin-bottom: 14px; }
.modal__quick button {
  padding: 6px 14px;
  border: 1.5px solid var(--border-secondary);
  border-radius: 8px;
  background: var(--bg-secondary);
  font-size: 13px;
  color: var(--accent);
  cursor: pointer;
  font-weight: 500;
}
.modal__quick button:active { background: var(--bg-tertiary); }

.week-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px; margin-bottom: 16px; }

.week-grid__item {
  padding: 8px 0;
  border: 1.5px solid var(--border-secondary);
  border-radius: 8px;
  background: var(--bg-secondary);
  font-size: 13px;
  color: var(--text-tertiary);
  cursor: pointer;
  transition: all 0.15s;
  text-align: center;
  font-weight: 500;
}

.week-grid__item:active {
  transform: scale(0.94);
}

.week-grid__item--active { border-color: var(--accent); background: var(--accent); color: #fff; }

.modal__confirm-btn {
  width: 100%;
  padding: 12px 0;
  border: none;
  border-radius: 10px;
  background: var(--accent);
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
  margin-top: 12px;
}
.modal__confirm-btn:active { background: var(--accent-hover); }

.period-edit-list { display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; max-height: 50vh; overflow: auto; }
.period-edit-tools { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 0 2px 4px; }
.period-edit-tools__count { font-size: 12px; color: var(--text-tertiary); white-space: nowrap; }
.period-edit-tools__actions { display: flex; gap: 6px; min-width: 0; }
.period-edit-tools__btn { padding: 6px 9px; border: 1.5px solid var(--border-secondary); border-radius: 8px; background: var(--bg-secondary); color: var(--accent); font-size: 12px; font-weight: 600; cursor: pointer; }
.period-edit-tools__btn:disabled { color: var(--text-placeholder); cursor: not-allowed; opacity: 0.55; }
.period-edit-item { display: grid; grid-template-columns: max-content minmax(0, 1fr); align-items: center; gap: 10px; }
.period-edit-item__num { font-size: 13px; font-weight: 600; color: var(--text-secondary); min-width: 44px; white-space: nowrap; }
.period-edit-item__times { display: grid; grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr); align-items: center; gap: 6px; min-width: 0; }
.period-edit-item__input { width: 100%; min-width: 0; box-sizing: border-box; padding: 6px 8px; border: 1.5px solid var(--border-secondary); border-radius: 8px; font-size: 13px; color: var(--text-primary); background: var(--bg-secondary); outline: none; font-variant-numeric: tabular-nums; text-align: center; }
.period-edit-item__input:focus { border-color: var(--accent); }
.period-edit-item__sep { color: var(--text-placeholder); font-size: 14px; }

/* ========== 历史选择弹窗 ========== */
.history-search {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--bg-tertiary);
  border-radius: 12px;
  margin-bottom: 12px;
}

.history-search__icon { flex-shrink: 0; }

.history-search__input {
  flex: 1;
  border: none;
  background: transparent;
  font-size: 14px;
  color: var(--text-primary);
  outline: none;
}

.history-search__input::placeholder { color: var(--text-placeholder); }

.history-search__clear {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: var(--border-secondary);
  border-radius: 50%;
  cursor: pointer;
  transition: background 0.15s;
}

.history-search__clear:active { background: var(--bg-hover); }

.history-list {
  max-height: 45vh;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 2px;
  -webkit-overflow-scrolling: touch;
}

.history-list__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 32px 0;
  color: var(--text-tertiary);
  font-size: 13px;
}

.history-list__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  border-radius: 12px;
  cursor: pointer;
  transition: background 0.15s;
  animation: fadeInUp 0.32s cubic-bezier(0.22, 1, 0.36, 1) both;
  animation-delay: calc(var(--stagger-index, 0) * 0.03s);
}

.history-list__item:active { background: var(--bg-active); }
.history-list__item--active { background: var(--accent-light); }

.history-list__left {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  flex: 1;
}

.history-list__icon {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.history-list__text {
  font-size: 15px;
  color: var(--text-primary);
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.history-list__item--active .history-list__text { color: var(--accent); }

.history-list__right {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
  margin-left: 8px;
}

.history-list__delete {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.15s;
}

.history-list__delete:active { background: var(--danger-bg); }

.modal-enter-active, .modal-leave-active { transition: opacity 0.2s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
</style>
