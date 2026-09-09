/**
 * @fileoverview 战场与作战任务动态管理类型定义文件
 * 包含战场空域区域定义、任务参数、打击卫星类别、政治红线枚举、多对多关联与导入导出格式等完整 TSDoc 注释
 */

/**
 * 战场空域地理几何区域类型
 */
export enum CombatAreaType {
  /** 圆形防空/反导/侦察打击圈 (经纬度中心锚点 + 半径) */
  CIRCLE = 'CIRCLE',
  /** 矩形地理经纬度范围包围盒 (MinLon, MaxLon, MinLat, MaxLat) */
  BOUNDING_BOX = 'BOUNDING_BOX',
  /** 自定义多边形点序列 (Polygon / GeoJSON 导入) */
  POLYGON = 'POLYGON'
}

/**
 * 战场战备与活跃状态枚举
 */
export enum BattlefieldStatus {
  /** 处于高度戒备与作战执行中 */
  ACTIVE = 'ACTIVE',
  /** 演训部署与战前准备阶段 */
  PREPARING = 'PREPARING',
  /** 待命常态监视状态 */
  STANDBY = 'STANDBY',
  /** 任务结案或已封存 */
  CONCLUDED = 'CONCLUDED'
}

/**
 * 打击任务政治红线枚举
 */
export enum PoliticalRedLine {
  /** 仅打击纯军用侦察/指挥控制卫星 (严格限制附带损伤) */
  MILITARY_ONLY = 'MILITARY_ONLY',
  /** 仅针对民用关键基础设施卫星 (受限慎用，需最高指挥层授权) */
  CIVILIAN_ONLY = 'CIVILIAN_ONLY',
  /** 军民两用全维无差别立体打击 (包含军商两用星座如星链、WorldView 等) */
  MILITARY_AND_CIVILIAN = 'MILITARY_AND_CIVILIAN'
}

/**
 * 任务中针对的目标卫星主要类型
 */
export enum TargetSatelliteType {
  /** 光学/雷达高分辨率对地侦察卫星 */
  RECONNAISSANCE = 'RECONNAISSANCE',
  /** 宽带互联网与超高频战术通信卫星 */
  COMMUNICATION = 'COMMUNICATION',
  /** 高轨空间高速数据中继卫星 */
  RELAY = 'RELAY',
  /** 军用高精度授时与伪距导航定位卫星 */
  NAVIGATION = 'NAVIGATION',
  /** 弹道导弹红外探测早期预警卫星 */
  EARLY_WARNING = 'EARLY_WARNING'
}

/**
 * 任务执行生命周期阶段枚举
 */
export enum MissionStatus {
  /** 作战计划编制与推演审核中 */
  PLANNING = 'PLANNING',
  /** 任务下发执行中 (动能拦截/高能激光/电子压制) */
  EXECUTING = 'EXECUTING',
  /** 任务已执行完毕评估中 */
  COMPLETED = 'COMPLETED',
  /** 任务中止或取消 */
  ABORTED = 'ABORTED'
}

/**
 * 任务战略优先级等级
 */
export enum MissionPriority {
  /** 最高战略特级优先级 (绝密即时响应) */
  CRITICAL = 'CRITICAL',
  /** 高优先级战术任务 */
  HIGH = 'HIGH',
  /** 常态例行监视压制任务 */
  MEDIUM = 'MEDIUM'
}

/**
 * 战场地理经纬度范围包围盒
 */
export interface BoundingBoxRange {
  /** 最小经度 (西边界，度) */
  minLon: number
  /** 最大经度 (东边界，度) */
  maxLon: number
  /** 最小纬度 (南边界，度) */
  minLat: number
  /** 最大纬度 (北边界，度) */
  maxLat: number
}

/**
 * 作战区域几何模型定义接口
 */
export interface CombatArea {
  /** 作战空域几何类型 */
  type: CombatAreaType
  /** 战场中心锚点经纬度坐标 */
  center: {
    /** 中心点经度 (度) */
    longitude: number
    /** 中心点纬度 (度) */
    latitude: number
  }
  /** 作战覆盖半径 (公里，仅在 CIRCLE 类型时生效) */
  radiusKm: number
  /** 经纬度包围盒范围 (仅在 BOUNDING_BOX 类型时生效) */
  bounds?: BoundingBoxRange
  /** 自定义多边形闭合顶点序列 (仅在 POLYGON 类型时生效) */
  polygonCoordinates?: Array<{
    /** 经度 (度) */
    longitude: number
    /** 纬度 (度) */
    latitude: number
  }>
}

/**
 * 战场态势实体接口
 */
export interface Battlefield {
  /** 战场唯一标识符 (例如：BF-2026-001) */
  id: string
  /** 战场全称 (例如：台海战区空天封锁空域) */
  name: string
  /** 战术代号 (例如：TAIWAN-STRAIT-AO) */
  code: string
  /** 当前战区战备状态 */
  status: BattlefieldStatus
  /** 战场地理空域范围几何模型 */
  area: CombatArea
  /**
   * 关联的作战任务 ID 列表 (实现战场与任务多对多关联)
   */
  missionIds: string[]
  /** 战场战术预警色彩 (Hex，如 #ef4444) */
  color: string
  /** 战场详细战略说明或作战背景 */
  description: string
  /** 战场创建时间 (ISO 字符串) */
  createdAt: string
  /** 最后更新时间 (ISO 字符串) */
  updatedAt: string
}

/**
 * 作战任务实体接口
 */
export interface CombatMission {
  /** 任务唯一流水号 (例如：MSN-2026-01) */
  id: string
  /** 任务名称 (例如：低轨高分侦察星链压制行动) */
  name: string
  /** 任务战术代号 (例如：OPERATION-SKY-SHIELD) */
  code: string
  /** 任务预计/实际开始时间 (ISO 字符串) */
  startTime: string
  /** 任务预计/实际结束时间 (ISO 字符串) */
  endTime: string
  /**
   * 任务中重点打击/干扰的卫星类型列表 (侦察、通信、中继、导航、预警)
   */
  targetSatelliteTypes: TargetSatelliteType[]
  /**
   * 任务政治红线策略
   */
  politicalRedLine: PoliticalRedLine
  /**
   * 打击的目标卫星星座/系列列表 (例如：Starlink、Starshield、WorldView、Keyhole)
   */
  targetConstellations: string[]
  /**
   * 关联覆盖的战场 ID 列表 (实现任务与战场多对多关联)
   */
  battlefieldIds: string[]
  /** 任务当前阶段状态 */
  status: MissionStatus
  /** 任务优先级 */
  priority: MissionPriority
  /** 任务战术行动方案详细说明 */
  description: string
  /** 任务创建时间 (ISO 字符串) */
  createdAt: string
}

/**
 * 预置地理要地候选匹配项接口
 */
export interface StrategicLocationOption {
  /** 地点中文名称 */
  name: string
  /** 英文/拼音检索别名列表 */
  aliases: string[]
  /** 经度 (度) */
  longitude: number
  /** 纬度 (度) */
  latitude: number
  /** 默认推荐防御/打击半径 (公里) */
  defaultRadiusKm: number
  /** 所属战术战区简述 */
  region: string
}

/**
 * 战场区域创建模式枚举
 */
export enum AreaCreationMode {
  /** 直接手动输入经纬度坐标与半径数值 */
  MANUAL_COORDINATES = 'MANUAL_COORDINATES',
  /** 地理地点名称联想检索定位 */
  SEARCH_LOCATION = 'SEARCH_LOCATION',
  /** 在三维球体地图上鼠标点击并拖拽拉出半径 */
  INTERACTIVE_DRAG = 'INTERACTIVE_DRAG',
  /** 导入外部 GeoJSON 或战术 JSON 区域文件 */
  IMPORT_FILE = 'IMPORT_FILE'
}
