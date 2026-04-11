---
name: fluid-cloud-notification
overview: 在云课 App 中实现"流体云"（类灵动岛/药丸丸）课程提醒效果，当课程快要开始时，在屏幕顶部显示一个流体形态的浮动提醒组件。
design:
  architecture:
    framework: vue
  styleKeywords:
    - Glassmorphism
    - Fluid Motion
    - Capsule Shape
    - Pill Notification
    - Elastic Animation
    - Breathing Glow
    - Morphing Transition
  fontSystem:
    fontFamily: PingFang SC, -apple-system, SF Pro Text
    heading:
      size: 15px
      weight: 700
    subheading:
      size: 13px
      weight: 600
    body:
      size: 12px
      weight: 400
  colorSystem:
    primary:
      - "#4A90D9"
      - "#58a6ff"
    background:
      - rgba(0,0,0,0.55)
      - rgba(255,255,255,0.12)
    text:
      - "#FFFFFF"
      - "#E6EDF3"
    functional:
      - "#E74C3C"
      - "#27AE60"
      - "#F39C12"
todos:
  - id: create-fluid-cloud-component
    content: 创建 FluidCloud.vue 仿流体云组件，实现胶囊形态、展开/收起、倒计时、CSS 流体动画及课程检测逻辑
    status: completed
  - id: integrate-to-app-vue
    content: 在 App.vue 中全局引入 FluidCloud 组件，传入 darkMode 状态，确保跨页面持久显示
    status: completed
    dependencies:
      - create-fluid-cloud-component
---

## 产品概述

在云课 App 中实现**流体云课程提醒**功能：当课程快要开始时，在屏幕顶部弹出一个仿流体云（类似 iOS 灵动岛 / OPPO 流体云 / 小米胶囊）形态的浮动提醒卡片，以流畅的动画效果提醒用户即将上课，并展示课程关键信息（名称、地点、时间、倒计时）。

## 核心功能

- **仿流体云组件**：在 App 顶部居中显示一个圆角药丸/胶囊形状的浮动卡片，具有流体感的 CSS 动画（呼吸光晕、弹性缩放、平滑形变）
- **智能检测逻辑**：定时器每 30 秒扫描当天课程表，当当前时间距离下一节课开始时间 <= 设定提前分钟数时触发流体云展示
- **课程信息展示**：显示课程名称、教室地点、上课时间、剩余分钟倒计时
- **交互体验**：
- 初始以小胶囊形态从顶部滑入 + 弹性动画
- 点击展开为完整卡片（显示更多详情），再次点击收起
- 左滑/右滑可关闭，或点击关闭按钮关闭
- 支持自动消失（课程开始后或超时后淡出）
- **全局挂载**：作为全局组件挂在 `App.vue` 中，所有页面均可显示，不随路由切换而销毁复用
- **设置联动**：复用现有的课前通知开关和提前时间设置（`notification.js` 中的配置）

## Tech Stack

- 前端框架: Vue 3 Composition API (`<script setup>`)
- 样式方案: 纯 CSS（与项目现有风格一致，使用 CSS 变量）
- 动画方案: CSS `@keyframes` 动画 + `transition` 过渡 + `backdrop-filter` 毛玻璃
- 定时检测: `setInterval` + `Date` 时间比对逻辑
- 数据来源: 复用 `storage.js`(课程数据) + `schedule.js`(节次时间) + `notification.js`(通知配置)

## 技术架构

### 系统架构

```
App.vue (全局入口)
├── <FluidCloud> (全局流体云组件, fixed 定位覆盖顶层)
│   ├── 定时检测模块 (每30s扫描课程)
│   ├── 渲染状态机 (hidden → pill → expanded → dismissed)
│   └── 交互处理 (点击展开/收起、滑动关闭)
├── <router-view> (页面内容)
```

### 核心设计决策

1. **纯 CSS 实现流体感** — 使用 `border-radius: 999px` 胶囊形状 + 多层 `box-shadow` 光晕 + CSS `@keyframes` 呼吸动画 + `backdrop-filter: blur()` 毛玻璃效果模拟流体云质感。无需 Canvas/WebGL，性能最优。
2. **状态机驱动 UI** — 组件内部维护 `visible`/`expanded`/`course`/`countdown` 四个核心响应式状态，通过组合控制不同的视觉呈现。
3. **检测策略** — 采用 `setInterval` 每 30 秒轮询一次当天课程（而非 Web Worker 或复杂调度），因为课程数据量极小（通常每天 <10 节课），且 30 秒精度对"提前提醒"场景完全够用。同时监听页面 `visibilitychange` 事件避免后台空跑。
4. **与现有通知系统共存** — 流体云是应用内的增强提醒（用户打开 App 时可见），与 `@capacitor/local-notifications` 的系统级推送（App 在后台时的通知）互补，共享同一套开关和提前时间设置。
5. **安全区域适配** — 使用 `env(safe-area-inset-top)` 确保流体云不会遮挡刘海/状态栏区域。

### 关键实现细节

- **课程匹配算法**: 从 `loadCourses()` 加载全部课程 → 按 `dayOfWeek === today` 过滤 → 检查 `weeks.includes(currentWeek)` → 找到 `startPeriod` 最小的未来课程 → 用 `periods[startPeriod-1].start` 计算精确开课时间 → 与 `now` 对比差值
- **倒计时格式**: 动态计算 `Math.ceil((courseStart - now) / 60000)` 分钟数，每秒更新
- **动画时机**: 
- 进入: `translateY(-100%)` → `translateY(0)` + `scale(0.8)→scale(1)` 弹性 (400ms cubic-bezier)
- 展开: `width: auto` + 高度扩展 (300ms ease)
- 退出: `opacity: 0` + `transform: translateY(-20px) scale(0.9)` (250ms)

## 目录结构

```
yunke-app/src/
├── components/
│   └── FluidCloud.vue           # [NEW] 仿流体云课程提醒组件 (~350行)
├── utils/
│   ├── storage.js               # [MODIFY] 无需修改（直接复用 loadCourses/loadPeriods）
│   ├── schedule.js              # [MODIFY] 无需修改（复用 DEFAULT_PERIODS/getCurrentWeekNumber）
│   └── notification.js          # [MODIFY] 无需修改（复用 isNotificationEnabled/getNotificationMinutes）
└── App.vue                      # [MODIFY] 引入并挂载 FluidCloud 全局组件 (~15行改动)
```

## 性能考量

- 定时器间隔 30 秒，CPU 占用可忽略
- 页面不可见时暂停检测（visibilitychange 监听）
- CSS 动画由 GPU 合成层加速（transform/opacity 触发硬件加速）
- 组件卸载时清理所有定时器和事件监听器（onBeforeUnmount）

## 设计概述

流体云组件是一个悬浮在屏幕顶部的**胶囊/药丸形状**浮动卡片，采用现代 Glassmorphism（毛玻璃）风格设计，配合柔和的渐变色和动态光效，营造出类似 iOS 灵动岛 / OPPO 流体云的视觉感受。

## 设计风格

**Glassmorphism + Fluid Motion（玻璃态 + 流体动效）**

整体风格关键词：通透、流动、精致、不打扰但醒目。

### 视觉层次

1. **背景层** — 半透明模糊毛玻璃底板（backdrop-filter: blur(20px) saturate(180%)），带微妙渐变边框
2. **内容层** — 课程信息文字，紧凑排版，高对比度确保可读性
3. **装饰层** — 外围柔和发光阴影（多层 box-shadow）+ 底部微妙的颜色指示条（使用课程自身颜色）

### 形态变化

- **收缩态（Pill）**: 约 200px 宽 x 44px 高的小胶囊，仅显示课程名 + 倒计时，居中悬浮于顶部
- **展开态（Expanded）**: 约 320px 宽 x 自适应高度的完整卡片，显示课程全名 + 地点 + 教室 + 上课时间 + 倒计时大字 + 关闭按钮
- **进入动画**: 从顶部向下弹出，伴随弹性缩放效果（先放大再回弹至正常大小）
- **退出动画**: 向上淡出并轻微缩小

### 配色方案

- 背景: 半透明深色（light 模式 rgba(0,0,0,0.55) / dark 模式 rgba(255,255,255,0.12)）
- 文字: 白色/浅色文字（两种模式统一用亮色文字以确保在半透明背景上的对比度）
- 强调色: 取自课程自身的 color 属性，用于底部指示条和倒计时数字
- 发光: 使用课程颜色的 30% 透明度版本作为外发光色

## Agent Extensions

### Skill: vue-best-practices

- **Purpose**: 确保流体云组件遵循 Vue 3 最佳实践，使用 Composition API `<script setup>`、合理的响应式设计、正确的生命周期管理
- **Expected outcome**: 产出符合 Vue 3 规范的高质量组件代码，包含完善的 ref/computed/onMounted/onBeforeUnmount 使用

### Skill: ui-ux-pro-max

- **Purpose**: 提供流体云组件的视觉设计方案指导，包括配色、动画曲线、交互模式等 UI/UX 专业建议
- **Expected outcome**: 精致的流体云视觉效果，符合现代移动端设计趋势的交互动效