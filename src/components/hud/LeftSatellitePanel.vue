<script setup lang="ts">
/**
 * @fileoverview 左侧卫星态势目标库与检索面板组件
 * 提供对编目卫星的多维检索、轨道类型筛选、任务分类标签、实时目标卡片及其相机追踪控制
 */

import { ref } from 'vue'
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Satellite as SatIcon,
  SlidersHorizontal,
  ArrowUpDown,
  ShieldAlert,
  Wifi,
  Globe,
  RotateCcw,
  Zap
} from 'lucide-vue-next'
import { useSatelliteState } from '../../composables/useSatelliteState'
import { useCombatPlanState } from '../../composables/useCombatPlanState'
import { OrbitType, SatelliteCategory, Satellite, SatelliteSortBy } from '../../types/satellite'

/**
 * 引入态势状态数据与控制操作
 */
const {
  filteredSatellites,
  selectedSatelliteId,
  searchKeyword,
  orbitTypeFilter,
  categoryFilter,
  seriesFilter,
  minThreatScore,
  maxLinkLatency,
  minCoverageRate,
  sortBy,
  selectSatellite
} = useSatelliteState()

/**
 * 引入作战计划决策向导控制
 */
const { openCombatPlanModal } = useCombatPlanState()

/**
 * 面板是否处于展开状态 (支持收起以扩充主态势三维视野)
 */
const isExpanded = ref<boolean>(true)

/**
 * 是否展开多维指标过滤面板 (威胁度、时延、覆盖率滑块)
 */
const isFilterDrawerOpen = ref<boolean>(false)

/**
 * 排序维度选项列表
 */
const sortOptions: { label: string; value: SatelliteSortBy }[] = [
  { label: '默认顺序', value: 'DEFAULT' },
  { label: '威胁度 (高→低)', value: 'THREAT_DESC' },
  { label: '威胁度 (低→高)', value: 'THREAT_ASC' },
  { label: '延迟 (低→高)', value: 'LATENCY_ASC' },
  { label: '延迟 (高→低)', value: 'LATENCY_DESC' },
  { label: '覆盖率 (高→低)', value: 'COVERAGE_DESC' },
  { label: '覆盖率 (低→高)', value: 'COVERAGE_ASC' }
]

/**
 * 重置多维指标筛选条件
 */
function resetMetricsFilter(): void {
  minThreatScore.value = 0
  maxLinkLatency.value = 1000
  minCoverageRate.value = 0
  sortBy.value = 'DEFAULT'
}

/**
 * 轨道类型筛选标签定义列表
 */
const orbitOptions: { label: string; value: OrbitType | 'ALL' }[] = [
  { label: '全部轨道', value: 'ALL' },
  { label: 'LEO 低轨', value: OrbitType.LEO },
  { label: 'MEO 中轨', value: OrbitType.MEO },
  { label: 'GEO 静止轨', value: OrbitType.GEO }
]

/**
 * 任务用途分类筛选选项
 */
const categoryOptions: { label: string; value: SatelliteCategory | 'ALL' }[] = [
  { label: '全部用途', value: 'ALL' },
  { label: '侦察', value: SatelliteCategory.RECONNAISSANCE },
  { label: '预警', value: SatelliteCategory.EARLY_WARNING },
  { label: '通信', value: SatelliteCategory.COMMUNICATION },
  { label: '导航', value: SatelliteCategory.NAVIGATION }
]

/**
 * 卫星所属系列/星座家族筛选选项
 */
const seriesOptions: { label: string; value: string }[] = [
  { label: '全部系列', value: 'ALL' },
  { label: '星链 (Starlink)', value: 'Starlink' },
  { label: '星盾 (Starshield)', value: 'Starshield' },
  { label: '世景 (WorldView)', value: 'WorldView' },
  { label: '锁眼 (Keyhole)', value: 'Keyhole' },
  { label: '天基红外 (SBIRS)', value: 'SBIRS' },
  { label: '导航 (GPS)', value: 'GPS' },
  { label: '中继 (TDRS)', value: 'TDRS' },
  { label: '雷达 (FIA-Radar)', value: 'FIA-Radar' }
]

/**
 * 点击选中卫星卡片
 *
 * @param sat - 目标卫星对象
 */
function handleSatelliteClick(sat: Satellite): void {
  selectSatellite(sat.id)
}

/**
 * 获取对应运行状态的中文语义描述
 *
 * @param status - 运行状态英文枚举
 * @returns 中文状态文本
 */
function getStatusLabel(status: string): string {
  switch (status) {
    case 'ACTIVE':
      return '执行中'
    case 'NORMAL':
      return '正常在轨'
    case 'ALERT':
      return '预警交会'
    case 'OFFLINE':
      return '离线'
    default:
      return status
  }
}
</script>

<template>
  <aside
    :class="[
      'absolute top-16 left-3 z-20 flex transition-all duration-300 select-none max-h-[calc(100vh-120px)]',
      isExpanded ? 'w-[420px]' : 'w-10'
    ]"
  >
    <!-- 面板主体内容区域 -->
    <div
      v-show="isExpanded"
      class="flex-1 flex flex-col rounded tactical-panel tactical-corner-bracket overflow-hidden"
    >
      <!-- 头部：标题与搜索框 -->
      <div class="p-3 border-b border-tactical-border/80 bg-tactical-dark/60">
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center gap-2">
            <SatIcon class="w-4 h-4 text-tactical-cyan" />
            <h2 class="font-mono text-xs font-bold tracking-wider text-tactical-text">
              在轨目标列表
            </h2>
          </div>
          <span class="font-mono text-[10px] text-tactical-muted">
            TOTAL: {{ filteredSatellites.length }}
          </span>
        </div>

        <!-- 搜索输入框 -->
        <div class="relative">
          <Search class="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-tactical-muted" />
          <input
            v-model="searchKeyword"
            type="text"
            placeholder="搜索代号/NORAD编号..."
            class="w-full pl-8 pr-3 py-1.5 rounded bg-tactical-bg/90 border border-tactical-border text-xs font-mono text-tactical-text placeholder-tactical-muted focus:outline-none focus:border-tactical-cyan transition-colors"
          />
        </div>

        <!-- 1. 轨道类型筛选标签横排 -->
        <div class="flex items-center gap-1 mt-2.5 overflow-x-auto pb-0.5 scrollbar-thin">
          <span class="text-[9px] font-mono text-tactical-muted whitespace-nowrap mr-0.5">轨道:</span>
          <button
            v-for="opt in orbitOptions"
            :key="opt.value"
            @click="orbitTypeFilter = opt.value"
            :class="[
              'px-1.5 py-0.5 rounded text-[10px] font-mono whitespace-nowrap transition-colors border',
              orbitTypeFilter === opt.value
                ? 'bg-tactical-cyan/20 border-tactical-cyan text-tactical-cyan shadow-glow-cyan'
                : 'bg-tactical-dark/60 border-tactical-border text-tactical-muted hover:text-tactical-text'
            ]"
          >
            {{ opt.label }}
          </button>
        </div>

        <!-- 2. 用途分类快速筛选 -->
        <div class="flex items-center gap-1 mt-1 overflow-x-auto pb-0.5 scrollbar-thin">
          <span class="text-[9px] font-mono text-tactical-muted whitespace-nowrap mr-0.5">用途:</span>
          <button
            v-for="cat in categoryOptions"
            :key="cat.value"
            @click="categoryFilter = cat.value"
            :class="[
              'px-1.5 py-0.5 rounded text-[10px] font-mono whitespace-nowrap transition-colors border',
              categoryFilter === cat.value
                ? 'bg-tactical-blue/20 border-tactical-blue text-tactical-blue shadow-[0_0_8px_rgba(59,130,246,0.3)]'
                : 'bg-tactical-dark/60 border-tactical-border text-tactical-muted hover:text-tactical-text'
            ]"
          >
            {{ cat.label }}
          </button>
        </div>

        <!-- 3. 卫星系列/星座快速筛选 (新增项) -->
        <div class="flex items-center gap-1 mt-1 overflow-x-auto pb-0.5 scrollbar-thin">
          <span class="text-[9px] font-mono text-tactical-amber whitespace-nowrap mr-0.5">系列:</span>
          <button
            v-for="ser in seriesOptions"
            :key="ser.value"
            @click="seriesFilter = ser.value"
            :class="[
              'px-1.5 py-0.5 rounded text-[10px] font-mono whitespace-nowrap transition-colors border',
              seriesFilter === ser.value
                ? 'bg-tactical-amber/20 border-tactical-amber text-tactical-amber shadow-[0_0_8px_rgba(245,158,11,0.3)]'
                : 'bg-tactical-dark/60 border-tactical-border text-tactical-muted hover:text-tactical-text'
            ]"
          >
            {{ ser.label }}
          </button>
        </div>

        <!-- 4. 排序选择与多维指标筛选折叠入口 -->
        <div class="flex items-center justify-between gap-1 mt-2 pt-2 border-t border-tactical-border/60">
          <div class="flex items-center gap-1">
            <ArrowUpDown class="w-3 h-3 text-tactical-cyan" />
            <select
              v-model="sortBy"
              class="bg-tactical-dark/90 border border-tactical-border text-tactical-text text-[10px] font-mono rounded px-1.5 py-0.5 focus:outline-none focus:border-tactical-cyan cursor-pointer"
            >
              <option v-for="opt in sortOptions" :key="opt.value" :value="opt.value">
                {{ opt.label }}
              </option>
            </select>
          </div>

          <!-- 高级指标筛选切换按钮 -->
          <button
            @click="isFilterDrawerOpen = !isFilterDrawerOpen"
            :class="[
              'flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono border transition-all',
              isFilterDrawerOpen || minThreatScore > 0 || maxLinkLatency < 1000 || minCoverageRate > 0
                ? 'bg-tactical-cyan/20 border-tactical-cyan text-tactical-cyan shadow-glow-cyan'
                : 'bg-tactical-dark border-tactical-border text-tactical-muted hover:text-tactical-text'
            ]"
            title="调节威胁度、链路时延、通信覆盖率过滤门限"
          >
            <SlidersHorizontal class="w-2.5 h-2.5" />
            <span>指标筛选</span>
            <span
              v-if="minThreatScore > 0 || maxLinkLatency < 1000 || minCoverageRate > 0"
              class="w-1.5 h-1.5 rounded-full bg-tactical-cyan animate-pulse"
            ></span>
          </button>
        </div>

        <!-- 5. 高级指标过滤滑动面板 -->
        <div
          v-if="isFilterDrawerOpen"
          class="mt-2 p-2 rounded bg-tactical-bg/95 border border-tactical-cyan/40 space-y-2 text-[10px] font-mono shadow-tactical-panel"
        >
          <!-- 威胁度门限滑块 -->
          <div>
            <div class="flex items-center justify-between text-tactical-muted">
              <span class="flex items-center gap-1 text-red-400">
                <ShieldAlert class="w-3 h-3" />
                <span>威胁度 &ge;</span>
              </span>
              <span class="text-red-400 font-bold">{{ minThreatScore }}分</span>
            </div>
            <input
              type="range"
              min="0"
              max="95"
              step="5"
              v-model.number="minThreatScore"
              class="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-red-500"
            />
          </div>

          <!-- 链路延迟最大门限滑块 -->
          <div>
            <div class="flex items-center justify-between text-tactical-muted">
              <span class="flex items-center gap-1 text-cyan-400">
                <Wifi class="w-3 h-3" />
                <span>链路延迟 &le;</span>
              </span>
              <span class="text-cyan-400 font-bold">{{ maxLinkLatency }}ms</span>
            </div>
            <input
              type="range"
              min="30"
              max="1000"
              step="20"
              v-model.number="maxLinkLatency"
              class="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
            />
          </div>

          <!-- 覆盖率门限滑块 -->
          <div>
            <div class="flex items-center justify-between text-tactical-muted">
              <span class="flex items-center gap-1 text-amber-400">
                <Globe class="w-3 h-3" />
                <span>覆盖率 &ge;</span>
              </span>
              <span class="text-amber-400 font-bold">{{ minCoverageRate }}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="95"
              step="5"
              v-model.number="minCoverageRate"
              class="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
          </div>

          <!-- 重置按钮 -->
          <div class="flex justify-end pt-1">
            <button
              @click="resetMetricsFilter"
              class="flex items-center gap-1 px-2 py-0.5 rounded bg-tactical-dark hover:bg-slate-800 text-tactical-muted hover:text-tactical-cyan border border-tactical-border text-[9px] transition-colors"
            >
              <RotateCcw class="w-2.5 h-2.5" />
              <span>重置条件</span>
            </button>
          </div>
        </div>
      </div>

      <!-- 列表内容区 -->
      <div class="flex-1 overflow-y-auto p-2 space-y-1.5 max-h-[calc(100vh-340px)]">
        <div
          v-for="sat in filteredSatellites"
          :key="sat.id"
          @click="handleSatelliteClick(sat)"
          :class="[
            'p-2.5 rounded cursor-pointer transition-all border relative',
            selectedSatelliteId === sat.id
              ? 'bg-tactical-cyan/10 border-tactical-cyan shadow-glow-cyan'
              : 'bg-tactical-dark/40 border-tactical-border/60 hover:border-tactical-border hover:bg-tactical-dark/80'
          ]"
        >
          <!-- 选中指示高亮左侧竖条 -->
          <div
            v-if="selectedSatelliteId === sat.id"
            class="absolute left-0 top-0 bottom-0 w-1 bg-tactical-cyan rounded-l"
          ></div>

          <div class="flex items-start justify-between">
            <div>
              <div class="flex items-center gap-1.5 flex-wrap">
                <span class="font-mono text-xs font-bold text-tactical-text">
                  {{ sat.name }}
                </span>
                <span
                  v-if="sat.series"
                  class="px-1 py-0.2 rounded text-[9px] font-mono bg-tactical-amber/15 border border-tactical-amber/50 text-tactical-amber"
                >
                  {{ sat.series }}
                </span>
                <span
                  class="px-1 py-0.2 rounded text-[9px] font-mono border"
                  :style="{ borderColor: sat.color, color: sat.color }"
                >
                  {{ sat.orbitType }}
                </span>
              </div>
              <div class="font-mono text-[10px] text-tactical-muted mt-0.5">
                {{ sat.id }} · NORAD #{{ sat.noradId }}
              </div>
            </div>

            <!-- 状态标签指示灯 -->
            <div class="flex items-center gap-1 text-[10px] font-mono">
              <span
                :class="[
                  'w-1.5 h-1.5 rounded-full',
                  sat.status === 'ALERT'
                    ? 'bg-tactical-red animate-ping'
                    : sat.status === 'ACTIVE'
                    ? 'bg-tactical-cyan'
                    : 'bg-tactical-green'
                ]"
              ></span>
              <span
                :class="[
                  sat.status === 'ALERT'
                    ? 'text-tactical-red'
                    : sat.status === 'ACTIVE'
                    ? 'text-tactical-cyan'
                    : 'text-tactical-green'
                ]"
              >
                {{ getStatusLabel(sat.status) }}
              </span>
            </div>
          </div>

          <!-- 🔴 重点指标行：威胁度、链路时延与通信覆盖率 -->
          <div class="mt-2 pt-1.5 border-t border-tactical-border/40 flex items-center justify-between font-mono text-[10px]">
            <!-- 威胁度 -->
            <div class="flex items-center gap-1">
              <ShieldAlert class="w-3 h-3 text-red-400" />
              <span class="text-tactical-muted">威胁度:</span>
              <span
                :class="[
                  'font-bold px-1 py-0.2 rounded text-[9px] border',
                  (sat.threatScore ?? 0) >= 90
                    ? 'bg-red-500/20 text-red-400 border-red-500/50 shadow-[0_0_6px_rgba(239,68,68,0.3)]'
                    : (sat.threatScore ?? 0) >= 80
                    ? 'bg-amber-500/20 text-amber-400 border-amber-500/50'
                    : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50'
                ]"
              >
                {{ sat.threatScore ?? '--' }}
              </span>
            </div>

            <!-- 链路延迟 -->
            <div class="flex items-center gap-1">
              <Wifi class="w-3 h-3 text-cyan-400" />
              <span class="text-tactical-muted">延迟:</span>
              <span class="text-cyan-300 font-bold">{{ sat.linkLatencyMs ?? '--' }}ms</span>
            </div>

            <!-- 通信覆盖率 (若是通信星或具备覆盖率指标) -->
            <div
              v-if="sat.category === SatelliteCategory.COMMUNICATION || sat.coverageRate !== undefined"
              class="flex items-center gap-1"
            >
              <Globe class="w-3 h-3 text-amber-400" />
              <span class="text-tactical-muted">覆盖率:</span>
              <span class="text-amber-300 font-bold">{{ sat.coverageRate ?? '--' }}%</span>
            </div>
          </div>

          <!-- 通信覆盖率专属进度条 (通信卫星) -->
          <div
            v-if="sat.category === SatelliteCategory.COMMUNICATION && sat.coverageRate"
            class="mt-1 flex items-center gap-1.5 font-mono text-[9px]"
          >
            <div class="flex-1 h-1 bg-tactical-dark rounded overflow-hidden border border-amber-500/30">
              <div
                class="h-full bg-gradient-to-r from-cyan-500 via-amber-400 to-red-400 transition-all duration-300"
                :style="{ width: `${sat.coverageRate}%` }"
              ></div>
            </div>
            <span class="text-[8px] text-amber-400 font-bold shrink-0">通信覆盖</span>
          </div>

          <!-- 动态遥测缩略快照 -->
          <div class="mt-1.5 grid grid-cols-3 gap-1 pt-1.5 border-t border-tactical-border/30 font-mono text-[10px] text-tactical-muted">
            <div>
              高度:
              <span class="text-tactical-text font-bold">{{ sat.telemetry.altitude.toFixed(0) }}km</span>
            </div>
            <div>
              速度:
              <span class="text-tactical-text font-bold">{{ sat.telemetry.velocity }}km/s</span>
            </div>
            <div class="text-right">
              纬度:
              <span class="text-tactical-text font-bold">{{ sat.telemetry.latitude.toFixed(1) }}°</span>
            </div>
          </div>
        </div>

        <!-- 空态提示 -->
        <div
          v-if="filteredSatellites.length === 0"
          class="py-8 text-center text-tactical-muted font-mono text-xs"
        >
          未检索到符合条件的在轨目标
        </div>
      </div>

      <!-- 底部操作：加入分析计划 -->
      <div class="p-2.5 border-t border-tactical-border/80 bg-tactical-dark/60 flex items-center">
        <button
          @click="openCombatPlanModal"
          class="w-full flex items-center justify-center gap-2 py-2 px-3 rounded font-mono text-xs font-bold transition-all border bg-tactical-cyan/20 hover:bg-tactical-cyan/35 border-tactical-cyan text-tactical-cyan shadow-glow-cyan hover:scale-[1.02] active:scale-95 cursor-pointer"
          title="将当前选定目标卫星纳入六步闭环作战推演与火力打击规划"
        >
          <Zap class="w-4 h-4 text-tactical-cyan animate-pulse" />
          <span>加入分析计划</span>
        </button>
      </div>
    </div>

    <!-- 折叠/展开控制按钮 -->
    <button
      @click="isExpanded = !isExpanded"
      class="h-10 w-6 self-start mt-4 rounded-r tactical-panel border-l-0 flex items-center justify-center text-tactical-muted hover:text-tactical-cyan hover:bg-tactical-dark/80 transition-colors"
      :title="isExpanded ? '收起目标列表' : '展开目标列表'"
    >
      <ChevronLeft v-if="isExpanded" class="w-4 h-4" />
      <ChevronRight v-else class="w-4 h-4" />
    </button>
  </aside>
</template>
