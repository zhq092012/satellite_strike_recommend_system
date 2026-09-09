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
  ChevronRight,
  Crosshair,
  BatteryCharging,
  Target
} from 'lucide-vue-next'
import { useSatelliteState } from '../../composables/useSatelliteState'
import { useRightPanelState } from '../../composables/useRightPanelState'
import { SatelliteCategory } from '../../types/satellite'

/**
 * 引入态势状态数据
 */
const { selectedSatellite } = useSatelliteState()

/**
 * 引入右侧面板调度中心
 */
const { isTelemetryActive, closeAllRightPanels } = useRightPanelState()

/**
 * 针对当前选中敌方卫星的武器打击智能推荐评估
 */
const strikeRecommendation = computed<{
  recommendedWeapon: string
  weaponType: string
  strikeMethod: string
  tacticalAdvantage: string
  inRange: boolean
}>(() => {
  if (!selectedSatellite.value) {
    return {
      recommendedWeapon: '未指定目标',
      weaponType: '待分配',
      strikeMethod: '请在态势视景或左侧目标清单中选定敌方卫星',
      tacticalAdvantage: '--',
      inRange: false
    }
  }

  const sat = selectedSatellite.value
  const alt = sat.telemetry.altitude

  if (alt <= 1200 && sat.category === SatelliteCategory.RECONNAISSANCE) {
    return {
      recommendedWeapon: 'HQ-19 陆基高空动能反卫拦截系统',
      weaponType: '动能直接撞击物理摧毁 (KKV)',
      strikeMethod: `目标当前轨高 ${alt.toFixed(0)}km，完全处于 HQ-19 动能包线(120-1200km)拦截窗口内。建议于近地点实施迎头直接碰撞拦截。备选方案：【光电神威-II 激光炮】实施光学焦平面硬烧蚀致盲。`,
      tacticalAdvantage: '彻底物理碎裂解体，毁灭敌高分光学与雷达感知载荷',
      inRange: true
    }
  } else if (alt <= 1500 && (sat.category === SatelliteCategory.EARLY_WARNING || sat.category === SatelliteCategory.RECONNAISSANCE)) {
    return {
      recommendedWeapon: '光电神威-II 兆瓦级地基高能致盲激光炮',
      weaponType: '高原自适应兆瓦级高能激光致盲',
      strikeMethod: `目标轨高 ${alt.toFixed(0)}km 处于激光炮 1500km 极限射高内。利用高原稀薄大气自适应相差矫正，连续照射数秒熔毁敌红外/光学光电探测敏感器。`,
      tacticalAdvantage: '光速秒级交战响应、低轨道残骸附带效应、不可逆物理烧蚀',
      inRange: true
    }
  } else if (sat.category === SatelliteCategory.COMMUNICATION && alt <= 1000) {
    return {
      recommendedWeapon: '凌霄-4 机动式超宽带大功率卫星干扰阵列',
      weaponType: '超宽带同频大功率电子阻断压制',
      strikeMethod: `目标为美低轨通信星座节点(轨高 ${alt.toFixed(0)}km)。建议由沿海车载机动干扰发射梯队对其 Ku/Ka 频段注入高增益同频噪声，瘫痪其对第一岛链前哨的数据下传；战时可由【HQ-19】实施重点动能截断。`,
      tacticalAdvantage: '多波束并发压制，阻断敌前沿分布式态势与火力杀伤链',
      inRange: true
    }
  } else if (sat.category === SatelliteCategory.NAVIGATION) {
    return {
      recommendedWeapon: '凌霄-4 机动式超宽带大功率卫星干扰阵列',
      weaponType: '战术大空域导航授时干扰与伪距欺骗',
      strikeMethod: `目标处于中地球轨道(${alt.toFixed(0)}km)，超出动能与激光拦截上限。利用超宽带大功率阵列针对 L1C/L2/M-Code 实施广域强电磁噪声压制与导航假星注入，诱偏敌精确制导弹药。`,
      tacticalAdvantage: '广域瘫痪敌机载与舰载武器末端卫星伪距修正与定位',
      inRange: true
    }
  } else {
    return {
      recommendedWeapon: '凌霄-4 机动式超宽带大功率卫星干扰发射阵列',
      weaponType: '天基战略数据中继全频段电磁阻塞',
      strikeMethod: `目标为静止高轨战略中继枢纽(${alt.toFixed(0)}km)。针对中继 S/Ku/Ka 转发器及对地测控基站实施全频段大功率电磁阻塞，彻底切断前沿多颗侦察星的跨洋回传链路。`,
      tacticalAdvantage: '牵一发而动全身，一击斩断敌跨大洋天基情报分发大动脉',
      inRange: true
    }
  }
})

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
    class="absolute top-16 right-3 z-20 flex transition-all duration-300 select-none max-h-[calc(100vh-120px)] w-[380px]"
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
            <span>开普勒轨道要素</span>
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
            <span>实时运动学遥测</span>
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
            <span>载荷传感器与平台健康</span>
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

        <!-- 模块 4: 武器反卫打击智能推荐评估卡片 (ASAT STRIKE RECOMMENDATION) -->
        <div class="p-2.5 rounded bg-tactical-dark/95 border border-tactical-red/60 font-mono shadow-[0_0_15px_rgba(239,68,68,0.15)]">
          <div class="flex items-center justify-between pb-1.5 border-b border-tactical-border/60 mb-2">
            <div class="flex items-center gap-1.5 text-xs font-bold text-tactical-red">
              <Target class="w-3.5 h-3.5 animate-pulse" />
              <span>反卫打击推荐评估</span>
            </div>
            <span
              :class="[
                'px-1.5 py-0.2 text-[9px] rounded font-bold border',
                strikeRecommendation.inRange
                  ? 'bg-tactical-red/20 border-tactical-red text-tactical-red'
                  : 'bg-tactical-amber/20 border-tactical-amber text-tactical-amber'
              ]"
            >
              {{ strikeRecommendation.inRange ? '● 动能/激光射程内' : '▲ 电子干扰射程内' }}
            </span>
          </div>

          <div class="space-y-1.5 text-[11px]">
            <div>
              <span class="text-tactical-muted text-[10px]">推荐打击武器: </span>
              <span class="font-bold text-tactical-cyan">{{ strikeRecommendation.recommendedWeapon }}</span>
            </div>
            <div>
              <span class="text-tactical-muted text-[10px]">主要交战样式: </span>
              <span class="text-white font-bold">{{ strikeRecommendation.weaponType }}</span>
            </div>
            <div class="p-1.5 rounded bg-tactical-bg/80 border border-tactical-border/50 text-[10px] text-tactical-text leading-relaxed break-words">
              {{ strikeRecommendation.strikeMethod }}
            </div>
            <div class="text-[9px] text-tactical-green flex items-center gap-1 font-bold">
              <Zap class="w-3 h-3 text-tactical-green" />
              <span>战术战损优势: {{ strikeRecommendation.tacticalAdvantage }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </aside>
</template>
