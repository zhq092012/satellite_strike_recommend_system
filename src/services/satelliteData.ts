/**
 * @fileoverview 初始卫星编队仿真数据与战术事件库
 * 提供不同轨道层级 (LEO/MEO/GEO)、不同战术用途的预设卫星数据，包含真实的开普勒根数、传感器配置与初始遥测
 */

import {
  Satellite,
  SatelliteCategory,
  OrbitType,
  OperationalStatus,
  TacticalAlert,
  AlertSeverity,
  CameraPreset
} from '../types/satellite'

/**
 * 战术视景相机预设机位列表
 * 用于快速将全局态势视角切换至关键战术观测区域
 */
export const CAMERA_PRESETS: CameraPreset[] = [
  {
    name: '全球态势',
    code: 'GLOBAL',
    longitude: 108.0,
    latitude: 32.0,
    height: 25000000,
    heading: 0,
    pitch: -1.57,
    roll: 0
  },
  {
    name: '亚太战区',
    code: 'ASIA_PACIFIC',
    longitude: 120.5,
    latitude: 26.5,
    height: 6500000,
    heading: 0,
    pitch: -1.2,
    roll: 0
  },
  {
    name: '北极俯视',
    code: 'NORTH_POLE',
    longitude: 0.0,
    latitude: 90.0,
    height: 22000000,
    heading: 0,
    pitch: -1.57,
    roll: 0
  },
  {
    name: '印度洋域',
    code: 'INDIAN_OCEAN',
    longitude: 80.0,
    latitude: 10.0,
    height: 8000000,
    heading: 0,
    pitch: -1.3,
    roll: 0
  }
]

/**
 * 预设态势分析卫星数据集
 * 涵盖低轨对地高分侦察、中轨导航增强、静止轨道通信中继等典型战术卫星
 */
export const INITIAL_SATELLITES: Satellite[] = [
  {
    id: 'SAT-GF06',
    name: '高分六号 (GF-6)',
    noradId: 43484,
    cosparId: '2018-048A',
    category: SatelliteCategory.RECONNAISSANCE,
    orbitType: OrbitType.LEO,
    status: OperationalStatus.ACTIVE,
    launchDate: '2018-06-02',
    owner: 'CH-SPACE-CMD',
    color: '#00f0ff',
    orbitalElements: {
      semiMajorAxis: 7018,
      eccentricity: 0.0001,
      inclination: 97.5,
      raan: 145.2,
      argOfPerigee: 88.0,
      meanAnomaly: 45.0,
      perigeeAltitude: 640,
      apogeeAltitude: 642,
      period: 97.5
    },
    sensor: {
      name: '多光谱宽幅成像仪',
      type: '高分辨率光学视场',
      halfFov: 28.5,
      status: 'ACTIVE',
      swathWidth: 800,
      beamColor: '#00f0ff'
    },
    telemetry: {
      latitude: 31.2,
      longitude: 121.5,
      altitude: 641.2,
      velocity: 7.54,
      pitch: 0.2,
      roll: -0.1,
      yaw: 180.0,
      batterySoc: 94.5,
      solarPower: 2450,
      propellantMass: 68.2,
      groundCoverageArea: 502650
    }
  },
  {
    id: 'SAT-YG30',
    name: '遥感三十号 (YG-30A)',
    noradId: 42955,
    cosparId: '2017-058A',
    category: SatelliteCategory.RECONNAISSANCE,
    orbitType: OrbitType.LEO,
    status: OperationalStatus.NORMAL,
    launchDate: '2017-09-29',
    owner: 'CH-SPACE-CMD',
    color: '#10b981',
    orbitalElements: {
      semiMajorAxis: 6978,
      eccentricity: 0.0012,
      inclination: 35.0,
      raan: 210.4,
      argOfPerigee: 120.0,
      meanAnomaly: 130.0,
      perigeeAltitude: 592,
      apogeeAltitude: 608,
      period: 96.6
    },
    sensor: {
      name: '电子信号截获侦测阵列',
      type: '电子侦察 (ELINT)',
      halfFov: 35.0,
      status: 'ACTIVE',
      swathWidth: 950,
      beamColor: '#10b981'
    },
    telemetry: {
      latitude: 22.4,
      longitude: 114.2,
      altitude: 601.5,
      velocity: 7.56,
      pitch: 0.0,
      roll: 0.0,
      yaw: 35.0,
      batterySoc: 89.2,
      solarPower: 2180,
      propellantMass: 45.8,
      groundCoverageArea: 708820
    }
  },
  {
    id: 'SAT-JB08',
    name: '尖兵预警八号 (JB-8)',
    noradId: 40982,
    cosparId: '2015-062A',
    category: SatelliteCategory.EARLY_WARNING,
    orbitType: OrbitType.LEO,
    status: OperationalStatus.ALERT,
    launchDate: '2015-11-08',
    owner: 'DEFENSE-DEPT',
    color: '#ef4444',
    orbitalElements: {
      semiMajorAxis: 7578,
      eccentricity: 0.045,
      inclination: 63.4,
      raan: 75.8,
      argOfPerigee: 270.0,
      meanAnomaly: 90.0,
      perigeeAltitude: 860,
      apogeeAltitude: 1540,
      period: 109.4
    },
    sensor: {
      name: '双波段红外弹道预警相机',
      type: '红外/紫外导弹告警',
      halfFov: 42.0,
      status: 'ACTIVE',
      swathWidth: 1600,
      beamColor: '#ef4444'
    },
    telemetry: {
      latitude: 38.6,
      longitude: 125.8,
      altitude: 1205.4,
      velocity: 7.12,
      pitch: -1.2,
      roll: 0.4,
      yaw: 63.4,
      batterySoc: 76.8,
      solarPower: 1920,
      propellantMass: 82.4,
      groundCoverageArea: 2010600
    }
  },
  {
    id: 'SAT-TL02',
    name: '天链二号01星 (TL-2A)',
    noradId: 44111,
    cosparId: '2019-017A',
    category: SatelliteCategory.COMMUNICATION,
    orbitType: OrbitType.GEO,
    status: OperationalStatus.NORMAL,
    launchDate: '2019-03-31',
    owner: 'TAC-COMM-CORPS',
    color: '#38bdf8',
    orbitalElements: {
      semiMajorAxis: 42164,
      eccentricity: 0.0002,
      inclination: 0.8,
      raan: 0.0,
      argOfPerigee: 0.0,
      meanAnomaly: 80.0,
      perigeeAltitude: 35780,
      apogeeAltitude: 35792,
      period: 1436.1
    },
    sensor: {
      name: 'Ka频段高速星间/星地中继相控阵天线',
      type: '空间数据中继与测控网',
      halfFov: 12.0,
      status: 'ACTIVE',
      swathWidth: 12000,
      beamColor: '#38bdf8'
    },
    telemetry: {
      latitude: 0.1,
      longitude: 80.0,
      altitude: 35786.0,
      velocity: 3.07,
      pitch: 0.0,
      roll: 0.0,
      yaw: 0.0,
      batterySoc: 98.6,
      solarPower: 8600,
      propellantMass: 310.0,
      groundCoverageArea: 113097000
    }
  },
  {
    id: 'SAT-BDS01',
    name: '北斗三号 M01 (BDS-MEO1)',
    noradId: 43001,
    cosparId: '2017-069A',
    category: SatelliteCategory.NAVIGATION,
    orbitType: OrbitType.MEO,
    status: OperationalStatus.NORMAL,
    launchDate: '2017-11-05',
    owner: 'NAV-SYS-CENTER',
    color: '#f59e0b',
    orbitalElements: {
      semiMajorAxis: 27906,
      eccentricity: 0.0008,
      inclination: 55.0,
      raan: 320.0,
      argOfPerigee: 15.0,
      meanAnomaly: 210.0,
      perigeeAltitude: 21508,
      apogeeAltitude: 21548,
      period: 773.0
    },
    sensor: {
      name: '星载高稳氢原子钟与B1C导航天线',
      type: '授时与定位下行链路',
      halfFov: 16.5,
      status: 'ACTIVE',
      swathWidth: 8500,
      beamColor: '#f59e0b'
    },
    telemetry: {
      latitude: 42.1,
      longitude: 105.4,
      altitude: 21528.0,
      velocity: 3.78,
      pitch: 0.0,
      roll: 0.0,
      yaw: 55.0,
      batterySoc: 92.4,
      solarPower: 3850,
      propellantMass: 142.6,
      groundCoverageArea: 56745000
    }
  },
  {
    id: 'SAT-SJ21',
    name: '实践二十一号 (SJ-21)',
    noradId: 49330,
    cosparId: '2021-096A',
    category: SatelliteCategory.EXPERIMENTAL,
    orbitType: OrbitType.GEO,
    status: OperationalStatus.ACTIVE,
    launchDate: '2021-10-24',
    owner: 'SPACE-TECH-INST',
    color: '#a855f7',
    orbitalElements: {
      semiMajorAxis: 42168,
      eccentricity: 0.0015,
      inclination: 2.1,
      raan: 48.0,
      argOfPerigee: 180.0,
      meanAnomaly: 120.0,
      perigeeAltitude: 35720,
      apogeeAltitude: 35850,
      period: 1436.5
    },
    sensor: {
      name: '空间碎片近距离交会对接光学雷达',
      type: '碎片减缓与空间维护',
      halfFov: 15.0,
      status: 'ACTIVE',
      swathWidth: 6000,
      beamColor: '#a855f7'
    },
    telemetry: {
      latitude: 1.5,
      longitude: 105.2,
      altitude: 35784.0,
      velocity: 3.07,
      pitch: 0.5,
      roll: -0.2,
      yaw: 2.1,
      batterySoc: 91.0,
      solarPower: 4500,
      propellantMass: 198.5,
      groundCoverageArea: 28274000
    }
  }
]

/**
 * 初始战术警报与事件流水列表
 */
export const INITIAL_ALERTS: TacticalAlert[] = [
  {
    id: 'ALT-2026-0901',
    timestamp: new Date().toISOString(),
    satelliteName: '尖兵预警八号 (JB-8)',
    satelliteId: 'SAT-JB08',
    severity: AlertSeverity.CRITICAL,
    title: '轨道交会安全预警 (Conjunction Alert)',
    details: '与已编目空间废弃物 2009-028BC 最小交会距离预估小于 1.8km，建议于 04:12 UTC 执行微冲量变轨避碰。',
    acknowledged: false
  },
  {
    id: 'ALT-2026-0902',
    timestamp: new Date(Date.now() - 300000).toISOString(),
    satelliteName: '高分六号 (GF-6)',
    satelliteId: 'SAT-GF06',
    severity: AlertSeverity.INFO,
    title: '进入重点观测区过境窗口',
    details: '当前进入亚太某预设战术重点侦察区域，光学多光谱相机已启动高画质连续成像程序。',
    acknowledged: false
  },
  {
    id: 'ALT-2026-0903',
    timestamp: new Date(Date.now() - 900000).toISOString(),
    satelliteName: '遥感三十号 (YG-30A)',
    satelliteId: 'SAT-YG30',
    severity: AlertSeverity.WARNING,
    title: '地面站测控入圈完成',
    details: '与喀什遥测地面站建立 X 频段下行数传链路，开始回传 ELINT 截获频谱原始数据集。',
    acknowledged: true
  }
]
