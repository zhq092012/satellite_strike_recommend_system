<script setup lang="ts">
/**
 * @fileoverview 顶部战术指挥状态栏组件
 * 显示系统代号、多时区军事时钟 (UTC/BJT)、战备戒备等级 (DEFCON)、全星系关键统计、显眼的新建任务/新建战场入口以及地图绘制交互提醒
 */

import { ref, onMounted, onUnmounted, computed } from 'vue'
import {
  Radio,
  Maximize2,
  Minimize2,
  Shield,
  Activity,
  RotateCcw,
  Target,
  Crosshair,
  Layers,
  Plus,
  Zap
} from 'lucide-vue-next'
import { useSatelliteState } from '../../composables/useSatelliteState'
import { useBattlefieldState } from '../../composables/useBattlefieldState'
import { useTacticalAssetsState } from '../../composables/useTacticalAssetsState'
import { useRightPanelState } from '../../composables/useRightPanelState'
import { useCombatPlanState } from '../../composables/useCombatPlanState'
import { cancelMapPointPickMode } from '../../services/cesiumManager'

/**
 * 引入作战计划决策向导控制
 */
const { openCombatPlanModal } = useCombatPlanState()

/**
 * 引入态势状态数据与控制操作
 */
const {
  clockState,
  resetSimulationTime
} = useSatelliteState()

/**
 * 引入战场与任务状态与弹窗控制
 */
const {
  battlefields,
  missions,
  isCreateBattlefieldModalOpen,
  isCreateMissionModalOpen,
  activeDrawerTab,
  isDrawingMode,
  cancelInteractiveMapDrawing
} = useBattlefieldState()

/**
 * 引入武器与数据链路状态及选点控制
 */
const {
  weapons,
  dataLinks,
  openDeployWeaponModal,
  isPickingLocationOnMap,
  cancelMapLocationPick
} = useTacticalAssetsState()

/**
 * 取消地图坐标点选并恢复视景与弹窗
 */
function handleCancelMapLocationPick(): void {
  cancelMapPointPickMode()
  cancelMapLocationPick()
}

/**
 * 引入右侧面板互斥调度中心
 */
const {
  isTelemetryActive,
  isBattlefieldActive,
  isTacticalAssetsActive,
  togglePanel
} = useRightPanelState()

/**
 * 动态系统当前绝对时间戳 (毫秒)
 */
const currentTimestamp = ref<number>(Date.now())

/**
 * 是否处于全屏状态
 */
const isFullscreen = ref<boolean>(false)

/**
 * 定时器句柄
 */
let timerHandle: number | null = null

/**
 * 格式化输出 UTC 协调世界时 (ZULU 军用时标)
 */
const utcTimeString = computed<string>(() => {
  const d = new Date(clockState.currentTime)
  return `${d.toISOString().slice(0, 10)} ${d.toISOString().slice(11, 19)}Z`
})

/**
 * 格式化输出北京时间 (BJT +08:00)
 */
const bjtTimeString = computed<string>(() => {
  const d = new Date(clockState.currentTime)
  // 转换东八区时间
  const bjt = new Date(d.getTime() + 8 * 3600 * 1000)
  return `${bjt.toISOString().slice(0, 10)} ${bjt.toISOString().slice(11, 19)} BJT`
})


/**
 * 切换浏览器全屏显示模式
 */
function toggleFullscreen(): void {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().then(() => {
      isFullscreen.value = true
    })
  } else {
    document.exitFullscreen().then(() => {
      isFullscreen.value = false
    })
  }
}

/**
 * 直接打开新建任务弹窗
 */
function handleOpenCreateMission(): void {
  isCreateMissionModalOpen.value = true
}

/**
 * 直接打开新建战场弹窗
 */
function handleOpenCreateBattlefield(): void {
  isCreateBattlefieldModalOpen.value = true
}

/**
 * 独占展开或收起战场与任务抽屉
 *
 * @param tab - 可选定位至指定标签页 ('BATTLEFIELDS' | 'MISSIONS')
 */
function handleToggleBattlefieldDrawer(tab?: 'BATTLEFIELDS' | 'MISSIONS'): void {
  if (tab) {
    activeDrawerTab.value = tab
  }
  togglePanel('BATTLEFIELD')
}

/**
 * 独占展开或收起武器与数据链路抽屉
 */
function handleToggleAssetDrawer(): void {
  togglePanel('TACTICAL_ASSETS')
}

/**
 * 独占展开或收起卫星遥测监控面板
 */
function handleToggleTelemetryPanel(): void {
  togglePanel('TELEMETRY')
}

onMounted(() => {
  timerHandle = window.setInterval(() => {
    currentTimestamp.value = Date.now()
  }, 1000)
})

onUnmounted(() => {
  if (timerHandle !== null) {
    clearInterval(timerHandle)
    timerHandle = null
  }
})
</script>

<template>
  <header
    class="absolute top-0 left-0 right-0 h-14 bg-[#0c1322]/95 border-b border-tactical-border/80 backdrop-blur-md px-3 sm:px-4 flex items-center justify-between z-40 select-none shadow-tactical-panel">
    <!-- 地图交互绘制进行中的高亮顶栏通告条 -->
    <div v-if="isDrawingMode"
      class="absolute inset-x-0 top-full bg-tactical-cyan/25 border-b border-tactical-cyan text-tactical-cyan px-4 py-1.5 flex items-center justify-between text-xs font-mono backdrop-blur shadow-glow-cyan z-30">
      <div class="flex items-center gap-2">
        <Crosshair class="w-4 h-4 animate-spin-slow" />
        <span class="font-bold">三维地图交互拉取作战半径模式中:</span>
        <span class="text-white">第1次点击确认中心点，移动鼠标拖动半径，第2次点击确认完成</span>
      </div>
      <button @click="cancelInteractiveMapDrawing"
        class="px-2 py-0.5 rounded bg-tactical-red/30 border border-tactical-red text-tactical-red hover:bg-tactical-red hover:text-white transition-colors text-[10px]">
        取消绘制
      </button>
    </div>

    <!-- 地图单点坐标拾取进行中的高亮通告条 -->
    <div v-if="isPickingLocationOnMap"
      class="absolute inset-x-0 top-full bg-cyan-950/95 border-b border-cyan-400 text-cyan-300 px-4 py-1.5 flex items-center justify-between text-xs font-mono backdrop-blur shadow-[0_4px_20px_rgba(6,182,212,0.4)] z-30">
      <div class="flex items-center gap-2">
        <Crosshair class="w-4 h-4 text-cyan-400 animate-bounce" />
        <span class="font-bold">三维地球阵地/设施坐标拾取中:</span>
        <span class="text-white">请在三维地球任意目标位置单机左键，系统将捕获地理坐标并自动填入</span>
      </div>
      <button @click="handleCancelMapLocationPick"
        class="px-2 py-0.5 rounded bg-red-900/40 border border-red-500 text-red-300 hover:bg-red-800 transition-colors text-[10px]">
        取消拾取
      </button>
    </div>

    <!-- 左侧系统代号与主标题 (保持右侧安全边距并避免折行) -->
    <div class="flex items-center gap-3 shrink-0 mr-4 sm:mr-6 lg:mr-8 pr-4 sm:pr-6 border-r border-tactical-border/60">
      <div
        class="relative flex items-center justify-center w-8 h-8 rounded bg-tactical-cyan/10 border border-tactical-cyan/50 text-tactical-cyan shrink-0">
        <Radio class="w-4 h-4 animate-pulse" />
        <div class="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-tactical-cyan shadow-glow-cyan"></div>
      </div>
      <div class="shrink-0">
        <h1 class="font-mono text-sm sm:text-base font-black tracking-wider text-tactical-text whitespace-nowrap">
          卫星态势分析系统
        </h1>
      </div>
    </div>

    <!-- 中间核心区：直接添加任务、战场、武器与抽屉入口快捷动作按钮组 (高度突出醒目) -->
    <div class="flex items-center gap-2">


      <!-- 🔵 核心按钮：【+ 添加战场】 -->
      <button
        @click="handleOpenCreateBattlefield"
        class="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded font-mono text-xs font-bold bg-tactical-dark/90 hover:bg-slate-800 border border-tactical-border/80 hover:border-tactical-cyan text-tactical-text hover:text-tactical-cyan transition-all hover:scale-105 active:scale-95"
        title="点击直接创建或导入新的战区空域"
      >
        <Plus class="w-3.5 h-3.5" />
        <Shield class="w-3.5 h-3.5" />
        <span>添加战场</span>
      </button>

      <!-- 🔴 核心按钮：【+ 添加任务】 -->
      <button
        @click="handleOpenCreateMission"
        class="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded font-mono text-xs font-bold bg-tactical-dark/90 hover:bg-slate-800 border border-tactical-border/80 hover:border-tactical-cyan text-tactical-text hover:text-tactical-cyan transition-all hover:scale-105 active:scale-95"
        title="点击直接创建新的卫星打击作战任务"
      >
        <Plus class="w-3.5 h-3.5" />
        <Target class="w-3.5 h-3.5" />
        <span>添加任务</span>
      </button>

      <!-- 🟢 核心按钮：【+ 部署武器】 (将武器放置到对应经纬度区域) -->
      <button
        @click="openDeployWeaponModal()"
        class="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded font-mono text-xs font-bold bg-tactical-dark/90 hover:bg-slate-800 border border-tactical-border/80 hover:border-tactical-cyan text-tactical-text hover:text-tactical-cyan transition-all hover:scale-105 active:scale-95"
        title="点击将反卫武器装备放置部署到指定战区经纬度区域"
      >
        <Plus class="w-3.5 h-3.5" />
        <Crosshair class="w-3.5 h-3.5" />
        <span class="hidden sm:inline">部署武器</span>
      </button>

      <!-- 🟡 核心按钮：【作战计划】向导 -->
      <button
        @click="openCombatPlanModal"
        class="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded font-mono text-xs font-bold bg-tactical-dark/90 hover:bg-slate-800 border border-tactical-border/80 hover:border-tactical-cyan text-tactical-text hover:text-tactical-cyan transition-all hover:scale-105 active:scale-95 cursor-pointer"
        title="启动反卫打击作战计划推演决策向导 (包含威胁度、链路时延、覆盖率、可打击度、甘特图与方案生成)"
      >
        <Zap class="w-3.5 h-3.5 text-amber-400" />
        <span>作战计划</span>
        <span class="px-1 py-0.2 rounded text-[9px] bg-slate-800 text-tactical-muted border border-tactical-border/80 hidden sm:inline">
          向导
        </span>
      </button>

      <!-- 1. 目标遥测面板入口 (独占切换) -->
      <button
        @click="handleToggleTelemetryPanel"
        :class="[
          'hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded font-mono text-xs font-bold transition-all border',
          isTelemetryActive
            ? 'bg-tactical-cyan/20 border-tactical-cyan text-tactical-cyan shadow-glow-cyan'
            : 'bg-tactical-dark/90 border-tactical-border/80 text-tactical-text hover:border-tactical-cyan hover:text-tactical-cyan hover:bg-slate-800'
        ]"
        title="独占展开/收起卫星目标精密遥测与开普勒六根数面板"
      >
        <Activity class="w-3.5 h-3.5" />
        <span>目标遥测</span>
      </button>

      <!-- 2. 战场与任务列表抽屉入口 (独占切换) -->
      <button
        @click="handleToggleBattlefieldDrawer()"
        :class="[
          'hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded font-mono text-xs font-bold transition-all border',
          isBattlefieldActive
            ? 'bg-tactical-cyan/20 border-tactical-cyan text-tactical-cyan shadow-glow-cyan'
            : 'bg-tactical-dark/90 border-tactical-border/80 text-tactical-text hover:border-tactical-cyan hover:text-tactical-cyan hover:bg-slate-800'
        ]"
        title="独占展开/收起战场与任务列表管理抽屉"
      >
        <Layers class="w-3.5 h-3.5" />
        <span>战场任务</span>
        <span class="px-1.5 py-0.2 rounded-full text-[9px] bg-slate-800 text-tactical-cyan font-mono border border-tactical-border/60">
          {{ missions.length }} / {{ battlefields.length }}
        </span>
      </button>

      <!-- 3. 武器与数据链路抽屉入口 (独占切换) -->
      <button
        @click="handleToggleAssetDrawer"
        :class="[
          'hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded font-mono text-xs font-bold transition-all border',
          isTacticalAssetsActive
            ? 'bg-tactical-cyan/20 border-tactical-cyan text-tactical-cyan shadow-glow-cyan'
            : 'bg-tactical-dark/90 border-tactical-border/80 text-tactical-text hover:border-tactical-cyan hover:text-tactical-cyan hover:bg-slate-800'
        ]"
        title="独占展开/收起武器系统、地面站、数据中心与空间链路管理抽屉"
      >
        <Crosshair class="w-3.5 h-3.5" />
        <span>武器与链路</span>
        <span class="px-1.5 py-0.2 rounded-full text-[9px] bg-slate-800 text-tactical-cyan font-mono border border-tactical-border/60">
          {{ weapons.length }}装备 / {{ dataLinks.length }}链路
        </span>
      </button>
    </div>

    <!-- 右侧：军用时标与快捷工具 -->
    <div class="flex items-center gap-3 shrink-0">
      <!-- 战术时标面板 (在宽屏显示) -->
      <div
        class="hidden md:flex items-center gap-3 px-3 py-1 rounded bg-tactical-dark/90 border border-tactical-border/70 font-mono text-xs">
        <div class="flex items-center gap-1.5">
          <span class="text-tactical-muted text-[10px]">UTC/Z:</span>
          <span class="text-tactical-cyan font-bold tracking-wider whitespace-nowrap">{{ utcTimeString }}</span>
        </div>
        <div class="w-[1px] h-3.5 bg-tactical-border"></div>
        <div class="flex items-center gap-1.5">
          <span class="text-tactical-muted text-[10px]">BJT:</span>
          <span class="text-tactical-text font-bold tracking-wider whitespace-nowrap">{{ bjtTimeString }}</span>
        </div>
      </div>

      <!-- 快捷工具按钮组 -->
      <div class="flex items-center gap-1 border-l border-tactical-border/80 pl-2">
        <!-- 重置推演时间 -->
        <button @click="resetSimulationTime" title="重置推演至当前系统时间"
          class="p-1.5 rounded hover:bg-tactical-dark border border-transparent hover:border-tactical-border text-tactical-muted hover:text-tactical-cyan transition-colors">
          <RotateCcw class="w-4 h-4" />
        </button>

        <!-- 全屏开关 -->
        <button @click="toggleFullscreen" :title="isFullscreen ? '退出全屏' : '全屏显示'"
          class="p-1.5 rounded hover:bg-tactical-dark border border-transparent hover:border-tactical-border text-tactical-muted hover:text-tactical-cyan transition-colors">
          <Minimize2 v-if="isFullscreen" class="w-4 h-4" />
          <Maximize2 v-else class="w-4 h-4" />
        </button>
      </div>
    </div>
  </header>
</template>
