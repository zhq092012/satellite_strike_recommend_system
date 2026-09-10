<script setup lang="ts">
/**
 * @fileoverview 作战计划向导 - 第一步：分析威胁度组件 (Step1ThreatAnalysis.vue)
 * 提供作战任务时空基准关联（任务时长、目标战区）、任务期内过境解算、MADM-AHP 动态威胁度权重模型以及从高到低严格倒序排列的候选卫星列表
 */

import {
  ShieldAlert,
  Sliders,
  CheckCircle2,
  Target,
  Clock,
  MapPin,
  Zap,
  ArrowDownUp,
  Layers
} from 'lucide-vue-next'
import { useCombatPlanState } from '../../composables/useCombatPlanState'

/**
 * 引入作战计划状态与计算数据
 */
const {
  selectedPlanMissionId,
  planMissionDurationHours,
  selectedPlanBattlefieldId,
  currentPlanMission,
  currentPlanBattlefield,
  missions,
  battlefields,
  setPlanMission,
  setPlanMissionDurationHours,
  setPlanBattlefield,
  threatFilterThreshold,
  wPayload,
  wOrbit,
  wRevisit,
  wStrategy,
  step1Candidates,
  evaluatedSatellites
} = useCombatPlanState()

/**
 * 快捷任务时长预设配置
 */
const durationPresets = [
  { hours: 6, label: '6h (突发速决)' },
  { hours: 12, label: '12h (半日战役)' },
  { hours: 24, label: '24h (标准昼夜)' },
  { hours: 48, label: '48h (持续行动)' },
  { hours: 72, label: '72h (战役周期)' }
]

/**
 * 格式化输出百分比数字
 *
 * @param val - 小数比例
 * @returns 百分比字符串
 */
function formatPercent(val: number): string {
  return `${Math.round(val * 100)}%`
}

/**
 * 格式化输出过境秒数为分钟+秒
 */
function formatOverpassDuration(totalSeconds: number): string {
  if (totalSeconds >= 3600) {
    const h = (totalSeconds / 3600).toFixed(1)
    return `${h}小时`
  }
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return s > 0 ? `${m}分${s}秒` : `${m}分钟`
}
</script>

<template>
  <div class="space-y-4 font-mono select-none">
    <!-- 1. 核心首步：关联协同作战任务与时空基准约束 (任务时长与目标区域) -->
    <div class="p-3.5 rounded bg-tactical-dark/80 border border-tactical-cyan/60 shadow-[0_0_15px_rgba(6,182,212,0.15)] relative overflow-hidden">
      <!-- 背景光晕装饰 -->
      <div class="absolute -right-16 -top-16 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <!-- 模块标题栏 -->
      <div class="flex items-center justify-between mb-3 border-b border-tactical-border/70 pb-2">
        <div class="flex items-center gap-2">
          <Target class="w-4 h-4 text-tactical-cyan animate-pulse" />
          <h3 class="text-xs sm:text-sm font-black tracking-wider text-tactical-text uppercase flex items-center gap-2">
            <span>一、关联协同作战任务与时空基准约束</span>
            <span class="text-[10px] text-tactical-cyan font-normal">（任务时长 · 战区区域 · 动力学过境约束）</span>
          </h3>
        </div>
        <span class="text-[10px] px-2.5 py-0.5 rounded bg-tactical-cyan/20 text-tactical-cyan border border-tactical-cyan/50 font-bold">
          作战基准建立中
        </span>
      </div>

      <!-- 任务、时长与区域三位一体控制面板 -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <!-- 维度 1: 关联作战任务 -->
        <div class="p-2.5 rounded bg-tactical-bg/90 border border-tactical-border flex flex-col justify-between space-y-2">
          <div>
            <div class="flex items-center justify-between text-tactical-muted mb-1.5">
              <span class="text-tactical-cyan font-bold flex items-center gap-1 text-[11px]">
                <Layers class="w-3.5 h-3.5" />
                1. 选择关联作战任务:
              </span>
              <span class="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                {{ currentPlanMission?.priority || 'CRITICAL' }}
              </span>
            </div>

            <!-- 任务下拉切换选择 -->
            <select
              :value="selectedPlanMissionId"
              @change="setPlanMission(($event.target as HTMLSelectElement).value)"
              class="w-full bg-slate-900 border border-tactical-border rounded px-2.5 py-1.5 text-xs text-tactical-text focus:border-tactical-cyan focus:outline-none cursor-pointer"
            >
              <option
                v-for="msn in missions"
                :key="msn.id"
                :value="msn.id"
              >
                [{{ msn.id }}] {{ msn.name }}
              </option>
            </select>
          </div>

          <!-- 当前任务战术画像徽章 -->
          <div class="p-2 rounded bg-slate-950/70 border border-tactical-border/50 text-[10px] space-y-1">
            <div class="flex justify-between">
              <span class="text-tactical-muted">战术代号:</span>
              <span class="text-tactical-cyan font-bold">{{ currentPlanMission?.code }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-tactical-muted">政治红线:</span>
              <span class="text-amber-400 font-bold">
                {{ currentPlanMission?.politicalRedLine === 'MILITARY_ONLY' ? '纯军用限制' : '军民两用全维打击' }}
              </span>
            </div>
            <div class="truncate text-tactical-muted">
              <span class="text-slate-400">打击重点:</span>
              {{ currentPlanMission?.targetConstellations?.join('、') || '美军低轨立体星座' }}
            </div>
          </div>
        </div>

        <!-- 维度 2: 任务推演时长与时间窗口 -->
        <div class="p-2.5 rounded bg-tactical-bg/90 border border-tactical-border flex flex-col justify-between space-y-2">
          <div>
            <div class="flex items-center justify-between text-tactical-muted mb-1.5">
              <span class="text-amber-400 font-bold flex items-center gap-1 text-[11px]">
                <Clock class="w-3.5 h-3.5" />
                2. 任务推演时长与窗口:
              </span>
              <span class="text-[11px] text-amber-300 font-bold px-1.5 py-0.2 rounded bg-amber-500/20 border border-amber-500/40">
                持续 {{ planMissionDurationHours }} 小时
              </span>
            </div>

            <!-- 快捷时长选择按钮组 -->
            <div class="grid grid-cols-5 gap-1 mb-2">
              <button
                v-for="preset in durationPresets"
                :key="preset.hours"
                @click="setPlanMissionDurationHours(preset.hours)"
                :class="[
                  'py-1 rounded text-[9px] font-bold border transition-all',
                  planMissionDurationHours === preset.hours
                    ? 'bg-amber-500/30 border-amber-400 text-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.3)]'
                    : 'bg-slate-900/80 border-tactical-border text-tactical-muted hover:text-white'
                ]"
              >
                {{ preset.hours }}h
              </button>
            </div>

            <!-- 时长细调滑动条 -->
            <div class="flex items-center gap-2">
              <span class="text-[9px] text-tactical-muted">1h</span>
              <input
                type="range"
                min="1"
                max="72"
                step="1"
                :value="planMissionDurationHours"
                @input="setPlanMissionDurationHours(Number(($event.target as HTMLInputElement).value))"
                class="flex-1 h-1.5 bg-slate-800 rounded appearance-none cursor-pointer accent-amber-500"
              />
              <span class="text-[9px] text-tactical-muted">72h</span>
            </div>
          </div>

          <!-- 时间窗口解析牌 -->
          <div class="p-2 rounded bg-slate-950/70 border border-tactical-border/50 text-[10px] space-y-1">
            <div class="flex justify-between text-slate-300">
              <span class="text-tactical-muted">有效推演窗口:</span>
              <span class="text-tactical-text font-bold">T+00:00 ~ T+{{ planMissionDurationHours }}:00</span>
            </div>
            <div class="text-[9px] text-amber-400/90 leading-tight">
              ★ 仅在上述时段内入境并对战区形成过境视场的目标卫星才被计入过境频次
            </div>
          </div>
        </div>

        <!-- 维度 3: 任务目标区域与战区范围 -->
        <div class="p-2.5 rounded bg-tactical-bg/90 border border-tactical-border flex flex-col justify-between space-y-2">
          <div>
            <div class="flex items-center justify-between text-tactical-muted mb-1.5">
              <span class="text-cyan-400 font-bold flex items-center gap-1 text-[11px]">
                <MapPin class="w-3.5 h-3.5" />
                3. 任务目标区域与战区:
              </span>
              <span class="text-[10px] text-cyan-300 font-bold px-1.5 py-0.2 rounded bg-cyan-500/20 border border-cyan-500/40">
                R = {{ currentPlanBattlefield?.area?.radiusKm || 380 }}km
              </span>
            </div>

            <!-- 战区下拉选择 -->
            <select
              :value="selectedPlanBattlefieldId"
              @change="setPlanBattlefield(($event.target as HTMLSelectElement).value)"
              class="w-full bg-slate-900 border border-tactical-border rounded px-2.5 py-1.5 text-xs text-tactical-text focus:border-tactical-cyan focus:outline-none cursor-pointer"
            >
              <option
                v-for="bf in battlefields"
                :key="bf.id"
                :value="bf.id"
              >
                {{ bf.name }}
              </option>
            </select>
          </div>

          <!-- 区域经纬度与覆盖范围牌 -->
          <div class="p-2 rounded bg-slate-950/70 border border-tactical-border/50 text-[10px] space-y-1">
            <div class="flex justify-between">
              <span class="text-tactical-muted">空域中心锚点:</span>
              <span class="text-tactical-cyan font-bold">
                {{ currentPlanBattlefield?.area?.center?.longitude.toFixed(2) }}°E,
                {{ currentPlanBattlefield?.area?.center?.latitude.toFixed(2) }}°N
              </span>
            </div>
            <div class="flex justify-between">
              <span class="text-tactical-muted">战备防护状态:</span>
              <span class="text-emerald-400 font-bold">{{ currentPlanBattlefield?.status || 'ACTIVE' }}</span>
            </div>
            <div class="text-[9px] text-cyan-300/80 truncate">
              战区代号: {{ currentPlanBattlefield?.code }} · 半径 {{ currentPlanBattlefield?.area?.radiusKm }}km
            </div>
          </div>
        </div>
      </div>

      <!-- 智能过境推演提示标牌 -->
      <div class="mt-3 p-2 rounded bg-tactical-cyan/10 border border-tactical-cyan/30 flex items-center gap-2 text-[11px] text-tactical-cyan">
        <Zap class="w-4 h-4 text-tactical-cyan shrink-0 animate-pulse" />
        <span class="leading-tight">
          <strong>动力学联动就绪：</strong>系统已基于关联任务<strong>【{{ currentPlanMission?.name }}】</strong>所设定的<strong>【{{ planMissionDurationHours }}小时任务期】</strong>与<strong>【{{ currentPlanBattlefield?.name }} (半径{{ currentPlanBattlefield?.area?.radiusKm }}km)】</strong>空域，实时解算出每颗在轨卫星在有效任务时间内的过境次数、战区累计留空时长及综合威胁度。
        </span>
      </div>
    </div>

    <!-- 2. 算法公式解析卡片 (展示 MADM-AHP 加权法与 4 权重调节) -->
    <div class="p-3.5 rounded bg-tactical-dark/70 border border-tactical-border/80">
      <div class="flex items-center justify-between mb-2">
        <div class="flex items-center gap-2">
          <ShieldAlert class="w-4 h-4 text-tactical-red" />
          <h3 class="text-xs font-bold tracking-wider text-tactical-text uppercase">
            二、天基目标战术威胁度多属性综合评价数学模型
          </h3>
        </div>
        <span class="text-[10px] px-2 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/40">
          数学模型: MADM-AHP 加权融合
        </span>
      </div>

      <!-- 核心数学公式看板 -->
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
          <span class="text-amber-300"><i class="italic">R</i><sub class="text-xs font-sans">任务期过境</sub></span>

          <span class="mx-2 text-slate-300 font-sans">+</span>

          <!-- w4 * V_strat -->
          <span><i class="italic">w</i><sub class="text-xs font-sans">4</sub></span>
          <span class="mx-1 text-slate-400">·</span>
          <span><i class="italic">V</i><sub class="text-xs font-sans">战略</sub></span>
        </div>

        <div class="text-[11px] text-tactical-muted font-mono flex items-center justify-center gap-2 flex-wrap">
          <span>综合威胁度得分 <strong class="text-tactical-cyan">T ∈ [0, 100]</strong></span>
          <span class="text-slate-600">|</span>
          <span>
            其中 <strong class="text-amber-300">R<sub>任务期过境</sub></strong> 依据在【{{ planMissionDurationHours }}小时任务时长】内对【目标战区】的过境频次与在空留空侦察总时长动态推导
          </span>
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
            低轨(LEO)距我更近，反应与拦截窗口紧迫
          </p>
        </div>

        <!-- 因子 3: 任务期过境频度与暴露时长 -->
        <div class="p-2 rounded bg-tactical-bg/80 border border-tactical-border">
          <div class="flex justify-between text-tactical-muted mb-1">
            <span class="text-cyan-400 font-bold">3. 任务期过境 (w₃)</span>
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
            在所选任务时间与目标空域内的过境与留空
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
            敌联合全域指控、战役中枢与星盾军用星座
          </p>
        </div>
      </div>
    </div>

    <!-- 3. 交互调节：打击威胁度门限筛选阈值 -->
    <div class="p-3.5 rounded bg-tactical-dark/70 border border-tactical-cyan/40 shadow-glow-cyan flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div class="space-y-1">
        <div class="flex items-center gap-2">
          <Sliders class="w-4 h-4 text-tactical-cyan" />
          <span class="text-xs font-bold text-tactical-text">调节首波次打击威胁度门限阈值:</span>
          <span class="text-sm font-bold text-red-400 px-2 py-0.5 rounded bg-red-500/20 border border-red-500/40">
            &ge; {{ threatFilterThreshold }} 分
          </span>
        </div>
        <p class="text-[10px] text-tactical-muted">
          拖动滑块过滤列入打击清单的目标威胁度下限，系统实时依分值从高到低重新排列
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

    <!-- 4. 筛选出的目标卫星列表 (严格按威胁度从高到低排序，突出过境指标与任务内威胁) -->
    <div class="p-3.5 rounded bg-tactical-dark/70 border border-tactical-border/80">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 border-b border-tactical-border/60 pb-2">
        <div class="flex items-center gap-2">
          <CheckCircle2 class="w-4 h-4 text-tactical-green" />
          <h3 class="text-xs font-bold tracking-wider text-tactical-text flex items-center gap-2">
            <span>筛选结果：满足打击门限的目标卫星 (共 {{ step1Candidates.length }} 颗)</span>
          </h3>
        </div>

        <div class="flex items-center gap-2.5">
          <!-- 排序状态指示标签 -->
          <div class="flex items-center gap-1 text-[10px] text-tactical-cyan px-2 py-0.5 rounded bg-tactical-cyan/15 border border-tactical-cyan/40">
            <ArrowDownUp class="w-3 h-3" />
            <span>威胁度从高到低严格倒序排列</span>
          </div>
          <span class="text-[10px] font-mono text-tactical-muted">
            入选率: {{ Math.round((step1Candidates.length / (evaluatedSatellites.length || 1)) * 100) }}%
          </span>
        </div>
      </div>

      <!-- 卫星候选表格/卡片网格 (按排名从第 1 名至最后一名严格展示) -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
        <div
          v-for="sat in step1Candidates"
          :key="sat.id"
          :class="[
            'p-3 rounded bg-tactical-bg/90 border transition-all flex flex-col justify-between relative overflow-hidden',
            sat.rank === 1
              ? 'border-amber-500/80 shadow-[0_0_15px_rgba(245,158,11,0.2)] bg-gradient-to-b from-amber-500/10 to-tactical-bg'
              : sat.rank <= 3
              ? 'border-red-500/60 shadow-[0_0_10px_rgba(239,68,68,0.15)]'
              : 'border-tactical-border/80 hover:border-tactical-cyan/60'
          ]"
        >
          <div>
            <!-- 卡片头部：排名、名称与威胁度勋章 -->
            <div class="flex items-start justify-between gap-2">
              <div class="flex items-center gap-2 min-w-0">
                <!-- 排名标记 -->
                <span
                  :class="[
                    'text-[10px] font-black px-1.5 py-0.5 rounded border shrink-0',
                    sat.rank === 1
                      ? 'bg-amber-500/30 text-amber-300 border-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.4)]'
                      : sat.rank <= 3
                      ? 'bg-red-500/30 text-red-300 border-red-500/60'
                      : 'bg-slate-800 text-slate-300 border-tactical-border'
                  ]"
                >
                  #{{ sat.rank.toString().padStart(2, '0') }}
                </span>
                <div class="min-w-0">
                  <div class="text-xs font-bold text-tactical-text truncate" :title="sat.name">
                    {{ sat.name }}
                  </div>
                  <div class="text-[10px] text-tactical-muted truncate">
                    {{ sat.id }} · {{ sat.owner }}
                  </div>
                </div>
              </div>

              <!-- 任务期威胁度勋章 (醒目高亮) -->
              <span
                :class="[
                  'text-[11px] font-black px-2 py-0.5 rounded border shrink-0',
                  sat.inMissionThreatScore >= 92
                    ? 'bg-red-500/30 text-red-400 border-red-500/80 shadow-[0_0_10px_rgba(239,68,68,0.5)]'
                    : sat.inMissionThreatScore >= 88
                    ? 'bg-amber-500/25 text-amber-400 border-amber-500/60'
                    : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
                ]"
              >
                威胁度: {{ sat.inMissionThreatScore }}分
              </span>
            </div>

            <!-- 任务时空过境核心数据看板 (突出任务期过境与在空侦察时长) -->
            <div class="mt-2 p-1.5 rounded bg-slate-950/80 border border-tactical-cyan/40 text-[9px] space-y-1 shadow-[inset_0_0_8px_rgba(0,0,0,0.5)]">
              <div class="flex justify-between items-center text-tactical-cyan font-bold border-b border-tactical-border/40 pb-1">
                <span class="flex items-center gap-1">
                  <Clock class="w-3 h-3 text-amber-400" />
                  任务期过境: <span class="text-white">{{ sat.inMissionPassesCount }} 次</span>
                </span>
                <span>
                  留空时长: <span class="text-amber-300">{{ formatOverpassDuration(sat.inMissionTotalOverpassSec) }}</span>
                </span>
              </div>
              <div class="grid grid-cols-2 gap-1 text-tactical-muted pt-0.5">
                <div>首次入境: <span class="text-tactical-text font-bold">T+{{ sat.inMissionNextPassMinute }}m</span></div>
                <div class="text-right">战区交叠: <span class="text-cyan-300 font-bold">{{ sat.areaOverlapRate }}%</span></div>
              </div>
            </div>

            <!-- 轨道与遥测指标 -->
            <div class="mt-1.5 grid grid-cols-3 gap-1 py-1 px-1.5 rounded bg-tactical-dark/80 text-[9px] text-tactical-muted border border-tactical-border/40">
              <div>轨道: <span class="text-tactical-text font-bold">{{ sat.orbitType }}</span></div>
              <div>高度: <span class="text-tactical-text font-bold">{{ sat.telemetry?.altitude ? sat.telemetry.altitude.toFixed(0) : 400 }}km</span></div>
              <div class="text-right">时延: <span class="text-cyan-300 font-bold">{{ sat.linkLatencyMs }}ms</span></div>
            </div>

            <!-- 传感器核心载荷 -->
            <div class="mt-1.5 text-[10px] text-tactical-text/90 line-clamp-2">
              <span class="text-tactical-muted">核心载荷:</span> {{ sat.sensor?.name || '综合侦察雷达' }}
            </div>

            <!-- 分项得分条形摘要 -->
            <div class="mt-1.5 flex items-center justify-between text-[8px] text-tactical-muted border-t border-tactical-border/30 pt-1">
              <span>载荷: <strong class="text-red-400">{{ sat.componentScores.payload }}</strong></span>
              <span>轨道: <strong class="text-amber-400">{{ sat.componentScores.orbit }}</strong></span>
              <span>过境: <strong class="text-cyan-400">{{ sat.componentScores.revisit }}</strong></span>
              <span>战略: <strong class="text-purple-400">{{ sat.componentScores.strategy }}</strong></span>
            </div>
          </div>

          <!-- 底部打击准入标记 -->
          <div class="mt-2 pt-1.5 border-t border-tactical-border/50 flex items-center justify-between text-[9px]">
            <span class="text-tactical-cyan">状态: {{ sat.status }}</span>
            <span class="text-red-400 font-bold flex items-center gap-1">
              <span>首波次打击准入</span>
              <span>✓</span>
            </span>
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <div
        v-if="step1Candidates.length === 0"
        class="py-10 text-center text-tactical-muted text-xs space-y-2"
      >
        <p>门限过高，当前无目标卫星满足 &ge; {{ threatFilterThreshold }} 分条件。</p>
        <p class="text-[10px]">请向左拖动滑块降低打击门限，或增加关联作战任务时长以纳入更多过境目标。</p>
      </div>
    </div>
  </div>
</template>
