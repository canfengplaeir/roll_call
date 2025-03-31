import { createApp } from 'vue'
import App from './App.vue'
import './index.css'
import router from './router'
import IconPlugin from './plugins/icons'
import { MotionPlugin } from '@vueuse/motion'

const app = createApp(App)
app.use(IconPlugin)
app.use(router)
app.use(MotionPlugin)
app.mount('#app')
