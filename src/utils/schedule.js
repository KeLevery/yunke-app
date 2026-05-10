// 每节课的时间配置（可自定义）
export const DEFAULT_PERIODS = [
  { period: 1,  start: '08:00', end: '08:45' },
  { period: 2,  start: '08:55', end: '09:40' },
  { period: 3,  start: '10:00', end: '10:45' },
  { period: 4,  start: '10:55', end: '11:40' },
  { period: 5,  start: '11:50', end: '12:35' },
  { period: 6,  start: '13:30', end: '14:15' },
  { period: 7,  start: '14:25', end: '15:10' },
  { period: 8,  start: '15:20', end: '16:05' },
  { period: 9,  start: '16:15', end: '17:00' },
  { period: 10, start: '17:10', end: '17:55' },
  { period: 11, start: '19:00', end: '19:45' },
  { period: 12, start: '19:55', end: '20:40' },
  { period: 13, start: '20:50', end: '21:35' },
  { period: 14, start: '21:45', end: '22:30' }
]

function timeToMinutes(time) {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

function minutesToTime(minutes) {
  const normalized = ((minutes % 1440) + 1440) % 1440
  const hours = Math.floor(normalized / 60)
  const mins = normalized % 60
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`
}

export const DEFAULT_PERIOD_DURATION = 45

export function normalizePeriodDuration(value) {
  const duration = parseInt(value)
  if (!Number.isFinite(duration)) return DEFAULT_PERIOD_DURATION
  return Math.max(20, Math.min(180, duration))
}

function getDefaultGapBeforePeriod(periodNumber) {
  const previousDefault = DEFAULT_PERIODS[periodNumber - 2]
  const currentDefault = DEFAULT_PERIODS[periodNumber - 1]
  if (!previousDefault || !currentDefault) return 10
  return Math.max(0, timeToMinutes(currentDefault.start) - timeToMinutes(previousDefault.end))
}

export function createNextPeriod(periods, durationMinutes = DEFAULT_PERIOD_DURATION) {
  const last = periods[periods.length - 1]
  if (!last) return { period: 1, start: '08:00', end: '08:45' }
  const duration = normalizePeriodDuration(durationMinutes)
  const start = timeToMinutes(last.end) + getDefaultGapBeforePeriod(last.period + 1)
  return {
    period: last.period + 1,
    start: minutesToTime(start),
    end: minutesToTime(start + duration)
  }
}

export function renumberPeriods(periods) {
  return periods.map((period, index) => ({ ...period, period: index + 1 }))
}

export function applyPeriodDuration(periods, durationMinutes = DEFAULT_PERIOD_DURATION) {
  const duration = normalizePeriodDuration(durationMinutes)
  const source = periods.length > 0 ? renumberPeriods(periods) : DEFAULT_PERIODS
  let start = timeToMinutes(source[0]?.start || DEFAULT_PERIODS[0].start)

  return source.map((period, index) => {
    const end = start + duration
    const nextStart = end + getDefaultGapBeforePeriod(index + 2)
    const updated = {
      ...period,
      period: index + 1,
      start: minutesToTime(start),
      end: minutesToTime(end)
    }
    start = nextStart
    return updated
  })
}

export function groupPeriodsByDayPart(periods) {
  const groups = [
    { label: '上午', periods: [] },
    { label: '午间', periods: [] },
    { label: '下午', periods: [] },
    { label: '晚上', periods: [] }
  ]

  periods.forEach(period => {
    const start = timeToMinutes(period.start)
    if (start < 12 * 60) {
      groups[0].periods.push(period)
    } else if (start < 14 * 60) {
      groups[1].periods.push(period)
    } else if (start < 18 * 60) {
      groups[2].periods.push(period)
    } else {
      groups[3].periods.push(period)
    }
  })

  return groups.filter(group => group.periods.length > 0)
}

// 星期标签
export const WEEK_DAYS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

// 更多课程颜色
export const COURSE_COLORS = [
  { name: '天蓝',   value: '#4A90D9' },
  { name: '海蓝',   value: '#2980B9' },
  { name: '靛青',   value: '#1A5276' },
  { name: '薄荷',   value: '#27AE60' },
  { name: '翠绿',   value: '#1E8449' },
  { name: '青瓷',   value: '#1ABC9C' },
  { name: '松石',   value: '#17A589' },
  { name: '珊瑚',   value: '#E74C3C' },
  { name: '玫红',   value: '#C0392B' },
  { name: '樱粉',   value: '#E91E8C' },
  { name: '琥珀',   value: '#F39C12' },
  { name: '橘橙',   value: '#E67E22' },
  { name: '紫藤',   value: '#8E44AD' },
  { name: '薰衣草', value: '#7D3C98' },
  { name: '墨灰',   value: '#5D6D7E' },
  { name: '棕褐',   value: '#8B6914' }
]

// 示例数据
export const SAMPLE_DATA = [
  {
    id: 'sample1',
    name: '高等数学',
    location: '教学楼A-301',
    teacher: '张教授',
    dayOfWeek: 1,
    startPeriod: 1,
    endPeriod: 2,
    weeks: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16],
    color: '#4A90D9'
  },
  {
    id: 'sample2',
    name: '大学英语',
    location: '外语楼B-205',
    teacher: '李老师',
    dayOfWeek: 2,
    startPeriod: 3,
    endPeriod: 4,
    weeks: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16],
    color: '#27AE60'
  },
  {
    id: 'sample3',
    name: '数据结构',
    location: '计算机楼C-102',
    teacher: '王教授',
    dayOfWeek: 3,
    startPeriod: 5,
    endPeriod: 6,
    weeks: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16],
    color: '#F39C12'
  },
  {
    id: 'sample4',
    name: '线性代数',
    location: '教学楼A-401',
    teacher: '赵老师',
    dayOfWeek: 4,
    startPeriod: 1,
    endPeriod: 2,
    weeks: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16],
    color: '#8E44AD'
  },
  {
    id: 'sample5',
    name: '体育',
    location: '体育馆',
    teacher: '陈教练',
    dayOfWeek: 5,
    startPeriod: 3,
    endPeriod: 4,
    weeks: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16],
    color: '#1ABC9C'
  },
  {
    id: 'sample6',
    name: 'Python编程',
    location: '计算机楼C-301',
    teacher: '刘教授',
    dayOfWeek: 1,
    startPeriod: 5,
    endPeriod: 6,
    weeks: [1,2,3,4,5,6,7,8],
    color: '#E74C3C'
  },
  {
    id: 'sample7',
    name: '马克思主义基本原理',
    location: '教学楼D-101',
    teacher: '孙老师',
    dayOfWeek: 3,
    startPeriod: 1,
    endPeriod: 2,
    weeks: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16],
    color: '#5D6D7E'
  },
  {
    id: 'sample8',
    name: '大学物理实验',
    location: '物理实验楼E-201',
    teacher: '周教授',
    dayOfWeek: 5,
    startPeriod: 5,
    endPeriod: 7,
    weeks: [1,2,3,4,5,6,7,8,9,10,11,12],
    color: '#E91E8C'
  }
]

/**
 * 获取指定周数的课程
 */
export function getCoursesForWeek(courses, weekNumber) {
  return courses.filter(course => course.weeks && course.weeks.includes(weekNumber))
}

/**
 * 获取指定某一天的课程
 */
export function getCoursesForDay(courses, weekNumber, dayOfWeek) {
  return getCoursesForWeek(courses, weekNumber)
    .filter(c => c.dayOfWeek === dayOfWeek)
    .sort((a, b) => a.startPeriod - b.startPeriod)
}

/**
 * 获取学期开始日期（优先从 localStorage 读取）
 */
function getSemesterStartDate() {
  const saved = localStorage.getItem('timetable_semester_start')
  if (saved) {
    const d = new Date(saved)
    if (!isNaN(d.getTime())) return d
  }
  return null
}

/**
 * 获取默认的学期开始日期（根据当前月份推测）
 */
function getDefaultSemesterStart() {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  if (month >= 9) {
    return new Date(year, 8, 1)
  } else if (month >= 2) {
    return new Date(year, 1, 20)
  } else {
    return new Date(year - 1, 8, 1)
  }
}

/**
 * 获取指定日期是第几周
 */
export function getWeekNumberForDate(date = new Date()) {
  const semesterStart = getSemesterStartDate() || getDefaultSemesterStart()
  // 找到学期开始的那个周一
  const startDay = semesterStart.getDay() || 7
  const monday = new Date(semesterStart)
  monday.setDate(semesterStart.getDate() - startDay + 1)
  const target = new Date(date)
  target.setHours(0, 0, 0, 0)
  monday.setHours(0, 0, 0, 0)
  const diff = target.getTime() - monday.getTime()
  const weekNum = Math.floor(diff / (7 * 24 * 60 * 60 * 1000)) + 1
  return Math.max(1, Math.min(weekNum, 25))
}

export function getCurrentWeekNumber() {
  return getWeekNumberForDate(new Date())
}

/**
 * 获取指定周的日期范围
 */
export function getWeekDateRange(weekNumber) {
  const semesterStart = getSemesterStartDate() || getDefaultSemesterStart()
  const startDay = semesterStart.getDay() || 7
  const firstMonday = new Date(semesterStart)
  firstMonday.setDate(semesterStart.getDate() - startDay + 1)
  const monday = new Date(firstMonday)
  monday.setDate(firstMonday.getDate() + (weekNumber - 1) * 7)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  return { monday, sunday }
}

/**
 * 格式化日期为 M.D 格式
 */
export function formatDate(date) {
  return `${date.getMonth() + 1}.${date.getDate()}`
}
