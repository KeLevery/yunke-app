import { ref, watch, onMounted } from 'vue'

const darkMode = ref(false)

export function useTheme() {
  onMounted(() => {
    const saved = localStorage.getItem('yunke_dark_mode')
    if (saved !== null) {
      darkMode.value = saved === 'true'
    } else {
      darkMode.value = window.matchMedia('(prefers-color-scheme: dark)').matches
    }
    applyTheme()
  })

  watch(darkMode, () => {
    localStorage.setItem('yunke_dark_mode', darkMode.value)
    applyTheme()
  })

  function applyTheme() {
    document.documentElement.setAttribute('data-theme', darkMode.value ? 'dark' : 'light')
  }

  function toggleDarkMode() {
    darkMode.value = !darkMode.value
  }

  return {
    darkMode,
    toggleDarkMode
  }
}
