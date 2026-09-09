<script setup lang="ts">
/**
 * @fileoverview 作战计划六步决策向导主模态框组件 (CombatPlanningModal.vue)
 * 组织六步全闭环式作战计划推演流，包含全屏战术毛玻璃容器、顶部 1-6 步骤导航器、各步分面板插槽及底部步进控制器
 */

import { onMounted, onUnmounted, computed } from 'vue'
import {
  X,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Clock,
  Globe,
  Crosshair,
  CalendarRange,
  FileCheck,
  Zap,
  Save
} from 'lucide-vue-next'
import { useCombatPlanState, CombatPlanStep } from '../../composables/useCombatPlanState'
import Step1ThreatAnalysis from './Step1ThreatAnalysis.vue'
import Step2LinkOverpassTopology from './Step2LinkOverpassTopology.vue'
import Step3CoverageAnalysis from './Step3CoverageAnalysis.vue'
import Step4StrikeFeasibility from './Step4StrikeFeasibility.vue'
import Step5WeaponMatchingGantt from './Step5WeaponMatchingGantt.vue'
import Step6PlanExport from './Step6PlanExport.vue'

/**
 * 引入作战计划状态管理
 */
const {
  isCombatPlanModalOpen,
  currentStep,
  closeCombatPlanModal,
  goToStep,
  nextStep,
  prevStep,
  savePlanToMissions
} = useCombatPlanState()

/**
 * 步骤条配置列表
 */
const stepsConfig = [
  { step: CombatPlanStep.THREAT_ANALYSIS, title: '分析威胁度', icon: ShieldAlert },
  { step: CombatPlanStep.LINK_TOPOLOGY, title: '链路时长与四层拓扑', icon: Clock },
  { step: CombatPlanStep.COVERAGE_ANALYSIS, title: '分析覆盖率', icon: Globe },
  { step: CombatPlanStep.STRIKE_FEASIBILITY, title: '分析可打击度', icon: Crosshair },
  { step: CombatPlanStep.WEAPON_MATCHING, title: '链路匹配武器甘特图', icon: CalendarRange },
  { step: CombatPlanStep.PLAN_EXPORT, title: '生成打击方案', icon: FileCheck }
]

/**
 * 下一步按钮显示的文本标签
 */
const nextButtonLabel = computed<string>(() => {
  switch (currentStep.value) {
    case CombatPlanStep.THREAT_ANALYSIS:
      return '下一步: 分析链路时长与拓扑'
    case CombatPlanStep.LINK_TOPOLOGY:
      return '下一步: 分析覆盖率'
    case CombatPlanStep.COVERAGE_ANALYSIS:
      return '下一步: 分析可打击度'
    case CombatPlanStep.STRIKE_FEASIBILITY:
      return '下一步: 匹配武器与甘特图'
    case CombatPlanStep.WEAPON_MATCHING:
      return '下一步: 生成最终打击方案'
    default:
      return '下一步'
  }
})

/**
 * 键盘 ESC 键监听关闭弹窗
 *
 * @param event - 键盘事件
 */
function handleKeyDown(event: KeyboardEvent): void {
  if (event.key === 'Escape' && isCombatPlanModalOpen.value) {
    closeCombatPlanModal()
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
})
</script>

<template>
  <!-- 作战计划全屏决策工作台 (全屏显示 Dialog) -->
  <div
    v-if="isCombatPlanModalOpen"
    class="fixed inset-0 z-50 flex flex-col w-screen h-screen bg-[#070d18] animate-fadeIn select-none overflow-hidden"
  >
    <!-- 1. 模态框顶部：战术代号、主标题与关闭按钮 -->
    <div class="px-6 py-3 bg-gradient-to-r from-slate-950 via-[#0b1528] to-slate-950 border-b border-tactical-border/80 flex items-center justify-between shrink-0 shadow-tactical-panel">
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 rounded bg-amber-500/20 border border-amber-400/60 flex items-center justify-center text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.3)]">
          <Zap class="w-4 h-4 animate-pulse" />
        </div>
        <div>
          <div class="flex items-center gap-2.5">
            <h2 class="font-mono text-base sm:text-lg font-black tracking-wider text-tactical-text">
              反卫作战计划推演决策向导
            </h2>
            <span class="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/20 text-amber-300 border border-amber-400/40">
              六步全闭环
            </span>
            <span class="px-2 py-0.5 rounded text-[10px] font-mono bg-tactical-cyan/15 text-tactical-cyan border border-tactical-cyan/40 hidden md:inline">
              全屏推演工作台
            </span>
          </div>
          <p class="font-mono text-[10px] text-tactical-muted tracking-wider">
            天基目标全流程自动评估 · 武器智能协同匹配 · 战效毁伤推演与方案导出
          </p>
        </div>
      </div>

      <button
        @click="closeCombatPlanModal"
        class="flex items-center gap-1 px-3 py-1.5 rounded bg-tactical-dark border border-tactical-border text-tactical-muted hover:text-white hover:border-tactical-red hover:bg-red-900/40 transition-colors text-xs font-mono"
        title="关闭向导工作台 (ESC)"
      >
        <X class="w-4 h-4" />
        <span>退出推演 (ESC)</span>
      </button>
    </div>

    <!-- 2. 步骤条指示器导航 (1 到 6) -->
    <div class="px-6 py-2.5 bg-tactical-dark/90 border-b border-tactical-border/70 overflow-x-auto scrollbar-thin shrink-0">
        <div class="flex items-center justify-between min-w-[700px] gap-2">
          <div
            v-for="item in stepsConfig"
            :key="item.step"
            @click="goToStep(item.step)"
            :class="[
              'flex-1 flex items-center gap-2 p-2 rounded cursor-pointer transition-all border relative',
              currentStep === item.step
                ? 'bg-tactical-cyan/20 border-tactical-cyan text-tactical-cyan shadow-glow-cyan'
                : currentStep > item.step
                ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-400 hover:bg-emerald-950/40'
                : 'bg-tactical-bg/60 border-tactical-border/50 text-tactical-muted hover:border-tactical-border hover:text-tactical-text'
            ]"
          >
            <!-- 步骤序号圆圈 -->
            <div
              :class="[
                'w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono font-bold shrink-0',
                currentStep === item.step
                  ? 'bg-tactical-cyan text-black'
                  : currentStep > item.step
                  ? 'bg-emerald-500 text-black'
                  : 'bg-slate-800 text-tactical-muted'
              ]"
            >
              {{ item.step }}
            </div>

            <!-- 步骤标题 -->
            <div class="truncate text-[11px] font-mono font-bold">
              {{ item.title }}
            </div>
          </div>
        </div>
      </div>

      <!-- 3. 中部：步骤内容插槽视区 (支持独立纵向滚动，全屏铺发展示) -->
      <div class="flex-1 min-h-0 overflow-y-auto p-5 sm:p-6 space-y-4 scrollbar-thin">
        <Step1ThreatAnalysis v-if="currentStep === CombatPlanStep.THREAT_ANALYSIS" />
        <Step2LinkOverpassTopology v-else-if="currentStep === CombatPlanStep.LINK_TOPOLOGY" />
        <Step3CoverageAnalysis v-else-if="currentStep === CombatPlanStep.COVERAGE_ANALYSIS" />
        <Step4StrikeFeasibility v-else-if="currentStep === CombatPlanStep.STRIKE_FEASIBILITY" />
        <Step5WeaponMatchingGantt v-else-if="currentStep === CombatPlanStep.WEAPON_MATCHING" />
        <Step6PlanExport v-else-if="currentStep === CombatPlanStep.PLAN_EXPORT" />
      </div>

      <!-- 4. 模态框底部：控制按钮条 (上一步、下一步、生成方案) -->
      <div class="px-6 py-3.5 bg-tactical-dark/95 border-t border-tactical-border/80 flex items-center justify-between font-mono shrink-0 shadow-tactical-panel">
        <div class="text-[11px] text-tactical-muted flex items-center gap-1.5">
          <span>当前阶段:</span>
          <span class="text-tactical-cyan font-bold">步骤 {{ currentStep }} / 6</span>
          <span class="text-tactical-text font-bold">({{ stepsConfig[currentStep - 1].title }})</span>
        </div>

        <div class="flex items-center gap-3">
          <!-- 上一步按钮 -->
          <button
            v-if="currentStep > CombatPlanStep.THREAT_ANALYSIS"
            @click="prevStep"
            class="flex items-center gap-1 px-3.5 py-1.5 rounded bg-tactical-dark hover:bg-slate-800 border border-tactical-border text-tactical-text hover:text-tactical-cyan text-xs font-bold transition-all"
          >
            <ChevronLeft class="w-4 h-4" />
            <span>上一步</span>
          </button>

          <!-- 下一步按钮 (步骤 1 - 5) -->
          <button
            v-if="currentStep < CombatPlanStep.PLAN_EXPORT"
            @click="nextStep"
            class="flex items-center gap-1.5 px-5 py-1.5 rounded bg-tactical-cyan/20 hover:bg-tactical-cyan/35 border border-tactical-cyan text-tactical-cyan shadow-glow-cyan text-xs font-bold transition-all hover:scale-105 active:scale-95"
          >
            <span>{{ nextButtonLabel }}</span>
            <ChevronRight class="w-4 h-4" />
          </button>

          <!-- 步骤 6 完成并保存方案按钮 -->
          <button
            v-else
            @click="savePlanToMissions"
            class="flex items-center gap-1.5 px-6 py-1.5 rounded bg-emerald-500/20 hover:bg-emerald-500/35 border border-emerald-400 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.3)] text-xs font-bold transition-all hover:scale-105 active:scale-95"
          >
            <Save class="w-4 h-4" />
            <span>确认并保存作战方案</span>
          </button>
        </div>
      </div>
  </div>
</template>
