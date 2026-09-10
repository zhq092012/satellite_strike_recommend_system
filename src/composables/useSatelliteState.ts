/**
 * @fileoverview 全局卫星态势管理 Composable (Vue 3 Composition API)
 * 提供响应式卫星列表、当前选中卫星、推演时钟、战术告警事件流以及视点相机控制的统一状态管理
 */

import { ref, computed, reactive } from 'vue'
import {
  Satellite,
  SatelliteCategory,
  OrbitType,
  TacticalAlert,
  SimulationClockState,
  SatelliteSortBy
} from '../types/satellite'
import { INITIAL_SATELLITES, INITIAL_ALERTS, CAMERA_PRESETS } from '../services/satelliteData'
import { updateSatelliteTelemetry } from '../services/satelliteService'
import { useRightPanelState } from './useRightPanelState'

/**
 * 卫星列表响应式数据源
 */
const satellites = ref<Satellite[]>(JSON.parse(JSON.stringify(INITIAL_SATELLITES)))

/**
 * 当前选中的卫星 ID (可为空)
 */
const selectedSatelliteId = ref<string>('SAT-USA-290')

/**
 * 是否将三维相机锁定并实时跟随当前选中的卫星
 */
const isTracked = ref<boolean>(true)

/**
 * 战术告警流水事件列表
 */
const alerts = ref<TacticalAlert[]>(JSON.parse(JSON.stringify(INITIAL_ALERTS)))

/**
 * 态势推演时钟响应式状态
 */
const clockState = reactive<SimulationClockState>({
  currentTime: Date.now(),
  isPlaying: true,
  multiplier: 1
})

/**
 * 仿真推演历元经过的虚拟时间 (秒)
 */
const elapsedSimulationSeconds = ref<number>(0)

/**
 * 卫星列表分类过滤条件 ('ALL' 表示全部)
 */
const categoryFilter = ref<SatelliteCategory | 'ALL'>('ALL')

/**
 * 卫星轨道高度层级过滤条件 ('ALL' 表示全部)
 */
const orbitTypeFilter = ref<OrbitType | 'ALL'>('ALL')

/**
 * 卫星所属星座/系列过滤条件 ('ALL' 表示全部)
 */
const seriesFilter = ref<string>('ALL')

/**
 * 卫星名称或代号搜索关键词
 */
const searchKeyword = ref<string>('')

/**
 * 最低威胁度筛选阈值 (0 - 100)
 */
const minThreatScore = ref<number>(0)

/**
 * 最大链路传输延迟筛选阈值 (ms)
 */
const maxLinkLatency = ref<number>(1000)

/**
 * 最低有效覆盖率筛选阈值 (0 - 100)
 */
const minCoverageRate = ref<number>(0)

/**
 * 列表排序维度
 */
const sortBy = ref<SatelliteSortBy>('DEFAULT')

/**
 * 战备等级状态 (DEFCON 1 到 5)
 */
const defconLevel = ref<number>(3)

/**
 * 鼠标指向的地面实时地理坐标
 */
const cursorGeoPosition = reactive<{
  longitude: number
  latitude: number
  altitude: number
}>({
  longitude: 116.4,
  latitude: 39.9,
  altitude: 0
})

/**
 * 当前相机视点空间高度 (米)
 */
const cameraAltitude = ref<number>(25000000)

/**
 * 全局卫星态势响应式状态 Composable 钩子
 *
 * @returns 卫星态势响应式状态对象与业务控制方法集合
 */
export function useSatelliteState() {
  /**
   * 当前选中的目标卫星计算属性
   */
  const selectedSatellite = computed<Satellite | null>(() => {
    return satellites.value.find((s) => s.id === selectedSatelliteId.value) || null
  })

  /**
   * 根据分类、轨道类型、卫星系列、威胁度、链路时延、覆盖率以及搜索词过滤与排序后的卫星列表
   */
  const filteredSatellites = computed<Satellite[]>(() => {
    const list = satellites.value.filter((sat) => {
      const matchCategory =
        categoryFilter.value === 'ALL' || sat.category === categoryFilter.value
      const matchOrbit =
        orbitTypeFilter.value === 'ALL' || sat.orbitType === orbitTypeFilter.value
      const matchSeries =
        seriesFilter.value === 'ALL' || sat.series === seriesFilter.value
      const matchKeyword =
        !searchKeyword.value.trim() ||
        sat.name.toLowerCase().includes(searchKeyword.value.toLowerCase()) ||
        sat.id.toLowerCase().includes(searchKeyword.value.toLowerCase()) ||
        (sat.series && sat.series.toLowerCase().includes(searchKeyword.value.toLowerCase()))
      const matchThreat = (sat.threatScore ?? 0) >= minThreatScore.value
      const matchLatency = (sat.linkLatencyMs ?? 0) <= maxLinkLatency.value
      const matchCoverage =
        minCoverageRate.value === 0 || ((sat.coverageRate ?? 0) >= minCoverageRate.value)

      return (
        matchCategory &&
        matchOrbit &&
        matchSeries &&
        matchKeyword &&
        matchThreat &&
        matchLatency &&
        matchCoverage
      )
    })

    // 根据选中的排序维度进行排序
    return list.slice().sort((a, b) => {
      switch (sortBy.value) {
        case 'THREAT_DESC':
          return (b.threatScore ?? 0) - (a.threatScore ?? 0)
        case 'THREAT_ASC':
          return (a.threatScore ?? 0) - (b.threatScore ?? 0)
        case 'LATENCY_ASC':
          return (a.linkLatencyMs ?? 0) - (b.linkLatencyMs ?? 0)
        case 'LATENCY_DESC':
          return (b.linkLatencyMs ?? 0) - (a.linkLatencyMs ?? 0)
        case 'COVERAGE_DESC':
          return (b.coverageRate ?? 0) - (a.coverageRate ?? 0)
        case 'COVERAGE_ASC':
          return (a.coverageRate ?? 0) - (b.coverageRate ?? 0)
        case 'DEFAULT':
        default:
          return 0
      }
    })
  })

  /**
   * 未确认处理的严重/紧急警报计数
   */
  const unreadAlertsCount = computed<number>(() => {
    return alerts.value.filter((a) => !a.acknowledged).length
  })

  /**
   * 选中并聚焦指定卫星，并自动独占唤起右侧遥测面板（收起其他抽屉）
   *
   * @param id - 目标卫星唯一标识 ID
   */
  function selectSatellite(id: string): void {
    selectedSatelliteId.value = id
    const { setActivePanel } = useRightPanelState()
    setActivePanel('TELEMETRY')
  }

  /**
   * 切换相机对目标卫星的锁定跟随状态
   *
   * @param tracked - 是否锁定跟随，若缺省则自动反转当前状态
   */
  function toggleTrack(tracked?: boolean): void {
    if (typeof tracked === 'boolean') {
      isTracked.value = tracked
    } else {
      isTracked.value = !isTracked.value
    }
  }

  /**
   * 步进推演更新所有卫星的物理空间坐标与遥测数据
   *
   * @param deltaSeconds - 真实帧时间步长 (秒)
   */
  function stepSimulation(deltaSeconds: number): void {
    if (!clockState.isPlaying) return

    // 考虑推演倍速的时间增量
    const virtualDelta = deltaSeconds * clockState.multiplier
    elapsedSimulationSeconds.value += virtualDelta
    clockState.currentTime += virtualDelta * 1000

    // 更新各卫星遥测
    satellites.value = satellites.value.map((sat) => {
      return updateSatelliteTelemetry(sat, elapsedSimulationSeconds.value)
    })
  }

  /**
   * 设置推演流速倍率
   *
   * @param multiplier - 仿真倍速 (如 1, 5, 10, 60, 300)
   */
  function setTimeMultiplier(multiplier: number): void {
    clockState.multiplier = multiplier
  }

  /**
   * 切换时态推演的播放/暂停状态
   */
  function togglePlayPause(): void {
    clockState.isPlaying = !clockState.isPlaying
  }

  /**
   * 重置推演时间至当前实时系统时间
   */
  function resetSimulationTime(): void {
    elapsedSimulationSeconds.value = 0
    clockState.currentTime = Date.now()
    satellites.value = JSON.parse(JSON.stringify(INITIAL_SATELLITES))
  }

  /**
   * 跳转/拖动至指定仿真推演秒数
   *
   * @param seconds - 目标秒数 (0 - 86400)
   */
  function seekSimulationTime(seconds: number): void {
    elapsedSimulationSeconds.value = Math.max(0, seconds)
  }

  /**
   * 确认或消除指定战术告警事件
   *
   * @param alertId - 告警流水号
   */
  function acknowledgeAlert(alertId: string): void {
    const target = alerts.value.find((a) => a.id === alertId)
    if (target) {
      target.acknowledged = true
    }
  }

  /**
   * 调整战备戒备等级
   *
   * @param level - 战备等级 (1 到 5)
   */
  function setDefconLevel(level: number): void {
    if (level >= 1 && level <= 5) {
      defconLevel.value = level
    }
  }

  /**
   * 更新鼠标地理指针读数
   *
   * @param lon - 经度 (度)
   * @param lat - 纬度 (度)
   * @param alt - 高度 (米)
   */
  function updateCursorCoordinates(lon: number, lat: number, alt: number): void {
    cursorGeoPosition.longitude = parseFloat(lon.toFixed(4))
    cursorGeoPosition.latitude = parseFloat(lat.toFixed(4))
    cursorGeoPosition.altitude = parseFloat(alt.toFixed(1))
  }

  /**
   * 更新当前视点相机高度
   *
   * @param height - 相机距地高度 (米)
   */
  function updateCameraAltitude(height: number): void {
    cameraAltitude.value = Math.round(height)
  }

  return {
    satellites,
    selectedSatelliteId,
    selectedSatellite,
    filteredSatellites,
    isTracked,
    alerts,
    unreadAlertsCount,
    clockState,
    elapsedSimulationSeconds,
    categoryFilter,
    orbitTypeFilter,
    seriesFilter,
    searchKeyword,
    minThreatScore,
    maxLinkLatency,
    minCoverageRate,
    sortBy,
    defconLevel,
    cursorGeoPosition,
    cameraAltitude,
    cameraPresets: CAMERA_PRESETS,
    selectSatellite,
    toggleTrack,
    stepSimulation,
    setTimeMultiplier,
    togglePlayPause,
    resetSimulationTime,
    seekSimulationTime,
    acknowledgeAlert,
    setDefconLevel,
    updateCursorCoordinates,
    updateCameraAltitude
  }
}
