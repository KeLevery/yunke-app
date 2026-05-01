<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Capacitor } from '@capacitor/core'
import { loadPeriods, savePeriods, loadSemesterStart, saveSemesterStart, loadCourses, saveCourses, loadCellHeight, saveCellHeight } from '../utils/storage'
import { DEFAULT_PERIODS, createNextPeriod, renumberPeriods } from '../utils/schedule'
import {
  isNotificationEnabled,
  setNotificationEnabled,
  getNotificationMinutes,
  setNotificationMinutes,
  requestNotificationPermission,
  checkNotificationPermission
} from '../utils/notification'

const router = useRouter()
const periods = ref([...DEFAULT_PERIODS])
const semesterStart = ref('')
const notificationEnabled = ref(false)
const notificationMinutes = ref(20)
const notificationPermissionGranted = ref(false)
const cellHeight = ref(0) // 0 表示自动
const showPeriods = ref(false)

const isNative = computed(() => Capacitor.isNativePlatform())

onMounted(() => {
  const custom = loadPeriods()
  if (custom) {
    periods.value = custom
  }
  semesterStart.value = loadSemesterStart()
  notificationEnabled.value = isNotificationEnabled()
  notificationMinutes.value = getNotificationMinutes()
  const savedCellHeight = loadCellHeight()
  cellHeight.value = savedCellHeight || 0
  if (isNotificationEnabled()) {
    checkNotificationPermission().then(granted => {
      notificationPermissionGranted.value = granted
    })
  }
})

function updatePeriodTime(index, field, value) {
  periods.value[index][field] = value
}

function addPeriod() {
  periods.value = [...periods.value, createNextPeriod(periods.value)]
}

function removeLastPeriod() {
  if (periods.value.length <= 1) return
  periods.value = renumberPeriods(periods.value.slice(0, -1))
}

function save() {
  savePeriods(renumberPeriods(periods.value))
  saveSemesterStart(semesterStart.value)
  router.back()
}

function resetToDefault() {
  periods.value = DEFAULT_PERIODS.map(p => ({ ...p }))
}

function goBack() {
  router.back()
}

async function toggleNotification(enabled) {
  if (enabled) {
    const granted = await requestNotificationPermission()
    notificationPermissionGranted.value = granted
    if (!granted) {
      notificationEnabled.value = false
      return
    }
  }
  notificationEnabled.value = enabled
  setNotificationEnabled(enabled)
}

function updateNotificationMinutes(val) {
  notificationMinutes.value = val
  setNotificationMinutes(val)
}

function updateCellHeight(val) {
  const h = parseInt(val)
  cellHeight.value = h
  if (h === 0) {
    localStorage.removeItem('timetable_cell_height')
  } else {
    saveCellHeight(h)
  }
}

// ========== 分享 / 导入 ==========
const showExportModal = ref(false)
const exportCode = ref('')
const copySuccess = ref(false)

const WEEK_NAMES = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

function exportTimetable() {
  const courses = loadCourses() || []
  if (courses.length === 0) {
    alert('暂无课程可导出')
    return
  }
  try {
    const lines = ['【云课课表】']
    courses.forEach(c => {
      const weekName = WEEK_NAMES[c.dayOfWeek - 1] || `周${c.dayOfWeek}`
      const weekStr = c.weeks && c.weeks.length > 0 ? formatWeeks(c.weeks) : ''
      const parts = [
        c.name || '未命名',
        c.location || '',
        c.teacher || '',
        `${weekName}${c.startPeriod}-${c.endPeriod}节`,
        weekStr,
        c.color || '#4A90D9'
      ]
      lines.push(parts.join('|'))
    })
    exportCode.value = lines.join('\n')
    showExportModal.value = true
    copySuccess.value = false
  } catch {
    alert('导出失败，数据格式异常')
  }
}

// 格式化周次：[1,2,3,4,5,6,7,8] → "1-8周"  [1,3,5,7] → "1,3,5,7周"
function formatWeeks(weeks) {
  if (!weeks || weeks.length === 0) return ''
  const sorted = [...weeks].sort((a, b) => a - b)
  // 检测连续区间
  const ranges = []
  let start = sorted[0], end = sorted[0]
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === end + 1) {
      end = sorted[i]
    } else {
      ranges.push(start === end ? `${start}` : `${start}-${end}`)
      start = sorted[i]
      end = sorted[i]
    }
  }
  ranges.push(start === end ? `${start}` : `${start}-${end}`)
  return ranges.join(',') + '周'
}

function copyExportCode() {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(exportCode.value).then(() => {
      copySuccess.value = true
      setTimeout(() => { copySuccess.value = false }, 2000)
    }).catch(() => {
      fallbackCopy()
    })
  } else {
    fallbackCopy()
  }
}

function fallbackCopy() {
  const ta = document.createElement('textarea')
  ta.value = exportCode.value
  ta.style.position = 'fixed'
  ta.style.left = '-9999px'
  document.body.appendChild(ta)
  ta.select()
  try {
    document.execCommand('copy')
    copySuccess.value = true
    setTimeout(() => { copySuccess.value = false }, 2000)
  } catch {
    alert('复制失败，请手动选择文本复制')
  }
  document.body.removeChild(ta)
}

// 导入
const showImportModal = ref(false)
const importCode = ref('')

function openImportModal() {
  importCode.value = ''
  showImportModal.value = true
}

function parseImportCode() {
  const code = importCode.value.trim()
  if (!code) {
    alert('请粘贴云课识别码')
    return
  }
  // 检查云课标识
  if (!code.includes('【云课课表】') && !code.includes('云课')) {
    alert('无效的云课识别码，请确认是否为云课导出的内容')
    return
  }
  try {
    const lines = code.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('【'))
    const courses = []
    lines.forEach(line => {
      const parts = line.split('|')
      if (parts.length < 4) return
      const name = parts[0] || '未命名'
      const location = parts[1] || ''
      const teacher = parts[2] || ''
      // 解析 "周一1-2节" → dayOfWeek=1, startPeriod=1, endPeriod=2
      const periodStr = parts[3] || ''
      const periodMatch = periodStr.match(/(周[一二三四五六日])(\d+)-(\d+)节/)
      let dayOfWeek = 1, startPeriod = 1, endPeriod = 1
      if (periodMatch) {
        const dayMap = { '周一': 1, '周二': 2, '周三': 3, '周四': 4, '周五': 5, '周六': 6, '周日': 7 }
        dayOfWeek = dayMap[periodMatch[1]] || 1
        startPeriod = parseInt(periodMatch[2]) || 1
        endPeriod = parseInt(periodMatch[3]) || startPeriod
      }
      // 解析 "1-16周" → [1,2,...,16]
      const weekStr = parts[4] || ''
      const weeks = parseWeeks(weekStr)
      const color = parts[5] || '#4A90D9'

      courses.push({
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        name,
        location,
        teacher,
        dayOfWeek,
        startPeriod,
        endPeriod,
        weeks,
        color
      })
    })
    if (courses.length === 0) {
      alert('未识别到有效的课程数据')
      return
    }
    const importDataObj = { courses, periods: null, semesterStart: '' }
    importTimetable(importDataObj)
  } catch (e) {
    alert('识别码格式错误，请确认是否为云课导出的内容')
  }
}

// 解析 "1-8周" 或 "1,3,5,7周" 或 "1-8,10-16周"
function parseWeeks(str) {
  if (!str) return []
  str = str.replace(/周/g, '').trim()
  if (!str) return []
  const weeks = []
  const parts = str.split(',')
  parts.forEach(part => {
    if (part.includes('-')) {
      const [start, end] = part.split('-').map(Number)
      if (!isNaN(start) && !isNaN(end)) {
        for (let i = start; i <= end; i++) weeks.push(i)
      }
    } else {
      const n = parseInt(part)
      if (!isNaN(n)) weeks.push(n)
    }
  })
  return weeks
}

function triggerImportFile() {
  openImportModal()
}

const showImportConfirm = ref(false)
const importData = ref(null)

function importTimetable(data) {
  if (!data || !data.courses || !Array.isArray(data.courses)) {
    alert('数据格式错误')
    return
  }
  importData.value = data
  showImportConfirm.value = true
}

function confirmImport() {
  if (!importData.value) return
  const data = importData.value
  const existingCourses = loadCourses() || []
  // 合并课程（按名称+星期+节次去重）
  const existingKeys = new Set(existingCourses.map(c => `${c.name}-${c.dayOfWeek}-${c.startPeriod}`))
  const newCourses = data.courses.filter(c => !existingKeys.has(`${c.name}-${c.dayOfWeek}-${c.startPeriod}`))
  const merged = [...existingCourses, ...newCourses]
  saveCourses(merged)
  if (data.periods) savePeriods(data.periods)
  if (data.semesterStart) saveSemesterStart(data.semesterStart)
  showImportConfirm.value = false
  showImportModal.value = false
  importData.value = null
  alert(`导入成功！新增 ${newCourses.length} 门课程`)
}

function cancelImport() {
  showImportConfirm.value = false
  importData.value = null
}
</script>

<template>
  <div class="settings">
    <header class="settings__header">
      <button class="settings__back" @click="goBack">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
      </button>
      <h1 class="settings__title">设置</h1>
      <div style="width: 36px"></div>
    </header>

    <div class="settings__body">
      <!-- 课前提醒 -->
      <div class="settings__section">
        <div class="settings__section-title">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
          课前提醒
        </div>
        <div class="settings__card">
          <div class="settings__field">
            <div class="settings__field-info">
              <span class="settings__field-label">开启提醒</span>
              <span class="settings__field-desc">课程开始前发送通知提醒</span>
            </div>
            <label class="settings__toggle">
              <input type="checkbox" :checked="notificationEnabled" @change="toggleNotification($event.target.checked)" />
              <span class="settings__toggle-slider"></span>
            </label>
          </div>
          <div v-if="notificationEnabled" class="settings__field settings__field--sub">
            <div class="settings__field-info">
              <span class="settings__field-label">提前时间</span>
              <span class="settings__field-desc">课前多少分钟发送提醒</span>
            </div>
            <select :value="notificationMinutes" class="settings__select" @change="updateNotificationMinutes(Number($event.target.value))">
              <option :value="5">5 分钟</option>
              <option :value="10">10 分钟</option>
              <option :value="15">15 分钟</option>
              <option :value="20">20 分钟</option>
              <option :value="30">30 分钟</option>
              <option :value="45">45 分钟</option>
              <option :value="60">60 分钟</option>
            </select>
          </div>
        </div>
      </div>

      <!-- 分享与导入 -->
      <div class="settings__section">
        <div class="settings__section-title">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
            <polyline points="16 6 12 2 8 6"/>
            <line x1="12" y1="2" x2="12" y2="15"/>
          </svg>
          分享与导入
        </div>
        <div class="settings__card">
          <button class="settings__action-btn" @click="exportTimetable">
            <div class="settings__action-info">
              <span class="settings__field-label">导出课表</span>
              <span class="settings__field-desc">生成云课识别码，发送给朋友即可导入</span>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
          <div class="settings__divider"></div>
          <button class="settings__action-btn" @click="openImportModal">
            <div class="settings__action-info">
              <span class="settings__field-label">导入课表</span>
              <span class="settings__field-desc">粘贴云课识别码，自动还原课表</span>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>
      </div>

      <!-- 学期开始日期 -->
      <div class="settings__section">
        <div class="settings__section-title">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          学期设置
        </div>
        <div class="settings__card">
          <div class="settings__field">
            <div class="settings__field-info">
              <span class="settings__field-label">学期开始日期</span>
              <span class="settings__field-desc">设置第一周第一天的日期（周一），影响周次计算</span>
            </div>
            <input v-model="semesterStart" class="settings__date-input" type="date" />
          </div>
        </div>
      </div>

      <!-- 课表单元格大小 -->
      <div class="settings__section">
        <div class="settings__section-title">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="15 3 21 3 21 9"/>
            <polyline points="9 21 3 21 3 15"/>
            <line x1="21" y1="3" x2="14" y2="10"/>
            <line x1="3" y1="21" x2="10" y2="14"/>
          </svg>
          课表显示
        </div>
        <div class="settings__card">
          <div class="settings__field">
            <div class="settings__field-info">
              <span class="settings__field-label">单元格大小</span>
              <span class="settings__field-desc">调整课表每个格子的{{ cellHeight > 0 ? '高度，当前 ' + cellHeight + 'px' : '高度，当前自适应' }}</span>
            </div>
            <select :value="cellHeight" class="settings__select" @change="updateCellHeight($event.target.value)">
              <option :value="0">自适应</option>
              <option :value="80">紧凑 (80px)</option>
              <option :value="100">较小 (100px)</option>
              <option :value="120">适中 (120px)</option>
              <option :value="140">标准 (140px)</option>
              <option :value="160">较大 (160px)</option>
              <option :value="180">大 (180px)</option>
              <option :value="200">最大 (200px)</option>
            </select>
          </div>
        </div>
      </div>

      <!-- 节次时间 -->
      <div class="settings__section">
        <div class="settings__section-title settings__section-title--clickable" @click="showPeriods = !showPeriods">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
          上课时间
          <svg class="settings__chevron" :class="{ 'settings__chevron--open': showPeriods }" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
        </div>
        <div class="settings__hint" v-if="!showPeriods">点击展开修改每节课的上课时间</div>
        <Transition name="collapse">
          <div v-if="showPeriods" class="period-list">
            <div class="period-list__tools">
              <span class="period-list__count">共 {{ periods.length }} 节</span>
              <div class="period-list__actions">
                <button class="period-list__btn" @click="addPeriod">增加一节</button>
                <button class="period-list__btn" :disabled="periods.length <= 1" @click="removeLastPeriod">删除最后一节</button>
              </div>
            </div>
            <div
              v-for="(p, idx) in periods"
              :key="idx"
              class="period-item"
            >
              <span class="period-item__num">第{{ p.period }}节</span>
              <div class="period-item__times">
                <input
                  :value="p.start"
                  class="period-item__input"
                  type="time"
                  @input="updatePeriodTime(idx, 'start', $event.target.value)"
                />
                <span class="period-item__sep">—</span>
                <input
                  :value="p.end"
                  class="period-item__input"
                  type="time"
                  @input="updatePeriodTime(idx, 'end', $event.target.value)"
                />
              </div>
            </div>
          </div>
        </Transition>
      </div>
    </div>

    <div class="settings__footer">
      <button class="settings__reset" @click="resetToDefault">恢复默认</button>
      <button class="settings__save" @click="save">保存设置</button>
    </div>

    <!-- 导出识别码弹窗 -->
    <Transition name="modal">
      <div v-if="showExportModal" class="modal-overlay" @click.self="showExportModal = false">
        <div class="modal">
          <div class="modal__title">云课识别码</div>
          <div class="modal__text">将以下识别码发送给朋友，对方在云课中粘贴即可导入课表</div>
          <div class="modal__code-box">
            <div class="modal__code-text">{{ exportCode }}</div>
          </div>
          <div class="modal__actions">
            <button class="modal__btn modal__btn--cancel" @click="showExportModal = false">关闭</button>
            <button class="modal__btn modal__btn--primary" @click="copyExportCode">
              {{ copySuccess ? '已复制' : '复制识别码' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- 导入识别码弹窗 -->
    <Transition name="modal">
      <div v-if="showImportModal" class="modal-overlay" @click.self="showImportModal = false">
        <div class="modal">
          <div class="modal__title">导入课表</div>
          <div class="modal__text">粘贴收到的云课识别码</div>
          <textarea
            class="modal__textarea"
            v-model="importCode"
            placeholder="粘贴云课识别码..."
            rows="4"
          ></textarea>
          <div class="modal__actions">
            <button class="modal__btn modal__btn--cancel" @click="showImportModal = false">取消</button>
            <button class="modal__btn modal__btn--primary" @click="parseImportCode">导入</button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- 导入确认弹窗 -->
    <Transition name="modal">
      <div v-if="showImportConfirm" class="modal-overlay" @click.self="cancelImport">
        <div class="modal">
          <div class="modal__title">确认导入</div>
          <div class="modal__text">
            即将导入 <strong>{{ importData?.courses?.length || 0 }}</strong> 门课程数据。
            已有的课程不会被覆盖，新课程将追加到现有列表中。
            是否继续？
          </div>
          <div class="modal__actions">
            <button class="modal__btn modal__btn--cancel" @click="cancelImport">取消</button>
            <button class="modal__btn modal__btn--primary" @click="confirmImport">导入</button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.settings {
  display: flex;
  flex-direction: column;
  height: 100vh;
  height: 100dvh;
  background: var(--bg-primary);
}

.settings__header {
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

.settings__back {
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

.settings__title {
  flex: 1;
  font-size: 17px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
  text-align: center;
}

.settings__body {
  flex: 1;
  overflow: auto;
  overflow-y: auto;
  padding: 16px;
  padding-bottom: 80px;
  -webkit-overflow-scrolling: touch;
}

.settings__section {
  margin-bottom: 24px;
  animation: fadeInUp 0.38s cubic-bezier(0.22, 1, 0.36, 1) both;
}

.settings__section:nth-child(1) { animation-delay: 0.02s; }
.settings__section:nth-child(2) { animation-delay: 0.06s; }
.settings__section:nth-child(3) { animation-delay: 0.1s; }
.settings__section:nth-child(4) { animation-delay: 0.14s; }
.settings__section:nth-child(5) { animation-delay: 0.18s; }


.settings__section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 10px;
}

.settings__card {
  background: var(--bg-secondary);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: var(--shadow-card);
}

.settings__field {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  gap: 12px;
}

.settings__field-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
}

.settings__field-label {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.settings__field-desc {
  font-size: 11px;
  color: var(--text-tertiary);
  line-height: 1.4;
}

.settings__date-input {
  padding: 8px 12px;
  border: 1.5px solid var(--border-secondary);
  border-radius: 10px;
  font-size: 14px;
  color: var(--text-primary);
  background: var(--bg-secondary);
  outline: none;
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
}

.settings__date-input:focus {
  border-color: var(--accent);
}

.settings__hint {
  font-size: 12px;
  color: var(--text-tertiary);
  margin-bottom: 12px;
  line-height: 1.5;
}

.period-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.period-list__tools {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 2px 2px 4px;
}

.period-list__count {
  font-size: 12px;
  color: var(--text-tertiary);
  white-space: nowrap;
}

.period-list__actions {
  display: flex;
  gap: 6px;
  min-width: 0;
}

.period-list__btn {
  padding: 6px 9px;
  border: 1.5px solid var(--border-secondary);
  border-radius: 8px;
  background: var(--bg-secondary);
  color: var(--accent);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.period-list__btn:disabled {
  color: var(--text-placeholder);
  cursor: not-allowed;
  opacity: 0.55;
}

.period-item {
  display: grid;
  grid-template-columns: max-content minmax(0, 1fr);
  align-items: center;
  gap: 10px;
  background: var(--bg-secondary);
  padding: 10px 14px;
  border-radius: 10px;
  box-shadow: var(--shadow-card);
}

.period-item__num {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
  min-width: 44px;
  white-space: nowrap;
}

.period-item__times {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.period-item__input {
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
  padding: 8px 10px;
  border: 1.5px solid var(--border-secondary);
  border-radius: 8px;
  font-size: 14px;
  color: var(--text-primary);
  background: var(--bg-secondary);
  outline: none;
  font-variant-numeric: tabular-nums;
  text-align: center;
}

.period-item__input:focus {
  border-color: var(--accent);
}

.period-item__sep {
  color: var(--text-placeholder);
  font-size: 14px;
  line-height: 1;
  text-align: center;
}

@media (max-width: 360px) {
  .settings__body {
    padding-inline: 12px;
  }

  .period-item {
    gap: 8px;
    padding: 10px 12px;
  }

  .period-list__tools {
    align-items: flex-start;
    flex-direction: column;
  }

  .period-item__input {
    padding-inline: 6px;
    font-size: 13px;
  }
}

@media (max-width: 340px) {
  .period-item {
    grid-template-columns: 40px minmax(0, 1fr);
    gap: 6px;
    padding-inline: 10px;
  }

  .period-item__num {
    min-width: 0;
    font-size: 12px;
  }

  .period-item__times {
    gap: 4px;
  }

  .period-item__input {
    padding-inline: 4px;
    font-size: 12px;
  }

  .period-item__sep {
    font-size: 12px;
  }
}

.settings__footer {
  padding: 12px 16px;
  padding-bottom: max(12px, env(safe-area-inset-bottom));
  background: var(--glass-bg);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border-top: 1px solid var(--glass-border);
  display: flex;
  gap: 10px;
  flex-shrink: 0;
  position: relative;
  z-index: 10;
}

.settings__reset {
  flex: 1;
  padding: 12px 0;
  border: 1.5px solid var(--border-secondary);
  border-radius: 10px;
  background: var(--bg-secondary);
  color: var(--text-secondary);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}

.settings__save {
  flex: 2;
  padding: 12px 0;
  border: none;
  border-radius: 10px;
  background: var(--accent);
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(74, 144, 217, 0.25);
}

/* Toggle 开关 */
.settings__toggle {
  position: relative;
  display: inline-block;
  width: 48px;
  height: 28px;
  flex-shrink: 0;
}

.settings__toggle input {
  opacity: 0;
  width: 0;
  height: 0;
}

.settings__toggle-slider {
  position: absolute;
  cursor: pointer;
  inset: 0;
  background: var(--border-secondary);
  border-radius: 28px;
  transition: 0.3s;
}

.settings__toggle-slider::before {
  content: '';
  position: absolute;
  height: 22px;
  width: 22px;
  left: 3px;
  bottom: 3px;
  background: white;
  border-radius: 50%;
  transition: 0.3s;
  box-shadow: 0 1px 3px rgba(0,0,0,0.2);
}

.settings__toggle input:checked + .settings__toggle-slider {
  background: var(--accent);
}

.settings__toggle input:checked + .settings__toggle-slider::before {
  transform: translateX(20px);
}

/* 提前时间选择 */
.settings__select {
  padding: 8px 12px;
  border: 1.5px solid var(--border-secondary);
  border-radius: 10px;
  font-size: 14px;
  color: var(--text-primary);
  background: var(--bg-secondary);
  outline: none;
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2395a5a6' stroke-width='2.5' xmlns='http://www.w3.org/2000/svg'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 10px center;
  padding-right: 28px;
}

.settings__select:focus {
  border-color: var(--accent);
}

.settings__field--sub {
  border-top: 1px solid var(--border-primary);
}

/* Action 按钮 */
.settings__action-btn {
  display: flex;
  align-items: center;
  width: 100%;
  padding: 14px 16px;
  gap: 12px;
  background: none;
  border: none;
  cursor: pointer;
  text-align: left;
}

.settings__action-btn:active {
  background: var(--bg-tertiary);
}

.settings__action-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.settings__divider {
  height: 1px;
  background: var(--border-primary);
  margin: 0 16px;
}

/* 弹窗样式 */
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
  padding: 24px;
}

.modal {
  background: var(--modal-bg);
  border-radius: 16px;
  padding: 24px;
  width: 100%;
  max-width: 320px;
  box-shadow: var(--shadow-elevated);
  animation: modalSpringIn 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes modalSpringIn {
  0% { transform: translateY(40px) scale(0.9); opacity: 0; }
  60% { transform: translateY(-4px) scale(1.01); opacity: 1; }
  100% { transform: translateY(0) scale(1); opacity: 1; }
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
.modal__btn--primary { background: var(--accent); color: #fff; }
.modal__btn--danger { background: var(--danger); color: #fff; }

.modal__code-box {
  background: var(--bg-tertiary);
  border-radius: 8px;
  padding: 10px;
  margin-bottom: 16px;
  max-height: 120px;
  overflow-y: auto;
  word-break: break-all;
}

.modal__code-text {
  font-size: 11px;
  color: var(--text-secondary);
  line-height: 1.5;
  font-family: monospace;
  user-select: all;
}

.modal__textarea {
  width: 100%;
  padding: 10px;
  border: 1.5px solid var(--border-secondary);
  border-radius: 8px;
  font-size: 13px;
  color: var(--text-primary);
  background: var(--bg-tertiary);
  outline: none;
  resize: vertical;
  margin-bottom: 16px;
  font-family: monospace;
  line-height: 1.5;
}

.modal__textarea:focus {
  border-color: var(--accent);
}

.modal-enter-active, .modal-leave-active { transition: opacity 0.25s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }

/* 折叠展开动画 */
.collapse-enter-active, .collapse-leave-active {
  transition: max-height 0.3s ease, opacity 0.25s ease;
  overflow: hidden;
}
.collapse-enter-from, .collapse-leave-to {
  max-height: 0;
  opacity: 0;
}
.collapse-enter-to, .collapse-leave-from {
  max-height: 800px;
  opacity: 1;
}

/* 可点击的 section 标题 */
.settings__section-title--clickable {
  cursor: pointer;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
}

.settings__chevron {
  margin-left: auto;
  transition: transform 0.3s ease;
  flex-shrink: 0;
}

.settings__chevron--open {
  transform: rotate(180deg);
}
</style>
