/**
 * @fileoverview 武器系统、敌方地面站、数据中心与空间数据链路核心类型定义文件
 * 包含武器分类、射程包络、地面基元设施、多跳立体通信链路拓扑以及反制压制状态等全量 TSDoc 注释
 */

import { TargetSatelliteType } from './battlefield'

/**
 * 反制武器装备作战机理分类枚举
 */
export enum WeaponType {
  /** 动能反卫直接碰撞拦截导弹 (Kinetic Kill Vehicle / ASAT) */
  KINETIC = 'KINETIC',
  /** 高能连续波激光 / 强电磁脉冲定向能致盲毁伤武器 (Directed Energy / Laser) */
  DIRECTED_ENERGY = 'DIRECTED_ENERGY',
  /** 超宽带大功率地基/机载卫星上行/下行压制干扰阵列 (Electronic Warfare Jamming) */
  ELECTRONIC_WARFARE = 'ELECTRONIC_WARFARE',
  /** 空间天基网络渗透与指令注入网络战系统 (Cyber Warfare) */
  CYBER = 'CYBER'
}

/**
 * 武器系统战备状态枚举
 */
export enum WeaponStatus {
  /** 待发就绪，处于高等级战备状态 */
  READY = 'READY',
  /** 正在开机发射、高能照射或电磁压制中 */
  ENGAGING = 'ENGAGING',
  /** 处于打击冷却、激光储能电容充电或机构复位中 */
  COOLDOWN = 'COOLDOWN',
  /** 备用弹药或能源耗尽 */
  DEPLETED = 'DEPLETED'
}

/**
 * 地面基元设施运行状态枚举
 */
export enum FacilityStatus {
  /** 正常开机在网运行中 */
  ACTIVE = 'ACTIVE',
  /** 已遭受我方电子压制、网络瘫痪或通信中断 */
  JAMMED = 'JAMMED',
  /** 处于维护检修或离线脱网状态 */
  OFFLINE = 'OFFLINE'
}

/**
 * 空间数据链路多跳拓扑形式枚举
 */
export enum DataLinkTopologyType {
  /** 卫星直接对地下行链路 (两跳: 卫星 -> 地面站 -> 数据中心) */
  DIRECT = 'DIRECT',
  /** 空间高速中继转发链路 (三跳: 卫星 -> 空间中继星 -> 地面站 -> 数据中心) */
  RELAY = 'RELAY'
}

/**
 * 数据链路连通工况状态枚举
 */
export enum DataLinkStatus {
  /** 链路畅通，处于高速数传中 */
  ACTIVE = 'ACTIVE',
  /** 链路已被我方武器压制阻断或严重降级 */
  JAMMED = 'JAMMED',
  /** 卫星出圈不可视或设备故障导致中断 */
  DISRUPTED = 'DISRUPTED'
}

/**
 * 武器装备立体作用范围射程包络接口
 */
export interface StrikeRangeEnvelope {
  /** 最大有效杀伤/压制射高 (公里) */
  maxAltitudeKm: number
  /** 最小交战/启动射高 (公里) */
  minAltitudeKm: number
  /** 最大倾斜作用距离 / 斜距作战半径 (公里) */
  maxDistanceKm: number
}

/**
 * 武器系统综合作战效能指标接口
 */
export interface WeaponPerformance {
  /** 单次打击/压制杀伤概率 (Pk, 百分比 0-100) */
  pkProbability: number
  /** 火控雷达/激光瞄准跟踪精度 (米 / 毫弧度) */
  trackingAccuracyM: number
  /** 目标告警到发射/照射的最快响应时间 (秒) */
  responseTimeSec: number
}

/**
 * 武器系统实体接口
 */
export interface WeaponSystem {
  /** 武器唯一装备代号 (例如：WPN-2026-001) */
  id: string
  /** 武器装备全称 (例如：HQ-19 陆基高空动能反卫拦截系统) */
  name: string
  /** 武器分类类型 */
  type: WeaponType
  /** 能够有效实施打击或压制的目标卫星类型列表 */
  targetSatelliteTypes: TargetSatelliteType[]
  /** 作用范围射程包络参数 */
  strikeRange: StrikeRangeEnvelope
  /** 综合作战性能指标 */
  performance: WeaponPerformance
  /** 连续打击间歇时间 (秒，冷却/再装填/重新储能) */
  cooldownSec: number
  /** 当前部署可用发射单元数 / 弹药基数 */
  quantity: number
  /** 装备阵地部署地理经纬度坐标 */
  position: {
    /** 部署经度 (度) */
    longitude: number
    /** 部署纬度 (度) */
    latitude: number
    /** 阵地海拔高度 (米) */
    altitudeM?: number
  }
  /** 部署阵地名称 (例如：胶东半岛某综合反导反卫阵地) */
  locationName: string
  /** 武器当前战备状态 */
  status: WeaponStatus
  /** 武器装备性能与战术用途详细说明 */
  description: string
  /** 装备录入建档时间 (ISO 字符串) */
  createdAt: string
}

/**
 * 敌方地面测控与数据接收站实体接口
 */
export interface GroundStation {
  /** 地面站唯一编号 (例如：GS-US-001) */
  id: string
  /** 地面站名称 (例如：澳大利亚松树谷天基情报地面站 Pine Gap) */
  name: string
  /** 站址地理经纬度与海拔 */
  position: {
    /** 经度 (度) */
    longitude: number
    /** 纬度 (度) */
    latitude: number
    /** 海拔 (米) */
    altitudeM?: number
  }
  /** 所属国家、阵营或军事同盟 (例如：美国、五眼联盟、北约) */
  country: string
  /** 接收与测控通信频段列表 (如 X频段、Ka频段、S频段、Ku频段) */
  frequencyBands: string[]
  /** 主抛物面天线口径 (米) */
  antennaDiameterM: number
  /** 卫星接收跟踪最低俯仰角门限 (度) */
  elevationLimitDeg: number
  /** 站点当前运行工况状态 */
  status: FacilityStatus
  /** 站点战术背景与通信网作用详细说明 */
  description: string
  /** 建站录入时间 (ISO 字符串) */
  createdAt: string
}

/**
 * 敌方情报指挥数据中心实体接口
 */
export interface DataCenter {
  /** 数据中心唯一代号 (例如：DC-001) */
  id: string
  /** 数据中心全称 (例如：美印太司令部联合情报作战中心 JIOC Hawaii) */
  name: string
  /** 设施经纬度坐标 */
  position: {
    /** 经度 (度) */
    longitude: number
    /** 纬度 (度) */
    latitude: number
  }
  /** 所属国家或战区同盟 */
  country: string
  /** 算力基础设施规模 (例如：120 PFLOPS 绝密国防云集群) */
  computeScale: string
  /** 军事保密与防护等级 (例如：Top Secret / SCI, Tier 4 防核加固) */
  securityLevel: string
  /** 当前运行工况状态 */
  status: FacilityStatus
  /** 职能说明与关联战略指挥中枢 */
  description: string
  /** 录入时间 (ISO 字符串) */
  createdAt: string
}

/**
 * 空间立体数据链路网络实体接口
 */
export interface DataLink {
  /** 链路唯一标识流水号 (例如：DL-2026-001) */
  id: string
  /** 链路名称 (例如：高分商遥-松树谷地面站-印太情报中心全链路) */
  name: string
  /** 多跳拓扑形式 (直连两跳 或 中继三跳) */
  topologyType: DataLinkTopologyType
  /** 源端空间卫星 ID */
  sourceSatelliteId: string
  /** 空间中继卫星 ID (仅在 RELAY 拓扑形式时必须具备) */
  relaySatelliteId?: string
  /** 负责对地接收数传的地面站 ID */
  groundStationId: string
  /** 最终汇聚处理的数据中心 ID */
  dataCenterId: string
  /** 链路当前通信质量与对抗工况 */
  status: DataLinkStatus
  /** 实时下行传输速率 (Mbps) */
  dataRateMbps: number
  /** 端到端通信往返时延 (毫秒) */
  latencyMs: number
  /** 链路战术通信说明 */
  description: string
  /** 创建时间 (ISO 字符串) */
  createdAt: string
}
