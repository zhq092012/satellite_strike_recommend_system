<script setup lang="ts">
/**
 * @fileoverview 作战计划向导 - 第五步：优先级链路匹配武器与甘特图组件 (Step5WeaponMatchingGantt.vue)
 * 依据多维综合评估，自动排定目标数据链路打击优先级队列，为每条链路分配最佳主战反卫武器，
 * 并以高精度战术甘特图 (Tactical Gantt Chart) 可视化各任务行动全生命周期时序条
 */

import { ref } from 'vue'
import {
  CalendarRange,
  Target,
  Clock
} from 'lucide-vue-next'
import { useCombatPlanState, GanttTaskItem } from '../../composables/useCombatPlanState'
import { WeaponType } from '../../types/tacticalAssets'

/**
 * 引入作战计划状态
 */
const { matchedWeaponPlans } = useCombatPlanState()

/**
 * 当前悬停选中的时序单项事件 (用于悬浮查看阶段细节)
 */
const hoveredTask = ref<GanttTaskItem | null>(null)

/**
 * 甘特图总时间跨度 (分钟，0 到 30)
 */
const TOTAL_MINUTES = 30

/**
 * 时间刻度标记列表
 */
const timeTicks = [0, 5, 10, 15, 20, 25, 30]

/**
 * 根据起始分钟与持续时间计算甘特图水平定位与宽度百分比
 *
 * @param start - 起始偏移分钟
 * @param duration - 持续时间分钟
 * @returns CSS 样式对象
 */
function getGanttBarStyle(start: number, duration: number): { left: string; width: string } {
  const leftPercent = (Math.max(0, start) / TOTAL_MINUTES) * 100
  const widthPercent = (Math.min(duration, TOTAL_MINUTES - start) / TOTAL_MINUTES) * 100
  return {
    left: `${leftPercent}%`,
    width: `${widthPercent}%`
  }
}

/**
 * 获取武器类型对应的徽章样式
 *
 * @param type - 武器分类枚举
 * @returns 样式类名
 */
function getWeaponBadgeClass(type: WeaponType): string {
  switch (type) {
    case WeaponType.KINETIC:
      return 'bg-red-500/20 text-red-400 border-red-500/50'
    case WeaponType.DIRECTED_ENERGY:
      return 'bg-amber-500/20 text-amber-400 border-amber-500/50'
    case WeaponType.ELECTRONIC_WARFARE:
      return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
    case WeaponType.CYBER:
      return 'bg-purple-500/20 text-purple-300 border-purple-500/50'
  }
}
</script>

<template>
  <div class="space-y-4 font-mono select-none">
    <!-- 1. 优先级链路与武器智能匹配总览 -->
    <div class="p-3.5 rounded bg-tactical-dark/70 border border-tactical-border/80">
      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center gap-2">
          <Target class="w-4 h-4 text-tactical-cyan" />
          <h3 class="text-xs font-bold tracking-wider text-tactical-text uppercase">
            五、综合优先级链路打击队列与武器阵地智能分配
          </h3>
        </div>
        <span class="text-[10px] px-2 py-0.5 rounded bg-tactical-cyan/20 text-tactical-cyan border border-tactical-cyan/40">
          智能分配法则: 毁伤最大化 & 弹目最佳契合
        </span>
      </div>

      <!-- 优先级链路分配表格卡片 -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
        <div
          v-for="plan in matchedWeaponPlans"
          :key="plan.link.id"
          class="p-2.5 rounded bg-tactical-bg/90 border border-tactical-border/80 hover:border-tactical-cyan transition-all flex flex-col justify-between"
        >
          <div>
            <!-- 头部：优先级序号与得分 -->
            <div class="flex items-center justify-between">
              <span class="text-xs font-black text-amber-400">
                TOP {{ plan.index }}: {{ plan.targetSatellite.name.split(' ')[0] }}
              </span>
              <span class="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/50">
                优先级: {{ plan.priorityScore }}分
              </span>
            </div>

            <!-- 目标链路与地面枢纽 -->
            <div class="mt-1 text-[10px] text-tactical-muted truncate">
              链路: {{ plan.link.name }}
            </div>

            <!-- 分配武器卡片 -->
            <div class="mt-2 p-2 rounded bg-tactical-dark/90 border border-tactical-cyan/40">
              <div class="flex items-center justify-between text-[10px]">
                <span class="text-tactical-muted">分配主战武器:</span>
                <span :class="['px-1 py-0.2 rounded text-[9px] font-bold border', getWeaponBadgeClass(plan.recommendedWeapon.type)]">
                  {{ plan.recommendedWeapon.type }}
                </span>
              </div>
              <div class="mt-1 text-xs font-bold text-tactical-cyan truncate">
                {{ plan.recommendedWeapon.name }}
              </div>
              <div class="mt-0.5 text-[9px] text-tactical-muted">
                部署阵地: {{ plan.recommendedWeapon.locationName }}
              </div>
            </div>

            <!-- 战术机理与预期 Pk -->
            <div class="mt-2 text-[10px] text-tactical-text/90 line-clamp-2">
              <span class="text-tactical-muted">打击机理:</span> {{ plan.tacticalRationale }}
            </div>
          </div>

          <div class="mt-2.5 pt-1.5 border-t border-tactical-border/40 flex items-center justify-between text-[9px]">
            <span class="text-emerald-400 font-bold">预期杀伤率: {{ plan.expectedPk }}%</span>
            <span class="text-cyan-300">时序阶段: 5步闭环</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 2. 战术作战时序甘特图 (Tactical Gantt Chart) -->
    <div class="p-3.5 rounded bg-tactical-dark/70 border border-tactical-cyan/40 shadow-tactical-panel">
      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center gap-2">
          <CalendarRange class="w-4 h-4 text-tactical-cyan" />
          <h3 class="text-xs font-bold tracking-wider text-tactical-text uppercase">
            多链路协同作战时序甘特图 (T+00:00 至 T+30:00)
          </h3>
        </div>

        <!-- 阶段图例图示 -->
        <div class="hidden md:flex items-center gap-3 text-[9px]">
          <span class="flex items-center gap-1">
            <span class="w-2 h-2 rounded-sm bg-blue-500"></span> 雷达截获
          </span>
          <span class="flex items-center gap-1">
            <span class="w-2 h-2 rounded-sm bg-amber-500"></span> 阵地准备
          </span>
          <span class="flex items-center gap-1">
            <span class="w-2 h-2 rounded-sm bg-red-500"></span> 发射/照射
          </span>
          <span class="flex items-center gap-1">
            <span class="w-2 h-2 rounded-sm bg-orange-500"></span> 命中/压制
          </span>
          <span class="flex items-center gap-1">
            <span class="w-2 h-2 rounded-sm bg-emerald-500"></span> 战损评估
          </span>
        </div>
      </div>

      <!-- 甘特图主体容器 -->
      <div class="p-3 rounded bg-black/60 border border-tactical-border/80 space-y-3">
        <!-- 时间刻度轴 (X 轴) -->
        <div class="flex items-center">
          <div class="w-36 sm:w-44 text-[10px] text-tactical-muted font-bold shrink-0">
            目标 / 武器
          </div>
          <div class="flex-1 relative h-5 border-b border-tactical-border/70">
            <div
              v-for="tick in timeTicks"
              :key="tick"
              class="absolute -translate-x-1/2 text-[9px] text-tactical-muted font-mono flex flex-col items-center"
              :style="{ left: `${(tick / TOTAL_MINUTES) * 100}%` }"
            >
              <span>T+{{ String(tick).padStart(2, '0') }}:00</span>
              <div class="w-[1px] h-1.5 bg-tactical-border/70"></div>
            </div>
          </div>
        </div>

        <!-- 各链路与分配武器任务行 -->
        <div class="space-y-2.5">
          <div
            v-for="plan in matchedWeaponPlans"
            :key="plan.link.id"
            class="flex items-center group hover:bg-slate-900/40 p-1 rounded transition-colors"
          >
            <!-- 目标卫星与武器标签栏 -->
            <div class="w-36 sm:w-44 pr-2 shrink-0">
              <div class="text-xs font-bold text-tactical-text truncate flex items-center gap-1">
                <span class="text-amber-400">#{{ plan.index }}</span>
                <span>{{ plan.targetSatellite.name.split(' ')[0] }}</span>
              </div>
              <div class="text-[9px] text-cyan-300 truncate">
                {{ plan.recommendedWeapon.name.split(' ')[0] }}
              </div>
            </div>

            <!-- 甘特时序轨道 -->
            <div class="flex-1 relative h-6 bg-slate-950/80 rounded border border-tactical-border/50 overflow-hidden">
              <!-- 背景竖向参考刻度网格线 -->
              <div
                v-for="tick in timeTicks"
                :key="tick"
                class="absolute top-0 bottom-0 w-[1px] bg-slate-800/40 pointer-events-none"
                :style="{ left: `${(tick / TOTAL_MINUTES) * 100}%` }"
              ></div>

              <!-- 任务事件色块条 -->
              <div
                v-for="task in plan.timelineTasks"
                :key="task.id"
                @mouseenter="hoveredTask = task"
                @mouseleave="hoveredTask = null"
                class="absolute top-1 bottom-1 rounded cursor-pointer transition-all hover:brightness-125 shadow-sm flex items-center justify-center overflow-hidden px-1"
                :style="{
                  ...getGanttBarStyle(task.startMinute, task.durationMinute),
                  backgroundColor: task.color
                }"
                :title="`${task.phaseName} (T+${task.startMinute} ~ T+${task.startMinute + task.durationMinute})`"
              >
                <span class="text-[8px] font-bold text-white whitespace-nowrap truncate drop-shadow-md">
                  {{ task.phaseName }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 悬浮选中的甘特任务说明卡片 -->
      <div
        v-if="hoveredTask"
        class="mt-2.5 p-2 rounded bg-tactical-bg/95 border border-tactical-cyan/60 flex items-center justify-between text-[10px] animate-fadeIn"
      >
        <div class="flex items-center gap-2">
          <Clock class="w-3.5 h-3.5 text-tactical-cyan" />
          <span class="text-tactical-muted">聚焦阶段:</span>
          <span class="font-bold text-tactical-text">{{ hoveredTask.phaseName }}</span>
          <span class="text-tactical-muted">| 执行武器:</span>
          <span class="text-cyan-300 font-bold">{{ hoveredTask.weaponName }}</span>
        </div>
        <div class="text-amber-400 font-bold">
          时间窗口: T+{{ String(hoveredTask.startMinute).padStart(2, '0') }}:00 ~ T+{{
            String(hoveredTask.startMinute + hoveredTask.durationMinute).padStart(2, '0')
          }}:00 (持续 {{ hoveredTask.durationMinute }} 分钟)
        </div>
      </div>
    </div>
  </div>
</template>
