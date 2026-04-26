<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { parsePdfTimetable } from '../utils/pdfParser'
import { saveCourses, loadCourses, addCourse } from '../utils/storage'
import { WEEK_DAYS, COURSE_COLORS } from '../utils/schedule'

const router = useRouter()

// 步骤: 1=选文件 2=解析中 3=预览确认
const step = ref(1)
const file = ref(null)
const parsing = ref(false)
const parsedCourses = ref([])
const warnings = ref([])
const errors = ref([])
const dragOver = ref(false)
const rawText = ref('')
const showRawText = ref(false)

// 周次设置
const defaultWeeks = ref(Array.from({ length: 16 }, (_, i) => i + 1))
const weekMode = ref('16') // '16' | '18' | 'custom'
const showWeekPicker = ref(false)

// 展开的课程卡片
const expandedCards = ref(new Set())

// ========== 文件选择 ==========

function onFileSelect(e) {
  const selectedFile = e.target.files?.[0]
  if (selectedFile) {
    if (selectedFile.type === 'application/pdf' || selectedFile.name.endsWith('.pdf')) {
      file.value = selectedFile
      startParse()
    } else {
      errors.value = ['请选择 PDF 格式的文件']
    }
  }
}

function onDrop(e) {
  dragOver.value = false
  const droppedFile = e.dataTransfer?.files?.[0]
  if (droppedFile) {
    if (droppedFile.type === 'application/pdf' || droppedFile.name.endsWith('.pdf')) {
      file.value = droppedFile
      startParse()
    } else {
      errors.value = ['请选择 PDF 格式的文件']
    }
  }
}

function onDragOver(e) {
  e.preventDefault()
  dragOver.value = true
}

function onDragLeave() {
  dragOver.value = false
}

function removeFile() {
  file.value = null
  step.value = 1
  parsedCourses.value = []
  warnings.value = []
  errors.value = []
}

function triggerInput() {
  document.getElementById('pdf-input')?.click()
}

// ========== 解析逻辑 ==========

async function startParse() {
  if (!file.value) return
  step.value = 2
  parsing.value = true
  warnings.value = []
  errors.value = []

  try {
    const result = await parsePdfTimetable(file.value)
    parsedCourses.value = result.courses || []
    rawText.value = result.rawText || ''

    if (!result.success && result.warnings.length > 0) {
      errors.value = result.warnings
    }
    if (result.warnings && result.warnings.length > 0) {
      warnings.value = result.warnings
    }

    // 默认展开所有卡片
    expandedCards.value = new Set(parsedCourses.value.map((_, i) => i))

    step.value = 3
  } catch (err) {
    errors.value = [`解析过程出错: ${err.message}`]
    step.value = 3
  }

  parsing.value = false
}

// ========== 课程编辑 ==========

function toggleCard(index) {
  if (expandedCards.value.has(index)) {
    expandedCards.value.delete(index)
  } else {
    expandedCards.value.add(index)
  }
}

function removeCourse(index) {
  parsedCourses.value.splice(index, 1)
  expandedCards.value.delete(index)
  // 重新索引展开状态
  const newExpanded = new Set()
  for (const idx of expandedCards.value) {
    if (idx < parsedCourses.value.length) newExpanded.add(idx)
    else if (idx > 0) newExpanded.add(idx - 1)
  }
  expandedCards.value = newExpanded
}

function updateCourseColor(index, color) {
  if (parsedCourses.value[index]) {
    parsedCourses.value[index].color = color
  }
}

// ========== 周次设置 ==========

function setWeekRange(mode) {
  weekMode.value = mode
  if (mode === '16') {
    defaultWeeks.value = Array.from({ length: 16 }, (_, i) => i + 1)
  } else if (mode === '18') {
    defaultWeeks.value = Array.from({ length: 18 }, (_, i) => i + 1)
  }
}

function toggleWeek(week) {
  const idx = defaultWeeks.value.indexOf(week)
  if (idx !== -1) {
    defaultWeeks.value.splice(idx, 1)
  } else {
    defaultWeeks.value.push(week)
  }
  defaultWeeks.value.sort((a, b) => a - b)
}

function openWeekPicker() {
  showWeekPicker.value = true
}

function applyWeeksToAll() {
  for (const course of parsedCourses.value) {
    course.weeks = [...defaultWeeks.value]
  }
}

// ========== 确认导入 ==========

async function confirmImport() {
  // 将周次应用到未设置周次的课程（已有周次的保留 PDF 解析的原始值）
  for (const course of parsedCourses.value) {
    if (!course.weeks || course.weeks.length === 0) {
      course.weeks = [...defaultWeeks.value]
    }
  }

  const existing = loadCourses() || []
  let addedCount = 0

  for (const courseData of parsedCourses.value) {
    addCourse({
      name: courseData.name,
      location: courseData.location,
      teacher: courseData.teacher,
      dayOfWeek: courseData.dayOfWeek,
      startPeriod: courseData.startPeriod,
      endPeriod: courseData.endPeriod,
      weeks: courseData.weeks,
      color: courseData.color
    })
    addedCount++
  }

  alert(`成功导入 ${addedCount} 门课程！`)
  router.push('/')
}

function goBack() {
  router.back()
}

// ========== 计算属性 ==========

const hasCourses = computed(() => parsedCourses.value.length > 0)

const fileName = computed(() => file.value ? file.value.name : '')

const fileSize = computed(() => {
  if (!file.value) return ''
  const size = file.value.size
  if (size < 1024) return size + ' B'
  if (size < 1024 * 1024) return Math.round(size / 1024) + ' KB'
  return (size / (1024 * 1024)).toFixed(1) + ' MB'
})
</script>

<template>
  <div class="import-page">
    <!-- 顶部导航栏 -->
    <header class="import-page__header">
      <button class="import-page__back" @click="goBack">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
      </button>
      <h1 class="import-page__title">导入课表</h1>
      <div style="width: 36px"></div>
    </header>

    <div class="import-page__body">
      <!-- 步骤 1：文件选择 -->
      <section v-if="step === 1" class="step-section">
        <div
          class="drop-zone"
          :class="{ 'drop-zone--active': dragOver }"
          @click="triggerInput"
          @drop.prevent="onDrop"
          @dragover.prevent="onDragOver"
          @dragleave.prevent="onDragLeave"
        >
          <svg class="drop-zone__icon" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="12" y1="11" x2="12" y2="17"/>
            <line x1="9" y1="14" x2="15" y2="14"/>
          </svg>
          <p class="drop-zone__text">点击或拖拽上传课表 PDF</p>
          <p class="drop-zone__hint">仅支持教务系统导出的标准课表 PDF 文件</p>
          <input id="pdf-input" type="file" accept=".pdf,application/pdf" hidden @change="onFileSelect" />
        </div>

        <!-- 已选文件 -->
        <div v-if="file" class="file-info">
          <div class="file-info__icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
            </svg>
          </div>
          <div class="file-info__detail">
            <span class="file-info__name">{{ fileName }}</span>
            <span class="file-info__size">{{ fileSize }}</span>
          </div>
          <button class="file-info__remove" @click="removeFile">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <!-- 错误提示 -->
        <div v-if="errors.length > 0" class="error-list">
          <div v-for="(err, i) in errors" :key="i" class="error-item">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            {{ err }}
          </div>
        </div>
      </section>

      <!-- 步骤 2：解析中 -->
      <section v-if="step === 2" class="step-section step-section--center">
        <div class="spinner"></div>
        <p class="parsing-text">正在解析课表...</p>
        <p class="parsing-hint">请稍候，这可能需要几秒钟</p>
      </section>

      <!-- 步骤 3：预览确认 -->
      <section v-if="step === 3" class="step-section">
        <!-- 结果摘要 -->
        <div v-if="hasCourses" class="result-summary result-summary--success">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#27AE60" stroke-width="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          <span>已识别 <strong>{{ parsedCourses.length }}</strong> 门课程</span>
        </div>

        <div v-if="!hasCourses && errors.length > 0" class="result-summary result-summary--error">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#E74C3C" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
          <span>未能识别课程信息</span>
        </div>

        <!-- 警告列表 -->
        <div v-if="warnings.length > 0" class="warning-list">
          <div v-for="(w, i) in warnings" :key="i" class="warning-item">{{ w }}</div>
        </div>

        <!-- 课程预览列表 -->
        <div v-if="hasCourses" class="course-preview-list">
          <div
            v-for="(course, index) in parsedCourses"
            :key="index"
            class="course-card"
            :style="{ '--stagger-index': index }"
          >
            <!-- 卡片头部 -->
            <div class="course-card__header" @click="toggleCard(index)">
              <div class="course-card__left">
                <span class="course-card__dot" :style="{ background: course.color }"></span>
                <span class="course-card__name">{{ course.name }}</span>
              </div>
              <div class="course-card__right">
                <span class="course-card__time-badge">
                  {{ WEEK_DAYS[course.dayOfWeek - 1] }} 第{{ course.startPeriod }}{{ course.endPeriod !== course.startPeriod ? '-' + course.endPeriod : '' }}节
                  <template v-if="course.weeks && course.weeks.length > 0">
                    · {{ course.weeks[0] }}-{{ course.weeks[course.weeks.length - 1] }}周
                  </template>
                </span>
                <button class="course-card__delete" @click.stop="removeCourse(index)">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                </button>
                <svg class="course-card__arrow" :class="{ 'course-card__arrow--open': expandedCards.has(index) }" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
              </div>
            </div>

            <!-- 卡片详情（可折叠） -->
            <Transition name="expand">
              <div v-if="expandedCards.has(index)" class="course-card__body">
                <div class="form-field">
                  <label class="form-label">课程名称</label>
                  <input class="form-input" type="text" v-model="parsedCourses[index].name" placeholder="未命名课程" maxlength="20" />
                </div>
                <div class="form-row">
                  <div class="form-field form-field--half">
                    <label class="form-label">上课地点</label>
                    <input class="form-input" type="text" v-model="parsedCourses[index].location" placeholder="如：教学楼A-301" maxlength="30" />
                  </div>
                  <div class="form-field form-field--half">
                    <label class="form-label">任课教师</label>
                    <input class="form-input" type="text" v-model="parsedCourses[index].teacher" placeholder="如：张教授" maxlength="20" />
                  </div>
                </div>
                <div class="form-row">
                  <div class="form-field form-field--half">
                    <label class="form-label">星期</label>
                    <select class="form-select" v-model="parsedCourses[index].dayOfWeek">
                      <option v-for="(day, i) in WEEK_DAYS" :key="i" :value="i + 1">{{ day }}</option>
                    </select>
                  </div>
                  <div class="form-field form-field--half form-field--inline">
                    <label class="form-label">节次</label>
                    <div class="period-range">
                      <select class="form-select form-select--sm" v-model="parsedCourses[index].startPeriod">
                        <option v-for="p in 12" :key="p" :value="p">{{ p }}</option>
                      </select>
                      <span class="period-sep">—</span>
                      <select class="form-select form-select--sm" v-model="parsedCourses[index].endPeriod">
                        <option v-for="p in 12" :key="p" :value="p" :disabled="p < parsedCourses[index].startPeriod">{{ p }}</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div class="form-field">
                  <label class="form-label">颜色</label>
                  <div class="color-picker">
                    <button
                      v-for="c in COURSE_COLORS"
                      :key="c.value"
                      class="color-dot"
                      :class="{ 'color-dot--active': course.color === c.value }"
                      :style="{ background: c.value }"
                      :title="c.name"
                      @click="updateCourseColor(index, c.value)"
                    >
                      <svg v-if="course.color === c.value" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
                    </button>
                  </div>
                </div>
                <div class="form-field" v-if="course.weeks && course.weeks.length > 0">
                  <label class="form-label">周次</label>
                  <span class="form-weeks-info">{{ course.weeks[0] }}-{{ course.weeks[course.weeks.length - 1] }}周（共{{ course.weeks.length }}周）</span>
                </div>
              </div>
            </Transition>
          </div>
        </div>

        <!-- 原始提取文本（调试用） -->
        <div v-if="rawText" class="raw-text-section">
          <button class="raw-text-toggle" @click="showRawText = !showRawText">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
            解析原始文本（点击{{ showRawText ? '收起' : '展开' }}）
          </button>
          <div v-if="showRawText" class="raw-text-content">{{ rawText }}</div>
        </div>

        <!-- 无结果时的重试区域 -->
        <div v-if="!hasCourses" class="retry-area">
          <button class="btn-retry" @click="step = 1; removeFile()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
            重新选择文件
          </button>
          <button class="btn-manual" @click="router.push('/course/add')">
            手动添加课程
          </button>
        </div>

        <!-- 周次设置（有课程时显示） -->
        <div v-if="hasCourses" class="week-setting">
          <label class="week-setting__label">上课周次（统一覆盖）</label>
          <div class="week-setting__quick">
            <button :class="{ active: weekMode === '16' }" @click="setWeekRange('16')">1-16 周</button>
            <button :class="{ active: weekMode === '18' }" @click="setWeekRange('18')">1-18 周</button>
            <button :class="{ active: weekMode === 'custom' }" @click="setWeekRange('custom'); openWeekPicker()">自定义</button>
          </div>
          <div class="week-setting__actions">
            <p class="week-setting__count">已选 {{ defaultWeeks.length }} 周</p>
            <button class="week-setting__apply" @click="applyWeeksToAll">应用到所有课程</button>
          </div>
        </div>
      </section>
    </div>

    <!-- 底部操作栏 -->
    <footer v-if="step === 3" class="import-page__footer">
      <button class="btn-cancel" @click="goBack">取消</button>
      <button class="btn-confirm" :disabled="!hasCourses" @click="confirmImport">
        确认导入{{ hasCourses ? ` (${parsedCourses.length}门)` : '' }}
      </button>
    </footer>

    <!-- 自定义周次弹窗 -->
    <Transition name="modal">
      <div v-if="showWeekPicker" class="modal-overlay" @click.self="showWeekPicker = false">
        <div class="modal">
          <div class="modal__handle"></div>
          <div class="modal__title">自定义周次</div>
          <div class="week-grid">
            <button v-for="w in 25" :key="w" class="week-grid__item" :class="{ active: defaultWeeks.includes(w) }" @click="toggleWeek(w)">{{ w }}</button>
          </div>
          <button class="modal__btn-close" @click="showWeekPicker = false">完成</button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.import-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  height: 100dvh;
  background: var(--bg-primary);
}

.import-page__header {
  display: flex;
  align-items: center;
  padding: 10px 16px;
  padding-top: max(10px, env(safe-area-inset-top));
  background: var(--glass-bg);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border-bottom: 1px solid var(--glass-border);
  gap: 12px;
  flex-shrink: 0;
  animation: fadeInUp 0.35s cubic-bezier(0.22, 1, 0.36, 1) both;
}

.import-page__back {
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
  transition: background 0.2s, transform 0.15s;
}
.import-page__back:active {
  background: var(--bg-hover);
  transform: scale(0.92);
}

.import-page__title {
  flex: 1;
  font-size: 17px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
  text-align: center;
}

.import-page__body {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  -webkit-overflow-scrolling: touch;
  padding-bottom: 80px;
}

/* 步骤区块 */
.step-section {
  display: flex;
  flex-direction: column;
  gap: 14px;
  animation: fadeInUp 0.38s cubic-bezier(0.22, 1, 0.36, 1) both;
}
.step-section--center {
  justify-content: center;
  align-items: center;
  min-height: 50vh;
  gap: 12px;
}

/* 拖拽上传区 */
.drop-zone {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 24px;
  border: 2px dashed var(--border-secondary);
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.25s ease;
  background: var(--bg-secondary);
  gap: 8px;
}

.drop-zone:hover, .drop-zone--active {
  border-color: var(--accent);
  background: var(--accent-light);
  transform: scale(1.01);
}

.drop-zone__icon { color: var(--text-placeholder); transition: color 0.25s; }
.drop-zone:hover .drop-zone__icon { color: var(--accent); }
.drop-zone__text { font-size: 15px; font-weight: 600; color: var(--text-secondary); }
.drop-zone__hint { font-size: 12px; color: var(--text-tertiary); }

/* 文件信息 */
.file-info {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  background: var(--bg-secondary);
  border: 1.5px solid var(--accent);
  border-radius: 12px;
}
.file-info__icon { color: var(--accent); flex-shrink: 0; }
.file-info__detail { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.file-info__name { font-size: 14px; font-weight: 500; color: var(--text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.file-info__size { font-size: 11px; color: var(--text-tertiary); }
.file-info__remove { width: 28px; height: 28px; border: none; background: var(--bg-tertiary); border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; color: var(--text-tertiary); flex-shrink: 0; transition: background 0.15s, transform 0.15s; }
.file-info__remove:active { background: var(--danger-bg); color: var(--danger); transform: scale(0.9); }

/* 错误列表 */
.error-list { display: flex; flex-direction: column; gap: 6px; }
.error-item {
  display: flex; align-items: center; gap: 8px; padding: 10px 12px;
  background: var(--danger-bg); border: 1px solid var(--danger-border); border-radius: 10px;
  font-size: 13px; color: var(--danger); line-height: 1.4;
}
.error-item svg { flex-shrink: 0; }

/* 解析动画 */
.spinner {
  width: 44px; height: 44px; border: 3.5px solid var(--border-secondary);
  border-top-color: var(--accent); border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
.parsing-text { font-size: 15px; font-weight: 600; color: var(--text-primary); }
.parsing-hint { font-size: 13px; color: var(--text-tertiary); }

/* 结果摘要 */
.result-summary {
  display: flex; align-items: center; gap: 8px; padding: 12px 14px;
  border-radius: 12px; font-size: 14px; font-weight: 500;
}
.result-summary--success { background: rgba(39, 174, 96, 0.08); color: #1E8449; }
.result-summary--error { background: var(--danger-bg); color: var(--danger); }
.result-summary strong { font-weight: 700; }

/* 警告列表 */
.warning-list { display: flex; flex-direction: column; gap: 6px; }
.warning-item {
  padding: 8px 12px; background: rgba(243, 156, 18, 0.06);
  border-left: 3px solid #F39C12; border-radius: 0 8px 8px 0;
  font-size: 12px; color: #B7950B; line-height: 1.5;
}

/* 课程预览 */
.course-preview-list { display: flex; flex-direction: column; gap: 10px; }

.course-card {
  background: var(--bg-secondary); border-radius: 14px;
  overflow: hidden; border: 1px solid var(--border-primary);
  transition: box-shadow 0.2s;
  animation: fadeInUp 0.38s cubic-bezier(0.22, 1, 0.36, 1) both;
  animation-delay: calc(var(--stagger-index, 0) * 0.04s);
}
.course-card:active { box-shadow: var(--shadow-card); }

.course-card__header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 14px; cursor: pointer; gap: 8px;
}
.course-card__left { display: flex; align-items: center; gap: 8px; min-width: 0; flex: 1; }
.course-card__dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
.course-card__name { font-size: 14px; font-weight: 600; color: var(--text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.course-card__right { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
.course-card__time-badge {
  padding: 3px 8px; background: var(--accent-light); color: var(--accent);
  border-radius: 6px; font-size: 11px; font-weight: 600; white-space: nowrap;
}
.course-card__delete {
  width: 26px; height: 26px; border: none; background: transparent; border-radius: 6px;
  cursor: pointer; display: flex; align-items: center; justify-content: center;
  color: var(--text-tertiary); transition: all 0.15s;
}
.course-card__delete:active { background: var(--danger-bg); color: var(--danger); transform: scale(0.9); }
.course-card__arrow {
  color: var(--text-tertiary); transition: transform 0.25s; flex-shrink: 0;
}
.course-card__arrow--open { transform: rotate(180deg); }

/* 卡片详情 */
.course-card__body {
  padding: 0 14px 14px; display: flex; flex-direction: column; gap: 12px;
  border-top: 1px solid var(--border-primary); margin-top: 0; padding-top: 12px;
}

.expand-enter-active, .expand-leave-active { transition: all 0.25s ease; overflow: hidden; }
.expand-enter-from, .expand-leave-to { opacity: 0; max-height: 0; padding-top: 0; margin-top: 0; }

/* 表单字段 */
.form-field { display: flex; flex-direction: column; gap: 5px; }
.form-field--half { flex: 1; min-width: 0; }
.form-row { display: flex; gap: 10px; }
.form-label { font-size: 12px; font-weight: 600; color: var(--text-secondary); padding-left: 1px; }

.form-input {
  padding: 9px 12px; border: 1.5px solid var(--border-secondary); border-radius: 10px;
  font-size: 14px; color: var(--text-primary); background: var(--bg-primary);
  outline: none; transition: border-color 0.2s, box-shadow 0.2s; width: 100%;
}
.form-input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(74,144,217,0.1); }
.form-input::placeholder { color: var(--text-placeholder); }

.form-select {
  padding: 9px 12px; border: 1.5px solid var(--border-secondary); border-radius: 10px;
  font-size: 14px; color: var(--text-primary); background: var(--bg-primary);
  outline: none; appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2395a5a6' stroke-width='2.5'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
  background-repeat: no-repeat; background-position: right 10px center; padding-right: 28px;
}
.form-select:focus { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(74,144,217,0.1); }
.form-select--sm { padding: 6px 8px; font-size: 13px; background-position: right 6px center; padding-right: 24px; }

.form-field--inline { display: flex; flex-direction: row; align-items: center; gap: 8px; }
.form-field--inline .form-label { flex-shrink: 0; }
.period-range { display: flex; align-items: center; gap: 4px; flex: 1; }
.period-sep { color: var(--text-placeholder); font-size: 13px; }

/* 周次信息 */
.form-weeks-info { font-size: 13px; color: var(--text-secondary); font-weight: 500; }

/* 颜色选择 */
.color-picker { display: flex; gap: 6px; flex-wrap: wrap; }
.color-dot {
  width: 26px; height: 26px; border-radius: 8px; border: 2px solid transparent;
  cursor: pointer; display: flex; align-items: center; justify-content: center;
  transition: transform 0.15s, border-color 0.15s;
}
.color-dot--active { border-color: var(--text-primary); transform: scale(1.15); box-shadow: 0 2px 8px rgba(0,0,0,0.15); }

/* 原始文本调试 */
.raw-text-section { margin-top: 4px; }
.raw-text-toggle {
  display: flex; align-items: center; gap: 6px; padding: 8px 0;
  border: none; background: transparent; color: var(--text-tertiary);
  font-size: 12px; cursor: pointer; width: 100%;
}
.raw-text-toggle svg { transition: transform 0.25s; }
.raw-text-content {
  margin-top: 6px; padding: 10px; background: var(--bg-tertiary);
  border-radius: 8px; font-size: 11px; color: var(--text-tertiary);
  line-height: 1.5; max-height: 200px; overflow-y: auto;
  word-break: break-all; font-family: monospace; white-space: pre-wrap;
}

/* 重试区域 */
.retry-area { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 32px 0; }
.btn-retry {
  display: flex; align-items: center; gap: 6px; padding: 11px 20px;
  border: 1.5px solid var(--accent); border-radius: 10px;
  background: transparent; color: var(--accent); font-size: 14px; font-weight: 600;
  cursor: pointer; transition: background 0.2s;
}
.btn-retry:active { background: var(--accent-light); }
.btn-manual {
  padding: 10px 20px; border: none; border-radius: 10px;
  background: var(--bg-tertiary); color: var(--text-secondary);
  font-size: 13px; cursor: pointer;
}
.btn-manual:active { background: var(--bg-hover); }

/* 周次设置 */
.week-setting { padding: 14px; background: var(--bg-secondary); border-radius: 14px; display: flex; flex-direction: column; gap: 10px; }
.week-setting__label { font-size: 13px; font-weight: 600; color: var(--text-secondary); }
.week-setting__quick { display: flex; gap: 8px; }
.week-setting__quick button {
  padding: 6px 14px; border: 1.5px solid var(--border-secondary); border-radius: 8px;
  background: var(--bg-primary); color: var(--text-secondary); font-size: 13px;
  cursor: pointer; transition: all 0.15s; font-weight: 500;
}
.week-setting__quick button.active { border-color: var(--accent); background: var(--accent-light); color: var(--accent); }
.week-setting__quick button:active { background: var(--bg-hover); }
.week-setting__actions { display: flex; align-items: center; justify-content: space-between; }
.week-setting__count { font-size: 12px; color: var(--text-tertiary); }
.week-setting__apply {
  padding: 5px 12px; border: 1.5px solid var(--accent); border-radius: 8px;
  background: var(--accent-light); color: var(--accent); font-size: 12px;
  font-weight: 600; cursor: pointer; transition: all 0.15s;
}
.week-setting__apply:active { background: var(--accent); color: #fff; transform: scale(0.95); }

/* 底部操作栏 */
.import-page__footer {
  position: fixed; bottom: 0; left: 0; right: 0;
  display: flex; gap: 10px; padding: 12px 16px;
  padding-bottom: max(12px, env(safe-area-inset-bottom));
  background: var(--glass-bg); border-top: 1px solid var(--glass-border);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  z-index: 10;
}
.btn-cancel {
  flex: 1; padding: 13px 0; border: 1.5px solid var(--border-secondary);
  border-radius: 12px; background: var(--bg-primary); color: var(--text-secondary);
  font-size: 15px; font-weight: 600; cursor: pointer; transition: background 0.15s;
}
.btn-cancel:active { background: var(--bg-hover); }
.btn-confirm {
  flex: 2; padding: 13px 0; border: none; border-radius: 12px;
  background: linear-gradient(135deg, var(--accent), var(--accent-hover));
  color: #fff; font-size: 15px; font-weight: 600; cursor: pointer;
  box-shadow: 0 4px 16px rgba(74,144,217,0.3); transition: opacity 0.2s, transform 0.15s;
}
.btn-confirm:not(:disabled):active { transform: scale(0.98); }
.btn-confirm:disabled { opacity: 0.45; cursor: not-allowed; box-shadow: none; }

/* 弹窗 */
.modal-overlay {
  position: fixed; inset: 0; background: var(--modal-overlay);
  backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
  display: flex; align-items: center; justify-content: center; z-index: 100; padding: 0 16px;
}
.modal {
  background: var(--modal-bg); border-radius: 20px; padding: 20px 20px 24px;
  width: 100%; max-width: 400px; animation: modalSpringIn 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}
@keyframes modalSpringIn {
  0% { transform: translateY(40px) scale(0.9); opacity: 0; }
  60% { transform: translateY(-4px) scale(1.01); opacity: 1; }
  100% { transform: translateY(0) scale(1); opacity: 1; }
}
.modal__handle {
  width: 36px; height: 4px; border-radius: 2px; background: var(--border-secondary); margin: 0 auto 16px;
}
.modal__title { font-size: 17px; font-weight: 700; color: var(--text-primary); margin-bottom: 16px; }

.week-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px; margin-bottom: 16px; }
.week-grid__item {
  padding: 8px 0; border: 1.5px solid var(--border-secondary); border-radius: 8px;
  background: var(--bg-secondary); font-size: 13px; color: var(--text-tertiary);
  cursor: pointer; transition: all 0.15s; text-align: center; font-weight: 500;
}
.week-grid__item.active { border-color: var(--accent); background: var(--accent); color: #fff; }
.modal__btn-close {
  width: 100%; padding: 12px 0; border: none; border-radius: 10px;
  background: var(--accent); color: #fff; font-size: 15px; font-weight: 600;
  cursor: pointer; transition: background 0.2s;
}
.modal__btn-close:active { background: var(--accent-hover); }

.modal-enter-active, .modal-leave-active { transition: opacity 0.2s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
</style>
