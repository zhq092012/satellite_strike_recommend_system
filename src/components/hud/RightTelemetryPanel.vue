<script setup lang="ts">
/**
 * @fileoverview 右侧遥测监控与轨道六根数分析面板组件
 * 精密展示当前选中卫星的开普勒轨道根数、瞬时动力学遥测、传感器视场覆盖与载荷工况
 */

import { computed } from 'vue'
import {
  Gauge,
  Zap,
  Globe,
  Radio,
  ChevronRight,
  Crosshair,
  BatteryCharging
} from 'lucide-vue-next'
import { useSatelliteState } from '../../composables/useSatelliteState'
import { useRightPanelState } from '../../composables/useRightPanelState'

/**
 * 引入态势状态数据
 */
const { selectedSatellite } = useSatelliteState()

/**
 * 引入右侧面板调度中心
 */
const { isTelemetryActive, closeAllRightPanels } = useRightPanelState()

/**
 * 卫星在轨速度占参考极值 (8.0 km/s) 的百分比
 */
const velocityPercentage = computed<number>(() => {
  if (!selectedSatellite.value) return 0
  const v = selectedSatellite.value.telemetry.velocity
  return Math.min(100, Math.round((v / 8.0) * 100))
})

/**
 * 格式化输出大数值地面覆盖面积 (平方公里)
 *
 * @param area - 覆盖面积数值
 * @returns 带千分位或万平方公里的格式化文本
 */
function formatCoverageArea(area: number): string {
  if (area >= 1000000) {
    return `${(area / 10000).toFixed(1)} 万 km²`
  }
  return `${area.toLocaleString()} km²`
}
</script>

<template>
  <aside
    v-if="isTelemetryActive"
    class="absolute top-16 right-3 z-20 flex transition-all duration-300 select-none max-h-[calc(100vh-120px)] w-84"
  >
    <!-- 折叠收起按钮 (位于左侧边缘) -->
    <button
      @click="closeAllRightPanels"
      class="h-10 w-6 self-start mt-4 rounded-l tactical-panel border-r-0 flex items-center justify-center text-tactical-muted hover:text-tactical-cyan hover:bg-tactical-dark/80 transition-colors"
      title="收起遥测面板"
    >
      <ChevronRight class="w-4 h-4" />
    </button>

    <!-- 面板主体内容 -->
    <div
      class="flex-1 flex flex-col rounded tactical-panel tactical-corner-bracket overflow-hidden"
    >
      <!-- 若未选中卫星的缺省态 -->
      <div
        v-if="!selectedSatellite"
        class="p-6 text-center text-tactical-muted font-mono text-xs flex flex-col items-center justify-center h-64"
      >
        <Crosshair class="w-8 h-8 text-tactical-muted/50 mb-2 animate-pulse" />
        请在左侧或球面上选择一颗目标卫星
      </div>

      <!-- 选中卫星遥测展示区 -->
      <div v-else class="flex-1 overflow-y-auto p-3 space-y-3 max-h-[calc(100vh-140px)]">
        <!-- 目标概览标牌 -->
        <div class="p-2.5 rounded bg-tactical-dark/80 border border-tactical-border/80">
          <div class="flex items-center justify-between">
            <div class="font-mono text-sm font-bold text-tactical-cyan flex items-center gap-1.5">
              <span class="w-2 h-2 rounded-full" :style="{ backgroundColor: selectedSatellite.color }"></span>
              {{ selectedSatellite.name }}
            </div>
            <span class="px-1.5 py-0.5 rounded text-[10px] font-mono bg-tactical-cyan/20 border border-tactical-cyan/50 text-tactical-cyan">
              {{ selectedSatellite.orbitType }} 轨道
            </span>
          </div>
          <div class="mt-1 grid grid-cols-2 gap-1 font-mono text-[10px] text-tactical-muted">
            <div>ID: <span class="text-tactical-text">{{ selectedSatellite.id }}</span></div>
            <div>COSPAR: <span class="text-tactical-text">{{ selectedSatellite.cosparId }}</span></div>
            <div>阵营: <span class="text-tactical-text">{{ selectedSatellite.owner }}</span></div>
            <div>发射日: <span class="text-tactical-text">{{ selectedSatellite.launchDate }}</span></div>
          </div>
        </div>

        <!-- 模块 1: 经典开普勒轨道六根数 -->
        <div class="p-2.5 rounded bg-tactical-dark/50 border border-tactical-border/60">
          <div class="flex items-center gap-1.5 font-mono text-xs font-bold text-tactical-text mb-2 pb-1 border-b border-tactical-border/40">
            <Globe class="w-3.5 h-3.5 text-tactical-cyan" />
            <span>开普勒轨道要素 (KEPLERIAN ELEMENTS)</span>
          </div>
          <div class="grid grid-cols-2 gap-2 font-mono text-xs">
            <div class="p-1.5 rounded bg-tactical-bg/70 border border-tactical-border/40">
              <div class="text-[9px] text-tactical-muted">半长轴 a</div>
              <div class="text-tactical-cyan font-bold">
                {{ selectedSatellite.orbitalElements.semiMajorAxis }} km
              </div>
            </div>
            <div class="p-1.5 rounded bg-tactical-bg/70 border border-tactical-border/40">
              <div class="text-[9px] text-tactical-muted">偏心率 e</div>
              <div class="text-tactical-text font-bold">
                {{ selectedSatellite.orbitalElements.eccentricity.toFixed(4) }}
              </div>
            </div>
            <div class="p-1.5 rounded bg-tactical-bg/70 border border-tactical-border/40">
              <div class="text-[9px] text-tactical-muted">轨道倾角 i</div>
              <div class="text-tactical-cyan font-bold">
                {{ selectedSatellite.orbitalElements.inclination.toFixed(1) }}°
              </div>
            </div>
            <div class="p-1.5 rounded bg-tactical-bg/70 border border-tactical-border/40">
              <div class="text-[9px] text-tactical-muted">运行周期 T</div>
              <div class="text-tactical-text font-bold">
                {{ selectedSatellite.orbitalElements.period.toFixed(1) }} min
              </div>
            </div>
            <div class="p-1.5 rounded bg-tactical-bg/70 border border-tactical-border/40">
              <div class="text-[9px] text-tactical-muted">近地点高度 hp</div>
              <div class="text-tactical-text font-bold">
                {{ selectedSatellite.orbitalElements.perigeeAltitude }} km
              </div>
            </div>
            <div class="p-1.5 rounded bg-tactical-bg/70 border border-tactical-border/40">
              <div class="text-[9px] text-tactical-muted">远地点高度 ha</div>
              <div class="text-tactical-text font-bold">
                {{ selectedSatellite.orbitalElements.apogeeAltitude }} km
              </div>
            </div>
          </div>
        </div>

        <!-- 模块 2: 瞬时运动学与星下点遥测 -->
        <div class="p-2.5 rounded bg-tactical-dark/50 border border-tactical-border/60">
          <div class="flex items-center gap-1.5 font-mono text-xs font-bold text-tactical-text mb-2 pb-1 border-b border-tactical-border/40">
            <Gauge class="w-3.5 h-3.5 text-tactical-green" />
            <span>实时运动学遥测 (DYNAMICS TELEMETRY)</span>
          </div>

          <!-- 速度仪表进度 -->
          <div class="mb-2">
            <div class="flex justify-between font-mono text-[10px] mb-1">
              <span class="text-tactical-muted">瞬时轨道线速度</span>
              <span class="text-tactical-green font-bold">
                {{ selectedSatellite.telemetry.velocity }} km/s
              </span>
            </div>
            <div class="w-full h-1.5 bg-tactical-bg rounded overflow-hidden border border-tactical-border/60">
              <div
                class="h-full bg-tactical-green transition-all duration-300 shadow-glow-green"
                :style="{ width: `${velocityPercentage}%` }"
              ></div>
            </div>
          </div>

          <!-- 星下点坐标与高度 -->
          <div class="grid grid-cols-2 gap-2 font-mono text-xs">
            <div class="p-1.5 rounded bg-tactical-bg/70 border border-tactical-border/40">
              <div class="text-[9px] text-tactical-muted">星下点经度</div>
              <div class="text-tactical-cyan font-bold">
                {{ selectedSatellite.telemetry.longitude.toFixed(2) }}°
              </div>
            </div>
            <div class="p-1.5 rounded bg-tactical-bg/70 border border-tactical-border/40">
              <div class="text-[9px] text-tactical-muted">星下点纬度</div>
              <div class="text-tactical-cyan font-bold">
                {{ selectedSatellite.telemetry.latitude.toFixed(2) }}°
              </div>
            </div>
            <div class="p-1.5 rounded bg-tactical-bg/70 border border-tactical-border/40">
              <div class="text-[9px] text-tactical-muted">瞬时地心高度</div>
              <div class="text-tactical-text font-bold">
                {{ selectedSatellite.telemetry.altitude.toFixed(1) }} km
              </div>
            </div>
            <div class="p-1.5 rounded bg-tactical-bg/70 border border-tactical-border/40">
              <div class="text-[9px] text-tactical-muted">对地覆盖面积</div>
              <div class="text-tactical-text font-bold text-[11px]">
                {{ formatCoverageArea(selectedSatellite.telemetry.groundCoverageArea) }}
              </div>
            </div>
          </div>
        </div>

        <!-- 模块 3: 载荷与平台工况 -->
        <div class="p-2.5 rounded bg-tactical-dark/50 border border-tactical-border/60">
          <div class="flex items-center gap-1.5 font-mono text-xs font-bold text-tactical-text mb-2 pb-1 border-b border-tactical-border/40">
            <Zap class="w-3.5 h-3.5 text-tactical-amber" />
            <span>载荷传感器与平台健康 (PAYLOAD & HEALTH)</span>
          </div>

          <div class="space-y-2 font-mono text-xs">
            <div class="flex justify-between text-[11px] p-1.5 rounded bg-tactical-bg/70 border border-tactical-border/40">
              <span class="text-tactical-muted">主载荷:</span>
              <span class="text-tactical-text font-bold">{{ selectedSatellite.sensor.name }}</span>
            </div>
            <div class="flex justify-between text-[11px] p-1.5 rounded bg-tactical-bg/70 border border-tactical-border/40">
              <span class="text-tactical-muted">半视场角 (FOV):</span>
              <span class="text-tactical-cyan font-bold">{{ selectedSatellite.sensor.halfFov }}°</span>
            </div>

            <!-- 电池蓄能状态 -->
            <div class="p-1.5 rounded bg-tactical-bg/70 border border-tactical-border/40">
              <div class="flex justify-between text-[10px] mb-1">
                <span class="text-tactical-muted flex items-center gap-1">
                  <BatteryCharging class="w-3 h-3 text-tactical-green" />
                  蓄电池荷电 (SoC)
                </span>
                <span class="text-tactical-green font-bold">
                  {{ selectedSatellite.telemetry.batterySoc }}%
                </span>
              </div>
              <div class="w-full h-1.5 bg-tactical-bg rounded overflow-hidden">
                <div
                  class="h-full bg-tactical-green transition-all"
                  :style="{ width: `${selectedSatellite.telemetry.batterySoc}%` }"
                ></div>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-2 text-[11px]">
              <div class="p-1.5 rounded bg-tactical-bg/70 border border-tactical-border/40">
                <div class="text-[9px] text-tactical-muted">太阳帆板功率</div>
                <div class="text-tactical-amber font-bold">
                  {{ selectedSatellite.telemetry.solarPower }} W
                </div>
              </div>
              <div class="p-1.5 rounded bg-tactical-bg/70 border border-tactical-border/40">
                <div class="text-[9px] text-tactical-muted">剩余推进剂</div>
                <div class="text-tactical-text font-bold">
                  {{ selectedSatellite.telemetry.propellantMass }} kg
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 模块 4: 战术态势建议卡片 -->
        <div class="p-2.5 rounded bg-tactical-cyan/10 border border-tactical-cyan/40 font-mono">
          <div class="flex items-center gap-1 text-xs font-bold text-tactical-cyan mb-1">
            <Radio class="w-3.5 h-3.5 animate-pulse" />
            <span>战术任务建议</span>
          </div>
          <p class="text-[10px] text-tactical-muted leading-relaxed">
            该目标当前在轨态势稳定，星下点视场对亚太核心海陆走廊保持有效连续覆盖，建议维持既定轨道根数并执行例行遥测监视。
          </p>
        </div>
      </div>
    </div>
  </aside>
</template>
