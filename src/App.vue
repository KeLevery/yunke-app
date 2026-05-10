<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useTheme } from './composables/useTheme'
import FluidCloud from './components/FluidCloud.vue'

const { toggleDarkMode } = useTheme()
const router = useRouter()
const transitionName = ref('fade-scale')

router.beforeEach((to, from) => {
  const toDepth = to.meta.depth ?? 0
  const fromDepth = from.meta.depth ?? 0
  transitionName.value = toDepth > fromDepth ? 'slide-right' : toDepth < fromDepth ? 'slide-left' : 'fade-scale'
})
</script>

<template>
  <FluidCloud />
  <router-view v-slot="{ Component, route }">
    <Transition :name="transitionName" appear>
      <component :is="Component" :key="route.fullPath" @toggle-dark="toggleDarkMode" />
    </Transition>
  </router-view>
</template>

<style>
/* ========== 主题变量 ========== */
:root,
[data-theme="light"] {
  --ease-route-enter: cubic-bezier(0.19, 1, 0.22, 1);
  --ease-route-leave: cubic-bezier(0.22, 1, 0.36, 1);
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

  --glass-bg: rgba(255, 255, 255, 0.72);
  --glass-border: rgba(255, 255, 255, 0.3);
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

  --glass-bg: rgba(22, 27, 34, 0.72);
  --glass-border: rgba(48, 54, 61, 0.3);
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

/* ========== 方向感知页面切换动画 ========== */

/* 轻微位移 + 交叉淡入，避免子页面切换时横向冲击过强 */
.slide-right-enter-active,
.slide-left-enter-active,
.fade-scale-enter-active {
  position: relative;
  z-index: 2;
  transition:
    transform 0.48s var(--ease-route-enter),
    opacity 0.44s ease-out;
  will-change: transform, opacity;
}

.slide-right-leave-active,
.slide-left-leave-active,
.fade-scale-leave-active {
  position: fixed;
  inset: 0;
  width: 100%;
  z-index: 1;
  pointer-events: none;
  transition:
    transform 0.36s var(--ease-route-leave),
    opacity 0.3s ease-out;
  will-change: transform, opacity;
}

.slide-right-enter-from {
  opacity: 0;
  transform: translate3d(14px, 0, 0);
}
.slide-right-leave-to {
  opacity: 0;
  transform: translate3d(-6px, 0, 0);
}

.slide-left-enter-from {
  opacity: 0;
  transform: translate3d(-14px, 0, 0);
}
.slide-left-leave-to {
  opacity: 0;
  transform: translate3d(6px, 0, 0);
}

.fade-scale-enter-from {
  opacity: 0;
  transform: translate3d(0, 5px, 0) scale(0.997);
}
.fade-scale-leave-to {
  opacity: 0;
  transform: translate3d(0, -3px, 0) scale(1.001);
}

/* ========== 通用动画工具类 ========== */

/* 渐入上浮 — 用于页面内元素入场 */
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 渐入缩放 — 用于卡片入场 */
@keyframes fadeInScale {
  from {
    opacity: 0;
    transform: scale(0.985);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

/* 弹性缩放 — 用于按钮点击 */
@keyframes bouncePress {
  0% { transform: scale(1); }
  45% { transform: scale(0.96); }
  75% { transform: scale(1.005); }
  100% { transform: scale(1); }
}

/* 涟漪扩散 */
@keyframes rippleExpand {
  from {
    transform: scale(0);
    opacity: 0.4;
  }
  to {
    transform: scale(2.5);
    opacity: 0;
  }
}

/* 柔和呼吸光晕 */
@keyframes softGlow {
  0%, 100% { box-shadow: 0 0 0 0 rgba(74, 144, 217, 0); }
  50% { box-shadow: 0 0 0 6px rgba(74, 144, 217, 0.1); }
}

/* 滚动条隐藏 */
::-webkit-scrollbar {
  width: 0;
  height: 0;
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    scroll-behavior: auto !important;
    transition-duration: 0.01ms !important;
  }
}
</style>
