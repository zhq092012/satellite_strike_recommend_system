<script setup lang="ts">
/**
 * @fileoverview 作战计划向导 - 第三步：天基多维时空覆盖率与重访态势分析 (Step3CoverageAnalysis.vue)
 * 系统化回答五大核心问题：
 * 1. 现在覆盖多少？(空间瞬时覆盖率 & 有效多因子折减模型)
 * 2. 未来什么时候覆盖？(24小时过境访问窗口 Access Windows 甘特时序)
 * 3. 一次能覆盖多久？(单次过境持续时长、平均时长与累计时长)
 * 4. 多久重新覆盖？(平均重访周期 & 最大覆盖空窗间隔)
 * 5. 同时有多少颗卫星可以覆盖？(多星重叠并发可见度 N(x,t) 阶梯分布)
 * 并结合门限滑块进行高覆盖关键敌星筛选与反制打击效益闭环评估
 */

import { ref, computed } from 'vue'
import {
  Globe,
  Sliders,
  CheckCircle2,
  Clock,
  Radio,
  Eye,
  Activity,
  Layers,
  ShieldAlert,
  Calendar,
  BarChart3,
  Sun,
  CloudRain
} from 'lucide-vue-next'
import { useCombatPlanState } from '../../composables/useCombatPlanState'
import { useCoverageState } from '../../composables/useCoverageState'

/**
 * 引入作战计划状态与计算数据
 */
const {
  minCoverageThreshold,
  step3Candidates
} = useCombatPlanState()

/**
 * 引入天基多维时空覆盖率分析状态与服务
 */
const {
  currentTargetRegion,
  currentEffectiveWeights,
  coverageMetrics,
  concurrencyDistribution,
  timeSeries,
  accessWindows,
  currentTimelineSample
} = useCoverageState()

/**
 * 活跃查看的子模块标签 ('OVERVIEW' | 'TIMELINE' | 'EFFECTIVE_FACTORS')
 */
const activeTab = ref<'OVERVIEW' | 'TIMELINE' | 'EFFECTIVE_FACTORS'>('OVERVIEW')

/**
 * 生成 24h 覆盖率曲线的 SVG Path (ViewBox: 0 0 1000 60)
 */
const sparklinePath = computed<string>(() => {
  if (!timeSeries.value || timeSeries.value.length === 0) return ''
  const len = timeSeries.value.length
  return timeSeries.value
    .map((pt, i) => {
      const x = (i / (len - 1)) * 1000
      const y = 55 - (Math.min(100, Math.max(0, pt.spatialCoverageRate)) / 100) * 50
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`
    })
    .join(' ')
})

const sparklineAreaPath = computed<string>(() => {
  if (!sparklinePath.value) return ''
  return `${sparklinePath.value} L 1000 58 L 0 58 Z`
})

/**
 * 格式化秒数为时分描述
 */
function formatSecToMin(sec: number): string {
  const min = Math.round(sec / 60)
  return `${min} 分钟`
}

/**
 * 格式化时序秒为时分 HH:MM
 */
function formatSecToHHMM(sec: number): string {
  const h = Math.floor(sec / 3600).toString().padStart(2, '0')
  const m = Math.floor((sec % 3600) / 60).toString().padStart(2, '0')
  return `${h}:${m}`
}
</script>

<template>
  <div class="space-y-4 font-mono select-none">
    <!-- 1. 顶部五大核心战术问题综述看板 (9 大度量指标磁贴) -->
    <div class="p-3.5 rounded bg-tactical-dark/70 border border-tactical-border/80">
      <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div class="flex items-center gap-2">
          <Globe class="w-4 h-4 text-tactical-cyan animate-pulse" />
          <h3 class="text-xs font-bold tracking-wider text-tactical-text uppercase">
            天基时空覆盖度量与重访态势评估体系
          </h3>
          <span class="text-[10px] text-tactical-muted">
            目标: {{ currentTargetRegion.name }} (R={{ currentTargetRegion.radiusKm }}km)
          </span>
        </div>

        <!-- 模式标签切换 -->
        <div class="flex items-center gap-1 text-[10px]">
          <button
            @click="activeTab = 'OVERVIEW'"
            :class="[
              'px-2 py-0.5 rounded transition-all border',
              activeTab === 'OVERVIEW'
                ? 'bg-tactical-cyan/20 border-tactical-cyan text-tactical-cyan font-bold shadow-glow-cyan'
                : 'bg-slate-900/60 border-slate-700/60 text-slate-400 hover:text-slate-200'
            ]"
          >
            五问综合看板
          </button>
          <button
            @click="activeTab = 'TIMELINE'"
            :class="[
              'px-2 py-0.5 rounded transition-all border',
              activeTab === 'TIMELINE'
                ? 'bg-tactical-cyan/20 border-tactical-cyan text-tactical-cyan font-bold shadow-glow-cyan'
                : 'bg-slate-900/60 border-slate-700/60 text-slate-400 hover:text-slate-200'
            ]"
          >
            24H 过境时序 ({{ accessWindows.length }}次)
          </button>
          <button
            @click="activeTab = 'EFFECTIVE_FACTORS'"
            :class="[
              'px-2 py-0.5 rounded transition-all border',
              activeTab === 'EFFECTIVE_FACTORS'
                ? 'bg-tactical-cyan/20 border-tactical-cyan text-tactical-cyan font-bold shadow-glow-cyan'
                : 'bg-slate-900/60 border-slate-700/60 text-slate-400 hover:text-slate-200'
            ]"
          >
            有效覆盖多因子修正
          </button>
        </div>
      </div>

      <!-- 问答看板 1: 5 问核心度量卡片矩阵 -->
      <div v-if="activeTab === 'OVERVIEW'" class="space-y-3">
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 text-xs">
          <!-- 问 1: 现在覆盖多少？ -->
          <div class="p-2.5 rounded bg-slate-950/80 border border-cyan-500/40 relative overflow-hidden flex flex-col justify-between shadow-[0_0_12px_rgba(6,182,212,0.1)]">
            <div class="space-y-1">
              <div class="flex items-center justify-between text-[10px] text-tactical-muted">
                <span class="flex items-center gap-1">
                  <Activity class="w-3 h-3 text-cyan-400" />
                  <span>Q1: 现在覆盖多少?</span>
                </span>
                <span class="text-[9px] text-cyan-300">瞬时空间</span>
              </div>
              <div class="text-xl font-bold text-tactical-cyan font-mono mt-1">
                {{ currentTimelineSample.spatialCoverageRate }}%
              </div>
            </div>
            <div class="mt-2 pt-1 border-t border-slate-800 text-[10px] text-slate-400 flex justify-between">
              <span>有效修正率:</span>
              <strong class="text-amber-400">{{ currentTimelineSample.effectiveCoverageRate }}%</strong>
            </div>
          </div>

          <!-- 问 2: 未来何时覆盖？ -->
          <div class="p-2.5 rounded bg-slate-950/80 border border-emerald-500/40 relative overflow-hidden flex flex-col justify-between shadow-[0_0_12px_rgba(16,185,129,0.1)]">
            <div class="space-y-1">
              <div class="flex items-center justify-between text-[10px] text-tactical-muted">
                <span class="flex items-center gap-1">
                  <Calendar class="w-3 h-3 text-emerald-400" />
                  <span>Q2: 未来何时覆盖?</span>
                </span>
                <span class="text-[9px] text-emerald-300">24H 窗口</span>
              </div>
              <div class="text-xl font-bold text-emerald-400 font-mono mt-1">
                {{ coverageMetrics.passCount }} <span class="text-xs font-normal text-slate-400">次过境</span>
              </div>
            </div>
            <div class="mt-2 pt-1 border-t border-slate-800 text-[10px] text-slate-400 flex justify-between">
              <span>时间覆盖率:</span>
              <strong class="text-emerald-400">{{ coverageMetrics.temporalCoverageRate }}%</strong>
            </div>
          </div>

          <!-- 问 3: 一次能覆盖多久？ -->
          <div class="p-2.5 rounded bg-slate-950/80 border border-amber-500/40 relative overflow-hidden flex flex-col justify-between shadow-[0_0_12px_rgba(245,158,11,0.1)]">
            <div class="space-y-1">
              <div class="flex items-center justify-between text-[10px] text-tactical-muted">
                <span class="flex items-center gap-1">
                  <Clock class="w-3 h-3 text-amber-400" />
                  <span>Q3: 一次能覆盖多久?</span>
                </span>
                <span class="text-[9px] text-amber-300">单次时长</span>
              </div>
              <div class="text-xl font-bold text-amber-300 font-mono mt-1">
                {{ coverageMetrics.averagePassDuration }} <span class="text-xs font-normal text-slate-400">分钟</span>
              </div>
            </div>
            <div class="mt-2 pt-1 border-t border-slate-800 text-[10px] text-slate-400 flex justify-between">
              <span>全天累计时长:</span>
              <strong class="text-amber-300">{{ coverageMetrics.totalCoverageDuration }} 分钟</strong>
            </div>
          </div>

          <!-- 问 4: 多久重新覆盖？ -->
          <div class="p-2.5 rounded bg-slate-950/80 border border-blue-500/40 relative overflow-hidden flex flex-col justify-between shadow-[0_0_12px_rgba(59,130,246,0.1)]">
            <div class="space-y-1">
              <div class="flex items-center justify-between text-[10px] text-tactical-muted">
                <span class="flex items-center gap-1">
                  <RotateCcw class="w-3 h-3 text-blue-400" />
                  <span>Q4: 多久重新覆盖?</span>
                </span>
                <span class="text-[9px] text-blue-300">重访周期</span>
              </div>
              <div class="text-xl font-bold text-blue-400 font-mono mt-1">
                {{ coverageMetrics.revisitTime }} <span class="text-xs font-normal text-slate-400">分钟</span>
              </div>
            </div>
            <div class="mt-2 pt-1 border-t border-slate-800 text-[10px] text-slate-400 flex justify-between">
              <span>最大空窗盲区:</span>
              <strong class="text-red-400">{{ coverageMetrics.maxRevisitGap }} 分钟</strong>
            </div>
          </div>

          <!-- 问 5: 同时有多少颗星？ -->
          <div class="p-2.5 rounded bg-slate-950/80 border border-purple-500/40 relative overflow-hidden flex flex-col justify-between shadow-[0_0_12px_rgba(168,85,247,0.1)]">
            <div class="space-y-1">
              <div class="flex items-center justify-between text-[10px] text-tactical-muted">
                <span class="flex items-center gap-1">
                  <Layers class="w-3 h-3 text-purple-400" />
                  <span>Q5: 同时几颗覆盖?</span>
                </span>
                <span class="text-[9px] text-purple-300">多星冗余</span>
              </div>
              <div class="text-xl font-bold text-purple-300 font-mono mt-1">
                {{ currentTimelineSample.concurrentSats }} <span class="text-xs font-normal text-slate-400">/ 峰值 {{ coverageMetrics.peakConcurrentSatellites }}</span>
              </div>
            </div>
            <div class="mt-2 pt-1 border-t border-slate-800 text-[10px] text-slate-400 flex justify-between">
              <span>平均重叠可用:</span>
              <strong class="text-purple-300">{{ coverageMetrics.averageConcurrentSatellites }} 颗</strong>
            </div>
          </div>
        </div>

        <!-- 多星重叠并发可见度 N(x,t) 阶梯分布图 -->
        <div class="p-3 rounded bg-slate-950/90 border border-slate-800 space-y-2">
          <div class="flex items-center justify-between text-[11px]">
            <div class="flex items-center gap-2">
              <BarChart3 class="w-3.5 h-3.5 text-cyan-400" />
              <span class="font-bold text-slate-200">目标区域多星重叠可见度分布 N(x, t)</span>
            </div>
            <span class="text-slate-400 text-[10px]">
              平均可用卫星数: <strong class="text-cyan-300 font-mono">{{ concurrencyDistribution.averageVisibility }}</strong> 颗
            </span>
          </div>

          <!-- 多段色块堆叠比例条 -->
          <div class="w-full h-3 rounded-full overflow-hidden flex bg-slate-800 border border-slate-700">
            <!-- 0 颗盲区 (黑色/深红) -->
            <div
              class="h-full bg-slate-700/80 transition-all duration-300"
              :style="{ width: `${concurrencyDistribution.zeroSatPercent}%` }"
              :title="`0 颗完全覆盖盲区: ${concurrencyDistribution.zeroSatPercent}%`"
            ></div>
            <!-- 1 颗单星 (青色) -->
            <div
              class="h-full bg-cyan-600 transition-all duration-300"
              :style="{ width: `${concurrencyDistribution.oneSatPercent}%` }"
              :title="`1 颗单星监视: ${concurrencyDistribution.oneSatPercent}%`"
            ></div>
            <!-- 2 颗立体 (蓝色) -->
            <div
              class="h-full bg-blue-500 transition-all duration-300"
              :style="{ width: `${concurrencyDistribution.twoSatPercent}%` }"
              :title="`2 颗双星交叉: ${concurrencyDistribution.twoSatPercent}%`"
            ></div>
            <!-- 3+ 颗高冗余 (紫色) -->
            <div
              class="h-full bg-purple-500 transition-all duration-300"
              :style="{ width: `${concurrencyDistribution.threePlusSatPercent}%` }"
              :title="`3+ 颗多星织网压制: ${concurrencyDistribution.threePlusSatPercent}%`"
            ></div>
          </div>

          <!-- 图例与详细百分比 -->
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[10px]">
            <div class="flex items-center justify-between px-2 py-1 rounded bg-slate-900/80 border border-slate-800">
              <span class="flex items-center gap-1 text-slate-400">
                <span class="w-2 h-2 rounded bg-slate-700"></span>
                <span>0颗覆盖(盲区)</span>
              </span>
              <strong class="text-slate-300">{{ concurrencyDistribution.zeroSatPercent }}%</strong>
            </div>
            <div class="flex items-center justify-between px-2 py-1 rounded bg-slate-900/80 border border-slate-800">
              <span class="flex items-center gap-1 text-cyan-400">
                <span class="w-2 h-2 rounded bg-cyan-600"></span>
                <span>1颗单星侦察</span>
              </span>
              <strong class="text-cyan-300">{{ concurrencyDistribution.oneSatPercent }}%</strong>
            </div>
            <div class="flex items-center justify-between px-2 py-1 rounded bg-slate-900/80 border border-slate-800">
              <span class="flex items-center gap-1 text-blue-400">
                <span class="w-2 h-2 rounded bg-blue-500"></span>
                <span>2颗立体交织</span>
              </span>
              <strong class="text-blue-300">{{ concurrencyDistribution.twoSatPercent }}%</strong>
            </div>
            <div class="flex items-center justify-between px-2 py-1 rounded bg-slate-900/80 border border-slate-800">
              <span class="flex items-center gap-1 text-purple-400">
                <span class="w-2 h-2 rounded bg-purple-500"></span>
                <span>3+颗冗余压制</span>
              </span>
              <strong class="text-purple-300">{{ concurrencyDistribution.threePlusSatPercent }}%</strong>
            </div>
          </div>
        </div>

        <!-- 24 小时覆盖率连续波动微图谱 -->
        <div class="p-3 rounded bg-slate-950/90 border border-cyan-500/30 space-y-1.5">
          <div class="flex items-center justify-between text-[11px]">
            <span class="font-bold text-slate-200">24H 空间覆盖率时序连续波形曲线 (0 ~ 100%)</span>
            <span class="text-[10px] text-cyan-400 font-mono">
              步长: 5 分钟 (共 289 个时间切片)
            </span>
          </div>

          <div class="w-full h-16 bg-slate-900/90 rounded border border-slate-800 overflow-hidden relative">
            <svg class="w-full h-full" viewBox="0 0 1000 60" preserveAspectRatio="none">
              <defs>
                <linearGradient id="step3AreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="#00f0ff" stop-opacity="0.4" />
                  <stop offset="100%" stop-color="#00f0ff" stop-opacity="0.02" />
                </linearGradient>
              </defs>
              <!-- 50% 辅助基准线 -->
              <line x1="0" y1="30" x2="1000" y2="30" stroke="#334155" stroke-dasharray="4 4" stroke-width="0.8" />
              <!-- 填充面 -->
              <path v-if="sparklineAreaPath" :d="sparklineAreaPath" fill="url(#step3AreaGrad)" />
              <!-- 折线 -->
              <path v-if="sparklinePath" :d="sparklinePath" fill="none" stroke="#00f0ff" stroke-width="1.8" />
            </svg>
          </div>

          <div class="flex justify-between text-[9px] text-slate-500 px-1">
            <span>00:00</span>
            <span>06:00</span>
            <span>12:00</span>
            <span>18:00</span>
            <span>24:00</span>
          </div>
        </div>
      </div>

      <!-- 模式 2: 24 小时详细过境访问窗口列表 (甘特卡片) -->
      <div v-else-if="activeTab === 'TIMELINE'" class="space-y-2">
        <div class="text-[11px] text-slate-300 flex items-center justify-between pb-1 border-b border-slate-800">
          <span>全天过境访问事件序列 (共 {{ accessWindows.length }} 次)</span>
          <span class="text-tactical-muted text-[10px]">T_pass = t_exit - t_entry</span>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-72 overflow-y-auto pr-1">
          <div
            v-for="(win, idx) in accessWindows"
            :key="win.id"
            class="p-2.5 rounded bg-slate-950/90 border border-slate-800 hover:border-cyan-500/60 transition-all text-xs space-y-1.5"
          >
            <div class="flex items-center justify-between">
              <span class="font-bold text-cyan-300 truncate max-w-[150px]" :title="win.satelliteName">
                #{{ idx + 1 }} {{ win.satelliteName }}
              </span>
              <span class="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                峰值 {{ win.peakCoverageRate }}%
              </span>
            </div>

            <div class="grid grid-cols-2 gap-1 text-[10px] text-slate-400 font-mono">
              <div>进入: <strong class="text-slate-200">{{ formatSecToHHMM(win.startTimeSec) }}</strong></div>
              <div>离开: <strong class="text-slate-200">{{ formatSecToHHMM(win.endTimeSec) }}</strong></div>
              <div>持续: <strong class="text-emerald-400">{{ formatSecToMin(win.durationSec) }}</strong></div>
              <div>仰角: <strong class="text-cyan-300">{{ win.maxElevationDeg }}°</strong></div>
            </div>

            <div class="text-[9px] text-slate-500 pt-1 border-t border-slate-900 flex justify-between">
              <span>有效因子: {{ win.effectiveFactor }}</span>
              <span class="text-tactical-green">可拦截观测窗 ✓</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 模式 3: 有效覆盖率修正模型多因子调节 -->
      <div v-else-if="activeTab === 'EFFECTIVE_FACTORS'" class="space-y-3">
        <div class="p-3 rounded bg-slate-950/90 border border-amber-500/30 text-xs space-y-2">
          <div class="flex items-center gap-2 font-bold text-amber-300">
            <ShieldAlert class="w-4 h-4 text-amber-400" />
            <span>有效覆盖率修正模型：几何“看得到” ≠ 任务“有效覆盖”</span>
          </div>
          <div class="p-2 rounded bg-slate-900/80 font-mono text-[11px] text-slate-300 text-center select-text border border-slate-800">
            Coverage<sub>effective</sub> = Coverage<sub>geometry</sub> &times; F<sub>elevation</sub> &times; F<sub>sensor</sub> &times; F<sub>illumination</sub> &times; F<sub>weather</sub>
          </div>
          <p class="text-[10px] text-slate-400 leading-relaxed">
            光学侦察卫星受昼夜光照、太阳天顶角及对流层云雾遮蔽严重；雷达卫星受地物杂波及天线旁瓣干扰限制。
            系统通过四重物理修正因子，真实呈现战区有效任务可用性。
          </p>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 text-xs">
          <!-- 因子 1: 仰角修正 -->
          <div class="p-2.5 rounded bg-slate-900/90 border border-slate-800 space-y-1.5">
            <div class="text-[10px] text-tactical-muted flex items-center gap-1">
              <Eye class="w-3 h-3 text-cyan-400" />
              <span>仰角门限 F_elevation</span>
            </div>
            <div class="text-base font-bold text-cyan-300 font-mono">
              {{ currentEffectiveWeights.elevationFactor * 100 }}%
            </div>
            <div class="text-[9px] text-slate-500">
              最低仰角 &ge; {{ currentEffectiveWeights.minElevationDeg }}° 避免地物盲区
            </div>
          </div>

          <!-- 因子 2: 传感器分辨率约束 -->
          <div class="p-2.5 rounded bg-slate-900/90 border border-slate-800 space-y-1.5">
            <div class="text-[10px] text-tactical-muted flex items-center gap-1">
              <Radio class="w-3 h-3 text-emerald-400" />
              <span>载荷指标 F_sensor</span>
            </div>
            <div class="text-base font-bold text-emerald-300 font-mono">
              {{ currentEffectiveWeights.sensorFactor * 100 }}%
            </div>
            <div class="text-[9px] text-slate-500">
              侧摆成像机动与焦平面有效像元
            </div>
          </div>

          <!-- 因子 3: 昼夜光照约束 -->
          <div class="p-2.5 rounded bg-slate-900/90 border border-slate-800 space-y-1.5">
            <div class="text-[10px] text-tactical-muted flex items-center gap-1">
              <Sun class="w-3 h-3 text-amber-400" />
              <span>日照天顶 F_illumination</span>
            </div>
            <div class="text-base font-bold text-amber-300 font-mono">
              {{ currentEffectiveWeights.illuminationFactor * 100 }}%
            </div>
            <div class="text-[9px] text-slate-500">
              光学侦察夜间遮断，SAR全天候
            </div>
          </div>

          <!-- 因子 4: 对流层气象衰减 -->
          <div class="p-2.5 rounded bg-slate-900/90 border border-slate-800 space-y-1.5">
            <div class="text-[10px] text-tactical-muted flex items-center gap-1">
              <CloudRain class="w-3 h-3 text-blue-400" />
              <span>气象雨衰 F_weather</span>
            </div>
            <div class="text-base font-bold text-blue-300 font-mono">
              {{ currentEffectiveWeights.weatherFactor * 100 }}%
            </div>
            <div class="text-[9px] text-slate-500">
              台海季风云量与微波大气吸附
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 2. 交互调节：覆盖率筛选门限滑块 -->
    <div class="p-3.5 rounded bg-tactical-dark/70 border border-tactical-cyan/40 shadow-glow-cyan flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div class="space-y-1">
        <div class="flex items-center gap-2">
          <Sliders class="w-4 h-4 text-tactical-cyan" />
          <span class="text-xs font-bold text-tactical-text">筛选覆盖率大于指定门限:</span>
          <span class="text-sm font-bold text-amber-400 px-2 py-0.5 rounded bg-amber-500/20 border border-amber-400/40">
            &ge; {{ minCoverageThreshold }}%
          </span>
        </div>
        <p class="text-[10px] text-tactical-muted">
          滑动滑块调节目标卫星覆盖率门限，重点锁定广域覆盖节点与高重访关键侦察星
        </p>
      </div>

      <div class="flex items-center gap-3 w-full md:w-80">
        <span class="text-[10px] text-tactical-muted whitespace-nowrap">50%</span>
        <input
          type="range"
          min="50"
          max="95"
          step="5"
          v-model.number="minCoverageThreshold"
          class="flex-1 h-2 bg-slate-800 rounded appearance-none cursor-pointer accent-amber-500"
        />
        <span class="text-[10px] text-tactical-muted whitespace-nowrap">95%</span>
      </div>
    </div>

    <!-- 3. 筛选出的目标卫星列表 (候选卡片) -->
    <div class="p-3.5 rounded bg-tactical-dark/70 border border-tactical-border/80">
      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center gap-2">
          <CheckCircle2 class="w-4 h-4 text-tactical-green" />
          <h3 class="text-xs font-bold tracking-wider text-tactical-text">
            覆盖率筛选结果：满足 &ge; {{ minCoverageThreshold }}% 的关键节点 (共 {{ step3Candidates.length }} 颗)
          </h3>
        </div>
        <span class="text-[10px] text-amber-400 font-bold">
          ★ 打击后将撕裂广域信息真空盲区
        </span>
      </div>

      <!-- 卫星候选卡片网格 -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
        <div
          v-for="sat in step3Candidates"
          :key="sat.id"
          class="p-2.5 rounded bg-tactical-bg/90 border border-tactical-border/80 hover:border-amber-400/70 transition-all flex flex-col justify-between"
        >
          <div>
            <div class="flex items-start justify-between">
              <div>
                <div class="text-xs font-bold text-tactical-text">{{ sat.name }}</div>
                <div class="text-[10px] text-tactical-muted mt-0.5">
                  {{ sat.id }} · {{ sat.series || '专项载荷' }}
                </div>
              </div>
              <span class="text-xs font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow-[0_0_8px_rgba(245,158,11,0.3)]">
                覆盖率: {{ sat.coverageRate }}%
              </span>
            </div>

            <!-- 覆盖率可视化进度条 -->
            <div class="mt-2.5 space-y-1">
              <div class="flex justify-between text-[9px] text-tactical-muted">
                <span>战区瞬时几何覆盖包络能力:</span>
                <span class="text-amber-400 font-bold">{{ sat.coverageRate }}%</span>
              </div>
              <div class="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden border border-tactical-border">
                <div
                  class="h-full bg-gradient-to-r from-cyan-500 to-amber-400 transition-all duration-300"
                  :style="{ width: `${sat.coverageRate}%` }"
                ></div>
              </div>
            </div>

            <!-- 详细战术参数 -->
            <div class="mt-2.5 grid grid-cols-3 gap-1 py-1 px-1.5 rounded bg-tactical-dark/80 text-[9px] text-tactical-muted border border-tactical-border/40">
              <div>类型: <span class="text-tactical-text font-bold">{{ sat.category }}</span></div>
              <div>威胁度: <span class="text-red-400 font-bold">{{ sat.threatScore }}分</span></div>
              <div>时延: <span class="text-cyan-300 font-bold">{{ sat.linkLatencyMs }}ms</span></div>
            </div>
          </div>

          <div class="mt-2.5 pt-1.5 border-t border-tactical-border/40 flex items-center justify-between text-[9px]">
            <span class="text-tactical-cyan">扫宽: {{ sat.sensor.swathWidth }}km</span>
            <span class="text-amber-400 font-bold">高覆盖要害节点 ✓</span>
          </div>
        </div>
      </div>

      <div
        v-if="step3Candidates.length === 0"
        class="py-8 text-center text-tactical-muted text-xs"
      >
        当前无卫星覆盖率大于 &ge; {{ minCoverageThreshold }}%，请向左调节门限滑块。
      </div>
    </div>
  </div>
</template>
