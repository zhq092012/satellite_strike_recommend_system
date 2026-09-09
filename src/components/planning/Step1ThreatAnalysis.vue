<script setup lang="ts">
/**
 * @fileoverview 作战计划向导 - 第一步：分析威胁度组件 (Step1ThreatAnalysis.vue)
 * 展示多属性加权威胁度数学算法公式、各项权重调节滑块、打击威胁度门限筛选器以及筛选出的候选目标卫星列表
 */

import { ShieldAlert, Sliders, CheckCircle2 } from 'lucide-vue-next'
import { useCombatPlanState } from '../../composables/useCombatPlanState'

/**
 * 引入作战计划状态与计算数据
 */
const {
  threatFilterThreshold,
  wPayload,
  wOrbit,
  wRevisit,
  wStrategy,
  step1Candidates
} = useCombatPlanState()

/**
 * 格式化输出百分比数字
 *
 * @param val - 小数比例
 * @returns 百分比字符串
 */
function formatPercent(val: number): string {
  return `${Math.round(val * 100)}%`
}
</script>

<template>
  <div class="space-y-4 font-mono select-none">
    <!-- 1. 算法公式解析卡片 -->
    <div class="p-3.5 rounded bg-tactical-dark/70 border border-tactical-border/80">
      <div class="flex items-center justify-between mb-2">
        <div class="flex items-center gap-2">
          <ShieldAlert class="w-4 h-4 text-tactical-red" />
          <h3 class="text-xs font-bold tracking-wider text-tactical-text uppercase">
            一、天基目标战术威胁度多属性综合评价数学模型
          </h3>
        </div>
        <span class="text-[10px] px-2 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/40">
          数学模型: MADM-AHP 加权法
        </span>
      </div>

      <!-- 核心数学公式看板 (真实排版数学公式) -->
      <div class="p-3.5 sm:p-4 rounded bg-slate-950/80 border border-tactical-cyan/50 text-center space-y-2 shadow-[0_0_15px_rgba(6,182,212,0.15)]">
        <div class="flex items-center justify-center flex-wrap gap-y-2 font-serif text-tactical-cyan text-base sm:text-xl font-bold tracking-normal select-text">
          <!-- T_total -->
          <span><i class="italic">T</i><sub class="text-xs font-sans">综合</sub></span>
          <span class="mx-2 text-slate-300 font-sans">=</span>

          <!-- w1 * P_payload -->
          <span><i class="italic">w</i><sub class="text-xs font-sans">1</sub></span>
          <span class="mx-1 text-slate-400">·</span>
          <span><i class="italic">P</i><sub class="text-xs font-sans">载荷</sub></span>

          <span class="mx-2 text-slate-300 font-sans">+</span>

          <!-- w2 * [1 - (H - Hmin)/(Hmax - Hmin)] -->
          <span><i class="italic">w</i><sub class="text-xs font-sans">2</sub></span>
          <span class="mx-1 text-slate-400">·</span>
          <span class="inline-flex items-center">
            <span class="text-2xl font-light text-slate-400 mr-0.5">[</span>
            <span>1</span>
            <span class="mx-1.5 text-slate-300 font-sans">−</span>
            <span class="inline-flex flex-col items-center justify-center text-xs sm:text-sm align-middle">
              <span class="border-b border-tactical-cyan/60 px-1 pb-0.5 leading-none">
                <i class="italic">H</i> − <i class="italic">H</i><sub class="text-[10px] font-sans">min</sub>
              </span>
              <span class="px-1 pt-0.5 leading-none">
                <i class="italic">H</i><sub class="text-[10px] font-sans">max</sub> − <i class="italic">H</i><sub class="text-[10px] font-sans">min</sub>
              </span>
            </span>
            <span class="text-2xl font-light text-slate-400 ml-0.5">]</span>
          </span>

          <span class="mx-2 text-slate-300 font-sans">+</span>

          <!-- w3 * R_revisit -->
          <span><i class="italic">w</i><sub class="text-xs font-sans">3</sub></span>
          <span class="mx-1 text-slate-400">·</span>
          <span><i class="italic">R</i><sub class="text-xs font-sans">重访</sub></span>

          <span class="mx-2 text-slate-300 font-sans">+</span>

          <!-- w4 * V_strat -->
          <span><i class="italic">w</i><sub class="text-xs font-sans">4</sub></span>
          <span class="mx-1 text-slate-400">·</span>
          <span><i class="italic">V</i><sub class="text-xs font-sans">战略</sub></span>
        </div>

        <div class="text-[11px] text-tactical-muted font-mono flex items-center justify-center gap-2 flex-wrap">
          <span>综合威胁度得分 <strong class="text-tactical-cyan">T ∈ [0, 100]</strong></span>
          <span class="text-slate-600">|</span>
          <span>由载荷威慑力、轨道近度、重访频次与战略价值 4 项关键战术指标加权融合</span>
        </div>
      </div>

      <!-- 四项指标与可调权重滑块网格 -->
      <div class="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-[11px]">
        <!-- 因子 1: 载荷威慑力 -->
        <div class="p-2 rounded bg-tactical-bg/80 border border-tactical-border">
          <div class="flex justify-between text-tactical-muted mb-1">
            <span class="text-red-400 font-bold">1. 载荷威力 (w₁)</span>
            <span class="text-tactical-cyan font-bold">{{ formatPercent(wPayload) }}</span>
          </div>
          <input
            type="range"
            min="0.1"
            max="0.6"
            step="0.05"
            v-model.number="wPayload"
            class="w-full h-1 bg-slate-700 rounded appearance-none cursor-pointer accent-red-500"
          />
          <p class="text-[9px] text-tactical-muted mt-1 leading-tight">
            高分光学/SAR雷达/凝视红外/宽带通信
          </p>
        </div>

        <!-- 因子 2: 轨道近度 -->
        <div class="p-2 rounded bg-tactical-bg/80 border border-tactical-border">
          <div class="flex justify-between text-tactical-muted mb-1">
            <span class="text-amber-400 font-bold">2. 轨道近度 (w₂)</span>
            <span class="text-tactical-cyan font-bold">{{ formatPercent(wOrbit) }}</span>
          </div>
          <input
            type="range"
            min="0.1"
            max="0.6"
            step="0.05"
            v-model.number="wOrbit"
            class="w-full h-1 bg-slate-700 rounded appearance-none cursor-pointer accent-amber-500"
          />
          <p class="text-[9px] text-tactical-muted mt-1 leading-tight">
            低轨(LEO)距我更近，留空反应时间短
          </p>
        </div>

        <!-- 因子 3: 重访频次 -->
        <div class="p-2 rounded bg-tactical-bg/80 border border-tactical-border">
          <div class="flex justify-between text-tactical-muted mb-1">
            <span class="text-cyan-400 font-bold">3. 重访频度 (w₃)</span>
            <span class="text-tactical-cyan font-bold">{{ formatPercent(wRevisit) }}</span>
          </div>
          <input
            type="range"
            min="0.1"
            max="0.6"
            step="0.05"
            v-model.number="wRevisit"
            class="w-full h-1 bg-slate-700 rounded appearance-none cursor-pointer accent-cyan-500"
          />
          <p class="text-[9px] text-tactical-muted mt-1 leading-tight">
            对台海/南海等关键空域的重访周期
          </p>
        </div>

        <!-- 因子 4: 战略价值 -->
        <div class="p-2 rounded bg-tactical-bg/80 border border-tactical-border">
          <div class="flex justify-between text-tactical-muted mb-1">
            <span class="text-purple-400 font-bold">4. 战略价值 (w₄)</span>
            <span class="text-tactical-cyan font-bold">{{ formatPercent(wStrategy) }}</span>
          </div>
          <input
            type="range"
            min="0.1"
            max="0.6"
            step="0.05"
            v-model.number="wStrategy"
            class="w-full h-1 bg-slate-700 rounded appearance-none cursor-pointer accent-purple-500"
          />
          <p class="text-[9px] text-tactical-muted mt-1 leading-tight">
            敌联合全域指控、战役中枢与星盾军用
          </p>
        </div>
      </div>
    </div>

    <!-- 2. 交互调节：威胁度打击筛选门限 -->
    <div class="p-3.5 rounded bg-tactical-dark/70 border border-tactical-cyan/40 shadow-glow-cyan flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div class="space-y-1">
        <div class="flex items-center gap-2">
          <Sliders class="w-4 h-4 text-tactical-cyan" />
          <span class="text-xs font-bold text-tactical-text">调节打击威胁度门限阈值:</span>
          <span class="text-sm font-bold text-red-400 px-2 py-0.5 rounded bg-red-500/20 border border-red-500/40">
            &ge; {{ threatFilterThreshold }} 分
          </span>
        </div>
        <p class="text-[10px] text-tactical-muted">
          滑动滑块调整需列入首波次打击清单的目标威胁度下限，系统将实时筛选出符合条件的敌方卫星
        </p>
      </div>

      <div class="flex items-center gap-3 w-full md:w-80">
        <span class="text-[10px] text-tactical-muted whitespace-nowrap">60分</span>
        <input
          type="range"
          min="60"
          max="95"
          step="1"
          v-model.number="threatFilterThreshold"
          class="flex-1 h-2 bg-slate-800 rounded appearance-none cursor-pointer accent-red-500"
        />
        <span class="text-[10px] text-tactical-muted whitespace-nowrap">95分</span>
      </div>
    </div>

    <!-- 3. 筛选出的目标卫星列表 -->
    <div class="p-3.5 rounded bg-tactical-dark/70 border border-tactical-border/80">
      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center gap-2">
          <CheckCircle2 class="w-4 h-4 text-tactical-green" />
          <h3 class="text-xs font-bold tracking-wider text-tactical-text">
            筛选结果：满足打击门限的目标卫星 (共 {{ step1Candidates.length }} 颗)
          </h3>
        </div>
        <span class="text-[10px] font-mono text-tactical-muted">
          当前入选率: {{ Math.round((step1Candidates.length / 9) * 100) }}%
        </span>
      </div>

      <!-- 卫星候选表格/卡片网格 -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
        <div
          v-for="sat in step1Candidates"
          :key="sat.id"
          class="p-2.5 rounded bg-tactical-bg/90 border border-tactical-border/80 hover:border-tactical-cyan/60 transition-all flex flex-col justify-between"
        >
          <div>
            <div class="flex items-start justify-between">
              <div>
                <div class="text-xs font-bold text-tactical-text">{{ sat.name }}</div>
                <div class="text-[10px] text-tactical-muted mt-0.5">
                  {{ sat.id }} · {{ sat.owner }}
                </div>
              </div>
              <!-- 威胁度勋章 -->
              <span
                :class="[
                  'text-[10px] font-bold px-1.5 py-0.5 rounded border',
                  sat.threatScore >= 90
                    ? 'bg-red-500/25 text-red-400 border-red-500/60 shadow-[0_0_8px_rgba(239,68,68,0.4)]'
                    : 'bg-amber-500/20 text-amber-400 border-amber-500/50'
                ]"
              >
                威胁度: {{ sat.threatScore }}分
              </span>
            </div>

            <!-- 关键参数 -->
            <div class="mt-2 grid grid-cols-3 gap-1 py-1 px-1.5 rounded bg-tactical-dark/80 text-[9px] text-tactical-muted border border-tactical-border/40">
              <div>轨道: <span class="text-tactical-text font-bold">{{ sat.orbitType }}</span></div>
              <div>高度: <span class="text-tactical-text font-bold">{{ sat.telemetry.altitude.toFixed(0) }}km</span></div>
              <div>延迟: <span class="text-cyan-300 font-bold">{{ sat.linkLatencyMs }}ms</span></div>
            </div>

            <!-- 传感器载荷威力说明 -->
            <div class="mt-2 text-[10px] text-tactical-text/90 line-clamp-2">
              <span class="text-tactical-muted">核心载荷:</span> {{ sat.sensor.name }}
            </div>
          </div>

          <!-- 底部标记 -->
          <div class="mt-2.5 pt-1.5 border-t border-tactical-border/40 flex items-center justify-between text-[9px]">
            <span class="text-tactical-cyan">状态: {{ sat.status }}</span>
            <span class="text-red-400 font-bold">符合打击条件 ✓</span>
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <div
        v-if="step1Candidates.length === 0"
        class="py-10 text-center text-tactical-muted text-xs"
      >
        门限过高，当前无卫星满足 &ge; {{ threatFilterThreshold }} 分条件，请向左拖动滑块降低门限。
      </div>
    </div>
  </div>
</template>
