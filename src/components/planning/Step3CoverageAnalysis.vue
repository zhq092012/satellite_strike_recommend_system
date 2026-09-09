<script setup lang="ts">
/**
 * @fileoverview 作战计划向导 - 第三步：分析覆盖率组件 (Step3CoverageAnalysis.vue)
 * 展示瞬时视场角几何交集计算模型、多星重叠重构覆盖率公式、覆盖率筛选门限滑块及候选目标卫星列表
 */

import { Globe, Sliders, CheckCircle2 } from 'lucide-vue-next'
import { useCombatPlanState } from '../../composables/useCombatPlanState'

/**
 * 引入作战计划状态与计算数据
 */
const {
  minCoverageThreshold,
  step3Candidates
} = useCombatPlanState()
</script>

<template>
  <div class="space-y-4 font-mono select-none">
    <!-- 1. 覆盖率数学算法模型展示 -->
    <div class="p-3.5 rounded bg-tactical-dark/70 border border-tactical-border/80">
      <div class="flex items-center justify-between mb-2">
        <div class="flex items-center gap-2">
          <Globe class="w-4 h-4 text-tactical-cyan" />
          <h3 class="text-xs font-bold tracking-wider text-tactical-text uppercase">
            三、对地视场几何包络与分布式星座重叠覆盖率算法模型
          </h3>
        </div>
        <span class="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-400/40">
          空间几何学: 球面冠角投影
        </span>
      </div>

      <!-- 核心数学公式看板 (真实排版数学公式) -->
      <div class="p-3.5 sm:p-4 rounded bg-slate-950/80 border border-amber-500/40 text-center space-y-2.5 shadow-[0_0_15px_rgba(245,158,11,0.15)]">
        <!-- 公式 1: 单星地面覆盖面积模型 -->
        <div class="flex items-center justify-center flex-wrap gap-y-2 font-serif text-amber-300 text-sm sm:text-base font-bold select-text">
          <span><i class="italic">S</i><sub class="text-xs font-sans">覆盖</sub></span>
          <span class="mx-2 text-slate-300 font-sans">=</span>
          <span>2π <i class="italic">R</i><sub class="text-xs font-sans">e</sub>²</span>
          <span class="inline-flex items-center mx-1">
            <span class="text-xl font-light text-slate-400 mr-0.5">(</span>
            <span>1 − cos <i class="italic">θ</i><sub class="text-xs font-sans">冠角</sub></span>
            <span class="text-xl font-light text-slate-400 ml-0.5">)</span>
          </span>
          <span class="mx-2 text-slate-500 font-sans">，</span>
          <span><i class="italic">θ</i><sub class="text-xs font-sans">冠角</sub></span>
          <span class="mx-1.5 text-slate-300 font-sans">=</span>
          <span class="font-sans font-normal text-slate-200 text-xs sm:text-sm">arcsin</span>
          <span class="inline-flex items-center">
            <span class="text-xl font-light text-slate-400 mr-0.5">[</span>
            <span class="inline-flex flex-col items-center justify-center text-xs align-middle">
              <span class="border-b border-amber-400/60 px-1 pb-0.5 leading-none"><i class="italic">R</i><sub class="text-[10px] font-sans">e</sub> + <i class="italic">H</i></span>
              <span class="px-1 pt-0.5 leading-none"><i class="italic">R</i><sub class="text-[10px] font-sans">e</sub></span>
            </span>
            <span class="mx-1">· sin <i class="italic">β</i><sub class="text-xs font-sans">视场</sub></span>
            <span class="text-xl font-light text-slate-400 ml-0.5">]</span>
          </span>
          <span class="mx-1.5 text-slate-300 font-sans">−</span>
          <span><i class="italic">β</i><sub class="text-xs font-sans">视场</sub></span>
        </div>

        <!-- 公式 2: 多星分布式星座对战区冗余重叠覆盖概率 -->
        <div class="flex items-center justify-center flex-wrap gap-y-2 font-serif text-tactical-cyan text-sm sm:text-base font-bold select-text">
          <span><i class="italic">C</i><sub class="text-xs font-sans">星座冗余</sub></span>
          <span class="mx-2 text-slate-300 font-sans">=</span>
          <span>1</span>
          <span class="mx-2 text-slate-300 font-sans">−</span>
          <span class="inline-flex flex-col items-center justify-center text-xs align-middle mr-1.5">
            <span class="text-[9px] text-slate-400 leading-none">N</span>
            <span class="text-base font-sans leading-none text-amber-400">∏</span>
            <span class="text-[9px] text-slate-400 leading-none">k=1</span>
          </span>
          <span class="inline-flex items-center">
            <span class="text-2xl font-light text-slate-400 mr-0.5">(</span>
            <span>1</span>
            <span class="mx-1.5 text-slate-300 font-sans">−</span>
            <span class="inline-flex flex-col items-center justify-center text-xs align-middle">
              <span class="border-b border-tactical-cyan/60 px-1 pb-0.5 leading-none"><i class="italic">S</i><sub class="text-[10px] font-sans">k</sub> ∩ <i class="italic">S</i><sub class="text-[10px] font-sans">战区</sub></span>
              <span class="px-1 pt-0.5 leading-none"><i class="italic">S</i><sub class="text-[10px] font-sans">战区</sub></span>
            </span>
            <span class="text-2xl font-light text-slate-400 ml-0.5">)</span>
          </span>
        </div>

        <div class="text-[11px] text-tactical-muted font-mono flex items-center justify-center gap-2 flex-wrap">
          <span><strong class="text-amber-400">β<sub>视场</sub></strong> 为载荷半视场角</span>
          <span class="text-slate-600">|</span>
          <span><strong class="text-tactical-cyan">H</strong> 为卫星轨道高度</span>
          <span class="text-slate-600">|</span>
          <span><strong class="text-emerald-400">C<sub>星座冗余</sub></strong> 为分布式星座对战区(ROI)的重叠冗余覆盖概率</span>
        </div>
      </div>

      <!-- 战术要点分析 -->
      <div class="mt-2.5 p-2 rounded bg-tactical-bg/80 border border-tactical-border/60 text-[10px] text-tactical-text leading-relaxed">
        <span class="text-amber-400 font-bold">★ 战术覆盖率打击价值:</span>
        覆盖率越高的通信/中继卫星（如 <span class="text-cyan-300 font-bold">TDRS-13 (96%)</span>、<span class="text-cyan-300 font-bold">Starlink (94%)</span>、<span class="text-cyan-300 font-bold">GPS-III (88%)</span>），其地面数据汇聚与战术分发能力越强。
        若通过反卫打击将其瘫痪或严重降级，将直接在敌战区通信网上撕裂出数千平方公里的信息真空黑洞！
      </div>
    </div>

    <!-- 2. 交互调节：覆盖率筛选门限 -->
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
          滑动滑块调节目标卫星覆盖率门限，重点锁定广域覆盖节点与分布式主干星
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

    <!-- 3. 筛选出的目标卫星列表 -->
    <div class="p-3.5 rounded bg-tactical-dark/70 border border-tactical-border/80">
      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center gap-2">
          <CheckCircle2 class="w-4 h-4 text-tactical-green" />
          <h3 class="text-xs font-bold tracking-wider text-tactical-text">
            覆盖率筛选结果：满足 &ge; {{ minCoverageThreshold }}% 的关键节点 (共 {{ step3Candidates.length }} 颗)
          </h3>
        </div>
        <span class="text-[10px] text-tactical-muted">
          覆盖黑洞潜在目标
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
                <span>战区有效视场覆盖能力:</span>
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
