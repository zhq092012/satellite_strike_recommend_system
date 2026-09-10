<script setup lang="ts">
/**
 * @fileoverview 作战计划向导 - 第二步：分析链路时长与四层空间数据链路拓扑 (Step2LinkOverpassTopology.vue)
 * 展示过境时间与地面站可见仰角计算推导公式、过境时长门限筛选器、候选卫星卡片，
 * 以及 1:1 还原的高清四层空间数据链路拓扑图 (侦察卫星 -> 中继卫星 -> 12个地面接收站 -> 亚马逊AWS北美云集群/数据中心)
 */

import { ref, computed } from 'vue'
import {
  Clock,
  Network,
  Sliders,
  CheckCircle2,
  Sparkles,
  Radio,
  Server,
  Zap,
  Wifi,
  Satellite as SatelliteIcon
} from 'lucide-vue-next'
import { useCombatPlanState } from '../../composables/useCombatPlanState'
import { useTacticalAssetsState } from '../../composables/useTacticalAssetsState'
import { useSatelliteState } from '../../composables/useSatelliteState'
import { OperationalStatus } from '../../types/satellite'
import { DataLinkTopologyType, DataLinkStatus, type DataLink } from '../../types/tacticalAssets'

/**
 * 引入作战计划状态与计算数据
 */
const {
  maxLinkDurationThreshold,
  step2Candidates,
  selectedTopologySatelliteId,
  selectTopologySatellite
} = useCombatPlanState()

/**
 * 引入态势资产与卫星数据
 */
const { dataLinks } = useTacticalAssetsState()
const { satellites } = useSatelliteState()

/**
 * 拓扑图展示模式：'SINGLE' (单星专属链路聚焦) | 'ALL' (全网四层总览)
 */
const topologyDisplayMode = ref<'SINGLE' | 'ALL'>('SINGLE')

/**
 * 当前选中的卫星对象
 */
const currentSelectedSatellite = computed(() => {
  const found = satellites.value.find((s) => s.id === selectedTopologySatelliteId.value)
  if (found) return found
  return step2Candidates.value[0] || satellites.value[0]
})

/**
 * 当前选中卫星对应的数据传输链路对象
 */
const activeDataLink = computed<DataLink>(() => {
  const sat = currentSelectedSatellite.value
  if (!sat) {
    return {
      id: 'DL-FALLBACK',
      name: '默认西太战区数据传输综合链路',
      topologyType: DataLinkTopologyType.DIRECT,
      sourceSatelliteId: 'SAT-USA-290',
      groundStationId: 'GS-GUAM-ANDERSEN',
      dataCenterId: 'DC-JIOC-HAWAII',
      status: DataLinkStatus.ACTIVE,
      dataRateMbps: 1200,
      latencyMs: 120,
      description: '过境时间窗内向第一/第二岛链战区情报网注入遥感/通信数据',
      createdAt: new Date().toISOString()
    }
  }

  const match = dataLinks.value.find((l) => l.sourceSatelliteId === sat.id)
  if (match) return match

  const isRelayNeeded = sat.telemetry.altitude > 800 || sat.name.includes('锁眼') || sat.name.includes('USA-326')
  return {
    id: `DL-AUTO-${sat.id}`,
    name: `${sat.name.split(' ')[0]} 战区战术回传综合链路`,
    topologyType: isRelayNeeded ? DataLinkTopologyType.RELAY : DataLinkTopologyType.DIRECT,
    sourceSatelliteId: sat.id,
    relaySatelliteId: isRelayNeeded ? 'SAT-TDRS-11' : undefined,
    groundStationId: isRelayNeeded ? 'GS-PINE-GAP' : 'GS-GUAM-ANDERSEN',
    dataCenterId: isRelayNeeded ? 'DC-SCHRIEVER-AFB' : 'DC-JIOC-HAWAII',
    status: sat.status === OperationalStatus.OFFLINE ? DataLinkStatus.JAMMED : DataLinkStatus.ACTIVE,
    dataRateMbps: isRelayNeeded ? 850 : 1200,
    latencyMs: sat.linkLatencyMs ?? 125,
    description: `${sat.name} 过境可见时间窗内向战区情报网注入遥感数据`,
    createdAt: new Date().toISOString()
  }
})

/**
 * 4 颗核心展示的侦察卫星节点 (对应图一 Level 1)
 */
const satelliteNodes = computed(() => {
  const defaults = [
    { id: 'SAT-USA-290', code: 'USA-290 (KH-11)', alias: 'CAPELLA-11', fullName: 'USA-290 (KH-11 锁眼光学侦察星)', x: 190, y: 70 },
    { id: 'SAT-WORLDVIEW-3', code: 'WorldView-3', alias: 'CAPELLA-14', fullName: 'WorldView-3 (世景三号高分商遥)', x: 390, y: 70 },
    { id: 'SAT-USA-326', code: 'USA-326 (SAR)', alias: 'CAPELLA-13', fullName: 'USA-326 (FIA-Radar 秘密雷达侦察星)', x: 610, y: 70 },
    { id: 'SAT-STARSHIELD-01', code: 'Starshield-01', alias: 'CAPELLA-15', fullName: 'Starshield-01 (SpaceX 军用星盾)', x: 830, y: 70 }
  ]
  return defaults
})

/**
 * 中继卫星节点 (对应图二 Level 2)
 */
const relayNode = {
  id: 'SAT-TDRS-11',
  code: 'TDRS-11',
  fullName: 'TDRS-11 (NASA/USSF 战略数据中继星)',
  x: 500,
  y: 175
}

/**
 * 12 个地面接收站节点 (对应图二 Level 3)
 */
const groundStationNodes = [
  { id: 'GS-1', name: '美国蒙大拿', x: 70, y: 320, window: '+0.0 分钟', activeFor: ['SAT-USA-290', 'SAT-STARSHIELD-01'] },
  { id: 'GS-2', name: '加拿大伊努维克', x: 148, y: 320, window: '+8.2 分钟', activeFor: ['SAT-USA-290', 'SAT-WORLDVIEW-3'] },
  { id: 'GS-3', name: '新西兰阿瓦鲁阿', x: 226, y: 320, window: '+19.3 分钟', activeFor: ['SAT-WORLDVIEW-3', 'SAT-USA-326'] },
  { id: 'GS-4', name: '智利蓬塔阿雷纳斯', x: 304, y: 320, window: '+31.6 分钟', activeFor: ['SAT-USA-290', 'SAT-USA-326'] },
  { id: 'GS-5', name: '爱尔兰Ireland', x: 382, y: 320, window: '+41.6 分钟', activeFor: ['SAT-STARSHIELD-01'] },
  { id: 'GS-6', name: '澳大利亚达尔文', x: 460, y: 320, window: '+339.6 分钟', activeFor: ['SAT-USA-290', 'SAT-WORLDVIEW-3'] },
  { id: 'GS-7', name: '南极TrollSat', x: 538, y: 320, window: '+45.1 分钟', activeFor: ['SAT-USA-290', 'SAT-WORLDVIEW-3'] },
  { id: 'GS-8', name: '加州特拉西', x: 616, y: 320, window: '+2.7 分钟', activeFor: ['SAT-STARSHIELD-01', 'SAT-USA-326'] },
  { id: 'GS-9', name: '俄勒冈Oregon', x: 694, y: 320, window: '+0.4 分钟', activeFor: ['SAT-USA-290'] },
  { id: 'GS-10', name: '夏威夷Kapolei', x: 772, y: 320, window: '+52.5 分钟', activeFor: ['SAT-WORLDVIEW-3', 'SAT-STARSHIELD-01'] },
  { id: 'GS-11', name: '斯瓦尔巴SvalSat', x: 850, y: 320, window: '+30.7 分钟', activeFor: ['SAT-USA-326'] },
  { id: 'GS-12', name: '南非开普敦', x: 928, y: 320, window: '-161.4 分钟', activeFor: ['SAT-USA-290'] }
]

/**
 * 数据中心节点 (对应图二 Level 4)
 */
const dataCenterNode = {
  id: 'DC-AWS',
  name: '亚马逊AWS北美云集群',
  fullName: '亚马逊AWS北美云集群 / 施里弗作战数据处理中心',
  x: 500,
  y: 440
}

/**
 * 判断某地面站是否属于当前选中卫星的高亮连线
 */
function isStationActiveForCurrentSat(gs: typeof groundStationNodes[0]): boolean {
  if (topologyDisplayMode.value === 'ALL') return true
  const curSatId = currentSelectedSatellite.value?.id || 'SAT-USA-290'
  return gs.activeFor.includes(curSatId)
}

/**
 * 判断某侦察卫星是否为当前选中
 */
function isSatActive(satId: string): boolean {
  return currentSelectedSatellite.value?.id === satId
}

/**
 * 点击切换选中卫星
 */
function handleSelectSatellite(satId: string): void {
  selectTopologySatellite(satId)
}
</script>

<template>
  <div class="space-y-4 font-mono select-none">
    <!-- 1. 过境时间与链路分析计算过程 -->
    <div class="p-3.5 rounded bg-tactical-dark/70 border border-tactical-border/80">
      <div class="flex items-center justify-between mb-2">
        <div class="flex items-center gap-2">
          <Clock class="w-4 h-4 text-tactical-cyan" />
          <h3 class="text-xs font-bold tracking-wider text-tactical-text uppercase">
            二、过境时间与地面站可见仰角通信窗口分析模型
          </h3>
        </div>
        <span class="text-[10px] px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-400 border border-cyan-400/40">
          几何学分析: 测控仰角截割模型
        </span>
      </div>

      <!-- 核心物理公式面板 -->
      <div class="p-3.5 sm:p-4 rounded bg-slate-950/80 border border-tactical-cyan/50 text-center space-y-2 shadow-[0_0_15px_rgba(6,182,212,0.15)]">
        <div class="flex items-center justify-center flex-wrap gap-y-2 font-serif text-tactical-cyan text-base sm:text-xl font-bold tracking-normal select-text">
          <span>Δ<i class="italic">t</i><sub class="text-xs font-sans">过境</sub></span>
          <span class="mx-2 text-slate-300 font-sans">=</span>

          <span class="inline-flex flex-col items-center justify-center text-xs sm:text-sm align-middle">
            <span class="border-b border-tactical-cyan/60 px-1.5 pb-0.5 leading-none">
              2 <i class="italic">R</i><sub class="text-[10px] font-sans">e</sub>
            </span>
            <span class="px-1.5 pt-0.5 leading-none">
              <i class="italic">v</i><sub class="text-[10px] font-sans">sat</sub>
            </span>
          </span>

          <span class="mx-1.5 text-slate-400">·</span>

          <span class="font-sans font-normal text-slate-200 text-sm sm:text-base">arccos</span>
          <span class="inline-flex items-center">
            <span class="text-2xl font-light text-slate-400 mr-0.5">(</span>
            <span class="inline-flex flex-col items-center justify-center text-xs sm:text-sm align-middle">
              <span class="border-b border-tactical-cyan/60 px-1 pb-0.5 leading-none">
                <i class="italic">R</i><sub class="text-[10px] font-sans">e</sub> · cos <i class="italic">ε</i><sub class="text-[10px] font-sans">min</sub>
              </span>
              <span class="px-1 pt-0.5 leading-none">
                <i class="italic">R</i><sub class="text-[10px] font-sans">e</sub> + <i class="italic">H</i>
              </span>
            </span>
            <span class="text-2xl font-light text-slate-400 ml-0.5">)</span>
          </span>
        </div>

        <div class="text-[11px] text-tactical-muted font-mono flex items-center justify-center gap-2 flex-wrap">
          <span>其中 <strong class="text-tactical-cyan">R<sub>e</sub> = 6378 km</strong> 为地球半径</span>
          <span class="text-slate-600">|</span>
          <span><strong class="text-tactical-cyan">H</strong> 为卫星轨道高度</span>
          <span class="text-slate-600">|</span>
          <span><strong class="text-tactical-cyan">ε<sub>min</sub></strong> 为地面站最低测控仰角 (5° ~ 10°)</span>
        </div>
      </div>

      <!-- 战术分析结论摘要 -->
      <div class="mt-2.5 p-2.5 rounded bg-tactical-bg/80 border border-tactical-border/60 text-[10px] text-tactical-text leading-relaxed">
        <div class="text-amber-400 font-bold mb-0.5">★ 空间链路薄弱点分析:</div>
        低轨 (LEO) 卫星过境时间极短 (通常仅 <span class="text-cyan-300 font-bold">400秒 ~ 600秒</span>)，对地面站通信为高突发、强脉冲下传；
        若其无法直连第一岛链地面站，则必须依赖 <span class="text-cyan-300 font-bold">TDRS-11 / 13</span> 等静止轨中继星构建跨洋转发链路，最终接入后方云集群与数据中心。
      </div>
    </div>

    <!-- 2. 过境时长筛选调节控件 -->
    <div class="p-3.5 rounded bg-tactical-dark/70 border border-tactical-cyan/40 shadow-glow-cyan flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div class="space-y-1">
        <div class="flex items-center gap-2">
          <Sliders class="w-4 h-4 text-tactical-cyan" />
          <span class="text-xs font-bold text-tactical-text">筛选过境下传时间短于:</span>
          <span class="text-sm font-bold text-cyan-400 px-2 py-0.5 rounded bg-cyan-500/20 border border-cyan-400/40">
            &le; {{ maxLinkDurationThreshold }} 秒 ({{ (maxLinkDurationThreshold / 60).toFixed(1) }} 分钟)
          </span>
        </div>
        <p class="text-[10px] text-tactical-muted">
          筛选短窗口突发过境目标，该类目标对打击时效性要求最高，是首波次火力分配的关键焦点
        </p>
      </div>

      <div class="flex items-center gap-3 w-full md:w-80">
        <span class="text-[10px] text-tactical-muted whitespace-nowrap">300秒</span>
        <input
          type="range"
          min="300"
          max="1200"
          step="30"
          v-model.number="maxLinkDurationThreshold"
          class="flex-1 h-2 bg-slate-800 rounded appearance-none cursor-pointer accent-cyan-500"
        />
        <span class="text-[10px] text-tactical-muted whitespace-nowrap">1200秒</span>
      </div>
    </div>

    <!-- 3. 筛选出的候选卫星列表 (点击切换拓扑聚焦目标) -->
    <div class="p-3.5 rounded bg-tactical-dark/70 border border-tactical-border/80">
      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center gap-2">
          <CheckCircle2 class="w-4 h-4 text-tactical-green" />
          <h3 class="text-xs font-bold tracking-wider text-tactical-text">
            过境时长筛选结果 (共 {{ step2Candidates.length }} 颗候选卫星 · 点击任意卫星切换下方拓扑图)
          </h3>
        </div>
        <span class="text-[10px] text-tactical-cyan font-bold flex items-center gap-1">
          <Sparkles class="w-3.5 h-3.5 animate-pulse" />
          <span>点击联动下方拓扑图</span>
        </span>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-2.5">
        <div
          v-for="sat in step2Candidates"
          :key="sat.id"
          @click="handleSelectSatellite(sat.id)"
          :class="[
            'p-2.5 rounded transition-all cursor-pointer relative',
            currentSelectedSatellite.id === sat.id
              ? 'bg-cyan-950/90 border-2 border-cyan-400 shadow-[0_0_18px_rgba(6,182,212,0.45)] ring-1 ring-cyan-300 scale-[1.02]'
              : 'bg-tactical-bg/90 border border-tactical-border/80 hover:border-cyan-400/80 hover:bg-slate-900/60'
          ]"
        >
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold text-tactical-text truncate">{{ sat.name.split(' ')[0] }}</span>
            <span
              :class="[
                'text-[9px] px-1.5 py-0.5 rounded font-bold border',
                currentSelectedSatellite.id === sat.id
                  ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-black'
                  : 'bg-cyan-900/40 text-cyan-300 border-cyan-500/40'
              ]"
            >
              {{ sat.overpassDurationSec }}秒
            </span>
          </div>

          <div class="text-[9px] text-tactical-muted mt-1 flex items-center justify-between">
            <span>{{ sat.orbitType }} · {{ sat.telemetry.altitude.toFixed(0) }}km</span>
            <span class="text-amber-400 font-bold">威胁 {{ sat.threatScore }}分</span>
          </div>

          <div class="mt-2 flex items-center justify-between text-[9px] text-tactical-muted pt-1.5 border-t border-tactical-border/40">
            <span>延迟: <strong class="text-cyan-300">{{ sat.linkLatencyMs }}ms</strong></span>
            <span
              v-if="currentSelectedSatellite.id === sat.id"
              class="text-cyan-300 font-black flex items-center gap-1"
            >
              <span class="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping"></span>
              <span>当前选定 ✓</span>
            </span>
            <span v-else class="text-slate-500">点击查看拓扑 →</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 4. 【核心拓扑图】四层立体空间数据链路拓扑图 (AntV/G6 风格层级图谱) -->
    <div class="p-3.5 rounded bg-tactical-dark/80 border border-tactical-cyan/50 shadow-tactical-panel space-y-3">
      <!-- 拓扑头部控制栏 -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-tactical-border/70 pb-2.5">
        <div class="flex items-center gap-2">
          <Network class="w-4 h-4 text-tactical-cyan animate-pulse" />
          <div class="flex items-center gap-2">
            <h3 class="text-xs sm:text-sm font-black tracking-wider text-tactical-text uppercase">
              四层立体空间数据链路拓扑图
            </h3>
            <span class="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-400/60 text-[10px] font-bold">
              当前目标: {{ currentSelectedSatellite?.name }}
            </span>
          </div>
        </div>

        <!-- 模式切换控制器 -->
        <div class="flex items-center gap-2">
          <button
            @click="topologyDisplayMode = 'SINGLE'"
            :class="[
              'px-3 py-1 rounded text-[10px] font-bold transition-all border flex items-center gap-1',
              topologyDisplayMode === 'SINGLE'
                ? 'bg-cyan-500/25 border-cyan-400 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.35)]'
                : 'bg-slate-900 border-tactical-border text-tactical-muted hover:text-tactical-text'
            ]"
          >
            <span>单星专属链路高亮</span>
          </button>
          <button
            @click="topologyDisplayMode = 'ALL'"
            :class="[
              'px-3 py-1 rounded text-[10px] font-bold transition-all border flex items-center gap-1',
              topologyDisplayMode === 'ALL'
                ? 'bg-cyan-500/25 border-cyan-400 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.35)]'
                : 'bg-slate-900 border-tactical-border text-tactical-muted hover:text-tactical-text'
            ]"
          >
            <span>全网四层链路总览</span>
          </button>
        </div>
      </div>

      <!-- 核心画布容器 (左侧 4 层标识胶囊 + 右侧层级拓扑 Graph) -->
      <div class="flex flex-col lg:flex-row gap-2 bg-[#040a16] border border-slate-800 rounded-lg p-3 relative overflow-hidden shadow-[inset_0_0_25px_rgba(0,0,0,0.9)]">
        <!-- 左侧层级标识立柱 (对应图二左侧 4 个层级胶囊) -->
        <div class="w-full lg:w-36 flex lg:flex-col justify-between py-4 lg:py-6 shrink-0 gap-2 font-mono">
          <!-- 胶囊 1: 侦察卫星 (Y ~ 70) -->
          <div class="flex-1 lg:flex-initial px-3 py-2 rounded-lg bg-slate-900/90 border border-slate-700/80 text-cyan-300 text-xs font-bold flex items-center gap-2 shadow-[0_0_10px_rgba(0,0,0,0.5)]">
            <Radio class="w-4 h-4 text-cyan-400 shrink-0" />
            <span>侦察卫星</span>
          </div>

          <!-- 胶囊 2: 中继卫星 (Y ~ 175) -->
          <div class="flex-1 lg:flex-initial px-3 py-2 rounded-lg bg-slate-900/90 border border-slate-700/80 text-cyan-300 text-xs font-bold flex items-center gap-2 shadow-[0_0_10px_rgba(0,0,0,0.5)]">
            <SatelliteIcon class="w-4 h-4 text-cyan-400 shrink-0" />
            <span>中继卫星</span>
          </div>

          <!-- 胶囊 3: 地面接收站 (Y ~ 320) -->
          <div class="flex-1 lg:flex-initial px-3 py-2 rounded-lg bg-slate-900/90 border border-slate-700/80 text-cyan-300 text-xs font-bold flex items-center gap-2 shadow-[0_0_10px_rgba(0,0,0,0.5)]">
            <Wifi class="w-4 h-4 text-cyan-400 shrink-0" />
            <span>地面接收站</span>
          </div>

          <!-- 胶囊 4: 数据中心 (Y ~ 440) -->
          <div class="flex-1 lg:flex-initial px-3 py-2 rounded-lg bg-slate-900/90 border border-slate-700/80 text-cyan-300 text-xs font-bold flex items-center gap-2 shadow-[0_0_10px_rgba(0,0,0,0.5)]">
            <Server class="w-4 h-4 text-cyan-400 shrink-0" />
            <span>数据中心</span>
          </div>
        </div>

        <!-- 右侧拓扑图画板 (精确对应图二的节点样式与连线形态) -->
        <div class="flex-1 min-w-0 relative">
          <!-- 顶部节点统计状态 -->
          <div class="flex items-center gap-4 text-xs font-mono mb-1 px-1">
            <span class="text-cyan-400 flex items-center gap-1.5 font-bold">
              <span class="w-2 h-2 rounded-full bg-cyan-400"></span>
              卫星节点: {{ satelliteNodes.length }} 颗
            </span>
            <span class="text-cyan-400 flex items-center gap-1.5 font-bold">
              <span class="w-2 h-2 rounded-full bg-cyan-400"></span>
              地面站节点: {{ groundStationNodes.length }} 个
            </span>
            <span class="text-blue-400 flex items-center gap-1.5 font-bold">
              <span class="w-2 h-2 rounded-full bg-blue-500"></span>
              数据中心: 1 个
            </span>
          </div>

          <!-- SVG 拓扑网络图谱 -->
          <div class="w-full h-[500px] overflow-hidden relative">
            <svg
              viewBox="0 0 1000 500"
              class="w-full h-full select-none"
              preserveAspectRatio="xMidYMid meet"
            >
              <defs>
                <!-- 红色光晕 -->
                <filter id="red-glow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <!-- 青色光晕 -->
                <filter id="cyan-glow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <!-- 蓝色光晕 -->
                <filter id="blue-glow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              <!-- ================= 1. 连线层：卫星 -> 中继卫星 (Level 1 -> Level 2) ================= -->
              <g class="sat-to-relay-edges">
                <template v-for="sat in satelliteNodes" :key="'e-sat-' + sat.id">
                  <!-- 连线路径 -->
                  <path
                    :d="`M ${sat.x} 78 C ${sat.x} 125, ${relayNode.x} 125, ${relayNode.x} 163`"
                    fill="none"
                    :stroke="isSatActive(sat.id) ? '#00f0ff' : '#94a3b8'"
                    :stroke-width="isSatActive(sat.id) ? 2.5 : 1.2"
                    :stroke-dasharray="isSatActive(sat.id) ? '6, 6' : '4, 4'"
                    :stroke-opacity="isSatActive(sat.id) ? 0.95 : 0.35"
                    :class="{ 'animate-flow-dash': isSatActive(sat.id) }"
                  />
                  <!-- 高亮流动光子包 -->
                  <circle
                    v-if="isSatActive(sat.id)"
                    r="3.5"
                    fill="#00f0ff"
                    filter="url(#cyan-glow)"
                  >
                    <animateMotion
                      :path="`M ${sat.x} 78 C ${sat.x} 125, ${relayNode.x} 125, ${relayNode.x} 163`"
                      dur="1.5s"
                      repeatCount="indefinite"
                    />
                  </circle>
                </template>
              </g>

              <!-- ================= 2. 连线层：中继卫星 -> 12 个地面站 (Level 2 -> Level 3) ================= -->
              <g class="relay-to-gs-edges">
                <template v-for="gs in groundStationNodes" :key="'e-relay-' + gs.id">
                  <!-- 连线路径 (呈优雅扇面展开) -->
                  <path
                    :d="`M ${relayNode.x} 187 C ${relayNode.x} 250, ${gs.x} 250, ${gs.x} 310`"
                    fill="none"
                    :stroke="isStationActiveForCurrentSat(gs) ? '#00f0ff' : '#64748b'"
                    :stroke-width="isStationActiveForCurrentSat(gs) ? 2 : 1"
                    :stroke-dasharray="isStationActiveForCurrentSat(gs) ? '6, 6' : '3, 3'"
                    :stroke-opacity="isStationActiveForCurrentSat(gs) ? 0.9 : 0.25"
                    :class="{ 'animate-flow-dash': isStationActiveForCurrentSat(gs) }"
                  />
                  <!-- 光流流动粒子 -->
                  <circle
                    v-if="isStationActiveForCurrentSat(gs) && topologyDisplayMode === 'SINGLE'"
                    r="3"
                    fill="#38bdf8"
                    filter="url(#cyan-glow)"
                  >
                    <animateMotion
                      :path="`M ${relayNode.x} 187 C ${relayNode.x} 250, ${gs.x} 250, ${gs.x} 310`"
                      dur="1.8s"
                      repeatCount="indefinite"
                    />
                  </circle>
                </template>
              </g>

              <!-- ================= 3. 连线层：12 个地面站 -> 数据中心 (Level 3 -> Level 4) ================= -->
              <g class="gs-to-dc-edges">
                <template v-for="gs in groundStationNodes" :key="'e-dc-' + gs.id">
                  <!-- 连线路径 (聚拢下行) -->
                  <path
                    :d="`M ${gs.x} 360 C ${gs.x} 405, ${dataCenterNode.x} 405, ${dataCenterNode.x} 432`"
                    fill="none"
                    :stroke="isStationActiveForCurrentSat(gs) ? '#38bdf8' : '#475569'"
                    :stroke-width="isStationActiveForCurrentSat(gs) ? 2 : 1"
                    :stroke-dasharray="isStationActiveForCurrentSat(gs) ? '6, 6' : '3, 3'"
                    :stroke-opacity="isStationActiveForCurrentSat(gs) ? 0.85 : 0.2"
                    :class="{ 'animate-flow-dash': isStationActiveForCurrentSat(gs) }"
                  />
                </template>
              </g>

              <!-- ================= 4. Level 1 节点：侦察卫星 (红色圆环 ⭕) ================= -->
              <g class="satellite-nodes">
                <g
                  v-for="sat in satelliteNodes"
                  :key="sat.id"
                  class="cursor-pointer group"
                  @click="handleSelectSatellite(sat.id)"
                >
                  <!-- 外部呼吸光晕 -->
                  <circle
                    :cx="sat.x"
                    :cy="sat.y"
                    :r="isSatActive(sat.id) ? 17 : 14"
                    fill="none"
                    :stroke="isSatActive(sat.id) ? '#00f0ff' : '#ef4444'"
                    :stroke-width="isSatActive(sat.id) ? 2.5 : 1.5"
                    :stroke-opacity="isSatActive(sat.id) ? 0.9 : 0.4"
                    :filter="isSatActive(sat.id) ? 'url(#cyan-glow)' : 'url(#red-glow)'"
                  />
                  <!-- 核心红色圆环 -->
                  <circle
                    :cx="sat.x"
                    :cy="sat.y"
                    r="10"
                    fill="#040a16"
                    :stroke="isSatActive(sat.id) ? '#00f0ff' : '#ef4444'"
                    stroke-width="2.5"
                  />
                  <!-- 中心发光点 -->
                  <circle
                    :cx="sat.x"
                    :cy="sat.y"
                    r="4"
                    :fill="isSatActive(sat.id) ? '#00f0ff' : '#ef4444'"
                  />
                  <!-- 文字标签 -->
                  <text
                    :x="sat.x"
                    :y="sat.y + 26"
                    text-anchor="middle"
                    :fill="isSatActive(sat.id) ? '#00f0ff' : '#f8fafc'"
                    font-size="11"
                    font-weight="bold"
                    font-family="monospace"
                  >
                    {{ sat.code }}
                  </text>
                  <text
                    :x="sat.x"
                    :y="sat.y + 38"
                    text-anchor="middle"
                    fill="#94a3b8"
                    font-size="9"
                    font-family="monospace"
                  >
                    {{ sat.alias }}
                  </text>
                </g>
              </g>

              <!-- ================= 5. Level 2 节点：中继卫星 (红色菱形 ◆) ================= -->
              <g class="relay-node">
                <!-- 菱形外发光 -->
                <polygon
                  :points="`${relayNode.x},${relayNode.y - 14} ${relayNode.x + 14},${relayNode.y} ${relayNode.x},${relayNode.y + 14} ${relayNode.x - 14},${relayNode.y}`"
                  fill="#040a16"
                  stroke="#ef4444"
                  stroke-width="2.5"
                  filter="url(#red-glow)"
                />
                <!-- 内部中心红点 -->
                <circle
                  :cx="relayNode.x"
                  :cy="relayNode.y"
                  r="3"
                  fill="#ef4444"
                />
                <!-- 标签 -->
                <text
                  :x="relayNode.x"
                  :y="relayNode.y + 26"
                  text-anchor="middle"
                  fill="#f8fafc"
                  font-size="11"
                  font-weight="bold"
                  font-family="monospace"
                >
                  {{ relayNode.code }}
                </text>
              </g>

              <!-- ================= 6. Level 3 节点：12 个地面接收站 (青色三角形 ▲) ================= -->
              <g class="ground-station-nodes">
                <g
                  v-for="gs in groundStationNodes"
                  :key="gs.id"
                  class="cursor-pointer group"
                >
                  <!-- 三角形图标 -->
                  <polygon
                    :points="`${gs.x},${gs.y - 12} ${gs.x + 10},${gs.y + 8} ${gs.x - 10},${gs.y + 8}`"
                    fill="#040a16"
                    :stroke="isStationActiveForCurrentSat(gs) ? '#00f0ff' : '#475569'"
                    :stroke-width="isStationActiveForCurrentSat(gs) ? 2.5 : 1.5"
                    :filter="isStationActiveForCurrentSat(gs) ? 'url(#cyan-glow)' : 'none'"
                  />
                  <!-- 地面站中文名称 -->
                  <text
                    :x="gs.x"
                    :y="gs.y + 22"
                    text-anchor="middle"
                    :fill="isStationActiveForCurrentSat(gs) ? '#f8fafc' : '#94a3b8'"
                    font-size="9"
                    font-weight="bold"
                    font-family="sans-serif"
                  >
                    {{ gs.name }}
                  </text>
                  <!-- 窗口时间 -->
                  <text
                    :x="gs.x"
                    :y="gs.y + 34"
                    text-anchor="middle"
                    :fill="isStationActiveForCurrentSat(gs) ? '#38bdf8' : '#64748b'"
                    font-size="8"
                    font-family="monospace"
                  >
                    {{ gs.window }}
                  </text>
                </g>
              </g>

              <!-- ================= 7. Level 4 节点：数据中心 (蓝色矩形 ■) ================= -->
              <g class="data-center-node">
                <!-- 方形图标 -->
                <rect
                  :x="dataCenterNode.x - 14"
                  :y="dataCenterNode.y - 14"
                  width="28"
                  height="28"
                  fill="#040a16"
                  stroke="#3b82f6"
                  stroke-width="2.5"
                  rx="3"
                  filter="url(#blue-glow)"
                />
                <rect
                  :x="dataCenterNode.x - 6"
                  :y="dataCenterNode.y - 6"
                  width="12"
                  height="12"
                  fill="#3b82f6"
                  opacity="0.8"
                />
                <!-- 标签 -->
                <text
                  :x="dataCenterNode.x"
                  :y="dataCenterNode.y + 28"
                  text-anchor="middle"
                  fill="#f8fafc"
                  font-size="11"
                  font-weight="bold"
                  font-family="sans-serif"
                >
                  {{ dataCenterNode.name }}
                </text>
              </g>
            </svg>
          </div>
        </div>
      </div>

      <!-- 底部当前选定链路的实时流水状态牌 -->
      <div class="p-3 rounded bg-slate-950/90 border border-cyan-500/40 shadow-[0_0_15px_rgba(6,182,212,0.15)] flex flex-wrap items-center justify-between gap-3 text-xs">
        <div class="flex items-center gap-2">
          <Zap class="w-4 h-4 text-cyan-400 animate-pulse" />
          <span class="text-tactical-muted">当前聚焦链路:</span>
          <span class="text-tactical-cyan font-bold font-mono">
            {{ currentSelectedSatellite.name }} → TDRS-11/13 中继 → 地面测控阵列 → 亚马逊AWS北美云集群
          </span>
        </div>
        <div class="flex items-center gap-4 text-tactical-muted text-[11px] font-mono">
          <span>下行速率: <strong class="text-amber-400">{{ activeDataLink.dataRateMbps }} Mbps</strong></span>
          <span>总时延: <strong class="text-emerald-400">{{ activeDataLink.latencyMs }} ms</strong></span>
          <span class="text-cyan-300 font-bold">
            状态: {{ activeDataLink.status === 'JAMMED' ? '受干扰压制' : '链路全通' }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@keyframes flowDash {
  to {
    stroke-dashoffset: -24;
  }
}
.animate-flow-dash {
  animation: flowDash 1.2s linear infinite;
}
</style>
