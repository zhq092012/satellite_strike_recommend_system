<script setup lang="ts">
/**
 * @fileoverview 左侧卫星态势目标库与检索面板组件
 * 提供对编目卫星的多维检索、轨道类型筛选、任务分类标签、实时目标卡片及其相机追踪控制
 */

import { ref } from 'vue'
import {
  Search,
  Crosshair,
  ChevronLeft,
  ChevronRight,
  Target,
  Satellite as SatIcon
} from 'lucide-vue-next'
import { useSatelliteState } from '../../composables/useSatelliteState'
import { useBattlefieldState } from '../../composables/useBattlefieldState'
import { OrbitType, SatelliteCategory, Satellite } from '../../types/satellite'

/**
 * 引入态势状态数据与控制操作
 */
const {
  filteredSatellites,
  selectedSatelliteId,
  isTracked,
  searchKeyword,
  orbitTypeFilter,
  categoryFilter,
  selectSatellite,
  toggleTrack
} = useSatelliteState()

/**
 * 引入战场与任务状态控制
 */
const { isCreateMissionModalOpen } = useBattlefieldState()

/**
 * 面板是否处于展开状态 (支持收起以扩充主态势三维视野)
 */
const isExpanded = ref<boolean>(true)

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
 * 点击选中卫星卡片
 *
 * @param sat - 目标卫星对象
 */
function handleSatelliteClick(sat: Satellite): void {
  selectSatellite(sat.id)
}

/**
 * 切换跟踪状态
 */
function handleToggleTrack(): void {
  toggleTrack()
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
      isExpanded ? 'w-80' : 'w-10'
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

        <!-- 轨道类型筛选标签横排 -->
        <div class="flex items-center gap-1 mt-2.5 overflow-x-auto pb-0.5">
          <button
            v-for="opt in orbitOptions"
            :key="opt.value"
            @click="orbitTypeFilter = opt.value"
            :class="[
              'px-2 py-0.5 rounded text-[10px] font-mono whitespace-nowrap transition-colors border',
              orbitTypeFilter === opt.value
                ? 'bg-tactical-cyan/20 border-tactical-cyan text-tactical-cyan'
                : 'bg-tactical-dark/60 border-tactical-border text-tactical-muted hover:text-tactical-text'
            ]"
          >
            {{ opt.label }}
          </button>
        </div>

        <!-- 用途分类快速筛选 -->
        <div class="flex items-center gap-1 mt-1.5 overflow-x-auto">
          <button
            v-for="cat in categoryOptions"
            :key="cat.value"
            @click="categoryFilter = cat.value"
            :class="[
              'px-2 py-0.5 rounded text-[10px] font-mono whitespace-nowrap transition-colors border',
              categoryFilter === cat.value
                ? 'bg-tactical-blue/20 border-tactical-blue text-tactical-blue'
                : 'bg-tactical-dark/60 border-tactical-border text-tactical-muted hover:text-tactical-text'
            ]"
          >
            {{ cat.label }}
          </button>
        </div>
      </div>

      <!-- 列表内容区 -->
      <div class="flex-1 overflow-y-auto p-2 space-y-1.5 max-h-[calc(100vh-320px)]">
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
              <div class="flex items-center gap-1.5">
                <span class="font-mono text-xs font-bold text-tactical-text">
                  {{ sat.name }}
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

          <!-- 动态遥测缩略快照 -->
          <div class="mt-2 grid grid-cols-3 gap-1 pt-1.5 border-t border-tactical-border/40 font-mono text-[10px] text-tactical-muted">
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

      <!-- 底部操作与锁定跟随开关 + 快速新建任务 -->
      <div class="p-2.5 border-t border-tactical-border/80 bg-tactical-dark/60 flex items-center gap-2">
        <button
          @click="handleToggleTrack"
          :class="[
            'flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded font-mono text-xs font-bold transition-all border',
            isTracked
              ? 'bg-tactical-cyan/20 border-tactical-cyan text-tactical-cyan shadow-glow-cyan'
              : 'bg-tactical-dark border-tactical-border text-tactical-muted hover:text-tactical-text'
          ]"
        >
          <Crosshair class="w-3.5 h-3.5" :class="{ 'animate-spin-slow': isTracked }" />
          <span>{{ isTracked ? '跟踪中' : '自由视角' }}</span>
        </button>

        <!-- 显眼的新建任务快捷入口 -->
        <button
          @click="isCreateMissionModalOpen = true"
          class="flex items-center justify-center gap-1 py-1.5 px-2.5 rounded font-mono text-xs font-bold transition-all border bg-tactical-cyan/20 hover:bg-tactical-cyan/35 border-tactical-cyan text-tactical-cyan shadow-glow-cyan"
          title="针对目标下达新的打击任务"
        >
          <Target class="w-3.5 h-3.5" />
          <span>+ 下达任务</span>
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
