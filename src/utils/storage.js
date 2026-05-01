const STORAGE_KEY = 'timetable_data'
const HISTORY_KEY = 'timetable_history'
const PERIODS_KEY = 'timetable_periods'
const SEMESTER_START_KEY = 'timetable_semester_start'
const CELL_HEIGHT_KEY = 'timetable_cell_height'
export const COURSES_CHANGED_EVENT = 'yunke:courses-changed'
export const PERIODS_CHANGED_EVENT = 'yunke:periods-changed'

const LEGACY_DEFAULT_PERIODS = [
  { period: 1, start: '08:00', end: '08:45' },
  { period: 2, start: '08:55', end: '09:40' },
  { period: 3, start: '10:00', end: '10:45' },
  { period: 4, start: '10:55', end: '11:40' },
  { period: 5, start: '14:00', end: '14:45' },
  { period: 6, start: '14:55', end: '15:40' },
  { period: 7, start: '16:00', end: '16:45' },
  { period: 8, start: '16:55', end: '17:40' },
  { period: 9, start: '19:00', end: '19:45' },
  { period: 10, start: '19:55', end: '20:40' },
  { period: 11, start: '20:50', end: '21:35' },
  { period: 12, start: '21:45', end: '22:30' }
]

function isLegacyDefaultPeriods(periods) {
  if (!Array.isArray(periods) || periods.length !== LEGACY_DEFAULT_PERIODS.length) return false
  return periods.every((period, index) => {
    const legacy = LEGACY_DEFAULT_PERIODS[index]
    return period.period === legacy.period && period.start === legacy.start && period.end === legacy.end
  })
}

// ========== 课程数据 ==========

export function loadCourses() {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    return data ? JSON.parse(data) : null
  } catch {
    return null
  }
}

export function saveCourses(courses) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(courses))
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(COURSES_CHANGED_EVENT, { detail: courses }))
  }
}

export function addCourse(course) {
  const courses = loadCourses() || []
  course.id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
  courses.push(course)
  saveCourses(courses)
  // 记录历史（仅非空值）
  if (course.name && course.name.trim() && course.name !== '未命名课程') addHistoryItem('name', course.name)
  if (course.location && course.location.trim()) addHistoryItem('location', course.location)
  if (course.teacher && course.teacher.trim()) addHistoryItem('teacher', course.teacher)
  return course
}

export function updateCourse(id, data) {
  const courses = loadCourses() || []
  const index = courses.findIndex(c => c.id === id)
  if (index !== -1) {
    courses[index] = { ...courses[index], ...data }
    saveCourses(courses)
    // 记录历史（仅非空值）
    if (data.name && data.name.trim() && data.name !== '未命名课程') addHistoryItem('name', data.name)
    if (data.location && data.location.trim()) addHistoryItem('location', data.location)
    if (data.teacher && data.teacher.trim()) addHistoryItem('teacher', data.teacher)
    return courses[index]
  }
  return null
}

export function deleteCourse(id) {
  const courses = loadCourses() || []
  const filtered = courses.filter(c => c.id !== id)
  saveCourses(filtered)
  return filtered
}

export function getCourseById(id) {
  const courses = loadCourses() || []
  return courses.find(c => c.id === id) || null
}

export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}

// ========== 历史记录 ==========

export function loadHistory() {
  try {
    const data = localStorage.getItem(HISTORY_KEY)
    return data ? JSON.parse(data) : { name: [], location: [], teacher: [] }
  } catch {
    return { name: [], location: [], teacher: [] }
  }
}

function saveHistory(history) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history))
}

export function addHistoryItem(type, value) {
  if (!value || !value.trim()) return
  const history = loadHistory()
  const list = history[type] || []
  // 去重并放到最前面
  const idx = list.indexOf(value.trim())
  if (idx !== -1) list.splice(idx, 1)
  list.unshift(value.trim())
  // 最多保留 20 条
  if (list.length > 20) list.pop()
  history[type] = list
  saveHistory(history)
}

export function removeHistoryItem(type, value) {
  const history = loadHistory()
  const list = history[type] || []
  const idx = list.indexOf(value)
  if (idx === -1) return
  list.splice(idx, 1)
  history[type] = list
  saveHistory(history)
}

export function getHistory(type) {
  const history = loadHistory()
  return history[type] || []
}

// ========== 自定义节次时间 ==========

export function loadPeriods() {
  try {
    const data = localStorage.getItem(PERIODS_KEY)
    if (!data) return null
    const periods = JSON.parse(data)
    return isLegacyDefaultPeriods(periods) ? null : periods
  } catch {
    return null
  }
}

export function savePeriods(periods) {
  localStorage.setItem(PERIODS_KEY, JSON.stringify(periods))
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(PERIODS_CHANGED_EVENT, { detail: periods }))
  }
}

// ========== 学期开始日期 ==========

export function loadSemesterStart() {
  return localStorage.getItem(SEMESTER_START_KEY) || ''
}

export function saveSemesterStart(dateStr) {
  localStorage.setItem(SEMESTER_START_KEY, dateStr)
}

// ========== 单元格高度 ==========

export function loadCellHeight() {
  const val = localStorage.getItem(CELL_HEIGHT_KEY)
  return val ? parseInt(val) : null
}

export function saveCellHeight(height) {
  localStorage.setItem(CELL_HEIGHT_KEY, String(height))
}
