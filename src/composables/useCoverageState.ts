/**
 * @fileoverview 全局天基时空覆盖分析与时态切片索引 Composable (useCoverageState.ts)
 * 统一调度 24 小时覆盖率预计算、时序插值、9 大综合度量指标、多星并发可见度分布
 * 并在仿真时间推演过程中提供 O(1) 常数级即时切片快照，驱动底部时间轴图谱与规划向导 Step 3
 */

import { ref, computed, watch } from 'vue'
import { useSatelliteState } from './useSatelliteState'
import {
  CoverageMetrics,
  CoverageTimeSeriesPoint,
  PassAccessWindow,
  MultiSatConcurrencyDistribution,
  TargetRegion,
  EffectiveFactorWeights
} from '../types/coverage'
import {
  DEFAULT_TARGET_REGION,
  DEFAULT_EFFECTIVE_WEIGHTS,
  precomputeCoverageSimulation
} from '../services/coverageService'

/**
 * 当前分析目标战区
 */
const currentTargetRegion = ref<TargetRegion>({ ...DEFAULT_TARGET_REGION })

/**
 * 当前传感器与气象有效修正权重
 */
const currentEffectiveWeights = ref<EffectiveFactorWeights>({ ...DEFAULT_EFFECTIVE_WEIGHTS })

/**
 * 24 小时时序预计算切片结果
 */
const timeSeries = ref<CoverageTimeSeriesPoint[]>([])

/**
 * 24 小时内所有过境访问窗口 (Access Windows)
 */
const accessWindows = ref<PassAccessWindow[]>([])

/**
 * 综合 9 项度量指标
 */
const coverageMetrics = ref<CoverageMetrics>({
  spatialCoverageRate: 0,
  temporalCoverageRate: 0,
  revisitTime: 0,
  maxRevisitGap: 0,
  passCount: 0,
  totalCoverageDuration: 0,
  averagePassDuration: 0,
  peakConcurrentSatellites: 0,
  averageConcurrentSatellites: 0
})

/**
 * 多星重叠冗余并发度分布
 */
const concurrencyDistribution = ref<MultiSatConcurrencyDistribution>({
  zeroSatPercent: 0,
  oneSatPercent: 0,
  twoSatPercent: 0,
  threePlusSatPercent: 0,
  averageVisibility: 0
})

/**
 * 是否正在重新预计算时序
 */
const isCalculating = ref<boolean>(false)

/**
 * 全局单例初始化标记
 */
let isInitialized = false

export function useCoverageState() {
  const { satellites, elapsedSimulationSeconds } = useSatelliteState()

  /**
   * 触发执行 24 小时全量时序预计算
   */
  function refreshCoveragePrecomputation() {
    isCalculating.value = true
    try {
      const result = precomputeCoverageSimulation(
        satellites.value,
        24,
        300, // 5 分钟步长，289 个切片
        currentTargetRegion.value,
        currentEffectiveWeights.value
      )

      timeSeries.value = result.timeSeries
      accessWindows.value = result.accessWindows
      coverageMetrics.value = result.metrics
      concurrencyDistribution.value = result.concurrencyDistribution
    } catch (err) {
      console.error('Coverage precomputation error:', err)
    } finally {
      isCalculating.value = false
    }
  }

  // 初始化首次运行
  if (!isInitialized) {
    isInitialized = true
    refreshCoveragePrecomputation()

    // 当卫星数据变更 (例如反制打击下线) 时自动重新预推
    watch(
      () => satellites.value.map((s) => `${s.id}_${s.status}`).join('|'),
      () => {
        refreshCoveragePrecomputation()
      }
    )
  }

  /**
   * 根据当前主推演时钟经过秒数 (elapsedSimulationSeconds)
   * 快速定位当前切片的瞬时覆盖率指标 (O(1) 常数级检索)
   */
  const currentTimelineSample = computed<CoverageTimeSeriesPoint>(() => {
    if (timeSeries.value.length === 0) {
      return {
        timeOffsetSec: 0,
        timeLabel: '00:00',
        spatialCoverageRate: 0,
        effectiveCoverageRate: 0,
        concurrentSats: 0,
        activeSatIds: []
      }
    }

    const stepSec = 300
    const totalSec = (elapsedSimulationSeconds.value % 86400 + 86400) % 86400
    const index = Math.floor(totalSec / stepSec)
    const clampedIndex = Math.min(index, timeSeries.value.length - 1)

    // 若有相邻点，进行轻量级线性插值，使波形数值跳动更加丝滑
    const currentPoint = timeSeries.value[clampedIndex]
    const nextPoint = timeSeries.value[Math.min(clampedIndex + 1, timeSeries.value.length - 1)]

    if (!nextPoint || clampedIndex === nextPoint.timeOffsetSec / stepSec) {
      return currentPoint
    }

    const ratio = (totalSec - currentPoint.timeOffsetSec) / stepSec
    const smoothSpatial =
      currentPoint.spatialCoverageRate +
      (nextPoint.spatialCoverageRate - currentPoint.spatialCoverageRate) * ratio

    const smoothEffective =
      currentPoint.effectiveCoverageRate +
      (nextPoint.effectiveCoverageRate - currentPoint.effectiveCoverageRate) * ratio

    return {
      timeOffsetSec: totalSec,
      timeLabel: currentPoint.timeLabel,
      spatialCoverageRate: Math.round(smoothSpatial * 10) / 10,
      effectiveCoverageRate: Math.round(smoothEffective * 10) / 10,
      concurrentSats: currentPoint.concurrentSats,
      activeSatIds: currentPoint.activeSatIds
    }
  })

  /**
   * 更新目标战区
   */
  function setTargetRegion(region: Partial<TargetRegion>) {
    currentTargetRegion.value = {
      ...currentTargetRegion.value,
      ...region
    }
    refreshCoveragePrecomputation()
  }

  /**
   * 更新有效折减权重因子
   */
  function updateEffectiveWeights(weights: Partial<EffectiveFactorWeights>) {
    currentEffectiveWeights.value = {
      ...currentEffectiveWeights.value,
      ...weights
    }
    refreshCoveragePrecomputation()
  }

  return {
    currentTargetRegion,
    currentEffectiveWeights,
    timeSeries,
    accessWindows,
    coverageMetrics,
    concurrencyDistribution,
    currentTimelineSample,
    isCalculating,
    refreshCoveragePrecomputation,
    setTargetRegion,
    updateEffectiveWeights
  }
}
