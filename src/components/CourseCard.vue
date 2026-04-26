<script setup>
import { usePeriods } from '../composables/usePeriods'

const props = defineProps({
  course: { type: Object, required: true }
})

const emit = defineEmits(['click'])

const { getTimeRange: getTimeRangeUtil } = usePeriods()

function getTimeRange(course) {
  return getTimeRangeUtil(course.startPeriod, course.endPeriod)
}
</script>

<template>
  <div
    class="course-card"
    :style="{
      '--card-color': course.color,
      '--card-color-light': course.color + '18',
      '--card-color-mid': course.color + '30'
    }"
    @click="emit('click', course)"
    :title="`${course.name}${course.location ? ' · ' + course.location : ''}${course.teacher ? ' · ' + course.teacher : ''}`"
  >
    <div class="course-card__name">{{ course.name }}</div>
    <div v-if="course.location" class="course-card__location">{{ course.location }}</div>
    <div v-if="course.teacher" class="course-card__teacher">{{ course.teacher }}</div>
  </div>
</template>

<style scoped>
.course-card {
  padding: 4px 6px;
  border-radius: 4px;
  background: var(--card-color-light);
  border-left: 3px solid var(--card-color);
  cursor: pointer;
  overflow: hidden;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  gap: 1px;
  line-height: 1.3;
  min-height: 0;
  position: relative;
  isolation: isolate;
  transition: background 0.16s ease, transform 0.16s ease, box-shadow 0.16s ease;
  animation: courseCardIn 0.3s cubic-bezier(0.22, 1, 0.36, 1) both;
}

.course-card::after {
  content: '';
  position: absolute;
  inset: -20%;
  background: radial-gradient(circle, var(--card-color-mid) 0%, transparent 62%);
  transform: scale(0);
  opacity: 0;
  transition: transform 0.35s ease, opacity 0.35s ease;
  pointer-events: none;
  z-index: 0;
}

@media (hover: hover) {
  .course-card:hover {
    background: var(--card-color-mid);
    transform: translateY(-1px);
    box-shadow: var(--shadow-card);
  }
}

.course-card:active {
  background: var(--card-color-mid);
  transform: scale(0.97);
}

.course-card:active::after {
  transform: scale(1);
  opacity: 0.55;
  transition: 0s;
}

.course-card__name {
  font-size: 11px;
  font-weight: 600;
  color: var(--card-color);
  line-height: 1.3;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  word-break: break-all;
  flex: 2 1 0;
  min-height: 0;
}

.course-card__location {
  font-size: 9px;
  color: var(--text-secondary);
  line-height: 1.3;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  word-break: break-all;
  flex: 1 1 0;
  min-height: 0;
}

.course-card__teacher {
  font-size: 9px;
  color: var(--text-tertiary);
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 0 0 auto;
  min-height: 0;
}

.course-card__name,
.course-card__location,
.course-card__teacher {
  position: relative;
  z-index: 1;
}

@keyframes courseCardIn {
  from {
    opacity: 0;
    transform: translateY(6px) scale(0.97);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
</style>
