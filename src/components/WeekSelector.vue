<script setup>
import { computed, ref } from 'vue'
import { getCurrentWeekNumber, getWeekDateRange, formatDate } from '../utils/schedule'

const props = defineProps({
  weekNumber: { type: Number, required: true }
})

const emit = defineEmits(['change'])

const showWeekPicker = ref(false)

const currentWeekNumber = computed(() => getCurrentWeekNumber())
const isCurrentWeek = computed(() => props.weekNumber === currentWeekNumber.value)

const dateRangeText = computed(() => {
  const { monday, sunday } = getWeekDateRange(props.weekNumber)
  return `${formatDate(monday)} - ${formatDate(sunday)}`
})

const weekOptions = computed(() => {
  return Array.from({ length: 25 }, (_, index) => {
    const week = index + 1
    const { monday, sunday } = getWeekDateRange(week)
    return {
      week,
      dateText: `${formatDate(monday)}-${formatDate(sunday)}`
    }
  })
})

function prevWeek() {
  if (props.weekNumber > 1) {
    emit('change', props.weekNumber - 1)
  }
}

function nextWeek() {
  if (props.weekNumber < 25) {
    emit('change', props.weekNumber + 1)
  }
}

function goToday() {
  emit('change', currentWeekNumber.value)
  showWeekPicker.value = false
}

function selectWeek(week) {
  emit('change', week)
  showWeekPicker.value = false
}

function openWeekPicker() {
  showWeekPicker.value = true
}
</script>

<template>
  <div class="week-selector">
    <button class="week-selector__btn" :disabled="weekNumber <= 1" title="上一周" @click="prevWeek">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
    </button>

    <div class="week-selector__info" @click="openWeekPicker">
      <span class="week-selector__week">第{{ weekNumber }}周</span>
      <span class="week-selector__date">{{ dateRangeText }}</span>
      <button v-if="!isCurrentWeek" class="week-selector__today" type="button" @click.stop="goToday">回本周</button>
    </div>

    <button class="week-selector__btn" :disabled="weekNumber >= 25" title="下一周" @click="nextWeek">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
    </button>

    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showWeekPicker" class="week-picker-overlay" @click.self="showWeekPicker = false">
          <div class="week-picker">
            <div class="week-picker__handle"></div>
            <div class="week-picker__header">
              <span class="week-picker__title">选择周次</span>
              <button class="week-picker__today-btn" type="button" @click="goToday">回到本周</button>
            </div>
            <div class="week-picker__grid">
              <button
                v-for="option in weekOptions"
                :key="option.week"
                class="week-picker__item"
                :class="{
                  'week-picker__item--active': option.week === weekNumber,
                  'week-picker__item--current': option.week === currentWeekNumber
                }"
                type="button"
                @click="selectWeek(option.week)"
              >
                <span class="week-picker__num">{{ option.week }}</span>
                <span class="week-picker__date">{{ option.dateText }}</span>
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.week-selector {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 8px 16px;
  background: var(--glass-bg);
  backdrop-filter: blur(18px) saturate(170%);
  -webkit-backdrop-filter: blur(18px) saturate(170%);
  border-bottom: 1px solid var(--glass-border);
  animation: fadeInUp 0.4s cubic-bezier(0.22, 1, 0.36, 1) 0.04s both;
  position: relative;
  z-index: 8;
}

.week-selector__btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border: none;
  border-radius: 10px;
  background: var(--bg-tertiary);
  color: var(--accent);
  cursor: pointer;
  transition: background 0.2s;
}

.week-selector__btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.week-selector__btn:not(:disabled):active {
  background: var(--bg-hover);
}

.week-selector__info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  cursor: pointer;
  position: relative;
  min-width: 104px;
  padding: 4px 12px;
  border-radius: 10px;
  transition: background 0.15s;
}

.week-selector__info:active {
  background: var(--bg-tertiary);
}

.week-selector__week {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary);
}

.week-selector__date {
  font-size: 11px;
  color: var(--text-tertiary);
  font-variant-numeric: tabular-nums;
}

.week-selector__today {
  margin-top: 1px;
  padding: 1px 6px;
  border: none;
  border-radius: 999px;
  background: var(--accent-light);
  color: var(--accent);
  font-size: 10px;
  font-weight: 600;
  cursor: pointer;
}

.week-picker-overlay {
  position: fixed;
  inset: 0;
  background: var(--modal-overlay);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 100;
}

.week-picker {
  background: var(--modal-bg);
  border-radius: 20px 20px 0 0;
  padding: 16px 16px 24px;
  width: 100%;
  max-width: 480px;
  max-height: 70vh;
  overflow: auto;
  animation: modalSpringIn 0.34s cubic-bezier(0.16, 1, 0.3, 1);
}

.week-picker__handle {
  width: 36px;
  height: 4px;
  border-radius: 2px;
  background: var(--border-secondary);
  margin: 0 auto 14px;
}

.week-picker__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.week-picker__title {
  font-size: 17px;
  font-weight: 700;
  color: var(--text-primary);
}

.week-picker__today-btn {
  padding: 5px 12px;
  border: 1.5px solid var(--accent);
  border-radius: 8px;
  background: transparent;
  color: var(--accent);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}

.week-picker__today-btn:active {
  background: var(--accent);
  color: #fff;
}

.week-picker__grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 6px;
}

.week-picker__item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  min-height: 50px;
  padding: 8px 4px;
  border: 1.5px solid var(--border-secondary);
  border-radius: 10px;
  background: var(--bg-secondary);
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, transform 0.15s;
}

.week-picker__item:active {
  transform: scale(0.95);
}

.week-picker__item--active {
  border-color: var(--accent);
  background: var(--accent);
}

.week-picker__item--current:not(.week-picker__item--active) {
  border-color: var(--accent);
}

.week-picker__num {
  font-size: 15px;
  font-weight: 700;
  color: var(--text-primary);
}

.week-picker__item--active .week-picker__num {
  color: #fff;
}

.week-picker__date {
  font-size: 8px;
  color: var(--text-tertiary);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.week-picker__item--active .week-picker__date {
  color: rgba(255, 255, 255, 0.8);
}

.week-picker__item--current:not(.week-picker__item--active) .week-picker__num {
  color: var(--accent);
}

@keyframes modalSpringIn {
  0% { transform: translateY(40px); opacity: 0; }
  100% { transform: translateY(0); opacity: 1; }
}

.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
</style>
