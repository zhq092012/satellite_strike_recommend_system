/// <reference types="vite/client" />

/**
 * Vue 3 SFC 单文件组件全局模块声明
 */
declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}
