import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import cesium from 'vite-plugin-cesium'
import path from 'path'

/**
 * Vite 核心构建与开发服务器配置
 * 集成了 Vue 3 插件、Cesium 静态资产自动配置插件以及路径别名解析
 */
export default defineConfig({
  plugins: [
    /** Vue 3 单文件组件 (SFC) 支持插件 */
    vue(),
    /** Cesium 静态资产自动拷贝与全局注入插件 */
    cesium()
  ],
  resolve: {
    alias: {
      /** 源码根路径别名映射 */
      '@': path.resolve(__dirname, './src')
    }
  },
  server: {
    /** 开发服务监听端口 */
    port: 3000,
    /** 是否在浏览器中自动打开 */
    open: false,
    /** 允许外部网络访问 */
    host: true
  }
})
