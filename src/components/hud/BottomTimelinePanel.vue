<script setup lang="ts">
/**
 * @fileoverview 底部时态推演控制与战术时空覆盖率时序图谱面板 (BottomTimelinePanel.vue)
 * 提供仿真时态播放/暂停、倍速档位切换 (1x - 300x)、24小时覆盖率波形曲线与过境访问窗口甘特带 (Sparkline Ribbon)、
 * 交互式时间轴拖拽定位、以及空间交会事件告警流水抽屉
 */

import { ref, computed } from 'vue'
import {
  Play,
  Pause,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ChevronUp,
  ChevronDown,
  Activity,
  Radio,
  Layers
} from 'lucide-vue-next'
import { useSatelliteState } from '../../composables/useSatelliteState'
import { useCoverageState } from '../../composables/useCoverageState'
import { AlertSeverity } from '../../types/satellite'

/**
 * 引入全局态势状态与动作
 */
const {
  clockState,
  elapsedSimulationSeconds,
  alerts,
  togglePlayPause,
  setTimeMultiplier,
  resetSimulationTime,
  seekSimulationTime,
  acknowledgeAlert
} = useSatelliteState()

/**
 * 引入全局时空覆盖分析状态
 */
const {
  timeSeries,
  accessWindows,
  currentTimelineSample,
  currentTargetRegion
} = useCoverageState()

/**
 * 是否展开战术告警事件流水抽屉
 */
const isAlertsDrawerOpen = ref<boolean>(false)

/**
 * 是否展开 24h 覆盖率时序波形带
 */
const isCoverageRibbonOpen = ref<boolean>(true)

/**
 * 仿真倍速档位配置列表
 */
const speedMultipliers: number[] = [1, 5, 10, 60, 300]

/**
 * 格式化输出任务历元推演经过时间 (MET: Mission Elapsed Time)
 */
const formattedMet = computed<string>(() => {
  const totalSec = Math.floor(elapsedSimulationSeconds.value)
  const hours = Math.floor(totalSec / 3600).toString().padStart(2, '0')
  const minutes = Math.floor((totalSec % 3600) / 60).toString().padStart(2, '0')
  const seconds = (totalSec % 60).toString().padStart(2, '0')
  return `+${hours}:${minutes}:${seconds} MET`
})

/**
 * 格式化 ISO 时间戳为本地时间展示
 */
function formatTime(isoStr: string): string {
  const d = new Date(isoStr)
  return d.toLocaleTimeString()
}

/**
 * 计算 24 小时推演游标在时间轴上的百分比位置 (0 - 100%)
 */
const cursorXPercent = computed<number>(() => {
  const currentSec = ((elapsedSimulationSeconds.value % 86400) + 86400) % 86400
  return (currentSec / 86400) * 100
})

/**
 * 生成 24 小时瞬时空间覆盖率 SVG 折线路径 (ViewBox: 0 0 1000 44)
 */
const spatialLinePath = computed<string>(() => {
  if (!timeSeries.value || timeSeries.value.length === 0) return ''
  const len = timeSeries.value.length
  return timeSeries.value
    .map((pt, i) => {
      const x = (i / (len - 1)) * 1000
      const y = 40 - (Math.min(100, Math.max(0, pt.spatialCoverageRate)) / 100) * 36
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`
    })
    .join(' ')
})

/**
 * 生成空间覆盖率渐变阴影填充面 SVG 路径
 */
const spatialAreaPath = computed<string>(() => {
  if (!timeSeries.value || timeSeries.value.length === 0) return ''
  const line = spatialLinePath.value
  return `${line} L 1000 42 L 0 42 Z`
})

/**
 * 生成有效覆盖率 (考虑气象/传感器折减) 虚线路径
 */
const effectiveLinePath = computed<string>(() => {
  if (!timeSeries.value || timeSeries.value.length === 0) return ''
  const len = timeSeries.value.length
  return timeSeries.value
    .map((pt, i) => {
      const x = (i / (len - 1)) * 1000
      const y = 40 - (Math.min(100, Math.max(0, pt.effectiveCoverageRate)) / 100) * 36
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`
    })
    .join(' ')
})

/**
 * 过境访问窗口 (Access Windows) 在时间轴上的条块分布
 */
const accessWindowRects = computed(() => {
  if (!accessWindows.value) return []
  return accessWindows.value.map((win) => {
    const x = (win.startTimeSec / 86400) * 1000
    const w = Math.max(4, (win.durationSec / 86400) * 1000)
    return {
      id: win.id,
      name: win.satelliteName,
      x,
      w,
      peakRate: win.peakCoverageRate
    }
  })
})

/**
 * 点击或拖动时间轴以快速跳转仿真推演时刻 (0 - 24h)
 */
function handleTimelineClick(e: MouseEvent) {
  const target = e.currentTarget as HTMLElement
  const rect = target.getBoundingClientRect()
  const clickX = e.clientX - rect.left
  const ratio = Math.max(0, Math.min(1, clickX / rect.width))
  seekSimulationTime(ratio * 86400)
}
</script>

<template>
  <div class="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 w-full max-w-4xl px-3 flex flex-col items-center select-none space-y-2">
    <!-- 展开式战术事件告警抽屉 -->
    <div
      v-if="isAlertsDrawerOpen"
      class="w-full p-3 rounded tactical-panel tactical-corner-bracket max-h-48 overflow-y-auto space-y-2 border border-tactical-border/80"
    >
      <div class="flex items-center justify-between pb-1.5 border-b border-tactical-border/60">
        <div class="flex items-center gap-1.5 font-mono text-xs font-bold text-tactical-text">
          <AlertTriangle class="w-3.5 h-3.5 text-tactical-red" />
          <span>战术态势事件与空间交会告警流水</span>
        </div>
        <button
          @click="isAlertsDrawerOpen = false"
          class="text-tactical-muted hover:text-tactical-text text-xs"
        >
          收起
        </button>
      </div>

      <div
        v-for="alert in alerts"
        :key="alert.id"
        :class="[
          'p-2 rounded flex items-start justify-between gap-3 text-xs font-mono border transition-all',
          alert.severity === AlertSeverity.CRITICAL
            ? 'bg-tactical-red/10 border-tactical-red/40 text-red-200'
            : alert.severity === AlertSeverity.WARNING
            ? 'bg-tactical-amber/10 border-tactical-amber/40 text-amber-200'
            : 'bg-tactical-dark/60 border-tactical-border text-tactical-text'
        ]"
      >
        <div class="flex-1">
          <div class="flex items-center gap-2">
            <span
              :class="[
                'px-1.5 py-0.2 rounded text-[9px] font-bold uppercase',
                alert.severity === AlertSeverity.CRITICAL
                  ? 'bg-tactical-red text-white'
                  : alert.severity === AlertSeverity.WARNING
                  ? 'bg-tactical-amber text-black'
                  : 'bg-tactical-cyan/30 text-tactical-cyan'
              ]"
            >
              {{ alert.severity }}
            </span>
            <span class="font-bold text-tactical-text">{{ alert.title }}</span>
            <span class="text-tactical-muted text-[10px]">{{ formatTime(alert.timestamp) }}</span>
          </div>
          <div class="mt-1 text-[11px] text-tactical-muted">
            [{{ alert.satelliteName }}] {{ alert.details }}
          </div>
        </div>

        <button
          v-if="!alert.acknowledged"
          @click="acknowledgeAlert(alert.id)"
          class="px-2 py-1 rounded text-[10px] bg-tactical-dark border border-tactical-border hover:border-tactical-cyan hover:text-tactical-cyan transition-colors"
        >
          确认
        </button>
        <div v-else class="flex items-center gap-1 text-[10px] text-tactical-muted">
          <CheckCircle2 class="w-3 h-3 text-tactical-green" />
          <span>已处置</span>
        </div>
      </div>
    </div>

    <!-- 战区 24 小时时空覆盖率波形与过境访问窗口条 (Coverage Timeline Ribbon) -->
    <div
      v-if="isCoverageRibbonOpen"
      class="w-full p-2.5 rounded-lg tactical-panel border border-tactical-cyan/40 shadow-[0_0_18px_rgba(6,182,212,0.15)] backdrop-blur-md transition-all font-mono"
    >
      <!-- 顶部信息栏：战区状态、当前瞬时指标与微图谱图例 -->
      <div class="flex flex-wrap items-center justify-between text-[10px] mb-1.5 gap-2">
        <div class="flex items-center gap-2">
          <Activity class="w-3.5 h-3.5 text-tactical-cyan animate-pulse" />
          <span class="font-bold text-tactical-text">24H 时空覆盖时序图谱</span>
          <span class="text-slate-500">|</span>
          <span class="text-tactical-muted truncate max-w-[200px]" :title="currentTargetRegion.name">
            {{ currentTargetRegion.name }}
          </span>
          <span class="px-1.5 py-0.2 rounded bg-cyan-950/60 border border-cyan-500/40 text-cyan-300 text-[9px]">
            R={{ currentTargetRegion.radiusKm }}km
          </span>
        </div>

        <!-- 实时推演读数：瞬时空间覆盖率、有效覆盖率与在圈卫星数 -->
        <div class="flex items-center gap-3 text-slate-300">
          <div class="flex items-center gap-1">
            <span class="w-2 h-2 rounded-full bg-cyan-400"></span>
            <span class="text-tactical-muted">瞬时覆盖:</span>
            <strong class="text-tactical-cyan text-xs font-bold">{{ currentTimelineSample.spatialCoverageRate }}%</strong>
          </div>
          <div class="flex items-center gap-1">
            <span class="w-2 h-2 rounded-full bg-amber-400"></span>
            <span class="text-tactical-muted">有效修正:</span>
            <strong class="text-amber-300 text-xs font-bold">{{ currentTimelineSample.effectiveCoverageRate }}%</strong>
          </div>
          <div class="flex items-center gap-1">
            <Radio class="w-3 h-3 text-emerald-400" />
            <span class="text-tactical-muted">并发可见:</span>
            <strong class="text-emerald-400 text-xs font-bold">{{ currentTimelineSample.concurrentSats }} 颗</strong>
          </div>
        </div>
      </div>

      <!-- 可交互 SVG 覆盖率时序图谱容器 -->
      <div
        class="relative w-full h-11 bg-slate-950/80 rounded border border-slate-800/80 overflow-hidden cursor-crosshair group"
        @click="handleTimelineClick"
        title="点击时间轴任意位置快速跳转推演时刻"
      >
        <!-- 背景横向网格线 (50%, 100%) -->
        <div class="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20 py-1">
          <div class="border-b border-cyan-500 border-dashed w-full"></div>
          <div class="border-b border-cyan-500 border-dashed w-full"></div>
        </div>

        <!-- SVG 连续波形与过境访问色块 -->
        <svg
          class="w-full h-full block"
          viewBox="0 0 1000 44"
          preserveAspectRatio="none"
        >
          <defs>
            <!-- 覆盖率波形渐变填充色 -->
            <linearGradient id="coverageWaveGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#00f0ff" stop-opacity="0.35" />
              <stop offset="100%" stop-color="#00f0ff" stop-opacity="0.02" />
            </linearGradient>
            <!-- 访问窗口条微渐变 -->
            <linearGradient id="accessBarGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#ef4444" stop-opacity="0.3" />
              <stop offset="100%" stop-color="#ef4444" stop-opacity="0.08" />
            </linearGradient>
          </defs>

          <!-- 1. 过境访问窗口底色块 (Access Windows) -->
          <rect
            v-for="bar in accessWindowRects"
            :key="bar.id"
            :x="bar.x"
            y="4"
            :width="bar.w"
            height="36"
            fill="url(#accessBarGrad)"
            stroke="#ef4444"
            stroke-opacity="0.4"
            stroke-width="0.8"
            rx="1.5"
          />

          <!-- 2. 空间覆盖率面积渐变 -->
          <path
            v-if="spatialAreaPath"
            :d="spatialAreaPath"
            fill="url(#coverageWaveGrad)"
          />

          <!-- 3. 有效覆盖率折减曲线 (虚线 Amber) -->
          <path
            v-if="effectiveLinePath"
            :d="effectiveLinePath"
            fill="none"
            stroke="#f59e0b"
            stroke-width="1.2"
            stroke-dasharray="3 3"
            stroke-opacity="0.75"
          />

          <!-- 4. 空间几何覆盖率核心曲线 (实线 Cyan) -->
          <path
            v-if="spatialLinePath"
            :d="spatialLinePath"
            fill="none"
            stroke="#00f0ff"
            stroke-width="1.8"
            stroke-linecap="round"
          />
        </svg>

        <!-- 5. 实时推演垂直游标指示线 (跟踪当前时间) -->
        <div
          class="absolute top-0 bottom-0 pointer-events-none transition-all duration-75 flex flex-col items-center"
          :style="{ left: `${cursorXPercent}%` }"
        >
          <!-- 游标顶端标记点 -->
          <div class="w-2 h-2 rounded-full bg-cyan-400 border border-slate-950 shadow-[0_0_8px_#00f0ff] -mt-0.5"></div>
          <!-- 竖直发光游标线 -->
          <div class="flex-1 w-[1.5px] bg-cyan-400 shadow-[0_0_6px_#00f0ff]"></div>
        </div>

        <!-- 悬停提示遮罩 -->
        <div class="absolute right-2 bottom-0.5 text-[8px] text-slate-500 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
          点击或拖动跳转时刻
        </div>
      </div>

      <!-- 时间轴刻度线与时间标签 (00:00 -> 24:00) -->
      <div class="flex justify-between text-[9px] text-slate-400 mt-1 px-0.5">
        <span>00:00</span>
        <span>04:00</span>
        <span>08:00</span>
        <span>12:00</span>
        <span>16:00</span>
        <span>20:00</span>
        <span>24:00</span>
      </div>
    </div>

    <!-- 底部主推演控制条 -->
    <div class="w-full flex items-center justify-between gap-4 px-4 py-2 rounded-lg tactical-panel border border-tactical-border/80 shadow-tactical-panel backdrop-blur-md">
      <!-- 左侧：播放/暂停与历元计时 -->
      <div class="flex items-center gap-3">
        <!-- 播放/暂停大按钮 -->
        <button
          @click="togglePlayPause"
          :class="[
            'flex items-center justify-center w-8 h-8 rounded border transition-all',
            clockState.isPlaying
              ? 'bg-tactical-cyan/20 border-tactical-cyan text-tactical-cyan shadow-glow-cyan'
              : 'bg-tactical-amber/20 border-tactical-amber text-tactical-amber'
          ]"
          :title="clockState.isPlaying ? '暂停推演' : '继续推演'"
        >
          <Pause v-if="clockState.isPlaying" class="w-4 h-4" />
          <Play v-else class="w-4 h-4 ml-0.5" />
        </button>

        <!-- 任务历元时钟 -->
        <div class="font-mono text-xs">
          <div class="text-[9px] text-tactical-muted flex items-center gap-1">
            <Clock class="w-2.5 h-2.5 text-tactical-cyan" />
            <span>仿真历元 (MET)</span>
          </div>
          <div class="text-tactical-text font-bold tracking-wider">
            {{ formattedMet }}
          </div>
        </div>
      </div>

      <!-- 中间：推演流速倍率快捷按键 -->
      <div class="flex items-center gap-1 font-mono text-xs">
        <span class="text-[10px] text-tactical-muted mr-1">推演倍速:</span>
        <button
          v-for="mul in speedMultipliers"
          :key="mul"
          @click="setTimeMultiplier(mul)"
          :class="[
            'px-2 py-0.5 rounded text-[11px] font-bold transition-all border',
            clockState.multiplier === mul
              ? 'bg-tactical-cyan/20 border-tactical-cyan text-tactical-cyan shadow-glow-cyan'
              : 'bg-tactical-dark/60 border-tactical-border/80 text-tactical-muted hover:text-tactical-text'
          ]"
        >
          {{ mul }}x
        </button>
      </div>

      <!-- 右侧：覆盖图谱开关、告警流水抽屉开关与重置 -->
      <div class="flex items-center gap-2">
        <!-- 覆盖率波形带折叠切换 -->
        <button
          @click="isCoverageRibbonOpen = !isCoverageRibbonOpen"
          :class="[
            'flex items-center gap-1 px-2 py-1 rounded font-mono text-xs border transition-all',
            isCoverageRibbonOpen
              ? 'bg-tactical-cyan/20 border-tactical-cyan text-tactical-cyan'
              : 'bg-tactical-dark/60 border-tactical-border text-tactical-muted hover:text-tactical-text'
          ]"
          title="切换覆盖率时序图谱显示"
        >
          <Layers class="w-3.5 h-3.5" />
          <span class="hidden sm:inline">时序图谱</span>
        </button>

        <!-- 告警流水抽屉开关 -->
        <button
          @click="isAlertsDrawerOpen = !isAlertsDrawerOpen"
          :class="[
            'flex items-center gap-1.5 px-2.5 py-1 rounded font-mono text-xs border transition-all',
            isAlertsDrawerOpen
              ? 'bg-tactical-cyan/20 border-tactical-cyan text-tactical-cyan'
              : 'bg-tactical-dark/60 border-tactical-border text-tactical-muted hover:text-tactical-text'
          ]"
        >
          <AlertTriangle class="w-3.5 h-3.5 text-tactical-amber" />
          <span>事件流水 ({{ alerts.length }})</span>
          <ChevronUp v-if="!isAlertsDrawerOpen" class="w-3 h-3" />
          <ChevronDown v-else class="w-3 h-3" />
        </button>

        <!-- 重置仿真时间 -->
        <button
          @click="resetSimulationTime"
          class="p-1.5 rounded bg-tactical-dark/60 hover:bg-tactical-dark border border-tactical-border hover:border-tactical-cyan text-tactical-muted hover:text-tactical-cyan transition-colors"
          title="重置仿真时间"
        >
          <RotateCcw class="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  </div>
</template>
