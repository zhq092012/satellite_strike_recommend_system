<script setup lang="ts">
/**
 * @fileoverview 底部时态推演控制与战术告警事件流水面板
 * 提供仿真时态播放/暂停、倍速档位切换 (1x - 300x)、推演历元滑块以及空间交会事件告警流水
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
  ChevronDown
} from 'lucide-vue-next'
import { useSatelliteState } from '../../composables/useSatelliteState'
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
  acknowledgeAlert
} = useSatelliteState()

/**
 * 是否展开战术告警事件流水抽屉
 */
const isAlertsDrawerOpen = ref<boolean>(false)

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
 *
 * @param isoStr - ISO 时间戳字符串
 * @returns 格式化时分秒
 */
function formatTime(isoStr: string): string {
  const d = new Date(isoStr)
  return d.toLocaleTimeString()
}
</script>

<template>
  <div class="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 w-full max-w-4xl px-3 flex flex-col items-center select-none">
    <!-- 展开式战术事件告警抽屉 -->
    <div
      v-if="isAlertsDrawerOpen"
      class="w-full mb-2 p-3 rounded tactical-panel tactical-corner-bracket max-h-48 overflow-y-auto space-y-2 border border-tactical-border/80"
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

      <!-- 右侧：告警流水抽屉开关与重置 -->
      <div class="flex items-center gap-2">
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
