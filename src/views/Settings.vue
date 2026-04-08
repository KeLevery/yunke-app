<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { loadPeriods, savePeriods, loadSemesterStart, saveSemesterStart } from '../utils/storage'
import { DEFAULT_PERIODS } from '../utils/schedule'

const router = useRouter()
const periods = ref([...DEFAULT_PERIODS])
const semesterStart = ref('')

onMounted(() => {
  const custom = loadPeriods()
  if (custom) {
    periods.value = custom
  }
  semesterStart.value = loadSemesterStart()
})

function updatePeriodTime(index, field, value) {
  periods.value[index][field] = value
}

function save() {
  savePeriods(periods.value)
  saveSemesterStart(semesterStart.value)
  router.back()
}

function resetToDefault() {
  periods.value = DEFAULT_PERIODS.map(p => ({ ...p }))
}

function goBack() {
  router.back()
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

      <!-- 节次时间 -->
      <div class="settings__section">
        <div class="settings__section-title">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
          上课时间
        </div>
        <div class="settings__hint">自定义每节课的上课时间，修改后将影响所有课程的时间显示。</div>
        <div class="period-list">
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
      </div>
    </div>

    <div class="settings__footer">
      <button class="settings__reset" @click="resetToDefault">恢复默认</button>
      <button class="settings__save" @click="save">保存设置</button>
    </div>
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
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-primary);
  gap: 12px;
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
  padding: 16px;
  -webkit-overflow-scrolling: touch;
}

.settings__section {
  margin-bottom: 24px;
}

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

.period-item {
  display: flex;
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
}

.period-item__times {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 6px;
}

.period-item__input {
  flex: 1;
  padding: 8px 10px;
  border: 1.5px solid var(--border-secondary);
  border-radius: 8px;
  font-size: 14px;
  color: var(--text-primary);
  background: var(--bg-secondary);
  outline: none;
  font-variant-numeric: tabular-nums;
}

.period-item__input:focus {
  border-color: var(--accent);
}

.period-item__sep {
  color: var(--text-placeholder);
  font-size: 14px;
}

.settings__footer {
  padding: 12px 16px;
  padding-bottom: max(12px, env(safe-area-inset-bottom));
  background: var(--bg-secondary);
  border-top: 1px solid var(--border-primary);
  display: flex;
  gap: 10px;
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
</style>
