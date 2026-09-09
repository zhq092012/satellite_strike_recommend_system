/**
 * @fileoverview 卫星态势分析系统客户端主入口文件
 * 挂载 Vue 3 应用实例并导入全局 Tailwind 与战术样式表
 */

import { createApp } from 'vue'
import App from './App.vue'
import './style.css'

/**
 * 根 Vue 应用实例
 */
const app = createApp(App)

// 挂载到 index.html 中的 #app 容器
app.mount('#app')
