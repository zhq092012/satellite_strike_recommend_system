/**
 * @fileoverview 轨道动力学推演与空间地理计算服务
 * 包含开普勒轨道外推、星下点经纬度计算、瞬时线速度评估、以及传感器地面覆盖视场几何生成
 */

import { OrbitalElements, Satellite, TelemetryData } from '../types/satellite'

/**
 * 地球标准引力常数 GM (Geocentric Gravitational Constant)，单位：km³/s²
 */
export const EARTH_GRAVITATIONAL_CONSTANT = 398600.4418

/**
 * 地球平均赤道半径，单位：km
 */
export const EARTH_EQUATORIAL_RADIUS = 6378.137

/**
 * 地球自转角速度，单位：度/秒 (360度 / 86164.0905秒 恒星日)
 */
export const EARTH_ROTATION_RATE_DEG_PER_SEC = 360.0 / 86164.0905

/**
 * 二维地理经纬度坐标点
 */
export interface GeoCoordinate {
  /** 经度 (Longitude)，单位：度 (-180 到 180) */
  longitude: number
  /** 纬度 (Latitude)，单位：度 (-90 到 90) */
  latitude: number
}

/**
 * 三维地理空间坐标点 (含高度)
 */
export interface GeoPosition3D extends GeoCoordinate {
  /** 距海平面椭球体高度 (Altitude)，单位：米 (m) */
  altitude: number
}

/**
 * 求解开普勒偏近点角方程 (Kepler's Equation: M = E - e * sin(E))
 * 采用牛顿-拉弗森切线迭代法 (Newton-Raphson Method) 进行快速高精度数值收敛
 *
 * @param meanAnomalyDeg - 平近点角 (Mean Anomaly)，单位：度
 * @param eccentricity - 轨道偏心率 (Eccentricity)，无量纲 [0, 1)
 * @returns 偏近点角 (Eccentric Anomaly)，单位：弧度 (rad)
 * @throws {Error} 若偏心率超出椭圆轨道范围 [0, 1) 则抛出异常
 */
export function solveKeplerEquation(meanAnomalyDeg: number, eccentricity: number): number {
  if (eccentricity < 0 || eccentricity >= 1) {
    throw new Error(`Invalid eccentricity for elliptical orbit: ${eccentricity}`)
  }

  // 将平近点角转换至 [0, 2π) 弧度区间
  const M = ((meanAnomalyDeg % 360 + 360) % 360) * (Math.PI / 180.0)

  // 初始迭代初值选取
  let E = eccentricity > 0.8 ? Math.PI : M
  const maxIterations = 20
  const tolerance = 1e-8

  // 牛顿切线迭代计算
  for (let i = 0; i < maxIterations; i++) {
    const delta = (E - eccentricity * Math.sin(E) - M) / (1.0 - eccentricity * Math.cos(E))
    E -= delta
    if (Math.abs(delta) < tolerance) {
      break
    }
  }

  return E
}

/**
 * 根据开普勒经典轨道参数及推进时差，计算卫星在当前历元的星下点地理坐标及瞬时状态
 *
 * @param elements - 卫星轨道六根数
 * @param elapsedTimeSeconds - 相对于参考初始历元经过的时长 (秒)
 * @returns 包含经纬度、高度、速度与瞬时覆盖面积的最新遥测数据对象
 */
export function propagateKeplerOrbit(
  elements: OrbitalElements,
  elapsedTimeSeconds: number
): Pick<TelemetryData, 'latitude' | 'longitude' | 'altitude' | 'velocity' | 'groundCoverageArea'> {
  // 1. 计算轨道平均角速度 n (Mean Motion)，单位：弧度/秒
  // 开普勒第三定律: n = sqrt(mu / a^3)
  const aKm = elements.semiMajorAxis
  const meanMotionRadPerSec = Math.sqrt(EARTH_GRAVITATIONAL_CONSTANT / Math.pow(aKm, 3))
  const meanMotionDegPerSec = meanMotionRadPerSec * (180.0 / Math.PI)

  // 2. 计算当前时刻平近点角 M
  const currentMeanAnomalyDeg = (elements.meanAnomaly + meanMotionDegPerSec * elapsedTimeSeconds) % 360.0

  // 3. 求解偏近点角 E (弧度)
  const E = solveKeplerEquation(currentMeanAnomalyDeg, elements.eccentricity)

  // 4. 计算真近点角 nu (True Anomaly，弧度)
  // tan(nu / 2) = sqrt((1 + e) / (1 - e)) * tan(E / 2)
  const sqrtFactor = Math.sqrt((1.0 + elements.eccentricity) / (1.0 - elements.eccentricity))
  const nu = 2.0 * Math.atan2(sqrtFactor * Math.sin(E / 2.0), Math.cos(E / 2.0))

  // 5. 计算地心距 r (单位: km)
  // r = a * (1 - e * cos(E))
  const rKm = aKm * (1.0 - elements.eccentricity * Math.cos(E))
  const altitudeKm = Math.max(0, rKm - EARTH_EQUATORIAL_RADIUS)

  // 6. 轨道平面坐标转换至地心天球/地理坐标
  // 纬度幅角 u = omega + nu
  const omegaRad = elements.argOfPerigee * (Math.PI / 180.0)
  const uRad = omegaRad + nu
  const incRad = elements.inclination * (Math.PI / 180.0)

  // 瞬时地心纬度 delta: sin(delta) = sin(inc) * sin(u)
  const sinDelta = Math.sin(incRad) * Math.sin(uRad)
  const latitudeDeg = Math.asin(Math.max(-1.0, Math.min(1.0, sinDelta))) * (180.0 / Math.PI)

  // 升交点赤经与轨道平面内经度分量
  const yOrb = Math.cos(incRad) * Math.sin(uRad)
  const xOrb = Math.cos(uRad)
  const orbitalLonDeg = Math.atan2(yOrb, xOrb) * (180.0 / Math.PI)

  // 考虑地球自转效应引起的升交点西移
  const raanDeg = elements.raan
  const earthRotationDeg = EARTH_ROTATION_RATE_DEG_PER_SEC * elapsedTimeSeconds
  let longitudeDeg = (raanDeg + orbitalLonDeg - earthRotationDeg) % 360.0
  if (longitudeDeg > 180.0) longitudeDeg -= 360.0
  if (longitudeDeg < -180.0) longitudeDeg += 360.0

  // 7. 计算瞬时轨道速率 v (单位: km/s)
  // 活力公式 (Vis-Viva equation): v = sqrt(mu * (2/r - 1/a))
  const velocityKmS = Math.sqrt(
    Math.max(0, EARTH_GRAVITATIONAL_CONSTANT * (2.0 / rKm - 1.0 / aKm))
  )

  // 8. 估算对地覆盖区域半径 (球面几何)
  // 地心角 beta = 90 - elevation - acos(Re / (Re + h) * cos(elevation))
  const horizonAngle = Math.acos(EARTH_EQUATORIAL_RADIUS / (EARTH_EQUATORIAL_RADIUS + altitudeKm))
  const coverageRadiusKm = EARTH_EQUATORIAL_RADIUS * horizonAngle * 0.75
  const groundCoverageArea = Math.round(Math.PI * Math.pow(coverageRadiusKm, 2))

  return {
    latitude: parseFloat(latitudeDeg.toFixed(4)),
    longitude: parseFloat(longitudeDeg.toFixed(4)),
    altitude: parseFloat(altitudeKm.toFixed(1)),
    velocity: parseFloat(velocityKmS.toFixed(2)),
    groundCoverageArea
  }
}

/**
 * 生成卫星运行整轨的空间 3D 轨迹点序列
 *
 * @param elements - 轨道六根数
 * @param segments - 采样点数量 (默认为 120 个点以保证平滑闭合)
 * @returns 3D 笛卡尔经纬度高度数组列表
 */
export function generateOrbitPath(
  elements: OrbitalElements,
  segments: number = 120
): GeoPosition3D[] {
  const points: GeoPosition3D[] = []
  const periodSeconds = elements.period * 60.0
  const stepSeconds = periodSeconds / segments

  for (let i = 0; i <= segments; i++) {
    const t = i * stepSeconds
    const state = propagateKeplerOrbit(elements, t)
    points.push({
      longitude: state.longitude,
      latitude: state.latitude,
      altitude: state.altitude * 1000.0 // 转换为米用于 Cesium 渲染
    })
  }

  return points
}

/**
 * 根据卫星当前星下点位置与半视场角，生成地面有效覆盖圆形多边形经纬度点集
 *
 * @param centerLon - 卫星星下点经度 (度)
 * @param centerLat - 卫星星下点纬度 (度)
 * @param altitudeKm - 卫星当前对地高度 (km)
 * @param halfFovDeg - 传感器对地半视场角 (度)
 * @param numPoints - 覆盖多边形采样边数 (默认为 36 边形)
 * @returns 构成多边形闭合边缘的经纬度数组
 */
export function calculateSensorFootprint(
  centerLon: number,
  centerLat: number,
  altitudeKm: number,
  halfFovDeg: number,
  numPoints: number = 36
): GeoCoordinate[] {
  // 视场角对应地面覆盖角计算
  const fovRad = halfFovDeg * (Math.PI / 180.0)
  // 地心视角弧度
  const centralAngleRad = Math.min(
    Math.PI / 3.0,
    Math.asin((altitudeKm / EARTH_EQUATORIAL_RADIUS) * Math.sin(fovRad))
  )
  const radiusKm = EARTH_EQUATORIAL_RADIUS * centralAngleRad

  // 将半径转换为经纬度近似度数 (1度约111km)
  const latRadiusDeg = radiusKm / 111.32
  const lonRadiusDeg = radiusKm / (111.32 * Math.cos(centerLat * (Math.PI / 180.0)) || 1)

  const footprintPoints: GeoCoordinate[] = []
  for (let i = 0; i < numPoints; i++) {
    const angle = (i / numPoints) * 2.0 * Math.PI
    let lon = centerLon + lonRadiusDeg * Math.cos(angle)
    let lat = centerLat + latRadiusDeg * Math.sin(angle)

    // 边界钳位处理
    if (lat > 89.9) lat = 89.9
    if (lat < -89.9) lat = -89.9
    if (lon > 180.0) lon -= 360.0
    if (lon < -180.0) lon += 360.0

    footprintPoints.push({ longitude: lon, latitude: lat })
  }

  return footprintPoints
}

/**
 * 更新卫星全生命周期动态遥测与姿态数据
 *
 * @param satellite - 待更新的目标卫星
 * @param elapsedSeconds - 历元推演时差
 * @returns 包含最新遥测数据的卫星对象克隆副本
 */
export function updateSatelliteTelemetry(
  satellite: Satellite,
  elapsedSeconds: number
): Satellite {
  const dynamicState = propagateKeplerOrbit(satellite.orbitalElements, elapsedSeconds)

  // 模拟蓄电池充放电周期 (随纬度太阳照射角微弱起伏)
  const isSunlit = Math.cos(dynamicState.latitude * (Math.PI / 180.0)) > 0
  const targetBattery = isSunlit ? 96.0 : 82.0
  const currentBattery = satellite.telemetry.batterySoc + (targetBattery - satellite.telemetry.batterySoc) * 0.05

  return {
    ...satellite,
    telemetry: {
      ...satellite.telemetry,
      latitude: dynamicState.latitude,
      longitude: dynamicState.longitude,
      altitude: dynamicState.altitude,
      velocity: dynamicState.velocity,
      groundCoverageArea: dynamicState.groundCoverageArea,
      batterySoc: parseFloat(currentBattery.toFixed(1)),
      solarPower: isSunlit ? 2500 + Math.floor(Math.random() * 80) : 0
    }
  }
}
