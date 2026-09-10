/**
 * @fileoverview 卫星多维时空覆盖率、重访周期与时序访问窗口核心类型定义文件
 * 包含空间覆盖率、时间覆盖率、重访空窗、单次过境时长、多星重叠并发分布及传感器有效修正参数
 */

/**
 * 核心综合覆盖度量指标接口
 */
export interface CoverageMetrics {
  /** 当前瞬时空间覆盖率 (Spatial Coverage Rate, 0 - 100%) */
  spatialCoverageRate: number
  /** 分析窗口内累计时间覆盖率 (Temporal Coverage Rate, 0 - 100%) */
  temporalCoverageRate: number
  /** 目标区域平均重访时间 (Mean Revisit Time, 单位: 分钟) */
  revisitTime: number
  /** 目标区域最大覆盖空窗时长 (Maximum Blackout / Gap, 单位: 分钟) */
  maxRevisitGap: number
  /** 分析窗口内有效过境/访问次数 (Pass Count) */
  passCount: number
  /** 窗口内累计有效覆盖总时长 (Total Coverage Duration, 单位: 分钟) */
  totalCoverageDuration: number
  /** 平均单次过境持续时长 (Average Pass Duration, 单位: 分钟) */
  averagePassDuration: number
  /** 峰值同时覆盖卫星数 (Peak Concurrent Satellites) */
  peakConcurrentSatellites: number
  /** 目标空域平均同时可用/可见卫星数 (Average Concurrent Satellites) */
  averageConcurrentSatellites: number
}

/**
 * 24小时离散时序切片采样点接口 (用于时间轴快速索引与波形图渲染)
 */
export interface CoverageTimeSeriesPoint {
  /** 相对任务仿真起点的偏移时间 (秒，0 - 86400) */
  timeOffsetSec: number
  /** 仿真时刻格式化标签 (例如 "10:30") */
  timeLabel: string
  /** 瞬时空间几何覆盖率 (0 - 100%) */
  spatialCoverageRate: number
  /** 综合传感器与气象修正后的有效覆盖率 (0 - 100%) */
  effectiveCoverageRate: number
  /** 当前时刻覆盖该区域的在圈卫星数 */
  concurrentSats: number
  /** 当前时刻有效覆盖该战区的卫星 ID 列表 */
  activeSatIds: string[]
}

/**
 * 单次过境访问窗口 (Access Window) 实体接口
 */
export interface PassAccessWindow {
  /** 窗口唯一标识 */
  id: string
  /** 卫星唯一 ID */
  satelliteId: string
  /** 卫星名称 */
  satelliteName: string
  /** 进入目标空域时刻 (秒) */
  startTimeSec: number
  /** 离开目标空域时刻 (秒) */
  endTimeSec: number
  /** 过境持续时长 (秒) */
  durationSec: number
  /** 过境峰值仰角 (度) */
  maxElevationDeg: number
  /** 峰值覆盖率 (%) */
  peakCoverageRate: number
  /** 传感器与环境有效综合折减系数 (0 - 1.0) */
  effectiveFactor: number
}

/**
 * 多星重叠冗余并发度空间与时间概率分布
 */
export interface MultiSatConcurrencyDistribution {
  /** 0 颗卫星覆盖比例 (完全失控/盲区占比, 0 - 100%) */
  zeroSatPercent: number
  /** 恰好 1 颗卫星覆盖比例 (单星单链观测, 0 - 100%) */
  oneSatPercent: number
  /** 恰好 2 颗卫星覆盖比例 (双星立体侦察/中继交织, 0 - 100%) */
  twoSatPercent: number
  /** 3 颗及以上卫星同时覆盖比例 (高重叠星座压制, 0 - 100%) */
  threePlusSatPercent: number
  /** 区域平均可见卫星数 Integral(N(x,t)dA) / A */
  averageVisibility: number
}

/**
 * 战区目标评估区域几何定义
 */
export interface TargetRegion {
  /** 区域唯一标识 */
  id: string
  /** 区域名称 (例如: 第一岛链防空识别圈、台海核心战区) */
  name: string
  /** 区域中心地理经度 (度) */
  centerLon: number
  /** 区域中心地理纬度 (度) */
  centerLat: number
  /** 区域有效作战半径 (公里) */
  radiusKm: number
  /** 区域投影总几何面积 (平方公里) */
  areaSqKm: number
}

/**
 * 有效覆盖率修正因子权重配置
 */
export interface EffectiveFactorWeights {
  /** 最低工作仰角限制 (度，低于此仰角视为地物遮挡无效应) */
  minElevationDeg: number
  /** 仰角修正系数 F_elevation (0 - 1.0) */
  elevationFactor: number
  /** 传感器类型与分辨率修正系数 F_sensor (0 - 1.0) */
  sensorFactor: number
  /** 昼夜与太阳天顶角光照修正系数 F_illumination (0 - 1.0) */
  illuminationFactor: number
  /** 云量与对流层大气衰减修正系数 F_weather (0 - 1.0) */
  weatherFactor: number
}
