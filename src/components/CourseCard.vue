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
      '--card-color-light': course.color + '22',
      '--card-color-mid': course.color + '40'
    }"
    @click="emit('click', course)"
  >
    <div class="course-card__name">{{ course.name }}</div>
    <div class="course-card__location">{{ course.location }}</div>
    <div class="course-card__time">
      {{ course.startPeriod }}-{{ course.endPeriod }}节
    </div>
  </div>
</template>

<style scoped>
.course-card {
  padding: 5px 7px;
  border-radius: 6px;
  background: var(--card-color-light);
  border-left: 3px solid var(--card-color);
  cursor: pointer;
  transition: transform 0.12s ease, box-shadow 0.12s ease;
  overflow: hidden;
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.course-card:active {
  transform: scale(0.97);
  background: var(--card-color-mid);
}

.course-card__name {
  font-size: 11px;
  font-weight: 700;
  color: var(--card-color);
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.course-card__location {
  font-size: 9px;
  color: var(--course-card-location);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.course-card__time {
  font-size: 8px;
  color: var(--course-card-time);
  font-variant-numeric: tabular-nums;
}
</style>
