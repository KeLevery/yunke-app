<script setup>
import { inject } from 'vue'
import { DEFAULT_PERIODS } from '../utils/schedule'

const props = defineProps({
  course: { type: Object, required: true }
})

const emit = defineEmits(['click'])

const periods = inject('periods', DEFAULT_PERIODS)

function getTimeRange(course) {
  const start = periods.find(p => p.period === course.startPeriod)
  const end = periods.find(p => p.period === course.endPeriod)
  return start && end ? `${start.start}-${end.end}` : ''
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
  transition: background 0.12s ease;
}

.course-card:active {
  background: var(--card-color-mid);
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
</style>
