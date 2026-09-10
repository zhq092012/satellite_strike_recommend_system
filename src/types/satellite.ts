/**
 * @fileoverview 卫星态势分析系统核心类型定义文件
 * 包含卫星分类、轨道要素、实时遥测数据、战术告警事件与视场传感器配置等全生命周期类型
 */
/**
 * 卫星任务类型枚举
 */
export enum SatelliteCategory {
  /** 光学/雷达成像侦察卫星 (Optical / SAR Reconnaissance) */
  RECONNAISSANCE = 'RECONNAISSANCE',
  /** 早期预警与电子侦察卫星 (Early Warning & ELINT) */
  EARLY_WARNING = 'EARLY_WARNING',
  /** 战术通信中继卫星 (Tactical Communication & Relay) */
  COMMUNICATION = 'COMMUNICATION',
  /** 导航与定位授时卫星 (Navigation & Positioning) */
  NAVIGATION = 'NAVIGATION',
  /** 空间实验与技术验证卫星 (Experimental) */
  EXPERIMENTAL = 'EXPERIMENTAL',
  /** 中继卫星 */
  RELAY = "RELAY"
}

/**
 * 卫星轨道高度层级类型枚举
 */
export enum OrbitType {
  /** 低地球轨道 (Low Earth Orbit, 160km - 2000km) */
  LEO = 'LEO',
  /** 中地球轨道 (Medium Earth Orbit, 2000km - 35786km) */
  MEO = 'MEO',
  /** 地球静止轨道 (Geostationary Earth Orbit, 约 35786km) */
  GEO = 'GEO',
  /** 高椭圆轨道 (Highly Elliptical Orbit) */
  HEO = 'HEO'
}

/**
 * 卫星当前在轨运行状态枚举
 */
export enum OperationalStatus {
  /** 运行正常，处于常态监视/服务状态 */
  NORMAL = 'NORMAL',
  /** 任务执行中 (例如机动变轨、高优先级对地成像) */
  ACTIVE = 'ACTIVE',
  /** 异常警报状态 (例如轨道交会预警、姿态偏差) */
  ALERT = 'ALERT',
  /** 测控盲区或脱网离线状态 */
  OFFLINE = 'OFFLINE'
}

/**
 * 战术告警事件威胁严重程度等级枚举
 */
export enum AlertSeverity {
  /** 一般信息提示 (如过境入圈) */
  INFO = 'INFO',
  /** 注意级提醒 (如测控盲区预警) */
  WARNING = 'WARNING',
  /** 严重危险告警 (如空间碎片距离过近、碰撞预警) */
  CRITICAL = 'CRITICAL'
}

/**
 * 开普勒经典轨道六根数 (Keplerian Orbital Elements) 接口定义
 */
export interface OrbitalElements {
  /**
   * 轨道半长轴 (Semi-Major Axis)，单位：公里 (km)
   * 决定轨道大小与运行周期
   */
  semiMajorAxis: number

  /**
   * 轨道偏心率 (Eccentricity)，无量纲 [0, 1)
   * 0 为正圆，接近 1 为高度扁平椭圆
   */
  eccentricity: number

  /**
   * 轨道倾角 (Inclination)，单位：角度 (deg)
   * 轨道平面与地球赤道平面的夹角
   */
  inclination: number

  /**
   * 升交点赤经 (Right Ascension of Ascending Node, RAAN)，单位：角度 (deg)
   * 决定轨道平面在惯性空间中的朝向方位
   */
  raan: number

  /**
   * 近地点幅角 (Argument of Perigee)，单位：角度 (deg)
   * 决定椭圆轨道近地点在轨道平面内的方向
   */
  argOfPerigee: number

  /**
   * 平近点角 (Mean Anomaly) 或初相角，单位：角度 (deg)
   * 描述参考历元时刻卫星在轨道上的位置
   */
  meanAnomaly: number

  /**
   * 近地点高度 (Perigee Altitude)，单位：公里 (km)
   */
  perigeeAltitude: number

  /**
   * 远地点高度 (Apogee Altitude)，单位：公里 (km)
   */
  apogeeAltitude: number

  /**
   * 运行周期 (Orbital Period)，单位：分钟 (min)
   */
  period: number
}

/**
 * 卫星对地探测/通信载荷视场传感器配置接口
 */
export interface SensorPayload {
  /** 传感器名称或型号代号 */
  name: string
  /** 传感器类型 (如：高分光学相机、合成孔径雷达 SAR、电子截获天线) */
  type: string
  /** 半视场角 (Half Field of View)，单位：角度 (deg) */
  halfFov: number
  /** 当前工作状态 (开机、待机、关机) */
  status: 'ACTIVE' | 'STANDBY' | 'OFF'
  /** 传感器地面扫宽 (Swath Width)，单位：公里 (km) */
  swathWidth: number
  /** 覆盖锥体颜色值 (CSS/Hex 格式) */
  beamColor: string
}

/**
 * 实时动态遥测数据接口
 */
export interface TelemetryData {
  /** 星下点大地纬度 (Sub-satellite Latitude)，单位：度 (-90 到 90) */
  latitude: number
  /** 星下点大地经度 (Sub-satellite Longitude)，单位：度 (-180 到 180) */
  longitude: number
  /** 卫星距地球椭球面瞬时高度 (Instant Altitude)，单位：公里 (km) */
  altitude: number
  /** 瞬时轨道线速度 (Orbital Speed)，单位：公里/秒 (km/s) */
  velocity: number
  /** 卫星俯仰角 (Pitch)，单位：度 */
  pitch: number
  /** 卫星横滚角 (Roll)，单位：度 */
  roll: number
  /** 卫星偏航角 (Yaw)，单位：度 */
  yaw: number
  /** 蓄电池荷电状态 (State of Charge, SoC)，百分比 0-100 */
  batterySoc: number
  /** 太阳能帆板输出功率，单位：瓦特 (W) */
  solarPower: number
  /** 剩余推进剂储量，单位：公斤 (kg) */
  propellantMass: number
  /** 瞬时地面有效覆盖面积，单位：平方公里 (km²) */
  groundCoverageArea: number
}

/**
 * 卫星全景态势实体接口
 */
export interface Satellite {
  /** 卫星唯一标识符 (例如：SAT-2024-001A) */
  id: string
  /** 卫星代号或公开发布名称 (例如：高分六号 GF-6、遥感三十号 YG-30) */
  name: string
  /** 北美防空司令部编目编号 (NORAD Catalog ID) */
  noradId: number
  /** 国际发射代号 (COSPAR ID) */
  cosparId: string
  /** 卫星任务分类 */
  category: SatelliteCategory
  /** 轨道类型 */
  orbitType: OrbitType
  /** 当前在轨运行状态 */
  status: OperationalStatus
  /** 发射入轨时间 (ISO 8601 日期字符串) */
  launchDate: string
  /** 所属单位/国家/阵营代号 */
  owner: string
  /** 所属卫星系列/星座代号 (例如：Starlink、Starshield、WorldView、Keyhole、SBIRS、GPS 等) */
  series?: string
  /** 经典开普勒轨道六根数 */
  orbitalElements: OrbitalElements
  /** 载荷传感器配置 */
  sensor: SensorPayload
  /** 实时遥测指标 */
  telemetry: TelemetryData
  /** 轨道渲染高亮色 (Hex 字符串，如 #00f0ff) */
  color: string
  /** 3D 渲染实体引用 ID (Cesium Entity ID) */
  entityId?: string
  /**
   * 目标卫星综合威胁度得分 (0 - 100 分)
   * 结合载荷威慑力、轨道近度、重访频次与战略价值多因子加权评估
   */
  threatScore: number
  /**
   * 目标卫星战术威胁评定等级
   */
  threatLevel: ThreatLevel
  /**
   * 端到端空间通信与数传链路时延，单位：毫秒 (ms)
   */
  linkLatencyMs: number
  /**
   * 地面有效瞬时或重叠覆盖率，百分比 (0 - 100)
   * 对战术通信与广域中继卫星尤为关键
   */
  coverageRate?: number
  /**
   * 单次对战区/地面站有效过境观测与下传窗口时长，单位：秒 (s)
   */
  overpassDurationSec: number
  /**
   * 我方武器打击可行性综合评分 (0 - 100 分)
   * 结合武器射高包络、单发命中概率 Pk 与阵地反应发射时间测算
   */
  strikeFeasibilityScore: number
  /**
   * 推荐打击手段与可行性评估简述
   */
  strikeFeasibilityReason?: string
}

/**
 * 目标卫星战术威胁度评定等级枚举
 */
export enum ThreatLevel {
  /** 极高威胁 (Critical): 处于战区上空实时侦察或下发火控指引 */
  CRITICAL = 'CRITICAL',
  /** 高危威胁 (High): 战略中继或广域监视卫星 */
  HIGH = 'HIGH',
  /** 中度威胁 (Medium): 处于交会轨道或辅助通信星 */
  MEDIUM = 'MEDIUM',
  /** 低度威胁 (Low): 常规商用或离线卫星 */
  LOW = 'LOW'
}

/**
 * 卫星在轨列表排序维度类型
 */
export type SatelliteSortBy =
  | 'DEFAULT'
  | 'THREAT_DESC'
  | 'THREAT_ASC'
  | 'LATENCY_ASC'
  | 'LATENCY_DESC'
  | 'COVERAGE_DESC'
  | 'COVERAGE_ASC'

/**
 * 战术告警事件接口
 */
export interface TacticalAlert {
  /** 告警唯一流水号 */
  id: string
  /** 告警生成时间戳 (UTC ISO 字符串) */
  timestamp: string
  /** 关联的卫星代号 */
  satelliteName: string
  /** 关联的卫星 ID */
  satelliteId: string
  /** 告警严重级别 */
  severity: AlertSeverity
  /** 告警简要标题 */
  title: string
  /** 告警详细描述信息 */
  details: string
  /** 是否已被指控人员已读或处置 */
  acknowledged: boolean
}

/**
 * 地理三维视点相机预设接口
 */
export interface CameraPreset {
  /** 预设名称 */
  name: string
  /** 战术标识 */
  code: string
  /** 目标经度 (度) */
  longitude: number
  /** 目标纬度 (度) */
  latitude: number
  /** 视点高度 (米) */
  height: number
  /** 相机航向角 (Heading, 弧度) */
  heading: number
  /** 相机俯仰角 (Pitch, 弧度) */
  pitch: number
  /** 相机翻滚角 (Roll, 弧度) */
  roll: number
}

/**
 * 态势推演时钟状态接口
 */
export interface SimulationClockState {
  /** 当前推演历元绝对时间 (毫秒时间戳) */
  currentTime: number
  /** 是否处于播放推演中 */
  isPlaying: boolean
  /** 推演时间倍速 (1x, 5x, 10x, 60x, 300x) */
  multiplier: number
}
