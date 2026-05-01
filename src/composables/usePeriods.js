import { ref, readonly } from 'vue'
import { loadPeriods as loadFromStorage, savePeriods, PERIODS_CHANGED_EVENT } from '../utils/storage'
import { DEFAULT_PERIODS } from '../utils/schedule'

const periods = ref([...DEFAULT_PERIODS])
let initialized = false
let listening = false

export function usePeriods() {
  if (!initialized) {
    const custom = loadFromStorage()
    if (custom) periods.value = custom
    initialized = true
  }

  if (!listening && typeof window !== 'undefined') {
    window.addEventListener(PERIODS_CHANGED_EVENT, event => {
      if (Array.isArray(event.detail)) periods.value = event.detail
    })
    listening = true
  }

  function refresh() {
    const custom = loadFromStorage()
    periods.value = custom || [...DEFAULT_PERIODS]
  }

  function updatePeriods(newPeriods) {
    savePeriods(newPeriods)
    periods.value = newPeriods
  }

  function getTimeRange(startPeriod, endPeriod) {
    const start = periods.value.find(p => p.period === startPeriod)
    const end = periods.value.find(p => p.period === endPeriod)
    return start && end ? `${start.start}-${end.end}` : ''
  }

  function getPeriodLabel(startPeriod, endPeriod) {
    return `${startPeriod}-${endPeriod}节`
  }

  return {
    periods: readonly(periods),
    refresh,
    updatePeriods,
    getTimeRange,
    getPeriodLabel
  }
}
