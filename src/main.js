import { createApp } from 'vue'
import { Capacitor } from '@capacitor/core'
import { App as CapApp } from '@capacitor/app'
import App from './App.vue'
import router from './router'

const app = createApp(App)
app.use(router)
app.mount('#app')

// 拦截 Android 返回键，改为路由返回而非退出应用
if (Capacitor.isNativePlatform()) {
  CapApp.addListener('backButton', () => {
    if (router.currentRoute.value.path === '/') {
      // 首页再按返回才退出
      CapApp.exitApp()
    } else {
      router.back()
    }
  })

  // 延迟初始化课前提醒通知，避免阻塞启动
  setTimeout(() => {
    import('./utils/notification').then(({ initNotifications }) => {
      initNotifications()
    })
  }, 2000)
}
