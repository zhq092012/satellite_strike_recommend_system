/**
 * @fileoverview 作战计划决策向导全局响应式状态管理 Composable (Vue 3 Composition API)
 * 提供 6 步闭环式作战计划推演控制：
 * 步骤 1：分析威胁度（多属性加权算法与门限筛选）
 * 步骤 2：分析链路时长与四层拓扑（过境与下传窗口推导、AntV/G6 四层空间数据链路拓扑）
 * 步骤 3：分析覆盖率（视场角与重叠覆盖率几何模型）
 * 步骤 4：分析可打击度（武器射高包络、Pk 杀伤概率与窗口评估）
 * 步骤 5：优先级链路匹配武器与战术甘特图（时序推演与火力分配）
 * 步骤 6：生成打击方案并保存与导出（同步至作战任务库、导出 JSON 与 Markdown 战术方案简报）
 */

import { ref, computed } from 'vue'
import { Satellite, SatelliteCategory } from '../types/satellite'
import { WeaponSystem, DataLink, WeaponType } from '../types/tacticalAssets'
import { useSatelliteState } from './useSatelliteState'
import { useTacticalAssetsState } from './useTacticalAssetsState'
import { useBattlefieldState } from './useBattlefieldState'
import {
  MissionStatus,
  MissionPriority,
  PoliticalRedLine,
  TargetSatelliteType,
  CombatMission
} from '../types/battlefield'

/**
 * 六步作战计划当前所处阶段枚举
 */
export enum CombatPlanStep {
  /** 步骤 1：分析威胁度 */
  THREAT_ANALYSIS = 1,
  /** 步骤 2：分析链路时长与四层拓扑 */
  LINK_TOPOLOGY = 2,
  /** 步骤 3：分析覆盖率 */
  COVERAGE_ANALYSIS = 3,
  /** 步骤 4：分析可打击度 */
  STRIKE_FEASIBILITY = 4,
  /** 步骤 5：优先级链路匹配武器与甘特图 */
  WEAPON_MATCHING = 5,
  /** 步骤 6：生成打击方案并保存导出 */
  PLAN_EXPORT = 6
}

/**
 * 甘特图战术时序单项事件接口
 */
export interface GanttTaskItem {
  /** 任务条唯一编号 */
  id: string
  /** 关联的链路或目标名称 */
  name: string
  /** 分配的武器装备名称 */
  weaponName: string
  /** 分配的武器分类 */
  weaponType: WeaponType
  /** 行动阶段名称 (如：雷达截获、火控瞄准、高能照射、战损评估) */
  phaseName: string
  /** 阶段起始时间偏移 (相对于 T+00:00，单位：分钟) */
  startMinute: number
  /** 阶段持续时长 (单位：分钟) */
  durationMinute: number
  /** 时序条渲染高亮色 */
  color: string
}

/**
 * 优先级链路武器匹配方案记录接口
 */
export interface MatchedWeaponPlan {
  /** 匹配序号 */
  index: number
  /** 目标空间数据链路 */
  link: DataLink
  /** 源端目标卫星 */
  targetSatellite: Satellite
  /** 综合优先级得分 (0 - 100) */
  priorityScore: number
  /** 推荐分配的最佳武器系统 */
  recommendedWeapon: WeaponSystem
  /** 预期单发杀伤概率 (Pk, 百分比) */
  expectedPk: number
  /** 打击机理战术说明 */
  tacticalRationale: string
  /** 该链路对应的甘特图战术时序事件队列 */
  timelineTasks: GanttTaskItem[]

  // ================= 打击前后战术对比指标 =================
  /** 打击前目标卫星威胁度得分 (0 - 100) */
  beforeThreatScore: number
  /** 打击后目标卫星威胁度残余得分 (0 - 100) */
  afterThreatScore: number
  /** 威胁度净削减分值 */
  threatReduction: number
  /** 威胁度削减降幅百分比 */
  threatReductionPercent: number

  /** 打击前视场覆盖率 (0 - 100%) */
  beforeCoverageRate: number
  /** 打击后残余覆盖率 (0 - 100%) */
  afterCoverageRate: number
  /** 覆盖率萎缩/黑洞剥夺百分比 */
  coverageReductionPercent: number

  /** 打击前正常传输时延 (ms) */
  beforeLatencyMs: number
  /** 打击后恶化重传传输时延 (ms) */
  afterLatencyMs: number
  /** 净增加的传输时延 (ms，正值表示恶化激增) */
  addedLatencyMs: number
  /** 打击前后战术效能压制综述说明 */
  tacticalOutcomeSummary: string
}

/**
 * 宏观打击前后综合战效汇总指标接口
 */
export interface CombatImpactOverview {
  /** 打击前平均威胁度 */
  avgThreatBefore: number
  /** 打击后平均残存威胁度 */
  avgThreatAfter: number
  /** 威胁度总体削减率 (%) */
  totalThreatReductionPercent: number

  /** 打击前平均覆盖率 (%) */
  avgCoverageBefore: number
  /** 打击后平均覆盖率 (%) */
  avgCoverageAfter: number
  /** 覆盖盲区撕裂扩展率 (%) */
  coverageDropPercent: number

  /** 打击前平均传输时延 (ms) */
  avgLatencyBefore: number
  /** 打击后平均传输时延 (ms) */
  avgLatencyAfter: number
  /** 平均净增加的传输时延 (ms) */
  avgAddedLatencyMs: number
  /** 传输时延恶化激增倍数 */
  latencySurgeRatio: number
}

/**
 * 模态框是否展开显示
 */
const isCombatPlanModalOpen = ref<boolean>(false)

/**
 * 当前所处的向导步骤 (1 到 6)
 */
const currentStep = ref<CombatPlanStep>(CombatPlanStep.THREAT_ANALYSIS)

// =================== 步骤 1：威胁度分析参数 ===================
/** 步骤 1：威胁度门限筛选阈值 (0 - 100 分) */
const threatFilterThreshold = ref<number>(85)
/** 载荷威胁指标权重系数 */
const wPayload = ref<number>(0.35)
/** 轨道高度近度权重系数 */
const wOrbit = ref<number>(0.25)
/** 重访频次权重系数 */
const wRevisit = ref<number>(0.20)
/** 战略价值权重系数 */
const wStrategy = ref<number>(0.20)

// =================== 步骤 2：链路时长与拓扑参数 ===================
/** 步骤 2：最大过境下传时间筛选阈值 (单位：秒，例如筛选短于该时长的过境卫星) */
const maxLinkDurationThreshold = ref<number>(600)
/** 当前拓扑图中选中的高亮链路 ID */
const selectedTopologyLinkId = ref<string>('DL-01')
/** 步骤 2：当前拓扑图聚焦展示的目标卫星 ID (默认选中第 1 颗 SAT-USA-290) */
const selectedTopologySatelliteId = ref<string>('SAT-USA-290')

// =================== 步骤 3：覆盖率分析参数 ===================
/** 步骤 3：最低有效覆盖率筛选阈值 (0 - 100 %) */
const minCoverageThreshold = ref<number>(75)

// =================== 步骤 4：可打击度分析参数 ===================
/** 步骤 4：最低可打击度评分筛选阈值 (0 - 100 分) */
const minStrikeFeasibilityThreshold = ref<number>(80)

// =================== 步骤 6：打击方案生成参数 ===================
/** 作战行动代号名称 */
const combatPlanCode = ref<string>('OP-HEAVEN-PIERCE-2026')
/** 作战方案代号名称 */
const combatPlanTitle = ref<string>('破天演武·多源天基信息网联合反制打击方案')
/** 方案备注与首长决心 */
const combatPlanRemarks = ref<string>(
  '针对进入战区上空的敌方重点光学/雷达侦察与低轨通信节点，集中动能、激光与超宽带电子干扰优势兵力，实施多跳数据链路硬摧毁与软压制，彻底阻断其态势回传链条。'
)
/** 保存成功提示显隐状态 */
const isSaveSuccess = ref<boolean>(false)

/**
 * 全局作战计划状态管理 Composable
 *
 * @returns 作战计划各步骤状态、算法模型、候选过滤结果与交互方法
 */
export function useCombatPlanState() {
  const { satellites } = useSatelliteState()
  const { weapons, dataLinks, groundStations, dataCenters } = useTacticalAssetsState()
  const { missions } = useBattlefieldState()

  // ----------------- 步骤 1 计算属性 -----------------
  /**
   * 步骤 1：根据多属性加权算法与筛选门限过滤的目标卫星列表
   */
  const step1Candidates = computed<Satellite[]>(() => {
    return satellites.value.filter((sat) => {
      const score = sat.threatScore ?? 0
      return score >= threatFilterThreshold.value
    })
  })

  // ----------------- 步骤 2 计算属性 -----------------
  /**
   * 步骤 2：根据过境下传时长过滤的卫星列表 (过境时长 <= 门限)
   */
  const step2Candidates = computed<Satellite[]>(() => {
    return satellites.value.filter((sat) => {
      const duration = sat.overpassDurationSec ?? 999999
      return duration <= maxLinkDurationThreshold.value
    })
  })

  /**
   * 步骤 2：用于 AntV/G6 渲染的四层链路节点与边数据集合
   */
  const topologyGraphData = computed(() => {
    interface G6Node {
      id: string
      label: string
      layer: number
      category: string
      status: string
      color: string
      details?: string
    }

    interface G6Edge {
      id: string
      source: string
      target: string
      label?: string
      latency?: number
      status: string
      color: string
    }

    const nodes: G6Node[] = []
    const edges: G6Edge[] = []
    const addedNodeIds = new Set<string>()

    // 遍历数据链路，构造 4 层节点
    dataLinks.value.forEach((link) => {
      // Layer 1: 源卫星
      const srcSat = satellites.value.find((s) => s.id === link.sourceSatelliteId)
      if (srcSat && !addedNodeIds.has(srcSat.id)) {
        nodes.push({
          id: srcSat.id,
          label: srcSat.name.split(' ')[0],
          layer: 1,
          category: 'SOURCE_SATELLITE',
          status: srcSat.status,
          color: srcSat.color || '#ef4444',
          details: `轨道: ${srcSat.orbitType} | 威胁: ${srcSat.threatScore}分`
        })
        addedNodeIds.add(srcSat.id)
      }

      // Layer 2: 空间中继卫星 (若有)
      if (link.relaySatelliteId) {
        const relaySat = satellites.value.find((s) => s.id === link.relaySatelliteId)
        if (relaySat && !addedNodeIds.has(relaySat.id)) {
          nodes.push({
            id: relaySat.id,
            label: relaySat.name.split(' ')[0],
            layer: 2,
            category: 'RELAY_SATELLITE',
            status: relaySat.status,
            color: '#00f0ff',
            details: `中继星: ${relaySat.orbitType} | 覆盖率: ${relaySat.coverageRate}%`
          })
          addedNodeIds.add(relaySat.id)
        }
      }

      // Layer 3: 敌方地面站
      const gs = groundStations.value.find((g) => g.id === link.groundStationId)
      if (gs && !addedNodeIds.has(gs.id)) {
        nodes.push({
          id: gs.id,
          label: gs.name.slice(0, 10),
          layer: 3,
          category: 'GROUND_STATION',
          status: gs.status,
          color: gs.status === 'JAMMED' ? '#f59e0b' : '#3b82f6',
          details: `${gs.country} | 天线: ${gs.antennaDiameterM}m`
        })
        addedNodeIds.add(gs.id)
      }

      // Layer 4: 数据中心
      const dc = dataCenters.value.find((d) => d.id === link.dataCenterId)
      if (dc && !addedNodeIds.has(dc.id)) {
        nodes.push({
          id: dc.id,
          label: dc.name.slice(0, 10),
          layer: 4,
          category: 'DATA_CENTER',
          status: dc.status,
          color: '#a855f7',
          details: `${dc.securityLevel} | 算力: ${dc.computeScale}`
        })
        addedNodeIds.add(dc.id)
      }

      // 构建边连接
      if (link.relaySatelliteId) {
        // 源星 -> 中继星
        edges.push({
          id: `${link.id}-e1`,
          source: link.sourceSatelliteId,
          target: link.relaySatelliteId,
          label: `${link.dataRateMbps}Mbps`,
          latency: Math.round(link.latencyMs * 0.4),
          status: link.status,
          color: link.status === 'JAMMED' ? '#ef4444' : '#00f0ff'
        })
        // 中继星 -> 地面站
        edges.push({
          id: `${link.id}-e2`,
          source: link.relaySatelliteId,
          target: link.groundStationId,
          label: `Ka频段下行`,
          latency: Math.round(link.latencyMs * 0.4),
          status: link.status,
          color: link.status === 'JAMMED' ? '#ef4444' : '#3b82f6'
        })
      } else {
        // 直连: 源星 -> 地面站
        edges.push({
          id: `${link.id}-e-direct`,
          source: link.sourceSatelliteId,
          target: link.groundStationId,
          label: `${link.dataRateMbps}Mbps`,
          latency: Math.round(link.latencyMs * 0.6),
          status: link.status,
          color: link.status === 'JAMMED' ? '#ef4444' : '#00f0ff'
        })
      }

      // 地面站 -> 数据中心 (专线光缆)
      edges.push({
        id: `${link.id}-e3`,
        source: link.groundStationId,
        target: link.dataCenterId,
        label: `海底光缆`,
        latency: Math.round(link.latencyMs * 0.2),
        status: link.status,
        color: '#8b5cf6'
      })
    })

    return { nodes, edges }
  })

  // ----------------- 步骤 3 计算属性 -----------------
  /**
   * 步骤 3：根据覆盖率阈值筛选出的卫星列表 (覆盖率 >= 门限)
   */
  const step3Candidates = computed<Satellite[]>(() => {
    return satellites.value.filter((sat) => {
      const cov = sat.coverageRate ?? 0
      return cov >= minCoverageThreshold.value
    })
  })

  // ----------------- 步骤 4 计算属性 -----------------
  /**
   * 步骤 4：根据可打击度阈值筛选出的卫星列表 (可打击度 >= 门限)
   */
  const step4Candidates = computed<Satellite[]>(() => {
    return satellites.value.filter((sat) => {
      const score = sat.strikeFeasibilityScore ?? 0
      return score >= minStrikeFeasibilityThreshold.value
    })
  })

  // ----------------- 步骤 5 计算属性：优先级链路武器智能匹配与甘特图 -----------------
  /**
   * 综合前 4 步评估，为每条链路与目标卫星匹配优先级与武器分配方案
   */
  const matchedWeaponPlans = computed<MatchedWeaponPlan[]>(() => {
    const plans: MatchedWeaponPlan[] = []

    dataLinks.value.forEach((link, idx) => {
      const targetSat = satellites.value.find((s) => s.id === link.sourceSatelliteId)
      if (!targetSat) return

      // 综合优先级计算公式:
      // Priority = 0.35 * Threat + 0.25 * Feasibility + 0.20 * (100 - Latency/10) + 0.20 * Coverage
      const threatPart = (targetSat.threatScore ?? 70) * 0.35
      const feasPart = (targetSat.strikeFeasibilityScore ?? 70) * 0.25
      const latencyPart = Math.max(0, 100 - (link.latencyMs ?? 100) / 10) * 0.20
      const covPart = (targetSat.coverageRate ?? 60) * 0.20
      const priorityScore = parseFloat((threatPart + feasPart + latencyPart + covPart).toFixed(1))

      // 智能匹配最优武器
      let assignedWeapon = weapons.value[0]
      let tacticalRationale = ''
      let expectedPk = 90.0

      if (
        targetSat.category === SatelliteCategory.RECONNAISSANCE &&
        targetSat.telemetry.altitude <= 650
      ) {
        // 低轨高分侦察星 -> HQ-19 动能或激光致盲
        const hq19 = weapons.value.find((w) => w.type === WeaponType.KINETIC)
        if (hq19) {
          assignedWeapon = hq19
          tacticalRationale =
            '目标处于 LEO 轨道 400-600km 弹道包络内，HQ-19 动能碰撞可实现物理彻底击毁，切断即时光学侦察源头。'
          expectedPk = hq19.performance.pkProbability
        }
      } else if (
        targetSat.category === SatelliteCategory.COMMUNICATION ||
        targetSat.series === 'Starlink' ||
        targetSat.series === 'Starshield'
      ) {
        // 宽带通信 / 星链星盾 -> 凌霄-4 电子对抗压制
        const jammer = weapons.value.find((w) => w.type === WeaponType.ELECTRONIC_WARFARE)
        if (jammer) {
          assignedWeapon = jammer
          tacticalRationale =
            '采用凌霄-4 超宽带高功率干扰发射阵列，对该链路 Ku/Ka 频段下行实施同频全信道压制，迫使其通信误码率达 90% 以上。'
          expectedPk = jammer.performance.pkProbability
        }
      } else {
        // 激光致盲或远程压制
        const laser = weapons.value.find((w) => w.type === WeaponType.DIRECTED_ENERGY)
        if (laser) {
          assignedWeapon = laser
          tacticalRationale =
            '利用青海高原光电神威-II 兆瓦级激光炮，在过境可见时间窗实施持续出光照射，对焦平面探测器实施热硬损伤致盲。'
          expectedPk = laser.performance.pkProbability
        }
      }

      // 构造甘特图战术时序任务 (T+00:00 至 T+30:00)
      const baseOffset = idx * 3
      const timelineTasks: GanttTaskItem[] = [
        {
          id: `${link.id}-task-1`,
          name: targetSat.name.split(' ')[0],
          weaponName: assignedWeapon.name.split(' ')[0],
          weaponType: assignedWeapon.type,
          phaseName: '雷达截获与开普勒外推',
          startMinute: baseOffset,
          durationMinute: 4,
          color: '#3b82f6'
        },
        {
          id: `${link.id}-task-2`,
          name: targetSat.name.split(' ')[0],
          weaponName: assignedWeapon.name.split(' ')[0],
          weaponType: assignedWeapon.type,
          phaseName: '阵地发射准备/激光储能',
          startMinute: baseOffset + 4,
          durationMinute: 4,
          color: '#eab308'
        },
        {
          id: `${link.id}-task-3`,
          name: targetSat.name.split(' ')[0],
          weaponName: assignedWeapon.name.split(' ')[0],
          weaponType: assignedWeapon.type,
          phaseName:
            assignedWeapon.type === WeaponType.KINETIC
              ? '动能弹点火中段交会'
              : assignedWeapon.type === WeaponType.DIRECTED_ENERGY
              ? '兆瓦级高能激光出光照射'
              : '宽带大功率电磁加电压制',
          startMinute: baseOffset + 8,
          durationMinute: 8,
          color: '#ef4444'
        },
        {
          id: `${link.id}-task-4`,
          name: targetSat.name.split(' ')[0],
          weaponName: assignedWeapon.name.split(' ')[0],
          weaponType: assignedWeapon.type,
          phaseName: '链路中断/末端硬毁伤判定',
          startMinute: baseOffset + 16,
          durationMinute: 5,
          color: '#f97316'
        },
        {
          id: `${link.id}-task-5`,
          name: targetSat.name.split(' ')[0],
          weaponName: assignedWeapon.name.split(' ')[0],
          weaponType: assignedWeapon.type,
          phaseName: '天基多源战损评估 (BDA)',
          startMinute: baseOffset + 21,
          durationMinute: 5,
          color: '#10b981'
        }
      ]

      // 计算打击前后核心指标对比 (突出威胁度、覆盖率、增加传输时延)
      const beforeThreatScore = targetSat.threatScore ?? 75
      const beforeCoverageRate = targetSat.coverageRate ?? 60
      const beforeLatencyMs = link.latencyMs ?? 100

      let afterThreatScore = 15
      let afterCoverageRate = 0
      let afterLatencyMs = 1200
      let tacticalOutcomeSummary = ''

      if (assignedWeapon.type === WeaponType.KINETIC) {
        afterThreatScore = 5
        afterCoverageRate = 0
        afterLatencyMs = 2800
        tacticalOutcomeSummary =
          '动能拦截器高速撞击物理粉碎星体，在轨结构解体，地面视场覆盖归零，下传数传链路彻底物理阻断！'
      } else if (assignedWeapon.type === WeaponType.DIRECTED_ENERGY) {
        afterThreatScore = 12
        afterCoverageRate = Math.round(beforeCoverageRate * 0.15)
        afterLatencyMs = 1650
        tacticalOutcomeSummary =
          '连续兆瓦级激光硬烧蚀焦平面探测器致盲，光学传感器像元烧结，回传全黑噪波，时延激增并实质失效！'
      } else if (assignedWeapon.type === WeaponType.ELECTRONIC_WARFARE) {
        afterThreatScore = 16
        afterCoverageRate = Math.round(beforeCoverageRate * 0.12)
        afterLatencyMs = 950
        tacticalOutcomeSummary =
          '超宽带同频大功率强电磁压制，信噪比降至门限以下，误码率>85%，传输时延暴增，数传实质瘫痪！'
      } else {
        afterThreatScore = 20
        afterCoverageRate = Math.round(beforeCoverageRate * 0.2)
        afterLatencyMs = 800
        tacticalOutcomeSummary = '网络指令注入与信令压制，星地通信链路严重降级并瘫痪。'
      }

      const threatReduction = beforeThreatScore - afterThreatScore
      const threatReductionPercent = Math.round(
        (threatReduction / (beforeThreatScore || 1)) * 100
      )
      const coverageReductionPercent = Math.round(
        ((beforeCoverageRate - afterCoverageRate) / (beforeCoverageRate || 1)) * 100
      )
      const addedLatencyMs = afterLatencyMs - beforeLatencyMs

      plans.push({
        index: idx + 1,
        link,
        targetSatellite: targetSat,
        priorityScore,
        recommendedWeapon: assignedWeapon,
        expectedPk,
        tacticalRationale,
        timelineTasks,
        beforeThreatScore,
        afterThreatScore,
        threatReduction,
        threatReductionPercent,
        beforeCoverageRate,
        afterCoverageRate,
        coverageReductionPercent,
        beforeLatencyMs,
        afterLatencyMs,
        addedLatencyMs,
        tacticalOutcomeSummary
      })
    })

    // 按综合优先级从高到低排序
    return plans.sort((a, b) => b.priorityScore - a.priorityScore)
  })

  /**
   * 宏观打击前后综合战效对比指标计算属性
   */
  const combatImpactOverview = computed<CombatImpactOverview>(() => {
    const plans = matchedWeaponPlans.value
    if (!plans.length) {
      return {
        avgThreatBefore: 0,
        avgThreatAfter: 0,
        totalThreatReductionPercent: 0,
        avgCoverageBefore: 0,
        avgCoverageAfter: 0,
        coverageDropPercent: 0,
        avgLatencyBefore: 0,
        avgLatencyAfter: 0,
        avgAddedLatencyMs: 0,
        latencySurgeRatio: 0
      }
    }

    const avgThreatBefore = Math.round(
      plans.reduce((acc, p) => acc + p.beforeThreatScore, 0) / plans.length
    )
    const avgThreatAfter = Math.round(
      plans.reduce((acc, p) => acc + p.afterThreatScore, 0) / plans.length
    )
    const totalThreatReductionPercent = Math.round(
      ((avgThreatBefore - avgThreatAfter) / (avgThreatBefore || 1)) * 100
    )

    const avgCoverageBefore = Math.round(
      plans.reduce((acc, p) => acc + p.beforeCoverageRate, 0) / plans.length
    )
    const avgCoverageAfter = Math.round(
      plans.reduce((acc, p) => acc + p.afterCoverageRate, 0) / plans.length
    )
    const coverageDropPercent = Math.round(
      ((avgCoverageBefore - avgCoverageAfter) / (avgCoverageBefore || 1)) * 100
    )

    const avgLatencyBefore = Math.round(
      plans.reduce((acc, p) => acc + p.beforeLatencyMs, 0) / plans.length
    )
    const avgLatencyAfter = Math.round(
      plans.reduce((acc, p) => acc + p.afterLatencyMs, 0) / plans.length
    )
    const avgAddedLatencyMs = avgLatencyAfter - avgLatencyBefore
    const latencySurgeRatio = parseFloat((avgLatencyAfter / (avgLatencyBefore || 1)).toFixed(1))

    return {
      avgThreatBefore,
      avgThreatAfter,
      totalThreatReductionPercent,
      avgCoverageBefore,
      avgCoverageAfter,
      coverageDropPercent,
      avgLatencyBefore,
      avgLatencyAfter,
      avgAddedLatencyMs,
      latencySurgeRatio
    }
  })

  // ----------------- 控制与导航方法 -----------------
  /**
   * 打开作战计划向导对话框
   */
  function openCombatPlanModal(): void {
    isCombatPlanModalOpen.value = true
  }

  /**
   * 关闭作战计划向导对话框
   */
  function closeCombatPlanModal(): void {
    isCombatPlanModalOpen.value = false
  }

  /**
   * 跳转至指定步骤 (1 到 6)
   *
   * @param step - 目标步骤
   */
  function goToStep(step: CombatPlanStep): void {
    if (step >= 1 && step <= 6) {
      currentStep.value = step
    }
  }

  /**
   * 进入下一步
   */
  function nextStep(): void {
    if (currentStep.value < CombatPlanStep.PLAN_EXPORT) {
      currentStep.value = (currentStep.value + 1) as CombatPlanStep
    }
  }

  /**
   * 返回上一步
   */
  function prevStep(): void {
    if (currentStep.value > CombatPlanStep.THREAT_ANALYSIS) {
      currentStep.value = (currentStep.value - 1) as CombatPlanStep
    }
  }

  /**
   * 切换步骤 2 中选中的目标卫星以动态聚焦展示该卫星的数据链路拓扑
   *
   * @param satId - 卫星唯一标识 ID
   */
  function selectTopologySatellite(satId: string): void {
    selectedTopologySatelliteId.value = satId
  }

  // ----------------- 步骤 6：方案保存与导出 -----------------
  /**
   * 将当前生成的作战打击方案保存持久化，并直接转换为正式作战任务注入全局任务系统
   */
  function savePlanToMissions(): void {
    // 遍历匹配到的方案队列，转换为实战任务
    matchedWeaponPlans.value.forEach((plan, i) => {
      // 将 SatelliteCategory 映射至 TargetSatelliteType
      const targetTypeMap: Partial<Record<SatelliteCategory, TargetSatelliteType>> = {
        [SatelliteCategory.RECONNAISSANCE]: TargetSatelliteType.RECONNAISSANCE,
        [SatelliteCategory.EARLY_WARNING]: TargetSatelliteType.EARLY_WARNING,
        [SatelliteCategory.COMMUNICATION]: TargetSatelliteType.COMMUNICATION,
        [SatelliteCategory.NAVIGATION]: TargetSatelliteType.NAVIGATION
      }

      const assignedType =
        targetTypeMap[plan.targetSatellite.category] || TargetSatelliteType.RECONNAISSANCE
      const startTime = new Date(Date.now() + i * 180000).toISOString()
      const endTime = new Date(Date.now() + (i * 3 + 30) * 60000).toISOString()

      const newMission: CombatMission = {
        id: `MSN-${combatPlanCode.value}-${plan.targetSatellite.id}-${i + 1}`,
        name: `【${combatPlanCode.value}】对 ${plan.targetSatellite.name.split(' ')[0]} 空间打击任务`,
        code: `${combatPlanCode.value}-#${plan.index}`,
        startTime,
        endTime,
        targetSatelliteTypes: [assignedType],
        politicalRedLine: PoliticalRedLine.MILITARY_AND_CIVILIAN,
        targetConstellations: [plan.targetSatellite.series || '美军核心载荷'],
        battlefieldIds: [],
        status: MissionStatus.PLANNING,
        priority: MissionPriority.CRITICAL,
        description: `优先级得分: ${plan.priorityScore} | 匹配武器: ${plan.recommendedWeapon.name} | 战术依据: ${plan.tacticalRationale}`,
        createdAt: new Date().toISOString()
      }

      // 防止重复添加
      const exists = missions.value.some((m) => m.id === newMission.id)
      if (!exists) {
        missions.value.unshift(newMission)
      }
    })

    // 保存至 LocalStorage
    try {
      localStorage.setItem('SAVED_COMBAT_PLAN_V2', JSON.stringify({
        code: combatPlanCode.value,
        title: combatPlanTitle.value,
        remarks: combatPlanRemarks.value,
        plans: matchedWeaponPlans.value,
        savedAt: new Date().toISOString()
      }))
    } catch {
      // 忽略本地存储配额错误
    }

    isSaveSuccess.value = true
    setTimeout(() => {
      isSaveSuccess.value = false
    }, 4000)
  }

  /**
   * 将作战方案导出为军用标准 JSON 数据文件并触发浏览器下载
   */
  function exportPlanAsJson(): void {
    const exportData = {
      version: 'TAC-PLAN-V2.5',
      code: combatPlanCode.value,
      title: combatPlanTitle.value,
      exportedAt: new Date().toISOString(),
      remarks: combatPlanRemarks.value,
      summary: {
        totalTargetLinks: matchedWeaponPlans.value.length,
        averagePriorityScore: (
          matchedWeaponPlans.value.reduce((acc, p) => acc + p.priorityScore, 0) /
          (matchedWeaponPlans.value.length || 1)
        ).toFixed(1),
        averageExpectedPk: (
          matchedWeaponPlans.value.reduce((acc, p) => acc + p.expectedPk, 0) /
          (matchedWeaponPlans.value.length || 1)
        ).toFixed(1),
        // 宏观战效对比指标 (威胁度、覆盖率、传输时延恶化)
        combatImpactOverview: {
          threat: {
            before: combatImpactOverview.value.avgThreatBefore,
            after: combatImpactOverview.value.avgThreatAfter,
            dropPercent: `${combatImpactOverview.value.totalThreatReductionPercent}%`
          },
          coverage: {
            before: `${combatImpactOverview.value.avgCoverageBefore}%`,
            after: `${combatImpactOverview.value.avgCoverageAfter}%`,
            dropPercent: `${combatImpactOverview.value.coverageDropPercent}%`
          },
          latency: {
            before: `${combatImpactOverview.value.avgLatencyBefore}ms`,
            after: `${combatImpactOverview.value.avgLatencyAfter}ms`,
            added: `+${combatImpactOverview.value.avgAddedLatencyMs}ms`,
            surgeRatio: `${combatImpactOverview.value.latencySurgeRatio}x`
          }
        }
      },
      strikeMatrix: matchedWeaponPlans.value.map((p) => ({
        priorityRank: p.index,
        priorityScore: p.priorityScore,
        targetSatellite: {
          id: p.targetSatellite.id,
          name: p.targetSatellite.name,
          noradId: p.targetSatellite.noradId,
          orbit: p.targetSatellite.orbitType
        },
        assignedWeapon: {
          id: p.recommendedWeapon.id,
          name: p.recommendedWeapon.name,
          type: p.recommendedWeapon.type,
          location: p.recommendedWeapon.locationName,
          pk: p.expectedPk
        },
        // 打击前后核心对比指标
        beforeAfterComparison: {
          threatScore: {
            before: p.beforeThreatScore,
            after: p.afterThreatScore,
            reduction: p.threatReduction,
            dropPercent: `${p.threatReductionPercent}%`
          },
          coverageRate: {
            before: `${p.beforeCoverageRate}%`,
            after: `${p.afterCoverageRate}%`,
            dropPercent: `${p.coverageReductionPercent}%`
          },
          transmissionLatency: {
            before: `${p.beforeLatencyMs}ms`,
            after: `${p.afterLatencyMs}ms`,
            addedLatency: `+${p.addedLatencyMs}ms`
          },
          tacticalOutcome: p.tacticalOutcomeSummary
        },
        tacticalRationale: p.tacticalRationale,
        timelineMilestones: p.timelineTasks
      }))
    }

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json;charset=utf-8'
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${combatPlanCode.value}_STRIKE_PLAN_${Date.now()}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  /**
   * 将作战方案导出为排版精美的 Markdown 战备行动简报并触发浏览器下载
   */
  function exportPlanAsMarkdown(): void {
    let md = `# 【战备简报】${combatPlanTitle.value}\n\n`
    md += `**作战行动代号**: \`${combatPlanCode.value}\`  \n`
    md += `**生成时间**: ${new Date().toLocaleString()} (BJT)  \n`
    md += `**作战任务数量**: ${matchedWeaponPlans.value.length} 个重点数据链路打击节点  \n\n`
    md += `## 一、首长战役决心与行动指导\n\n`
    md += `> ${combatPlanRemarks.value}\n\n`

    md += `## 二、打击前后宏观核心战效指标深度对比\n\n`
    md += `| 战术指标维度 | 打击前初始指标 | 打击后受损指标 | 战效变化幅度 | 核心战术作战收益评估 |\n`
    md += `| :--- | :--- | :--- | :--- | :--- |\n`
    md += `| **综合威胁度** | **${combatImpactOverview.value.avgThreatBefore}** 分 | **${combatImpactOverview.value.avgThreatAfter}** 分 | <font color="#10b981">**↓ ${combatImpactOverview.value.totalThreatReductionPercent}%**</font> | 敌在轨对地立体侦察与火控照射威胁基本清除 |\n`
    md += `| **有效覆盖率** | **${combatImpactOverview.value.avgCoverageBefore}%** | **${combatImpactOverview.value.avgCoverageAfter}%** | <font color="#f59e0b">**↓ ${combatImpactOverview.value.coverageDropPercent}%**</font> | 撕裂出数千平方公里通信侦察信息盲区黑洞 |\n`
    md += `| **数据传输时延** | **${combatImpactOverview.value.avgLatencyBefore}** ms | **${combatImpactOverview.value.avgLatencyAfter}** ms | <font color="#ef4444">**↑ +${combatImpactOverview.value.avgAddedLatencyMs} ms (${combatImpactOverview.value.latencySurgeRatio}倍)**</font> | 超宽带强电磁同频压制，数传实质阻断瘫痪 |\n\n`

    md += `## 三、各重点目标打击前后指标对比矩阵表\n\n`
    md += `| 优先级 | 目标卫星 | 匹配武器装备 | 威胁度 (前→后) | 覆盖率 (前→后) | 传输时延 (前→后) | 增加传输时延 | 战备打击收益综述 |\n`
    md += `| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |\n`

    matchedWeaponPlans.value.forEach((p) => {
      md += `| **TOP ${p.index}** | ${p.targetSatellite.name} | ${p.recommendedWeapon.name.split(' ')[0]} | ${p.beforeThreatScore}分 → **${p.afterThreatScore}分** (↓${p.threatReductionPercent}%) | ${p.beforeCoverageRate}% → **${p.afterCoverageRate}%** (↓${p.coverageReductionPercent}%) | ${p.beforeLatencyMs}ms → **${p.afterLatencyMs}ms** | <font color="#ef4444">**+${p.addedLatencyMs}ms**</font> | ${p.tacticalOutcomeSummary} |\n`
    })

    md += `\n## 四、分项战术打击机理与协同要求\n\n`
    matchedWeaponPlans.value.forEach((p) => {
      md += `### ${p.index}. 目标: ${p.targetSatellite.name} (综合优先级: ${p.priorityScore}分)\n\n`
      md += `- **目标链路**: ${p.link.name} (时延: ${p.link.latencyMs}ms)\n`
      md += `- **分配武器**: ${p.recommendedWeapon.name} (${p.recommendedWeapon.type})\n`
      md += `- **战备指标对比**:\n`
      md += `  - 威胁度: \`${p.beforeThreatScore}分\` → \`${p.afterThreatScore}分\` (净削减 ${p.threatReduction}分)\n`
      md += `  - 覆盖率: \`${p.beforeCoverageRate}%\` → \`${p.afterCoverageRate}%\` (剥夺 ${p.coverageReductionPercent}%)\n`
      md += `  - 传输时延: \`${p.beforeLatencyMs}ms\` → \`${p.afterLatencyMs}ms\` (时延暴增 +${p.addedLatencyMs}ms)\n`
      md += `- **战术机理**: ${p.tacticalRationale}\n`
      md += `- **甘特图时序进程**:\n`
      p.timelineTasks.forEach((t) => {
        md += `  - \`T+${String(t.startMinute).padStart(2, '0')}:00 ~ T+${String(
          t.startMinute + t.durationMinute
        ).padStart(2, '0')}:00\`: ${t.phaseName}\n`
      })
      md += `\n`
    })

    md += `\n---\n*本简报由空间态势感知与反卫作战智能推荐指挥系统自动解算生成*\n`

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${combatPlanCode.value}_战备行动方案简报_${Date.now()}.md`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return {
    isCombatPlanModalOpen,
    currentStep,
    // Step 1
    threatFilterThreshold,
    wPayload,
    wOrbit,
    wRevisit,
    wStrategy,
    step1Candidates,
    // Step 2
    maxLinkDurationThreshold,
    selectedTopologyLinkId,
    selectedTopologySatelliteId,
    selectTopologySatellite,
    step2Candidates,
    topologyGraphData,
    // Step 3
    minCoverageThreshold,
    step3Candidates,
    // Step 4
    minStrikeFeasibilityThreshold,
    step4Candidates,
    // Step 5
    matchedWeaponPlans,
    combatImpactOverview,
    // Step 6
    combatPlanCode,
    combatPlanTitle,
    combatPlanRemarks,
    isSaveSuccess,
    // Methods
    openCombatPlanModal,
    closeCombatPlanModal,
    goToStep,
    nextStep,
    prevStep,
    savePlanToMissions,
    exportPlanAsJson,
    exportPlanAsMarkdown
  }
}
