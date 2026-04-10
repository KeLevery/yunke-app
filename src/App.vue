<script setup>
import { ref, watch, onMounted } from 'vue'

const darkMode = ref(false)

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
</script>

<template>
  <router-view v-slot="{ Component }">
    <Transition name="page" mode="out-in">
      <component :is="Component" :dark-mode="darkMode" @toggle-dark="toggleDarkMode" />
    </Transition>
  </router-view>
</template>

<style>
/* ========== 主题变量 ========== */
:root,
[data-theme="light"] {
  --bg-primary: #f5f7fb;
  --bg-secondary: #ffffff;
  --bg-tertiary: #f0f4f8;
  --bg-hover: #e8edf2;
  --bg-active: #f0f5fc;

  --text-primary: #2c3e50;
  --text-secondary: #5d6d7e;
  --text-tertiary: #95a5a6;
  --text-placeholder: #c8d6e5;

  --border-primary: #edf1f7;
  --border-secondary: #e8edf2;
  --border-cell: #f4f6f9;

  --accent: #4A90D9;
  --accent-light: rgba(74, 144, 217, 0.08);
  --accent-hover: #357ABD;

  --danger: #e74c3c;
  --danger-bg: #fff5f5;
  --danger-border: #f5c6cb;

  --shadow-card: 0 2px 12px rgba(0,0,0,0.05);
  --shadow-elevated: 0 12px 40px rgba(0,0,0,0.15);

  --modal-overlay: rgba(0,0,0,0.45);
  --modal-bg: #ffffff;

  --course-card-location: #666;
  --course-card-time: #999;
}

[data-theme="dark"] {
  --bg-primary: #0d1117;
  --bg-secondary: #161b22;
  --bg-tertiary: #1c2333;
  --bg-hover: #252d3a;
  --bg-active: #1a2436;

  --text-primary: #e6edf3;
  --text-secondary: #8b949e;
  --text-tertiary: #6e7681;
  --text-placeholder: #3d444d;

  --border-primary: #21262d;
  --border-secondary: #30363d;
  --border-cell: #1c2128;

  --accent: #58a6ff;
  --accent-light: rgba(88, 166, 255, 0.1);
  --accent-hover: #79b8ff;

  --danger: #f85149;
  --danger-bg: #1c1215;
  --danger-border: #3d2224;

  --shadow-card: 0 2px 12px rgba(0,0,0,0.3);
  --shadow-elevated: 0 12px 40px rgba(0,0,0,0.5);

  --modal-overlay: rgba(0,0,0,0.65);
  --modal-bg: #1c2333;

  --course-card-location: #8b949e;
  --course-card-time: #6e7681;
}

/* 全局重置 */
*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html {
  font-size: 16px;
  -webkit-text-size-adjust: 100%;
  -webkit-tap-highlight-color: transparent;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
  background: var(--bg-primary);
  color: var(--text-primary);
  line-height: 1.5;
  overflow-x: hidden;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  font-feature-settings: 'kern' 1;
  text-rendering: optimizeLegibility;
  transition: background 0.3s, color 0.3s;
}

#app {
  width: 100vw;
  min-height: 100vh;
  min-height: 100dvh;
  overflow: hidden;
}

input,
select,
textarea,
button {
  font-family: inherit;
  font-size: inherit;
}

button {
  -webkit-appearance: none;
  appearance: none;
}

select {
  -webkit-appearance: none;
  appearance: none;
}

/* 页面切换动画 */
.page-enter-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.page-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.page-enter-from {
  opacity: 0;
  transform: translateX(16px);
}

.page-leave-to {
  opacity: 0;
  transform: translateX(-8px);
}

/* 滚动条隐藏 */
::-webkit-scrollbar {
  width: 0;
  height: 0;
}
</style>
