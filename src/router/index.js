import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'WeekView',
    component: () => import('../views/WeekView.vue'),
    meta: { title: '周视图' }
  },
  {
    path: '/courses',
    name: 'CourseList',
    component: () => import('../views/CourseList.vue'),
    meta: { title: '课程列表' }
  },
  {
    path: '/course/add',
    name: 'CourseAdd',
    component: () => import('../views/CourseForm.vue'),
    meta: { title: '添加课程' }
  },
  {
    path: '/course/edit/:id',
    name: 'CourseEdit',
    component: () => import('../views/CourseForm.vue'),
    meta: { title: '编辑课程' }
  },
  {
    path: '/settings',
    name: 'Settings',
    component: () => import('../views/Settings.vue'),
    meta: { title: '时间设置' }
  },
  {
    path: '/import',
    name: 'PdfImport',
    component: () => import('../views/PdfImport.vue'),
    meta: { title: '导入课表' }
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

router.beforeEach((to) => {
  document.title = to.meta.title ? `${to.meta.title} - 云课` : '云课'
})

export default router
