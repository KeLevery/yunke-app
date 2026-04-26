/**
 * PDF 课表解析器
 * 使用 pdfjs-dist 在浏览器端解析教务系统导出的标准课表 PDF
 *
 * 核心策略（针对横版课表 PDF）：
 * 1. 提取 PDF 全部文本项及其位置信息
 * 2. 识别星期列表头文本项（"星期一"~"星期日"）
 * 3. 对整页文本用正则提取课程信息（课程名、节次、周次、地点、教师）
 * 4. 根据课程名文本项的 y 坐标，找到最近的星期标签，推断星期
 *    规律：课程 y < 其所属星期标签 y，课程总是在星期标签上方
 *
 * 课程单元格格式：课程名\n(X-X节)X-X周/校区:xxx/场地:xxx/教师:xxx/...
 */

import * as pdfjs from 'pdfjs-dist'
import pdfWorkerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { COURSE_COLORS } from './schedule'

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerSrc

const CMAP_URL = '/cmaps/'
const CMAP_PACKED = true
const STANDARD_FONT_DATA_URL = '/standard_fonts/'

const DAY_KEYWORDS = {
  '周一': 1, '星期一': 1,
  '周二': 2, '星期二': 2,
  '周三': 3, '星期三': 3,
  '周四': 4, '星期四': 4,
  '周五': 5, '星期五': 5,
  '周六': 6, '星期六': 6,
  '周日': 7, '星期日': 7
}

const DEFAULT_WEEKS = Array.from({ length: 16 }, (_, i) => i + 1)

// ========== 主入口 ==========

export async function parsePdfTimetable(file) {
  const warnings = []

  try {
    const arrayBuffer = await file.arrayBuffer()
    const pdf = await pdfjs.getDocument({
      data: arrayBuffer,
      cMapUrl: CMAP_URL,
      cMapPacked: CMAP_PACKED,
      standardFontDataUrl: STANDARD_FONT_DATA_URL,
      useSystemFonts: true
    }).promise

    const maxPages = Math.min(pdf.numPages, 10)
    let allCourses = []
    let rawText = ''

    for (let i = 1; i <= maxPages; i++) {
      const page = await pdf.getPage(i)
      const textContent = await page.getTextContent()

      const items = textContent.items
        .filter(item => item.str.trim().length > 0)
        .map(item => ({
          text: item.str,
          x: item.transform[4],
          y: item.transform[5],
          width: item.width || 0,
          height: Math.abs(item.transform[3]) || item.height || 10
        }))

      if (items.length === 0) {
        warnings.push(`第 ${i} 页未提取到文字，可能是扫描版图片 PDF`)
        continue
      }

      rawText += items.map(t => t.text).join(' ')

      if (typeof window !== 'undefined') {
        window.__pdfItems = items
      }

      const result = parsePageItems(items, warnings)
      if (result.courses.length > 0) {
        allCourses.push(...result.courses)
      }
    }

    pdf.destroy()

    if (allCourses.length === 0) {
      return {
        success: false,
        courses: [],
        warnings: warnings.length > 0 ? warnings : ['未识别到课程信息'],
        rawText: rawText.substring(0, 2000)
      }
    }

    return {
      success: true,
      courses: assignCourseColors(deduplicateCourses(allCourses)),
      warnings,
      rawText: rawText.substring(0, 2000)
    }
  } catch (err) {
    console.error('PDF 解析失败:', err)
    return {
      success: false,
      courses: [],
      warnings: [`PDF 解析出错: ${err.message}`],
      rawText: ''
    }
  }
}

// ========== 核心解析 ==========

function parsePageItems(items, warnings) {
  // 1. 识别星期列表头
  const dayHeaders = []
  for (const item of items) {
    for (const [kw, val] of Object.entries(DAY_KEYWORDS)) {
      if (item.text.trim() === kw) {
        dayHeaders.push({ keyword: kw, y: item.y, dayOfWeek: val })
      }
    }
  }

  const dayMap = new Map()
  for (const h of dayHeaders) {
    if (!dayMap.has(h.dayOfWeek)) {
      dayMap.set(h.dayOfWeek, h)
    }
  }
  const uniqueHeaders = [...dayMap.values()]

  console.log('[PDF解析] 星期列表头:', uniqueHeaders.map(h => `${h.keyword}(y=${h.y.toFixed(0)})`).join(', '))

  // 2. 构建课程名 → y 坐标映射
  const courseNameYMap = new Map()
  for (const item of items) {
    const text = item.text.trim()
    // 课程名：2-20个中文字符+英文字母+数字，排除表头和元数据文本
    if (/^[\u4e00-\u9fa5a-zA-Z0-9]{2,20}$/.test(text) && !isHeaderOrMetaText(text)) {
      courseNameYMap.set(text, item.y)
    }
  }

  console.log('[PDF解析] 课程名文本项:', [...courseNameYMap.entries()].map(([k, v]) => `${k}(y=${v.toFixed(0)})`).join(', '))

  // 3. 合并所有文本，用正则提取课程
  const sorted = [...items].sort((a, b) => {
    if (Math.abs(a.y - b.y) > 5) return a.y - b.y
    return a.x - b.x
  })
  const fullText = sorted.map(i => i.text).join(' ')

  const courses = extractCoursesFromText(fullText)

  // 4. 为每门课程分配星期
  for (const course of courses) {
    const dayOfWeek = inferDayOfWeek(course.name, courseNameYMap, uniqueHeaders)
    course.dayOfWeek = dayOfWeek
    if (dayOfWeek === 0) {
      warnings.push(`课程"${course.name}"的星期信息未识别，请手动修改`)
    }
  }

  // 5. 提取实践课程和其他课程
  const specialCourses = extractSpecialCourses(fullText)
  for (const sc of specialCourses) {
    sc.dayOfWeek = 0
    warnings.push(`实践/其他课程"${sc.name}"未分配星期，请手动设置`)
  }
  courses.push(...specialCourses)

  console.log(`[PDF解析] 解析结果: ${courses.length} 门课程`)
  for (const c of courses) {
    console.log(`  - ${c.name} 星期${c.dayOfWeek || '?'} 第${c.startPeriod}-${c.endPeriod}节 ${c.weeks[0]}-${c.weeks[c.weeks.length-1]}周`)
  }

  return { courses }
}

// ========== 推断星期 ==========

function inferDayOfWeek(courseName, courseNameYMap, dayHeaders) {
  if (dayHeaders.length === 0) return 0

  let courseY = courseNameYMap.get(courseName)

  if (courseY === undefined) {
    // 模糊匹配课程名
    for (const [name, y] of courseNameYMap.entries()) {
      if (name.includes(courseName) || courseName.includes(name)) {
        courseY = y
        break
      }
    }
  }

  if (courseY === undefined) return 0

  return findDayByY(courseY, dayHeaders)
}

function findDayByY(courseY, dayHeaders) {
  // 规律：课程 y < 其所属星期标签 y
  // 找到 y 坐标大于 courseY 且最接近的星期标签
  let bestDay = 0
  let bestY = Infinity

  for (const header of dayHeaders) {
    if (header.y > courseY && header.y < bestY) {
      bestY = header.y
      bestDay = header.dayOfWeek
    }
  }

  // 如果没找到（课程 y 比所有星期标签都大），取 y 最大的星期
  if (bestDay === 0 && dayHeaders.length > 0) {
    const sorted = [...dayHeaders].sort((a, b) => b.y - a.y)
    bestDay = sorted[0].dayOfWeek
  }

  return bestDay
}

// ========== 核心正则：提取课程 ==========

function extractCoursesFromText(text) {
  const courses = []

  // 核心正则：课程名(X-X节)X-X周
  // 课程名：2-20个中文字符+英文字母+数字（支持J2EE等），不含括号
  const coursePattern = /([\u4e00-\u9fa5a-zA-Z0-9]{2,20})\s*[（(](\d{1,2})[~\-–](\d{1,2})节[）)]\s*(\d{1,2})[~\-–](\d{1,2})周/g

  let match
  while ((match = coursePattern.exec(text)) !== null) {
    let rawName = match[1]
    const startPeriod = parseInt(match[2])
    const endPeriod = parseInt(match[3])
    const weekStart = parseInt(match[4])
    const weekEnd = parseInt(match[5])

    let name = cleanCourseName(rawName)

    if (!name || name.length < 2 || isNonCourseContent(name)) continue

    const weeks = Array.from({ length: weekEnd - weekStart + 1 }, (_, i) => weekStart + i)

    const detailStart = match.index + match[0].length
    const detailText = text.substring(detailStart, detailStart + 300)

    let location = ''
    // 注意：PDF 文本中"场地"可能被拆分为"场 地"，需要兼容
    // 同时"考 核方式"等也有空格，所以场地的值在 / 前面
    const locMatch = detailText.match(/(?:场\s*地|地点)[：:]\s*([^/\n]+)/)
    if (locMatch) location = locMatch[1].replace(/\s/g, '').trim()

    let teacher = ''
    const teachMatch = detailText.match(/教师[：:]([^/\n]+)/)
    if (teachMatch) teacher = teachMatch[1].replace(/\s/g, '').trim()

    courses.push({
      name: name.substring(0, 20),
      location: location.substring(0, 30),
      teacher: teacher.substring(0, 20),
      dayOfWeek: 0,
      startPeriod,
      endPeriod,
      weeks,
      color: ''
    })
  }

  if (courses.length === 0) {
    const looseCourses = looseExtractCourses(text)
    courses.push(...looseCourses)
  }

  return courses
}

// ========== 提取实践课程和其他课程 ==========

function extractSpecialCourses(text) {
  const courses = []

  // 实践课程格式：课程名教师名(共X周)/X-X周/无;
  const practiceMatch = text.match(/实践课程[：:]([\s\S]+?)(?=其他课程|$)/)
  if (practiceMatch) {
    const practiceText = practiceMatch[1]
    // 先匹配 完整名称+教师名(共X周)/X-X周/ 的模式
    // 实践课程格式：课程名教师名(共X周)/X-X周/无;
    // 使用贪婪匹配让第一个捕获组尽可能长（含课程名+教师名），
    // 教师名紧跟 (共，所以用前瞻来定位
    const itemPattern = /([\u4e00-\u9fa5a-zA-Z0-9,，]+)(?=\(共)\(共(\d+)周\)\/(\d+)[~\-–](\d+)周\//g
    let m
    while ((m = itemPattern.exec(practiceText)) !== null) {
      const fullName = m[1].trim()
      const weekStart = parseInt(m[3])
      const weekEnd = parseInt(m[4])
      const weeks = Array.from({ length: weekEnd - weekStart + 1 }, (_, i) => weekStart + i)

      // 分离课程名和教师名
      const { name, teacher } = separateCourseAndTeacher(fullName)

      if (name.length >= 2) {
        courses.push({
          name: name.substring(0, 20),
          location: '',
          teacher,
          dayOfWeek: 0,
          startPeriod: 0,
          endPeriod: 0,
          weeks,
          color: ''
        })
      }
    }
  }

  // 其他课程（MOOC等）
  // 格式：课程名(类别)教师1,教师2(共X周)/X-X周/无;
  // 注意：教师名可能用逗号分隔，且课程名可能含括号如(MOOC)
  const otherMatch = text.match(/其他课程[：:]([\s\S]+)/)
  if (otherMatch) {
    const otherText = otherMatch[1]
    // 使用贪婪匹配让课程名尽可能长（含课程名+教师名），
    // 然后在后处理中分离
    // 字符集包含逗号（多位教师用逗号分隔）
    const itemPattern = /([\u4e00-\u9fa5a-zA-Z0-9()（）,，]+)(?=\(共)\(共(\d+)周\)\/(\d+)[~\-–](\d+)周\//g
    let m
    while ((m = itemPattern.exec(otherText)) !== null) {
      const fullName = m[1].trim()
      const weekStart = parseInt(m[3])
      const weekEnd = parseInt(m[4])
      const weeks = Array.from({ length: weekEnd - weekStart + 1 }, (_, i) => weekStart + i)

      // fullName 是课程名+教师名的组合，需要分离
      // 其他课程的教师名可能用逗号分隔
      const { name, teacher } = separateCourseAndTeacherOther(fullName)

      if (name.length >= 2) {
        courses.push({
          name: name.substring(0, 20),
          location: '',
          teacher,
          dayOfWeek: 0,
          startPeriod: 0,
          endPeriod: 0,
          weeks,
          color: ''
        })
      }
    }
  }

  return courses
}

// ========== 分离课程名和教师名（其他课程/MOOC专用）==========

function separateCourseAndTeacherOther(fullName) {
  // MOOC课程格式：课程名(MOOC)教师1,教师2
  // 先找到最后一个 ) 或最后一个非逗号非中文的位置
  
  // 如果包含括号如(MOOC)，先提取括号部分
  const parenMatch = fullName.match(/^(.*?[）\)])([\u4e00-\u9fa5,，]+)$/)
  if (parenMatch) {
    const namePart = parenMatch[1]
    const teacherPart = parenMatch[2]
    return { name: namePart.trim(), teacher: teacherPart.replace(/[,，]/g, ',') }
  }
  
  // 没有括号的情况，用后缀词匹配
  for (let i = fullName.length - 2; i >= 2; i--) {
    const possibleName = fullName.slice(0, i)
    const possibleTeacher = fullName.slice(i)
    
    if (COURSE_SUFFIXES.some(suffix => possibleName.endsWith(suffix))) {
      return { name: possibleName, teacher: possibleTeacher.replace(/[,，]/g, ',') }
    }
  }
  
  // 默认：尝试剥离最后2-4个中文字符作为教师名
  if (fullName.length >= 6) {
    const teacherLen = fullName.length > 10 ? 4 : 3
    return {
      name: fullName.slice(0, -teacherLen),
      teacher: fullName.slice(-teacherLen).replace(/[,，]/g, ',')
    }
  }
  
  return { name: fullName, teacher: '' }
}

// ========== 分离课程名和教师名（实践/其他课程专用）==========

// 结合正则匹配的课程名部分和教师名部分，进一步优化分割
function separateCourseAndTeacher2(courseNamePart, teacherPart) {
  // courseNamePart 是正则捕获的课程名部分
  // teacherPart 是正则捕获的教师名部分
  // 但由于非贪婪匹配，courseNamePart 可能包含教师名的前一部分

  // 如果 courseNamePart 以已知后缀词结尾，说明分割正确
  if (COURSE_SUFFIXES.some(suffix => courseNamePart.endsWith(suffix))) {
    return { name: courseNamePart, teacher: teacherPart.replace(/[,，]/g, ',') }
  }

  // 否则尝试从 courseNamePart 末尾剥离教师名
  for (let teacherLen = 2; teacherLen <= Math.min(4, courseNamePart.length - 2); teacherLen++) {
    const possibleExtraTeacher = courseNamePart.slice(-teacherLen)
    const possibleName = courseNamePart.slice(0, -teacherLen)

    if (!/^[\u4e00-\u9fa5]+$/.test(possibleExtraTeacher)) continue
    if (possibleName.length < 2) continue

    if (COURSE_SUFFIXES.some(suffix => possibleName.endsWith(suffix))) {
      const fullTeacher = possibleExtraTeacher + teacherPart.replace(/[,，]/g, ',')
      return { name: possibleName, teacher: fullTeacher }
    }
  }

  // 默认返回原始分割
  return { name: courseNamePart, teacher: teacherPart.replace(/[,，]/g, ',') }
}

// ========== 分离课程名和教师名 ==========

// 课程名后缀词（如果课程名以这些词结尾，说明课程名还没结束）
const COURSE_SUFFIXES = ['实践', '实验', '设计', '分析', '原理', '基础', '导论', '概论',
  '技术', '方法', '系统', '工程', '管理', '开发', '研究', '应用', '理论', '实习',
  '研讨', '实训', '课程', '训练', '操作', '认知', '工艺', '劳动', '文化', '之旅',
  '文明', '生态', '实践']

function separateCourseAndTeacher(fullName) {
  // 策略：从后往前尝试剥离 2-4 个中文字符作为教师名
  // 课程名至少 2 个字符，教师名 2-4 个字符
  for (let teacherLen = 2; teacherLen <= Math.min(6, fullName.length - 2); teacherLen++) {
    const possibleTeacher = fullName.slice(-teacherLen)
    const possibleName = fullName.slice(0, -teacherLen)

    // 教师名应该是纯中文字符
    if (!/^[\u4e00-\u9fa5]+$/.test(possibleTeacher)) continue

    // 课程名至少 2 个字符
    if (possibleName.length < 2) continue

    // 如果课程名以已知的后缀词结尾，说明分割正确
    if (COURSE_SUFFIXES.some(suffix => possibleName.endsWith(suffix))) {
      return { name: possibleName, teacher: possibleTeacher }
    }
  }

  // 如果没有找到匹配的后缀，尝试默认剥离 2-3 个字符
  // 但要确保课程名足够长（>=4 字符）
  if (fullName.length >= 6) {
    // 默认剥离 2 个字符
    const defaultTeacherLen = fullName.length > 8 ? 3 : 2
    return {
      name: fullName.slice(0, -defaultTeacherLen),
      teacher: fullName.slice(-defaultTeacherLen)
    }
  }

  // 太短无法分离
  return { name: fullName, teacher: '' }
}

// ========== 清理课程名 ==========

function cleanCourseName(name) {
  let cleaned = name

  const dayKws = Object.keys(DAY_KEYWORDS).sort((a, b) => b.length - a.length)
  for (const kw of dayKws) {
    cleaned = cleaned.split(kw).join('')
  }

  cleaned = cleaned.replace(/^[上下午晚\s\d\-～–]+/, '')
  cleaned = cleaned.replace(/^课表$/, '')
  // 只移除完整匹配的元数据关键词，不影响课程名中的部分字符
  if (/^(共|学号|学期|学年|时间段|节次|其他课程|实践课程)$/.test(cleaned)) {
    cleaned = ''
  }

  return cleaned.trim()
}

// ========== 宽松提取 ==========

function looseExtractCourses(text) {
  const courses = []
  const loosePattern = /([\u4e00-\u9fa5a-zA-Z]{2,20}?)(\d{1,2})[~\-–](\d{1,2})周/g

  let match
  while ((match = loosePattern.exec(text)) !== null) {
    let rawName = match[1].replace(/[\s\n]/g, '').trim()
    let name = cleanCourseName(rawName)

    if (!name || name.length < 2 || isNonCourseContent(name)) continue

    const weekStart = parseInt(match[2])
    const weekEnd = parseInt(match[3])
    const weeks = Array.from({ length: weekEnd - weekStart + 1 }, (_, i) => weekStart + i)

    const detailStart = match.index + match[0].length
    const detailText = text.substring(detailStart, detailStart + 300)

    let location = ''
    const locMatch = detailText.match(/(?:场\s*地|地点)[：:]([^/\n]+)/)
    if (locMatch) location = locMatch[1].replace(/\s/g, '').trim()

    let teacher = ''
    const teachMatch = detailText.match(/教师[：:]([^/\n]+)/)
    if (teachMatch) teacher = teachMatch[1].replace(/\s/g, '').trim()

    let startPeriod = 1
    let endPeriod = 2
    const periodMatch = text.substring(Math.max(0, match.index - 50), match.index).match(/(\d{1,2})[~\-–](\d{1,2})节/)
    if (periodMatch) {
      startPeriod = parseInt(periodMatch[1])
      endPeriod = parseInt(periodMatch[2])
    }

    courses.push({
      name: name.substring(0, 20),
      location: location.substring(0, 30),
      teacher: teacher.substring(0, 20),
      dayOfWeek: 0,
      startPeriod,
      endPeriod,
      weeks,
      color: ''
    })
  }

  return courses
}

// ========== 工具函数 ==========

function isHeaderOrMetaText(text) {
  const patterns = [
    /^(星期[一二三四五六日]?|周[一二三四五六日]|节次|时间|备注|说明|上午|下午|晚上|时间段|课表)$/,
    /^(考核方式|选课备注|学分|课程总学时|校区|场地|教师|理论|实验|上机|课外|线上|打印时间|学号|学期|学年)$/,
    /^(石湖|江枫|天平|无|共|地|核|分|时|方式|考查|考试)$/,
    /^\d+$/,
    /^[上下午晚]$/,
    /.+课表$/  // "房宇帅课表" 等
  ]
  return patterns.some(p => p.test(text.trim()))
}

function isNonCourseContent(text) {
  const t = text.trim()
  const patterns = [
    /^(星期[一二三四五六日]?|周[一二三四五六日]|节次|时间|课程|备注|说明|上午|下午|晚上|时间段|课表)$/,
    /^\s*[-–—|]+\s*$/, /^\s*$/,
    /^第?\d{1,2}节?$/, /^\d{1,2}[~\-–]\d{1,2}节$/, /^\d{1,2}$/,
    /^(考核方式|选课备注|学分|课程总学时|校区|场地|教师|实践|理论|实验|上机|课外|线上|打印时间|学号|学期)/,
    /^(石湖|江枫|天平|无)/,
    /^(房宇帅|学年第|学期|共|地|核|分|时|方式|考查|考试)/
  ]
  return patterns.some(p => p.test(t))
}

function deduplicateCourses(courses) {
  const seen = new Set()
  return courses.filter(course => {
    const key = `${course.name}_${course.dayOfWeek}_${course.startPeriod}_${course.endPeriod}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function assignCourseColors(courses) {
  const colorMap = new Map()
  let colorIndex = 0
  for (const course of courses) {
    const key = course.name
    if (!colorMap.has(key)) {
      colorMap.set(key, COURSE_COLORS[colorIndex % COURSE_COLORS.length].value)
      colorIndex++
    }
    course.color = colorMap.get(key)
  }
  return courses
}
