import { ref, computed, readonly } from 'vue'
import { loadPeriods as loadFromStorage, savePeriods } from '../utils/storage'
import { DEFAULT_PERIODS } from '../utils/schedule'

const periods = ref([...DEFAULT_PERIODS])
let initialized = false

export function usePeriods() {
  if (!initialized) {
    const custom = loadFromStorage()
    if (custom) periods.value = custom
    initialized = true
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
