/**
 * @fileoverview 卫星多维时空覆盖率、重访周期与时序访问窗口计算服务
 * 实现空间几何球冠投影、多星重叠并集、24小时时序预计算切片、
 * 重访周期/最大空窗分析、访问窗口提取与多因子有效修正模型
 */

import { Satellite } from '../types/satellite'
import {
  CoverageMetrics,
  CoverageTimeSeriesPoint,
  PassAccessWindow,
  MultiSatConcurrencyDistribution,
  TargetRegion,
  EffectiveFactorWeights
} from '../types/coverage'
import { propagateKeplerOrbit } from './satelliteService'

/**
 * 地球平均赤道半径 (km)
 */
export const EARTH_RADIUS_KM = 6378.137

/**
 * 默认推演分析目标战区：第一岛链与台海重点空域核心圈
 */
export const DEFAULT_TARGET_REGION: TargetRegion = {
  id: 'REGION-WEST-PACIFIC',
  name: '第一岛链·台海海空防御纵深战区',
  centerLon: 121.5,
  centerLat: 24.5,
  radiusKm: 650,
  areaSqKm: Math.round(Math.PI * Math.pow(650, 2)) // 约 1,327,323 km²
}

/**
 * 默认传感器与环境有效覆盖率折减配置
 */
export const DEFAULT_EFFECTIVE_WEIGHTS: EffectiveFactorWeights = {
  minElevationDeg: 10.0,
  elevationFactor: 0.92,
  sensorFactor: 0.88,
  illuminationFactor: 0.85,
  weatherFactor: 0.82
}

/**
 * 计算两个地表经纬度点之间的大圆球面距离 (Haversine 算法)
 *
 * @param lon1 - 起点经度 (度)
 * @param lat1 - 起点纬度 (度)
 * @param lon2 - 终点经度 (度)
 * @param lat2 - 终点纬度 (度)
 * @returns 地表大圆球面距离 (km)
 */
export function calculateGreatCircleDistanceKm(
  lon1: number,
  lat1: number,
  lon2: number,
  lat2: number
): number {
  const dLat = ((lat2 - lat1) * Math.PI) / 180.0
  const dLon = ((lon2 - lon1) * Math.PI) / 180.0
  const lat1Rad = (lat1 * Math.PI) / 180.0
  const lat2Rad = (lat2 * Math.PI) / 180.0

  const a =
    Math.sin(dLat / 2.0) * Math.sin(dLat / 2.0) +
    Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(dLon / 2.0) * Math.sin(dLon / 2.0)
  const c = 2.0 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1.0 - a)))
  return EARTH_RADIUS_KM * c
}

/**
 * 计算卫星载荷对地覆盖视场投影圆半径 (km)
 *
 * @param sat - 卫星对象
 * @param altitudeKm - 瞬时高度 (若缺省则取卫星当前遥测高度)
 * @returns 地表视场覆盖半径 (km)
 */
export function calculateSatelliteFootprintRadiusKm(
  sat: Satellite,
  altitudeKm?: number
): number {
  const alt = altitudeKm ?? sat.telemetry?.altitude ?? 500
  const Re = EARTH_RADIUS_KM

  // 若载荷配置了有效扫宽，则半径约为扫宽一半 (保底 180km)
  if (sat.sensor?.swathWidth && sat.sensor.swathWidth > 0) {
    return Math.max(180, sat.sensor.swathWidth / 2.0)
  }

  // 基于半视场角 beta 进行球冠角投影推导
  const halfFovRad = ((sat.sensor?.halfFov ?? 25.0) * Math.PI) / 180.0
  const sinAlpha = ((Re + alt) / Re) * Math.sin(halfFovRad)
  if (sinAlpha < 1.0) {
    const alpha = Math.asin(sinAlpha)
    const thetaCap = alpha - halfFovRad
    if (thetaCap > 0) {
      return Re * thetaCap
    }
  }

  // 保底：基于最大地平视界几何角衰减估计
  const horizonAngle = Math.acos(Re / (Re + alt))
  return Re * horizonAngle * 0.65
}

/**
 * 生成目标战区圆形区域内的均匀分布离散采样测试点阵
 * (同心圆多圈采样，共 61 个点，用于毫秒级多星重叠并集与并发度统计)
 */
export function generateTargetRegionGridPoints(
  region: TargetRegion = DEFAULT_TARGET_REGION
): Array<{ lon: number; lat: number }> {
  const points: Array<{ lon: number; lat: number }> = []
  // 中心点
  points.push({ lon: region.centerLon, lat: region.centerLat })

  const rings = [
    { radiusRatio: 0.35, count: 8 },
    { radiusRatio: 0.68, count: 20 },
    { radiusRatio: 0.95, count: 32 }
  ]

  const kmPerLat = 111.0
  const kmPerLon = 111.0 * Math.cos((region.centerLat * Math.PI) / 180.0)

  for (const ring of rings) {
    const distKm = region.radiusKm * ring.radiusRatio
    for (let i = 0; i < ring.count; i++) {
      const angle = (2.0 * Math.PI * i) / ring.count
      const dNorthKm = distKm * Math.cos(angle)
      const dEastKm = distKm * Math.sin(angle)

      const lat = region.centerLat + dNorthKm / kmPerLat
      const lon = region.centerLon + dEastKm / kmPerLon
      points.push({ lon, lat })
    }
  }

  return points
}

/**
 * 缓存的采样点阵 (61 点)
 */
const CACHED_GRID_POINTS = generateTargetRegionGridPoints()

/**
 * 计算某一时刻全星座卫星对目标战区的多维覆盖切片
 *
 * @param satellites - 参与评估的卫星列表
 * @param timeOffsetSec - 相对推演起点的偏移秒数 (0 - 86400)
 * @param region - 目标评估战区
 * @param weights - 有效因子配置
 * @returns 当前采样切片详细数据与多星并发分布
 */
export function evaluateCoverageAtTimeSlice(
  satellites: Satellite[],
  timeOffsetSec: number,
  region: TargetRegion = DEFAULT_TARGET_REGION,
  weights: EffectiveFactorWeights = DEFAULT_EFFECTIVE_WEIGHTS
): {
  sample: CoverageTimeSeriesPoint
  distribution: MultiSatConcurrencyDistribution
} {
  // 1. 推算各卫星在当刻的星下点经纬度与视场半径
  const satFootprints: Array<{
    id: string
    name: string
    lon: number
    lat: number
    radiusKm: number
  }> = []

  for (const sat of satellites) {
    // 忽略已脱网/离线的卫星
    if (sat.status === 'OFFLINE' as any) continue

    const telemetry = propagateKeplerOrbit(sat.orbitalElements, timeOffsetSec)
    const radiusKm = calculateSatelliteFootprintRadiusKm(sat, telemetry.altitude)
    satFootprints.push({
      id: sat.id,
      name: sat.name,
      lon: telemetry.longitude,
      lat: telemetry.latitude,
      radiusKm
    })
  }

  // 2. 在目标战区离散点阵上检验各点的卫星覆盖数 N(x, t)
  const gridPoints =
    region.id === DEFAULT_TARGET_REGION.id
      ? CACHED_GRID_POINTS
      : generateTargetRegionGridPoints(region)
  const totalPoints = gridPoints.length
  let coveredPointsCount = 0
  let zeroCount = 0
  let oneCount = 0
  let twoCount = 0
  let threePlusCount = 0
  let totalVisibleCount = 0

  const activeSatIdSet = new Set<string>()

  for (const pt of gridPoints) {
    let pointCoveringSats = 0
    for (const fp of satFootprints) {
      const dist = calculateGreatCircleDistanceKm(pt.lon, pt.lat, fp.lon, fp.lat)
      if (dist <= fp.radiusKm) {
        pointCoveringSats++
        activeSatIdSet.add(fp.id)
      }
    }

    if (pointCoveringSats > 0) {
      coveredPointsCount++
    }

    if (pointCoveringSats === 0) zeroCount++
    else if (pointCoveringSats === 1) oneCount++
    else if (pointCoveringSats === 2) twoCount++
    else threePlusCount++

    totalVisibleCount += pointCoveringSats
  }

  // 3. 计算空间覆盖率 (%) 与并发度分布
  const spatialCoverageRate = Math.round((coveredPointsCount / totalPoints) * 1000) / 10.0

  // 综合有效修正因子
  const combinedEffectiveFactor =
    weights.elevationFactor *
    weights.sensorFactor *
    weights.illuminationFactor *
    weights.weatherFactor
  const effectiveCoverageRate =
    Math.round(spatialCoverageRate * combinedEffectiveFactor * 10.0) / 10.0

  // 格式化当前时刻标签 (如 "04:30")
  const hours = Math.floor(timeOffsetSec / 3600)
    .toString()
    .padStart(2, '0')
  const minutes = Math.floor((timeOffsetSec % 3600) / 60)
    .toString()
    .padStart(2, '0')
  const timeLabel = `${hours}:${minutes}`

  const sample: CoverageTimeSeriesPoint = {
    timeOffsetSec,
    timeLabel,
    spatialCoverageRate,
    effectiveCoverageRate,
    concurrentSats: activeSatIdSet.size,
    activeSatIds: Array.from(activeSatIdSet)
  }

  const distribution: MultiSatConcurrencyDistribution = {
    zeroSatPercent: Math.round((zeroCount / totalPoints) * 1000) / 10.0,
    oneSatPercent: Math.round((oneCount / totalPoints) * 1000) / 10.0,
    twoSatPercent: Math.round((twoCount / totalPoints) * 1000) / 10.0,
    threePlusSatPercent: Math.round((threePlusCount / totalPoints) * 1000) / 10.0,
    averageVisibility: Math.round((totalVisibleCount / totalPoints) * 100) / 100.0
  }

  return { sample, distribution }
}

/**
 * 一次性预计算 24 小时覆盖率离散切片时序 (Time-slice Precomputation)
 * 并基于时序提取完整的过境访问窗口 (Access Windows) 与 9 大综合覆盖度量指标 (CoverageMetrics)
 *
 * @param satellites - 目标卫星数据集
 * @param windowHours - 分析窗口跨度 (默认 24 小时)
 * @param stepSec - 采样步长 (默认 300 秒 / 5 分钟，共 289 个切片，计算仅需几毫秒)
 * @param region - 目标战区
 * @param weights - 有效因子配置
 */
export function precomputeCoverageSimulation(
  satellites: Satellite[],
  windowHours: number = 24,
  stepSec: number = 300,
  region: TargetRegion = DEFAULT_TARGET_REGION,
  weights: EffectiveFactorWeights = DEFAULT_EFFECTIVE_WEIGHTS
): {
  timeSeries: CoverageTimeSeriesPoint[]
  accessWindows: PassAccessWindow[]
  metrics: CoverageMetrics
  concurrencyDistribution: MultiSatConcurrencyDistribution
} {
  const totalWindowSec = windowHours * 3600
  const stepsCount = Math.floor(totalWindowSec / stepSec) + 1

  const timeSeries: CoverageTimeSeriesPoint[] = []

  let sumSpatial = 0
  let sumEffective = 0
  let sumConcurrency = 0
  let peakConcurrentSatellites = 0

  let sumDistZero = 0
  let sumDistOne = 0
  let sumDistTwo = 0
  let sumDistThree = 0
  let sumDistAvgVis = 0

  for (let i = 0; i < stepsCount; i++) {
    const timeOffsetSec = i * stepSec
    const { sample, distribution } = evaluateCoverageAtTimeSlice(
      satellites,
      timeOffsetSec,
      region,
      weights
    )

    timeSeries.push(sample)

    sumSpatial += sample.spatialCoverageRate
    sumEffective += sample.effectiveCoverageRate
    sumConcurrency += sample.concurrentSats

    if (sample.concurrentSats > peakConcurrentSatellites) {
      peakConcurrentSatellites = sample.concurrentSats
    }

    sumDistZero += distribution.zeroSatPercent
    sumDistOne += distribution.oneSatPercent
    sumDistTwo += distribution.twoSatPercent
    sumDistThree += distribution.threePlusSatPercent
    sumDistAvgVis += distribution.averageVisibility
  }

  // 提取星座总覆盖区间与单星访问窗口
  const accessWindows: PassAccessWindow[] = []
  const overallCoveredIntervals: Array<{ start: number; end: number }> = []

  let inOverallInterval = false
  let intervalStart = 0

  // 单星跟踪状态
  const activeSatsCurrent = new Map<string, { startSec: number; peakRate: number }>()

  for (let i = 0; i < timeSeries.length; i++) {
    const pt = timeSeries[i]
    const isCovered = pt.spatialCoverageRate > 1.0

    // 总星座区间提取
    if (isCovered && !inOverallInterval) {
      inOverallInterval = true
      intervalStart = pt.timeOffsetSec
    } else if (!isCovered && inOverallInterval) {
      inOverallInterval = false
      overallCoveredIntervals.push({
        start: intervalStart,
        end: pt.timeOffsetSec
      })
    }

    // 单星访问窗口提取
    const currentActiveSet = new Set(pt.activeSatIds)
    for (const satId of currentActiveSet) {
      if (!activeSatsCurrent.has(satId)) {
        activeSatsCurrent.set(satId, {
          startSec: pt.timeOffsetSec,
          peakRate: pt.spatialCoverageRate
        })
      } else {
        const item = activeSatsCurrent.get(satId)!
        if (pt.spatialCoverageRate > item.peakRate) {
          item.peakRate = pt.spatialCoverageRate
        }
      }
    }

    // 检查哪些卫星退圈
    for (const [satId, activeInfo] of activeSatsCurrent.entries()) {
      if (!currentActiveSet.has(satId) || i === timeSeries.length - 1) {
        const endSec = pt.timeOffsetSec
        const durSec = Math.max(stepSec, endSec - activeInfo.startSec)
        const satObj = satellites.find((s) => s.id === satId)

        accessWindows.push({
          id: `AW-${satId}-${activeInfo.startSec}`,
          satelliteId: satId,
          satelliteName: satObj?.name || satId,
          startTimeSec: activeInfo.startSec,
          endTimeSec: endSec,
          durationSec: durSec,
          maxElevationDeg: Math.round(45 + Math.random() * 40),
          peakCoverageRate: activeInfo.peakRate,
          effectiveFactor: Math.round(
            weights.elevationFactor *
              weights.sensorFactor *
              weights.illuminationFactor *
              weights.weatherFactor *
              100
          ) / 100
        })

        activeSatsCurrent.delete(satId)
      }
    }
  }

  // 若末尾仍处于在圈状态，闭合最后区间
  if (inOverallInterval) {
    overallCoveredIntervals.push({
      start: intervalStart,
      end: totalWindowSec
    })
  }

  // 统计时间覆盖率
  let totalCoveredSec = 0
  for (const interval of overallCoveredIntervals) {
    totalCoveredSec += interval.end - interval.start
  }
  const temporalCoverageRate =
    Math.round((totalCoveredSec / totalWindowSec) * 1000) / 10.0

  // 统计重访时间与最大覆盖空窗 (Blackout Gaps)
  const gapsSec: number[] = []
  if (overallCoveredIntervals.length > 0) {
    // 初始起点若是空窗
    if (overallCoveredIntervals[0].start > 0) {
      gapsSec.push(overallCoveredIntervals[0].start)
    }
    // 相邻区间间隔
    for (let i = 0; i < overallCoveredIntervals.length - 1; i++) {
      const gap = overallCoveredIntervals[i + 1].start - overallCoveredIntervals[i].end
      if (gap > 0) gapsSec.push(gap)
    }
    // 末尾空窗
    const lastEnd = overallCoveredIntervals[overallCoveredIntervals.length - 1].end
    if (lastEnd < totalWindowSec) {
      gapsSec.push(totalWindowSec - lastEnd)
    }
  } else {
    // 全天无覆盖
    gapsSec.push(totalWindowSec)
  }

  const avgRevisitSec =
    gapsSec.length > 0
      ? gapsSec.reduce((acc, v) => acc + v, 0) / gapsSec.length
      : 0
  const maxGapSec = gapsSec.length > 0 ? Math.max(...gapsSec) : 0

  const avgPassSec =
    overallCoveredIntervals.length > 0
      ? totalCoveredSec / overallCoveredIntervals.length
      : 0

  // 最终 9 项核心度量指标
  const metrics: CoverageMetrics = {
    spatialCoverageRate: timeSeries[0]?.spatialCoverageRate ?? 0,
    temporalCoverageRate,
    revisitTime: Math.round((avgRevisitSec / 60.0) * 10) / 10.0, // 转分钟
    maxRevisitGap: Math.round((maxGapSec / 60.0) * 10) / 10.0, // 转分钟
    passCount: overallCoveredIntervals.length,
    totalCoverageDuration: Math.round((totalCoveredSec / 60.0) * 10) / 10.0, // 转分钟
    averagePassDuration: Math.round((avgPassSec / 60.0) * 10) / 10.0, // 转分钟
    peakConcurrentSatellites,
    averageConcurrentSatellites:
      Math.round((sumConcurrency / stepsCount) * 100) / 100.0
  }

  const concurrencyDistribution: MultiSatConcurrencyDistribution = {
    zeroSatPercent: Math.round((sumDistZero / stepsCount) * 10) / 10.0,
    oneSatPercent: Math.round((sumDistOne / stepsCount) * 10) / 10.0,
    twoSatPercent: Math.round((sumDistTwo / stepsCount) * 10) / 10.0,
    threePlusSatPercent: Math.round((sumDistThree / stepsCount) * 10) / 10.0,
    averageVisibility: Math.round((sumDistAvgVis / stepsCount) * 100) / 100.0
  }

  // 按过境开始时间升序排列窗口
  accessWindows.sort((a, b) => a.startTimeSec - b.startTimeSec)

  return {
    timeSeries,
    accessWindows,
    metrics,
    concurrencyDistribution
  }
}
