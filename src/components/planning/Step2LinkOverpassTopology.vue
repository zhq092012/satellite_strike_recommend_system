<script setup lang="ts">
/**
 * @fileoverview 作战计划向导 - 第二步：分析链路时长与四层空间数据链路拓扑 (Step2LinkOverpassTopology.vue)
 * 展示过境时间与地面站可见仰角计算推导公式、过境时长门限筛选器、筛选结果候选卫星列表，
 * 并支持用户点击任意候选卫星，动态联动切换并聚焦呈现该卫星专属的四层立体传输数据链路：
 * 第一层：目标卫星 -> 第二层：中继卫星 -> 第三层：地面站 -> 第四层：数据中心
 */

import { ref, onMounted, onUnmounted, watch, computed, nextTick } from 'vue'
import {
  Clock,
  Network,
  Sliders,
  CheckCircle2,
  Share2,
  Sparkles
} from 'lucide-vue-next'
import { Graph } from '@antv/g6'
import { useCombatPlanState } from '../../composables/useCombatPlanState'
import { useTacticalAssetsState } from '../../composables/useTacticalAssetsState'
import { useSatelliteState } from '../../composables/useSatelliteState'
import type { DataLink } from '../../types/tacticalAssets'

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
const { dataLinks, groundStations, dataCenters } = useTacticalAssetsState()
const { satellites } = useSatelliteState()

/**
 * 拓扑图展示模式：'SINGLE' (单星专属链路聚焦) | 'ALL' (全网四层总览)
 */
const topologyDisplayMode = ref<'SINGLE' | 'ALL'>('SINGLE')

/**
 * G6 渲染容器 DOM 引用
 */
const g6Container = ref<HTMLDivElement | null>(null)

/**
 * G6 图实例句柄
 */
let graphInstance: Graph | null = null

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
const activeDataLink = computed<DataLink | null>(() => {
  const sat = currentSelectedSatellite.value
  if (!sat) return null

  // 匹配数据链路中 sourceSatelliteId 为当前卫星的链路
  const match = dataLinks.value.find((l) => l.sourceSatelliteId === sat.id)
  if (match) return match

  // 若无直接记录，提供兜底安全链路模型
  return {
    id: `DL-AUTO-${sat.id}`,
    name: `${sat.name.split(' ')[0]} 战区战术回传综合链路`,
    topologyType: sat.telemetry.altitude > 1000 ? ('RELAY' as any) : ('DIRECT' as any),
    sourceSatelliteId: sat.id,
    relaySatelliteId: sat.telemetry.altitude > 1000 ? 'SAT-TDRS-13' : undefined,
    groundStationId: 'GS-GUAM-ANDERSEN',
    dataCenterId: 'DC-JIOC-HAWAII',
    status: 'ACTIVE' as any,
    dataRateMbps: 1200,
    latencyMs: sat.linkLatencyMs ?? 110,
    description: `${sat.name} 过境可见时间窗内向第一/第二岛链战区情报网注入遥感/通信数据`,
    createdAt: new Date().toISOString()
  }
})

/**
 * 当前链路所途经的地面站对象
 */
const activeGroundStation = computed(() => {
  if (!activeDataLink.value) return null
  return groundStations.value.find((g) => g.id === activeDataLink.value?.groundStationId) || groundStations.value[0]
})

/**
 * 当前链路所途经的中继卫星对象 (若有)
 */
const activeRelaySatellite = computed(() => {
  if (!activeDataLink.value?.relaySatelliteId) return null
  return satellites.value.find((s) => s.id === activeDataLink.value?.relaySatelliteId) || null
})

/**
 * 当前链路终点数据中心对象
 */
const activeDataCenter = computed(() => {
  if (!activeDataLink.value) return null
  return dataCenters.value.find((d) => d.id === activeDataLink.value?.dataCenterId) || dataCenters.value[0]
})

/**
 * 四层静态定义元数据 (用于底部结构卡片)
 */
const topologyLayers = [
  {
    layerIndex: 1,
    title: '第一层: 目标卫星',
    subtitle: '源端在轨天基观测与通信节点',
    color: '#ef4444',
    nodes: [
      { id: 'SAT-USA-290', name: 'USA-290 锁眼', desc: 'LEO 402km 光学侦察' },
      { id: 'SAT-WORLDVIEW-3', name: 'WorldView-3', desc: 'LEO 617km 商用高分' },
      { id: 'SAT-STARSHIELD-01', name: 'Starshield-01', desc: 'LEO 550km 星盾军用' },
      { id: 'SAT-STARLINK-30128', name: 'Starlink-30128', desc: 'LEO 540km 星链宽带' },
      { id: 'SAT-USA-326', name: 'USA-326 秘密雷达', desc: 'LEO 512km 合成孔径雷达' }
    ]
  },
  {
    layerIndex: 2,
    title: '第二层: 中继卫星',
    subtitle: '天基高速星间激光/微波中继',
    color: '#00f0ff',
    nodes: [
      { id: 'SAT-TDRS-13', name: 'TDRS-13 跟踪中继', desc: 'GEO 35786km 双Ka天线' }
    ]
  },
  {
    layerIndex: 3,
    title: '第三层: 敌方地面站',
    subtitle: '深空高增益抛物面接收阵列',
    color: '#3b82f6',
    nodes: [
      { id: 'GS-PINE-GAP', name: '松树谷地面站 (澳)', desc: '32米天线 / X+Ka频段' },
      { id: 'GS-GUAM-ANDERSEN', name: '关岛安德森站', desc: '18米天线 / 西太前哨' },
      { id: 'GS-MISAWA-JAPAN', name: '三泽空军站 (日)', desc: '15米天线 / Ka频段' }
    ]
  },
  {
    layerIndex: 4,
    title: '第四层: 数据中心',
    subtitle: '战区与战略联合情报超算枢纽',
    color: '#a855f7',
    nodes: [
      { id: 'DC-JIOC-HAWAII', name: '夏威夷印太联情中心', desc: '450 PFLOPS 绝密超算' },
      { id: 'DC-SCHRIEVER-AFB', name: '施里弗天基作战中枢', desc: '600 PFLOPS 抗核加固' },
      { id: 'DC-CAMP-COURTNEY', name: '冲绳边缘战术微云', desc: '80 PFLOPS 前沿微云' }
    ]
  }
]

/**
 * 点击候选卫星卡片，切换当前选中的卫星链路
 *
 * @param satId - 卫星 ID
 */
function handleSelectSatellite(satId: string): void {
  selectTopologySatellite(satId)
}

/**
 * 初始化 AntV/G6 图实例并挂载
 */
async function initG6Graph(): Promise<void> {
  await nextTick()
  if (!g6Container.value) return

  const container = g6Container.value
  const width = container.clientWidth || 800
  const height = 260

  // 销毁旧实例
  if (graphInstance) {
    graphInstance.destroy()
    graphInstance = null
  }

  const g6Nodes: any[] = []
  const g6Edges: any[] = []

  if (topologyDisplayMode.value === 'SINGLE') {
    // ----------------- 单星专属链路模式 -----------------
    const sat = currentSelectedSatellite.value
    const link = activeDataLink.value
    const relay = activeRelaySatellite.value
    const gs = activeGroundStation.value
    const dc = activeDataCenter.value

    if (sat && link) {
      // 1. 源卫星节点
      g6Nodes.push({
        id: sat.id,
        data: {
          label: sat.name.split(' ')[0],
          sub: `${sat.orbitType} · ${sat.telemetry.altitude.toFixed(0)}km`,
          color: '#ef4444'
        },
        style: {
          x: width * 0.14,
          y: height * 0.5,
          size: [140, 42]
        }
      })

      // 2. 中继层节点
      if (relay) {
        g6Nodes.push({
          id: relay.id,
          data: {
            label: relay.name.split(' ')[0],
            sub: 'GEO 35786km 中继',
            color: '#00f0ff'
          },
          style: {
            x: width * 0.38,
            y: height * 0.5,
            size: [140, 42]
          }
        })

        // 源星 -> 中继星边
        g6Edges.push({
          id: `e-${sat.id}-${relay.id}`,
          source: sat.id,
          target: relay.id,
          data: { label: `星间微波 ${link.dataRateMbps}Mbps` }
        })

        // 中继星 -> 地面站边
        if (gs) {
          g6Edges.push({
            id: `e-${relay.id}-${gs.id}`,
            source: relay.id,
            target: gs.id,
            data: { label: `Ka频段下传 (${link.latencyMs}ms)` }
          })
        }
      } else {
        // 无中继直连：源星 -> 地面站直接连线
        if (gs) {
          g6Edges.push({
            id: `e-${sat.id}-${gs.id}`,
            source: sat.id,
            target: gs.id,
            data: { label: `直连下传 ${link.dataRateMbps}Mbps (${link.latencyMs}ms)` }
          })
        }
      }

      // 3. 地面站节点
      if (gs) {
        g6Nodes.push({
          id: gs.id,
          data: {
            label: gs.name.slice(0, 8),
            sub: `${gs.antennaDiameterM}m 阵列`,
            color: '#3b82f6'
          },
          style: {
            x: width * 0.64,
            y: height * 0.5,
            size: [140, 42]
          }
        })

        // 4. 数据中心节点与边
        if (dc) {
          g6Nodes.push({
            id: dc.id,
            data: {
              label: dc.name.slice(0, 8),
              sub: dc.securityLevel || '情报中枢',
              color: '#a855f7'
            },
            style: {
              x: width * 0.88,
              y: height * 0.5,
              size: [140, 42]
            }
          })

          g6Edges.push({
            id: `e-${gs.id}-${dc.id}`,
            source: gs.id,
            target: dc.id,
            data: { label: '国防专网光缆 (25ms)' }
          })
        }
      }
    }
  } else {
    // ----------------- 全网四层拓扑总览模式 -----------------
    const layerXPositions = [width * 0.12, width * 0.38, width * 0.64, width * 0.88]

    topologyLayers.forEach((layer, lIdx) => {
      const totalInLayer = layer.nodes.length
      const x = layerXPositions[lIdx]

      layer.nodes.forEach((node, nIdx) => {
        const ySpacing = height / (totalInLayer + 1)
        const y = ySpacing * (nIdx + 1)

        const isCurrentActive =
          node.id === currentSelectedSatellite.value?.id ||
          node.id === activeRelaySatellite.value?.id ||
          node.id === activeGroundStation.value?.id ||
          node.id === activeDataCenter.value?.id

        g6Nodes.push({
          id: node.id,
          data: {
            label: node.name,
            sub: node.desc,
            layer: layer.layerIndex,
            color: isCurrentActive ? layer.color : '#475569',
            active: isCurrentActive
          },
          style: {
            x,
            y,
            size: [120, 36]
          }
        })
      })
    })

    // 全量网络边定义
    const allEdges = [
      { id: 'e-wv3-guam', source: 'SAT-WORLDVIEW-3', target: 'GS-GUAM-ANDERSEN', data: { label: '直传 1200Mbps', satId: 'SAT-WORLDVIEW-3' } },
      { id: 'e-guam-hawaii', source: 'GS-GUAM-ANDERSEN', target: 'DC-JIOC-HAWAII', data: { label: '海底光纤', satId: 'SAT-WORLDVIEW-3' } },
      { id: 'e-kh-tdrs', source: 'SAT-USA-290', target: 'SAT-TDRS-13', data: { label: '星间中继 850Mbps', satId: 'SAT-USA-290' } },
      { id: 'e-tdrs-pine', source: 'SAT-TDRS-13', target: 'GS-PINE-GAP', data: { label: 'Ka频段下行', satId: 'SAT-USA-290' } },
      { id: 'e-pine-schriever', source: 'GS-PINE-GAP', target: 'DC-SCHRIEVER-AFB', data: { label: '国防专网', satId: 'SAT-USA-290' } },
      { id: 'e-starlink-misawa', source: 'SAT-STARLINK-30128', target: 'GS-MISAWA-JAPAN', data: { label: 'Ku下行(干扰)', satId: 'SAT-STARLINK-30128' } },
      { id: 'e-misawa-courtney', source: 'GS-MISAWA-JAPAN', target: 'DC-CAMP-COURTNEY', data: { label: '第一岛链干线', satId: 'SAT-STARLINK-30128' } },
      { id: 'e-starshield-guam', source: 'SAT-STARSHIELD-01', target: 'GS-GUAM-ANDERSEN', data: { label: '星盾加密', satId: 'SAT-STARSHIELD-01' } },
      { id: 'e-u326-tdrs', source: 'SAT-USA-326', target: 'SAT-TDRS-13', data: { label: '雷达中继', satId: 'SAT-USA-326' } }
    ]

    allEdges.forEach((edge) => {
      const isEdgeActive = edge.data?.satId === currentSelectedSatellite.value?.id
      g6Edges.push({
        ...edge,
        data: {
          ...edge.data,
          active: isEdgeActive
        }
      })
    })
  }

  try {
    graphInstance = new Graph({
      container,
      width,
      height,
      autoFit: 'view',
      data: {
        nodes: g6Nodes,
        edges: g6Edges
      },
      node: {
        type: 'rect',
        style: {
          radius: 4,
          fill: '#0f172a',
          stroke: (d: any) => d.data?.color || '#00f0ff',
          lineWidth: (d: any) => (d.data?.active !== false ? 2 : 1),
          labelText: (d: any) => `${d.data?.label || d.id}`,
          labelFill: (d: any) => (d.data?.active !== false ? '#f1f5f9' : '#64748b'),
          labelFontSize: 11,
          labelFontFamily: 'monospace',
          labelFontWeight: 'bold'
        }
      },
      edge: {
        type: 'line',
        style: {
          stroke: (d: any) => (d.data?.active !== false ? '#00f0ff' : '#334155'),
          lineWidth: (d: any) => (d.data?.active !== false ? 2 : 1),
          strokeOpacity: (d: any) => (d.data?.active !== false ? 0.9 : 0.4),
          labelText: (d: any) => `${d.data?.label || ''}`,
          labelFill: (d: any) => (d.data?.active !== false ? '#38bdf8' : '#475569'),
          labelFontSize: 9,
          labelFontFamily: 'monospace',
          endArrow: true
        }
      },
      behaviors: ['drag-canvas', 'zoom-canvas']
    })

    await graphInstance.render()
  } catch (err) {
    console.warn('G6 Canvas 初始化降级为高清军工拓扑视图:', err)
  }
}

onMounted(() => {
  initG6Graph()
  window.addEventListener('resize', initG6Graph)
})

onUnmounted(() => {
  window.removeEventListener('resize', initG6Graph)
  if (graphInstance) {
    graphInstance.destroy()
    graphInstance = null
  }
})

// 监听选中卫星、展示模式及门限变化，动态重绘拓扑
watch([selectedTopologySatelliteId, topologyDisplayMode, maxLinkDurationThreshold], () => {
  initG6Graph()
})
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

      <!-- 核心物理公式面板 (真实排版数学公式) -->
      <div class="p-3.5 sm:p-4 rounded bg-slate-950/80 border border-tactical-cyan/50 text-center space-y-2 shadow-[0_0_15px_rgba(6,182,212,0.15)]">
        <div class="flex items-center justify-center flex-wrap gap-y-2 font-serif text-tactical-cyan text-base sm:text-xl font-bold tracking-normal select-text">
          <!-- Δt_pass -->
          <span>Δ<i class="italic">t</i><sub class="text-xs font-sans">过境</sub></span>
          <span class="mx-2 text-slate-300 font-sans">=</span>

          <!-- (2 Re) / v_sat -->
          <span class="inline-flex flex-col items-center justify-center text-xs sm:text-sm align-middle">
            <span class="border-b border-tactical-cyan/60 px-1.5 pb-0.5 leading-none">
              2 <i class="italic">R</i><sub class="text-[10px] font-sans">e</sub>
            </span>
            <span class="px-1.5 pt-0.5 leading-none">
              <i class="italic">v</i><sub class="text-[10px] font-sans">sat</sub>
            </span>
          </span>

          <span class="mx-1.5 text-slate-400">·</span>

          <!-- arccos( (Re * cos ε_min) / (Re + H) ) -->
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
        若其无法直连第一岛链地面站，则必须依赖 <span class="text-cyan-300 font-bold">TDRS-13</span> 等静止轨中继星构建跨洋转发链路。
        在过境窗口期实施动能阻击或高功率干扰，可使敌方战场侦察情报出现不可逆的时效断裂。
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

    <!-- 3. 筛选出的短过境时长卫星结果（【核心交互】：点击任意卡片即可切换下方展示链路） -->
    <div class="p-3.5 rounded bg-tactical-dark/70 border border-tactical-border/80">
      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center gap-2">
          <CheckCircle2 class="w-4 h-4 text-tactical-green" />
          <h3 class="text-xs font-bold tracking-wider text-tactical-text">
            过境时长筛选结果 (共 {{ step2Candidates.length }} 颗候选卫星 · 点击任意卫星切换链路拓扑)
          </h3>
        </div>
        <span class="text-[10px] text-tactical-cyan font-bold flex items-center gap-1">
          <Sparkles class="w-3.5 h-3.5 animate-pulse" />
          <span>点击卡片联动下方拓扑</span>
        </span>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2.5">
        <div
          v-for="sat in step2Candidates"
          :key="sat.id"
          @click="handleSelectSatellite(sat.id)"
          :class="[
            'p-2.5 rounded transition-all cursor-pointer relative',
            selectedTopologySatelliteId === sat.id
              ? 'bg-cyan-950/80 border-2 border-cyan-400 shadow-[0_0_18px_rgba(6,182,212,0.45)] ring-1 ring-cyan-300 scale-[1.02]'
              : 'bg-tactical-bg/90 border border-tactical-border/80 hover:border-cyan-400/80 hover:bg-slate-900/60'
          ]"
        >
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold text-tactical-text truncate">{{ sat.name.split(' ')[0] }}</span>
            <span
              :class="[
                'text-[9px] px-1.5 py-0.5 rounded font-bold border',
                selectedTopologySatelliteId === sat.id
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
            <span>链路时延: <strong class="text-cyan-300">{{ sat.linkLatencyMs }}ms</strong></span>
            <span
              v-if="selectedTopologySatelliteId === sat.id"
              class="text-cyan-300 font-black flex items-center gap-1"
            >
              <span class="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping"></span>
              <span>当前选定链路 ✓</span>
            </span>
            <span v-else class="text-slate-500">点击查看链路 →</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 4. 【核心展示区】当前选中卫星专属四层空间数据链路全景看板与拓扑图 -->
    <div class="p-3.5 rounded bg-tactical-dark/70 border border-tactical-cyan/40 shadow-tactical-panel space-y-3">
      <!-- 拓扑头部：聚焦状态与视图模式切换 -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-tactical-border/60 pb-2.5">
        <div class="flex items-center gap-2">
          <Network class="w-4 h-4 text-tactical-cyan animate-pulse" />
          <div class="flex items-center gap-2">
            <h3 class="text-xs font-bold tracking-wider text-tactical-text uppercase">
              四层立体空间数据链路拓扑
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
              'px-2.5 py-1 rounded text-[10px] font-bold transition-all border',
              topologyDisplayMode === 'SINGLE'
                ? 'bg-cyan-500/25 border-cyan-400 text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                : 'bg-slate-900 border-tactical-border text-tactical-muted hover:text-tactical-text'
            ]"
          >
            单星专属链路
          </button>
          <button
            @click="topologyDisplayMode = 'ALL'"
            :class="[
              'px-2.5 py-1 rounded text-[10px] font-bold transition-all border',
              topologyDisplayMode === 'ALL'
                ? 'bg-cyan-500/25 border-cyan-400 text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                : 'bg-slate-900 border-tactical-border text-tactical-muted hover:text-tactical-text'
            ]"
          >
            全网链路总览
          </button>
        </div>
      </div>

      <!-- 专属四层传输路径管道条 (清晰呈现该星完整路径流程) -->
      <div
        v-if="currentSelectedSatellite && activeDataLink"
        class="p-3 rounded bg-slate-950/90 border border-cyan-500/40 shadow-[0_0_15px_rgba(6,182,212,0.15)]"
      >
        <div class="flex items-center justify-between text-[10px] mb-2 text-slate-400">
          <div class="flex items-center gap-2">
            <Share2 class="w-3.5 h-3.5 text-cyan-400" />
            <span class="font-bold text-slate-200">{{ activeDataLink.name }}</span>
          </div>
          <div class="flex items-center gap-3">
            <span>拓扑架构: <strong class="text-cyan-300">{{ activeDataLink.topologyType === 'RELAY' ? '天基星间中继' : '地面站直传' }}</strong></span>
            <span>传输速率: <strong class="text-amber-400">{{ activeDataLink.dataRateMbps }} Mbps</strong></span>
            <span>链路时延: <strong class="text-emerald-400">{{ activeDataLink.latencyMs }} ms</strong></span>
          </div>
        </div>

        <!-- 4-Stage 可视化链路流水线节点卡片 -->
        <div class="grid grid-cols-1 sm:grid-cols-4 gap-2 text-[10px]">
          <!-- 阶段 1: 目标卫星 -->
          <div class="p-2 rounded bg-slate-900/90 border border-red-500/50 relative overflow-hidden">
            <div class="text-[9px] text-red-400 font-bold flex items-center gap-1">
              <span class="w-1.5 h-1.5 rounded-full bg-red-400"></span>
              <span>第一层: 源目标卫星</span>
            </div>
            <div class="text-xs font-bold text-slate-100 mt-1 truncate">
              {{ currentSelectedSatellite.name }}
            </div>
            <div class="text-[9px] text-slate-400 mt-0.5">
              {{ currentSelectedSatellite.orbitType }} · {{ currentSelectedSatellite.telemetry.altitude.toFixed(0) }}km
            </div>
          </div>

          <!-- 阶段 2: 中继卫星 -->
          <div
            :class="[
              'p-2 rounded border relative overflow-hidden',
              activeRelaySatellite
                ? 'bg-slate-900/90 border-cyan-500/50 text-cyan-300'
                : 'bg-slate-900/50 border-slate-700/60 text-slate-500'
            ]"
          >
            <div class="text-[9px] font-bold flex items-center gap-1">
              <span
                class="w-1.5 h-1.5 rounded-full"
                :class="activeRelaySatellite ? 'bg-cyan-400' : 'bg-slate-600'"
              ></span>
              <span>第二层: 空间中继星</span>
            </div>
            <div class="text-xs font-bold text-slate-100 mt-1 truncate">
              {{ activeRelaySatellite ? activeRelaySatellite.name : '直连地面免中继' }}
            </div>
            <div class="text-[9px] text-slate-400 mt-0.5">
              {{ activeRelaySatellite ? 'GEO 35786km 双Ka天线' : '地面可见角直传第一岛链' }}
            </div>
          </div>

          <!-- 阶段 3: 敌方地面站 -->
          <div class="p-2 rounded bg-slate-900/90 border border-blue-500/50 relative overflow-hidden">
            <div class="text-[9px] text-blue-400 font-bold flex items-center gap-1">
              <span class="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
              <span>第三层: 地面接收站</span>
            </div>
            <div class="text-xs font-bold text-slate-100 mt-1 truncate">
              {{ activeGroundStation?.name || '关岛安德森地面站' }}
            </div>
            <div class="text-[9px] text-slate-400 mt-0.5">
              {{ activeGroundStation?.country || '西太战区' }} · {{ activeGroundStation?.antennaDiameterM || 18 }}m 阵列
            </div>
          </div>

          <!-- 阶段 4: 数据中心 -->
          <div class="p-2 rounded bg-slate-900/90 border border-purple-500/50 relative overflow-hidden">
            <div class="text-[9px] text-purple-400 font-bold flex items-center gap-1">
              <span class="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
              <span>第四层: 战略数据中心</span>
            </div>
            <div class="text-xs font-bold text-slate-100 mt-1 truncate">
              {{ activeDataCenter?.name || '夏威夷印太联情中心' }}
            </div>
            <div class="text-[9px] text-slate-400 mt-0.5">
              {{ activeDataCenter?.securityLevel || '绝密级' }} · 算力超算枢纽
            </div>
          </div>
        </div>
      </div>

      <!-- AntV/G6 动态 Canvas 挂载容器 -->
      <div
        ref="g6Container"
        class="w-full h-[260px] rounded bg-[#070d1a] border border-tactical-border/80 overflow-hidden relative"
      >
        <!-- 拓扑交互提示水印 -->
        <div class="absolute bottom-2 right-2 text-[9px] text-tactical-muted font-mono pointer-events-none bg-black/60 px-2 py-0.5 rounded border border-tactical-border/40">
          支持鼠标拖拽平移与滚轮缩放画布
        </div>
      </div>

      <!-- 四层链路结构说明表格卡片 -->
      <div class="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
        <div
          v-for="layer in topologyLayers"
          :key="layer.layerIndex"
          class="p-2.5 rounded bg-tactical-bg/90 border border-tactical-border"
        >
          <div class="flex items-center gap-1.5 mb-1">
            <span
              class="w-2 h-2 rounded-full"
              :style="{ backgroundColor: layer.color }"
            ></span>
            <span class="text-xs font-bold text-tactical-text">{{ layer.title }}</span>
          </div>
          <p class="text-[9px] text-tactical-muted mb-2">{{ layer.subtitle }}</p>

          <div class="space-y-1">
            <div
              v-for="item in layer.nodes"
              :key="item.id"
              :class="[
                'p-1.5 rounded border text-[9px] transition-all',
                item.id === currentSelectedSatellite?.id ||
                item.id === activeRelaySatellite?.id ||
                item.id === activeGroundStation?.id ||
                item.id === activeDataCenter?.id
                  ? 'bg-cyan-950/50 border-cyan-400 font-bold text-cyan-200 shadow-[0_0_8px_rgba(6,182,212,0.3)]'
                  : 'bg-tactical-dark/60 border-tactical-border/40 text-tactical-muted'
              ]"
            >
              <div class="flex items-center justify-between">
                <span>{{ item.name }}</span>
                <span
                  v-if="
                    item.id === currentSelectedSatellite?.id ||
                    item.id === activeRelaySatellite?.id ||
                    item.id === activeGroundStation?.id ||
                    item.id === activeDataCenter?.id
                  "
                  class="text-cyan-400 font-bold"
                >
                  ● 途经
                </span>
              </div>
              <div class="text-[8px] opacity-70">{{ item.desc }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
