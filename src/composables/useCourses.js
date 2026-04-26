import { ref, readonly } from 'vue'
import { loadCourses as loadFromStorage, addCourse as addToStorage, updateCourse as updateInStorage, deleteCourse as deleteFromStorage, COURSES_CHANGED_EVENT } from '../utils/storage'

const courses = ref([])
let initialized = false
let listening = false

function syncFromStorage() {
  courses.value = loadFromStorage() || []
}

function ensureCourseChangeListener() {
  if (listening || typeof window === 'undefined') return
  window.addEventListener(COURSES_CHANGED_EVENT, syncFromStorage)
  listening = true
}

export function useCourses() {
  if (!initialized) {
    syncFromStorage()
    initialized = true
  }
  ensureCourseChangeListener()

  function refresh() {
    syncFromStorage()
  }

  function addCourse(course) {
    const newCourse = addToStorage(course)
    syncFromStorage()
    return newCourse
  }

  function updateCourse(id, data) {
    const updated = updateInStorage(id, data)
    if (updated) {
      syncFromStorage()
    }
    return updated
  }

  function deleteCourse(id) {
    deleteFromStorage(id)
    syncFromStorage()
  }

  return {
    courses: readonly(courses),
    refresh,
    addCourse,
    updateCourse,
    deleteCourse
  }
}
