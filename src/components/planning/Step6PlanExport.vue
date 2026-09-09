<script setup lang="ts">
/**
 * @fileoverview 作战计划向导 - 第六步：生成打击方案并保存/导出组件 (Step6PlanExport.vue)
 * 汇总整编全流程反卫打击行动预案，重点突出展示打击前后目标综合威胁度、有效覆盖率以及增加的传输时延等核心战效指标对比，
 * 并支持一键持久化保存（直接同步下发至作战指挥任务系统）以及导出为军用标准 JSON 与 Markdown 战备行动简报。
 */

import { ref } from 'vue'
import {
  FileText,
  Save,
  Download,
  CheckCircle2,
  Crosshair,
  ShieldAlert,
  Globe,
  WifiOff,
  ArrowRight,
  TrendingDown,
  Activity,
  Layers,
  Sparkles
} from 'lucide-vue-next'
import { useCombatPlanState, type MatchedWeaponPlan } from '../../composables/useCombatPlanState'

/**
 * 引入作战计划状态与方法
 */
const {
  combatPlanCode,
  combatPlanTitle,
  combatPlanRemarks,
  matchedWeaponPlans,
  combatImpactOverview,
  isSaveSuccess,
  savePlanToMissions,
  exportPlanAsJson,
  exportPlanAsMarkdown
} = useCombatPlanState()

/**
 * 当前选中的单项方案详情（用于在下方展示更深入的打击前后战损剖析）
 */
const selectedDetailPlan = ref<MatchedWeaponPlan | null>(null)

/**
 * 点击选中某一行目标以聚焦查看毁伤效能
 *
 * @param plan - 选中的武器匹配预案
 */
function handleSelectPlan(plan: MatchedWeaponPlan): void {
  if (selectedDetailPlan.value?.link.id === plan.link.id) {
    selectedDetailPlan.value = null
  } else {
    selectedDetailPlan.value = plan
  }
}

/**
 * 点击保存方案并注入任务系统
 */
function handleSavePlan(): void {
  savePlanToMissions()
}

/**
 * 点击导出军标 JSON 格式数据
 */
function handleExportJson(): void {
  exportPlanAsJson()
}

/**
 * 点击导出战备行动简报 Markdown
 */
function handleExportMarkdown(): void {
  exportPlanAsMarkdown()
}
</script>

<template>
  <div class="space-y-4 font-mono select-none">
    <!-- 保存成功提示通知浮条 -->
    <div
      v-if="isSaveSuccess"
      class="p-3 rounded bg-emerald-950/90 border border-emerald-400 text-emerald-300 text-xs font-bold flex items-center justify-between shadow-[0_0_20px_rgba(16,185,129,0.4)] animate-bounce"
    >
      <div class="flex items-center gap-2">
        <CheckCircle2 class="w-4 h-4 text-emerald-400" />
        <span>【{{ combatPlanCode }}】作战预案已成功保存，并已转换为正式战术任务同步注入作战任务库！</span>
      </div>
      <span class="text-[10px] text-emerald-400 font-normal">已在“战场任务”中生效</span>
    </div>

    <!-- 1. 方案核心代号与首长战役指导编辑 -->
    <div class="p-3.5 rounded bg-tactical-dark/70 border border-tactical-border/80">
      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center gap-2">
          <FileText class="w-4 h-4 text-tactical-cyan" />
          <h3 class="text-xs font-bold tracking-wider text-tactical-text uppercase">
            六、作战行动方案整编与首长战役指导
          </h3>
        </div>
        <span class="text-[10px] px-2 py-0.5 rounded bg-tactical-cyan/20 text-tactical-cyan border border-tactical-cyan/40">
          保密等级: 绝密
        </span>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label class="block text-[10px] text-tactical-muted mb-1">作战行动代号:</label>
          <input
            v-model="combatPlanCode"
            type="text"
            class="w-full px-2.5 py-1.5 rounded bg-tactical-bg/90 border border-tactical-border text-xs text-tactical-text font-bold focus:border-tactical-cyan focus:outline-none"
          />
        </div>
        <div>
          <label class="block text-[10px] text-tactical-muted mb-1">作战方案主标题:</label>
          <input
            v-model="combatPlanTitle"
            type="text"
            class="w-full px-2.5 py-1.5 rounded bg-tactical-bg/90 border border-tactical-border text-xs text-tactical-text font-bold focus:border-tactical-cyan focus:outline-none"
          />
        </div>
      </div>

      <div class="mt-2.5">
        <label class="block text-[10px] text-tactical-muted mb-1">战役指导与首长决心:</label>
        <textarea
          v-model="combatPlanRemarks"
          rows="2"
          class="w-full px-2.5 py-1.5 rounded bg-tactical-bg/90 border border-tactical-border text-[11px] text-tactical-text focus:border-tactical-cyan focus:outline-none resize-none"
        ></textarea>
      </div>
    </div>

    <!-- 2. 【核心突出展示】打击前后核心战效对比宏观看板 -->
    <div class="p-3.5 rounded bg-slate-950/80 border-2 border-tactical-cyan/40 shadow-[0_0_25px_rgba(6,182,212,0.15)]">
      <div class="flex items-center justify-between mb-3 border-b border-tactical-border/60 pb-2">
        <div class="flex items-center gap-2">
          <Sparkles class="w-4 h-4 text-tactical-cyan animate-pulse" />
          <span class="text-xs font-bold tracking-wider text-tactical-text uppercase">
            打击前后核心战效指标深度对比看板
          </span>
        </div>
        <span class="text-[10px] text-tactical-muted">
          解算模型: 联合作战仿真效能评估引擎 V3.2
        </span>
      </div>

      <!-- 三大核心指标对比卡片 -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
        <!-- ① 综合威胁度削减卡片 -->
        <div class="p-3 rounded bg-slate-900/90 border border-emerald-500/40 relative overflow-hidden group hover:border-emerald-400 transition-all">
          <div class="absolute -right-6 -bottom-6 w-20 h-20 bg-emerald-500/5 rounded-full blur-xl pointer-events-none"></div>
          <div class="flex items-center justify-between mb-2">
            <span class="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
              <ShieldAlert class="w-3.5 h-3.5 text-emerald-400" />
              目标综合威胁度
            </span>
            <span class="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 font-bold border border-emerald-500/30">
              削减 {{ combatImpactOverview.totalThreatReductionPercent }}%
            </span>
          </div>

          <div class="flex items-baseline justify-between mt-2">
            <div>
              <div class="text-[10px] text-tactical-muted">打击前初始</div>
              <div class="text-lg font-bold text-red-400 line-through decoration-red-500/60">
                {{ combatImpactOverview.avgThreatBefore }} <span class="text-xs">分</span>
              </div>
            </div>

            <ArrowRight class="w-4 h-4 text-emerald-400 shrink-0" />

            <div>
              <div class="text-[10px] text-tactical-muted">打击后残余</div>
              <div class="text-2xl font-black text-emerald-300 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]">
                {{ combatImpactOverview.avgThreatAfter }} <span class="text-xs">分</span>
              </div>
            </div>
          </div>

          <div class="mt-2.5 pt-2 border-t border-slate-800 text-[10px] text-emerald-400/90 flex items-center gap-1">
            <TrendingDown class="w-3 h-3 text-emerald-400" />
            <span>战效评估: 敌在轨对地侦察火控威胁基本清除</span>
          </div>
        </div>

        <!-- ② 覆盖率萎缩/黑洞撕裂卡片 -->
        <div class="p-3 rounded bg-slate-900/90 border border-amber-500/40 relative overflow-hidden group hover:border-amber-400 transition-all">
          <div class="absolute -right-6 -bottom-6 w-20 h-20 bg-amber-500/5 rounded-full blur-xl pointer-events-none"></div>
          <div class="flex items-center justify-between mb-2">
            <span class="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
              <Globe class="w-3.5 h-3.5 text-amber-400" />
              全球/战区覆盖率
            </span>
            <span class="text-[10px] px-1.5 py-0.5 rounded bg-amber-950 text-amber-400 font-bold border border-amber-500/30">
              剥夺 {{ combatImpactOverview.coverageDropPercent }}%
            </span>
          </div>

          <div class="flex items-baseline justify-between mt-2">
            <div>
              <div class="text-[10px] text-tactical-muted">打击前覆盖</div>
              <div class="text-lg font-bold text-slate-400 line-through decoration-slate-500/60">
                {{ combatImpactOverview.avgCoverageBefore }}%
              </div>
            </div>

            <ArrowRight class="w-4 h-4 text-amber-400 shrink-0" />

            <div>
              <div class="text-[10px] text-tactical-muted">打击后残余</div>
              <div class="text-2xl font-black text-amber-300 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]">
                {{ combatImpactOverview.avgCoverageAfter }}%
              </div>
            </div>
          </div>

          <div class="mt-2.5 pt-2 border-t border-slate-800 text-[10px] text-amber-400/90 flex items-center gap-1">
            <Layers class="w-3 h-3 text-amber-400" />
            <span>战效评估: 撕裂出数千平方公里信息感知黑洞</span>
          </div>
        </div>

        <!-- ③ 增加的传输时延卡片（重点突出红色激增警示） -->
        <div class="p-3 rounded bg-slate-900/90 border-2 border-red-500/60 relative overflow-hidden group hover:border-red-400 shadow-[0_0_15px_rgba(239,68,68,0.2)] transition-all">
          <div class="absolute -right-6 -bottom-6 w-20 h-20 bg-red-500/10 rounded-full blur-xl pointer-events-none"></div>
          <div class="flex items-center justify-between mb-2">
            <span class="text-[11px] font-bold text-red-300 flex items-center gap-1.5">
              <WifiOff class="w-3.5 h-3.5 text-red-400 animate-pulse" />
              增加的传输时延
            </span>
            <span class="text-[10px] px-1.5 py-0.5 rounded bg-red-950 text-red-300 font-bold border border-red-500/50 animate-pulse">
              激增 {{ combatImpactOverview.latencySurgeRatio }} 倍
            </span>
          </div>

          <div class="flex items-baseline justify-between mt-2">
            <div>
              <div class="text-[10px] text-tactical-muted">打击前时延</div>
              <div class="text-sm font-bold text-slate-400">
                {{ combatImpactOverview.avgLatencyBefore }} <span class="text-[10px]">ms</span>
              </div>
            </div>

            <ArrowRight class="w-4 h-4 text-red-400 shrink-0" />

            <div>
              <div class="text-[10px] text-tactical-muted">打击后时延</div>
              <div class="text-sm font-bold text-slate-300">
                {{ combatImpactOverview.avgLatencyAfter }} <span class="text-[10px]">ms</span>
              </div>
            </div>

            <div class="pl-2 border-l border-red-900/60 text-right">
              <div class="text-[10px] text-red-400 font-bold">净增加时延</div>
              <div class="text-2xl font-black text-red-400 drop-shadow-[0_0_10px_rgba(239,68,68,0.6)]">
                +{{ combatImpactOverview.avgAddedLatencyMs }} <span class="text-xs">ms</span>
              </div>
            </div>
          </div>

          <div class="mt-2.5 pt-2 border-t border-slate-800 text-[10px] text-red-400 flex items-center gap-1">
            <Activity class="w-3 h-3 text-red-400" />
            <span>战效评估: 超宽带强电磁同频压制，数传实质瘫痪</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 3. 打击方案火力分配矩阵总表（突出展示各链路打击前后指标） -->
    <div class="p-3.5 rounded bg-tactical-dark/70 border border-tactical-border/80 overflow-x-auto">
      <div class="flex items-center justify-between mb-2">
        <div class="text-xs font-bold text-tactical-text flex items-center gap-1.5">
          <Crosshair class="w-3.5 h-3.5 text-tactical-cyan" />
          <span>反制打击行动分派与打击前后指标对比矩阵清单</span>
        </div>
        <div class="text-[10px] text-tactical-muted">
          点击任意行可查看详细战术毁伤机理剖析
        </div>
      </div>

      <table class="w-full text-left text-[10px]">
        <thead>
          <tr class="border-b border-tactical-border/70 text-tactical-muted bg-slate-900/60">
            <th class="py-2 px-2">序号</th>
            <th class="py-2 px-2">目标卫星</th>
            <th class="py-2 px-2">分配武器</th>
            <th class="py-2 px-2 text-center">威胁度 (前 → 后)</th>
            <th class="py-2 px-2 text-center">覆盖率 (前 → 后)</th>
            <th class="py-2 px-2 text-center">传输时延 (前 → 后)</th>
            <th class="py-2 px-2 text-center bg-red-950/20 text-red-400 border-x border-red-900/40">
              增加传输时延
            </th>
            <th class="py-2 px-2">毁伤战备成效简评</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-tactical-border/40">
          <tr
            v-for="plan in matchedWeaponPlans"
            :key="plan.link.id"
            @click="handleSelectPlan(plan)"
            :class="[
              'cursor-pointer transition-colors',
              selectedDetailPlan?.link.id === plan.link.id
                ? 'bg-cyan-950/40 border-l-2 border-tactical-cyan'
                : 'hover:bg-slate-900/50'
            ]"
          >
            <!-- 序号 -->
            <td class="py-2 px-2 font-bold text-amber-400">#{{ plan.index }}</td>

            <!-- 目标卫星 -->
            <td class="py-2 px-2">
              <div class="font-bold text-tactical-text">{{ plan.targetSatellite.name }}</div>
              <div class="text-[9px] text-tactical-muted">
                {{ plan.targetSatellite.orbitType }} · {{ plan.targetSatellite.telemetry.altitude.toFixed(0) }}km
              </div>
            </td>

            <!-- 分配武器 -->
            <td class="py-2 px-2">
              <div class="font-bold text-cyan-300">
                {{ plan.recommendedWeapon.name.split(' ')[0] }}
              </div>
              <div class="text-[9px] text-tactical-muted">
                {{ plan.recommendedWeapon.locationName }} (Pk {{ plan.expectedPk }}%)
              </div>
            </td>

            <!-- 威胁度 (前 → 后) -->
            <td class="py-2 px-2 text-center">
              <div class="flex items-center justify-center gap-1">
                <span class="text-red-400 font-bold line-through">{{ plan.beforeThreatScore }}</span>
                <span class="text-slate-500">→</span>
                <span class="text-emerald-400 font-bold">{{ plan.afterThreatScore }}</span>
              </div>
              <div class="text-[9px] text-emerald-400">↓ {{ plan.threatReductionPercent }}%</div>
            </td>

            <!-- 覆盖率 (前 → 后) -->
            <td class="py-2 px-2 text-center">
              <div class="flex items-center justify-center gap-1">
                <span class="text-slate-400 line-through">{{ plan.beforeCoverageRate }}%</span>
                <span class="text-slate-500">→</span>
                <span class="text-amber-400 font-bold">{{ plan.afterCoverageRate }}%</span>
              </div>
              <div class="text-[9px] text-amber-400">↓ {{ plan.coverageReductionPercent }}%</div>
            </td>

            <!-- 传输时延 (前 → 后) -->
            <td class="py-2 px-2 text-center">
              <div class="flex items-center justify-center gap-1">
                <span class="text-slate-400">{{ plan.beforeLatencyMs }}ms</span>
                <span class="text-slate-500">→</span>
                <span class="text-slate-200 font-bold">{{ plan.afterLatencyMs }}ms</span>
              </div>
            </td>

            <!-- 【重点高亮】增加传输时延 -->
            <td class="py-2 px-2 text-center bg-red-950/30 border-x border-red-900/40">
              <span class="inline-block px-1.5 py-0.5 rounded bg-red-900/60 border border-red-500 text-red-300 font-black text-[11px] shadow-[0_0_8px_rgba(239,68,68,0.4)]">
                +{{ plan.addedLatencyMs }} ms
              </span>
            </td>

            <!-- 毁伤成效简评 -->
            <td class="py-2 px-2 text-[10px] text-tactical-muted max-w-[200px] truncate" :title="plan.tacticalOutcomeSummary">
              {{ plan.tacticalOutcomeSummary }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 4. 单项重点目标深度毁伤机理展开卡片 (若用户点击某行) -->
    <div
      v-if="selectedDetailPlan"
      class="p-3.5 rounded bg-cyan-950/20 border border-tactical-cyan/40 animate-fadeIn"
    >
      <div class="flex items-center justify-between mb-2">
        <div class="flex items-center gap-2">
          <Crosshair class="w-4 h-4 text-tactical-cyan" />
          <span class="text-xs font-bold text-tactical-cyan">
            【TOP {{ selectedDetailPlan.index }}】{{ selectedDetailPlan.targetSatellite.name }} 战术打击前后效能微观剖析
          </span>
        </div>
        <button
          @click="selectedDetailPlan = null"
          class="text-[10px] text-tactical-muted hover:text-tactical-text px-1.5 py-0.5 rounded hover:bg-slate-800"
        >
          收起
        </button>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-4 gap-2.5 mb-2.5">
        <div class="p-2 rounded bg-slate-900/80 border border-slate-800">
          <div class="text-[9px] text-tactical-muted">分配武器装备</div>
          <div class="text-xs font-bold text-tactical-text mt-0.5">{{ selectedDetailPlan.recommendedWeapon.name }}</div>
          <div class="text-[9px] text-tactical-cyan">{{ selectedDetailPlan.recommendedWeapon.type }} · Pk {{ selectedDetailPlan.expectedPk }}%</div>
        </div>

        <div class="p-2 rounded bg-slate-900/80 border border-slate-800">
          <div class="text-[9px] text-tactical-muted">威胁度削减</div>
          <div class="text-xs font-bold text-emerald-400 mt-0.5">
            {{ selectedDetailPlan.beforeThreatScore }}分 → {{ selectedDetailPlan.afterThreatScore }}分
          </div>
          <div class="text-[9px] text-emerald-500 font-bold">削减 {{ selectedDetailPlan.threatReductionPercent }}% (净减 {{ selectedDetailPlan.threatReduction }}分)</div>
        </div>

        <div class="p-2 rounded bg-slate-900/80 border border-slate-800">
          <div class="text-[9px] text-tactical-muted">覆盖率剥夺</div>
          <div class="text-xs font-bold text-amber-400 mt-0.5">
            {{ selectedDetailPlan.beforeCoverageRate }}% → {{ selectedDetailPlan.afterCoverageRate }}%
          </div>
          <div class="text-[9px] text-amber-500 font-bold">跌落 {{ selectedDetailPlan.coverageReductionPercent }}% (造成黑洞盲区)</div>
        </div>

        <div class="p-2 rounded bg-red-950/40 border border-red-500/50">
          <div class="text-[9px] text-red-300 font-bold">传输时延恶化量</div>
          <div class="text-xs font-black text-red-400 mt-0.5">
            +{{ selectedDetailPlan.addedLatencyMs }} ms (激增至 {{ selectedDetailPlan.afterLatencyMs }}ms)
          </div>
          <div class="text-[9px] text-red-300 font-bold">数传同频干扰阻断瘫痪</div>
        </div>
      </div>

      <div class="p-2.5 rounded bg-slate-900/70 border border-slate-800 text-[11px] space-y-1">
        <div class="text-tactical-text font-bold flex items-center gap-1.5">
          <span class="w-1.5 h-1.5 rounded-full bg-tactical-cyan"></span>
          <span>战术协同机理与毁伤归因:</span>
        </div>
        <p class="text-slate-300 pl-3 leading-relaxed">
          {{ selectedDetailPlan.tacticalRationale }}
        </p>
        <div class="text-tactical-text font-bold flex items-center gap-1.5 pt-1">
          <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
          <span>预期毁伤终态成果:</span>
        </div>
        <p class="text-emerald-300/90 pl-3 leading-relaxed">
          {{ selectedDetailPlan.tacticalOutcomeSummary }}
        </p>
      </div>
    </div>

    <!-- 5. 底部核心操作按钮：保存与导出 -->
    <div class="p-3.5 rounded bg-tactical-dark/70 border border-tactical-cyan/50 shadow-glow-cyan flex flex-col sm:flex-row items-center justify-between gap-3">
      <div class="text-[11px] text-tactical-muted">
        方案已完成打击前后战效深度解算，请点击按钮进行方案归档或分发导出：
      </div>

      <div class="flex items-center gap-2.5 w-full sm:w-auto">
        <!-- 核心按钮：保存方案 -->
        <button
          @click="handleSavePlan"
          class="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 rounded bg-emerald-500/20 hover:bg-emerald-500/35 border border-emerald-400 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.3)] font-bold text-xs transition-all hover:scale-105 active:scale-95"
        >
          <Save class="w-4 h-4" />
          <span>保存打击方案</span>
        </button>

        <!-- 导出 JSON -->
        <button
          @click="handleExportJson"
          class="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 rounded bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400 text-cyan-300 font-bold text-xs transition-all hover:scale-105 active:scale-95"
          title="导出为标准军事计划 JSON 格式数据"
        >
          <Download class="w-4 h-4" />
          <span>导出 JSON</span>
        </button>

        <!-- 导出 Markdown -->
        <button
          @click="handleExportMarkdown"
          class="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 rounded bg-tactical-dark hover:bg-slate-800 border border-tactical-border hover:border-tactical-cyan text-tactical-text font-bold text-xs transition-all hover:scale-105 active:scale-95"
          title="导出排版精美的 Markdown 格式战备行动简报"
        >
          <FileText class="w-4 h-4" />
          <span>导出简报 (MD)</span>
        </button>
      </div>
    </div>
  </div>
</template>

