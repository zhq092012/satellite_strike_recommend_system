<script setup lang="ts">
/**
 * @fileoverview 右侧面板战术快速停靠栏组件 (Quick Dock)
 * 当所有右侧面板均处于收起状态时，在屏幕右侧边缘显示精致的军工折角快捷展开标签，
 * 供指挥员快速一键展开卫星遥测、战场任务或武器链路面板。
 */

import { Activity, Layers, Crosshair } from 'lucide-vue-next'
import { useRightPanelState, RightPanelType } from '../../composables/useRightPanelState'

/**
 * 引入右侧面板互斥状态管理 Composable
 */
const { activeRightPanel, setActivePanel } = useRightPanelState()

/**
 * 快捷独占展开指定的右侧面板
 *
 * @param panel - 目标面板类型 ('TELEMETRY' | 'BATTLEFIELD' | 'TACTICAL_ASSETS')
 */
function handleOpen(panel: RightPanelType): void {
  setActivePanel(panel)
}
</script>

<template>
  <div
    v-if="activeRightPanel === 'NONE'"
    class="fixed right-2 top-24 z-20 flex flex-col gap-2 font-mono select-none animate-fade-in"
  >
    <!-- 1. 展开卫星遥测 -->
    <button
      @click="handleOpen('TELEMETRY')"
      class="group flex items-center gap-1.5 pl-2.5 pr-2.5 py-1.5 rounded-l tactical-panel border-r-0 border-tactical-cyan/40 hover:border-tactical-cyan hover:bg-tactical-dark text-tactical-cyan text-xs font-bold shadow-glow-cyan transition-all hover:-translate-x-1"
      title="展开卫星目标精密遥测面板"
    >
      <Activity class="w-3.5 h-3.5 animate-pulse" />
      <span class="text-[11px] tracking-wider">遥测</span>
    </button>

    <!-- 2. 展开战场任务 -->
    <button
      @click="handleOpen('BATTLEFIELD')"
      class="group flex items-center gap-1.5 pl-2.5 pr-2.5 py-1.5 rounded-l tactical-panel border-r-0 border-tactical-border/80 hover:border-tactical-cyan hover:bg-tactical-dark text-tactical-text hover:text-tactical-cyan text-xs font-bold transition-all hover:-translate-x-1"
      title="展开战场空域与作战任务管理抽屉"
    >
      <Layers class="w-3.5 h-3.5" />
      <span class="text-[11px] tracking-wider">战区</span>
    </button>

    <!-- 3. 展开武器装备与链路 -->
    <button
      @click="handleOpen('TACTICAL_ASSETS')"
      class="group flex items-center gap-1.5 pl-2.5 pr-2.5 py-1.5 rounded-l tactical-panel border-r-0 border-cyan-500/40 hover:border-cyan-400 hover:bg-tactical-dark text-cyan-300 text-xs font-bold shadow-[0_0_10px_rgba(6,182,212,0.2)] transition-all hover:-translate-x-1"
      title="展开武器系统与天基数据链路抽屉"
    >
      <Crosshair class="w-3.5 h-3.5" />
      <span class="text-[11px] tracking-wider">武器</span>
    </button>
  </div>
</template>
