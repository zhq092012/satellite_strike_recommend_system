<script setup lang="ts">
/**
 * @fileoverview 作战计划向导 - 第四步：分析可打击度组件 (Step4StrikeFeasibility.vue)
 * 展示阵地反卫武器交战几何包线、杀伤概率 Pk 期望模型与反应时间窗口算法，
 * 提供可打击度门限筛选滑块与筛选候选目标卫星结果列表
 */

import { Crosshair, Sliders, CheckCircle2, ShieldCheck } from 'lucide-vue-next'
import { useCombatPlanState } from '../../composables/useCombatPlanState'
import { useTacticalAssetsState } from '../../composables/useTacticalAssetsState'

/**
 * 引入作战计划状态与计算数据
 */
const {
  minStrikeFeasibilityThreshold,
  step4Candidates
} = useCombatPlanState()

/**
 * 引入武器装备数据
 */
const { weapons } = useTacticalAssetsState()
</script>

<template>
  <div class="space-y-4 font-mono select-none">
    <!-- 1. 可打击度算法模型解析 -->
    <div class="p-3.5 rounded bg-tactical-dark/70 border border-tactical-border/80">
      <div class="flex items-center justify-between mb-2">
        <div class="flex items-center gap-2">
          <Crosshair class="w-4 h-4 text-tactical-cyan" />
          <h3 class="text-xs font-bold tracking-wider text-tactical-text uppercase">
            四、武器立体交战包络与杀伤概率 Pk 综合可打击度算法模型
          </h3>
        </div>
        <span class="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
          火控算法: 射界动力学交会模型
        </span>
      </div>

      <!-- 核心数学公式看板 (真实排版数学公式) -->
      <div class="p-3.5 sm:p-4 rounded bg-slate-950/80 border border-emerald-500/40 text-center space-y-2 shadow-[0_0_15px_rgba(16,185,129,0.15)]">
        <div class="flex items-center justify-center flex-wrap gap-y-2 font-serif text-emerald-400 text-sm sm:text-lg font-bold tracking-normal select-text">
          <!-- F_strike -->
          <span><i class="italic">F</i><sub class="text-xs font-sans">可打击度</sub></span>
          <span class="mx-2 text-slate-300 font-sans">=</span>
          <span class="text-slate-200">100</span>
          <span class="mx-1 text-slate-400">×</span>

          <span class="inline-flex items-center">
            <span class="text-2xl font-light text-slate-400 mr-0.5">[</span>

            <!-- 0.40 * eta_alt(H) -->
            <span>0.40 · <i class="italic">η</i><sub class="text-xs font-sans">射高</sub>(<i class="italic">H</i>)</span>

            <span class="mx-2 text-slate-300 font-sans">+</span>

            <!-- 0.35 * Pk * (1 - P_decoy) -->
            <span>0.35 · <i class="italic">P</i><sub class="text-xs font-sans">k</sub></span>
            <span class="inline-flex items-center mx-1">
              <span class="text-xl font-light text-slate-400 mr-0.5">(</span>
              <span>1 − <i class="italic">P</i><sub class="text-xs font-sans">诱饵</sub></span>
              <span class="text-xl font-light text-slate-400 ml-0.5">)</span>
            </span>

            <span class="mx-2 text-slate-300 font-sans">+</span>

            <!-- 0.25 * exp(- tau_resp / delta_t_pass) -->
            <span>0.25 · <span class="font-sans font-normal text-slate-200 text-xs sm:text-sm">exp</span></span>
            <span class="inline-flex items-center">
              <span class="text-xl font-light text-slate-400 mr-0.5">(</span>
              <span class="mx-0.5 text-slate-300 font-sans">−</span>
              <span class="inline-flex flex-col items-center justify-center text-xs align-middle">
                <span class="border-b border-emerald-400/60 px-1 pb-0.5 leading-none"><i class="italic">τ</i><sub class="text-[10px] font-sans">响应</sub></span>
                <span class="px-1 pt-0.5 leading-none">Δ<i class="italic">t</i><sub class="text-[10px] font-sans">过境</sub></span>
              </span>
              <span class="text-xl font-light text-slate-400 ml-0.5">)</span>
            </span>

            <span class="text-2xl font-light text-slate-400 ml-0.5">]</span>
          </span>
        </div>

        <div class="text-[11px] text-tactical-muted font-mono flex items-center justify-center gap-2 flex-wrap">
          <span><strong class="text-emerald-400">η<sub>射高</sub>(H)</strong> 为武器射高适配度</span>
          <span class="text-slate-600">|</span>
          <span><strong class="text-tactical-cyan">P<sub>k</sub></strong> 为单发杀伤率</span>
          <span class="text-slate-600">|</span>
          <span><strong class="text-amber-400">P<sub>诱饵</sub></strong> 为目标反导假目标率</span>
          <span class="text-slate-600">|</span>
          <span><strong class="text-purple-400">τ<sub>响应</sub> / Δt<sub>过境</sub></strong> 为交战窗口利用时滞比</span>
        </div>
      </div>

      <!-- 我方主战反卫阵地覆盖能力 -->
      <div class="mt-3 grid grid-cols-1 md:grid-cols-3 gap-2 text-[10px]">
        <div
          v-for="wpn in weapons"
          :key="wpn.id"
          class="p-2 rounded bg-tactical-bg/90 border border-tactical-border flex flex-col justify-between"
        >
          <div>
            <div class="flex items-center justify-between">
              <span class="font-bold text-tactical-cyan">{{ wpn.name.split(' ')[0] }}</span>
              <span class="px-1 py-0.2 rounded text-[9px] bg-tactical-dark text-tactical-muted border border-tactical-border">
                {{ wpn.type }}
              </span>
            </div>
            <div class="mt-1 text-tactical-text">阵地: {{ wpn.locationName }}</div>
            <div class="mt-1 text-tactical-muted">
              有效射高: <span class="text-emerald-400 font-bold">{{ wpn.strikeRange.minAltitudeKm }}~{{ wpn.strikeRange.maxAltitudeKm }}km</span>
            </div>
          </div>
          <div class="mt-2 pt-1 border-t border-tactical-border/40 flex justify-between text-[9px]">
            <span>杀伤概率 Pk: <strong class="text-emerald-400">{{ wpn.performance.pkProbability }}%</strong></span>
            <span>反应: <strong class="text-cyan-300">{{ wpn.performance.responseTimeSec }}s</strong></span>
          </div>
        </div>
      </div>
    </div>

    <!-- 2. 交互调节：可打击度筛选门限 -->
    <div class="p-3.5 rounded bg-tactical-dark/70 border border-tactical-cyan/40 shadow-glow-cyan flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div class="space-y-1">
        <div class="flex items-center gap-2">
          <Sliders class="w-4 h-4 text-tactical-cyan" />
          <span class="text-xs font-bold text-tactical-text">筛选可打击度评分大于:</span>
          <span class="text-sm font-bold text-emerald-400 px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/40">
            &ge; {{ minStrikeFeasibilityThreshold }} 分
          </span>
        </div>
        <p class="text-[10px] text-tactical-muted">
          筛选当前阵地射高包络与拦截窗口高度可行的目标卫星，确保首发命中率
        </p>
      </div>

      <div class="flex items-center gap-3 w-full md:w-80">
        <span class="text-[10px] text-tactical-muted whitespace-nowrap">60分</span>
        <input
          type="range"
          min="60"
          max="95"
          step="1"
          v-model.number="minStrikeFeasibilityThreshold"
          class="flex-1 h-2 bg-slate-800 rounded appearance-none cursor-pointer accent-emerald-500"
        />
        <span class="text-[10px] text-tactical-muted whitespace-nowrap">95分</span>
      </div>
    </div>

    <!-- 3. 筛选出的可打击目标卫星结果 -->
    <div class="p-3.5 rounded bg-tactical-dark/70 border border-tactical-border/80">
      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center gap-2">
          <CheckCircle2 class="w-4 h-4 text-tactical-green" />
          <h3 class="text-xs font-bold tracking-wider text-tactical-text">
            可打击度评估筛选结果 (共 {{ step4Candidates.length }} 颗高可行目标)
          </h3>
        </div>
        <span class="text-[10px] text-emerald-400 font-bold">
          火控解算通过率 100%
        </span>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
        <div
          v-for="sat in step4Candidates"
          :key="sat.id"
          class="p-2.5 rounded bg-tactical-bg/90 border border-tactical-border/80 hover:border-emerald-500/60 transition-all flex flex-col justify-between"
        >
          <div>
            <div class="flex items-start justify-between">
              <div>
                <div class="text-xs font-bold text-tactical-text">{{ sat.name }}</div>
                <div class="text-[10px] text-tactical-muted mt-0.5">
                  {{ sat.id }} · 轨道高度 {{ sat.telemetry.altitude.toFixed(0) }}km
                </div>
              </div>
              <span class="text-xs font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 shadow-[0_0_8px_rgba(16,185,129,0.3)]">
                可打击度: {{ sat.strikeFeasibilityScore }}分
              </span>
            </div>

            <!-- 可行性战术简述 -->
            <div class="mt-2 p-1.5 rounded bg-tactical-dark/80 border border-tactical-border/40 text-[10px] text-tactical-muted leading-tight">
              <span class="text-emerald-400 font-bold">打击可行性依据:</span>
              {{ sat.strikeFeasibilityReason || '目标轨道参数稳定，处于我方陆基动能弹与激光武器最佳杀伤包络内部。' }}
            </div>
          </div>

          <div class="mt-2.5 pt-1.5 border-t border-tactical-border/40 flex items-center justify-between text-[9px]">
            <span class="text-tactical-cyan">威胁度: {{ sat.threatScore }}分</span>
            <span class="text-emerald-400 font-bold flex items-center gap-1">
              <ShieldCheck class="w-3 h-3" />
              进入交战清单 ✓
            </span>
          </div>
        </div>
      </div>

      <div
        v-if="step4Candidates.length === 0"
        class="py-8 text-center text-tactical-muted text-xs"
      >
        当前无可打击度 &ge; {{ minStrikeFeasibilityThreshold }} 分的目标，请调低门限。
      </div>
    </div>
  </div>
</template>
