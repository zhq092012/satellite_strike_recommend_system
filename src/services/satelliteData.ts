/**
 * @fileoverview 初始敌方美军在轨卫星编队仿真数据与战术拦截事件库
 * 全面涵盖美国军用 (NRO/USSF/MDA) 与军民两用商用 (Starshield/Starlink/WorldView) 典型战术卫星目标，
 * 包含精准开普勒轨道要素、传感器载荷、初始动力学遥测，并与反卫武器 (动能HQ-19/激光致盲/电子干扰) 形成完备的打击闭环。
 */

import {
  Satellite,
  SatelliteCategory,
  OrbitType,
  OperationalStatus,
  TacticalAlert,
  AlertSeverity,
  CameraPreset,
  ThreatLevel
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
    name: '台海空域',
    code: 'TAIWAN_STRAIT',
    longitude: 119.8,
    latitude: 24.2,
    height: 1800000,
    heading: 0,
    pitch: -1.0,
    roll: 0
  },
  {
    name: '关岛前哨',
    code: 'GUAM_OUTPOST',
    longitude: 144.8,
    latitude: 13.5,
    height: 2200000,
    heading: 0,
    pitch: -1.1,
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
 * 预设态势分析与武器打击目标卫星数据集 (均为美国重点军民用卫星)
 * 覆盖低轨 (LEO)、中轨 (MEO) 及静止轨道 (GEO)，可由 HQ-19 动能弹、光电神威-II 激光炮与凌霄-4 干扰发射阵列打击
 */
export const INITIAL_SATELLITES: Satellite[] = [
  {
    id: 'SAT-USA-290',
    name: 'USA-290 (KH-11 锁眼光学侦察星)',
    noradId: 44713,
    cosparId: '2019-071A',
    category: SatelliteCategory.RECONNAISSANCE,
    orbitType: OrbitType.LEO,
    status: OperationalStatus.ALERT,
    launchDate: '2019-10-18',
    owner: 'US-NRO (美国国家侦察局)',
    series: 'Keyhole',
    color: '#ef4444',
    orbitalElements: {
      semiMajorAxis: 6778,
      eccentricity: 0.0035,
      inclination: 97.9,
      raan: 135.0,
      argOfPerigee: 90.0,
      meanAnomaly: 45.0,
      perigeeAltitude: 388,
      apogeeAltitude: 412,
      period: 92.5
    },
    sensor: {
      name: '2.4米大口径高分光学/短波红外主望远镜',
      type: '高分辨率光学成像 (分米级战术侦察)',
      halfFov: 24.0,
      status: 'ACTIVE',
      swathWidth: 450,
      beamColor: '#ef4444'
    },
    telemetry: {
      latitude: 36.2,
      longitude: 122.8,
      altitude: 402.5,
      velocity: 7.67,
      pitch: -0.4,
      roll: 0.2,
      yaw: 180.0,
      batterySoc: 92.4,
      solarPower: 3600,
      propellantMass: 185.0,
      groundCoverageArea: 159040
    },
    threatScore: 96,
    threatLevel: ThreatLevel.CRITICAL,
    linkLatencyMs: 125,
    coverageRate: 65,
    overpassDurationSec: 420,
    strikeFeasibilityScore: 94,
    strikeFeasibilityReason: '近地点高度约400km，处于HQ-19动能拦截弹弹道顶点包络内部，且大口径主镜头对光电神威-II激光致盲高度脆弱。'
  },
  {
    id: 'SAT-WORLDVIEW-3',
    name: 'WorldView-3 (世景三号高分商遥)',
    noradId: 40115,
    cosparId: '2014-048A',
    category: SatelliteCategory.RECONNAISSANCE,
    orbitType: OrbitType.LEO,
    status: OperationalStatus.ACTIVE,
    launchDate: '2014-08-13',
    owner: 'Maxar-Intel (美商遥军用采办)',
    series: 'WorldView',
    color: '#f59e0b',
    orbitalElements: {
      semiMajorAxis: 6995,
      eccentricity: 0.0012,
      inclination: 97.9,
      raan: 195.0,
      argOfPerigee: 110.0,
      meanAnomaly: 120.0,
      perigeeAltitude: 610,
      apogeeAltitude: 624,
      period: 97.0
    },
    sensor: {
      name: 'WV-110 全色/多光谱传感器 (0.31m超高分辨率)',
      type: '商业高分光学与短波红外高光谱成像',
      halfFov: 28.0,
      status: 'ACTIVE',
      swathWidth: 680,
      beamColor: '#f59e0b'
    },
    telemetry: {
      latitude: 24.5,
      longitude: 120.8,
      altitude: 617.2,
      velocity: 7.55,
      pitch: 0.1,
      roll: -0.3,
      yaw: 97.9,
      batterySoc: 88.5,
      solarPower: 3100,
      propellantMass: 72.4,
      groundCoverageArea: 363160
    },
    threatScore: 88,
    threatLevel: ThreatLevel.HIGH,
    linkLatencyMs: 85,
    coverageRate: 58,
    overpassDurationSec: 480,
    strikeFeasibilityScore: 92,
    strikeFeasibilityReason: '轨道高度617km，倾角97.9度太阳同步轨道，轨迹稳定易于雷达解算，适合激光致盲或动能直接撞击。'
  },
  {
    id: 'SAT-STARSHIELD-01',
    name: 'Starshield-01 (SpaceX 星盾军用低轨星)',
    noradId: 56120,
    cosparId: '2023-042A',
    category: SatelliteCategory.COMMUNICATION,
    orbitType: OrbitType.LEO,
    status: OperationalStatus.ALERT,
    launchDate: '2023-03-24',
    owner: 'USSF / SpaceX (美国太空军星盾星座)',
    series: 'Starshield',
    color: '#06b6d4',
    orbitalElements: {
      semiMajorAxis: 6928,
      eccentricity: 0.0008,
      inclination: 53.0,
      raan: 82.0,
      argOfPerigee: 45.0,
      meanAnomaly: 160.0,
      perigeeAltitude: 545,
      apogeeAltitude: 555,
      period: 95.6
    },
    sensor: {
      name: '军用高速激光星间通信终端与战术侦察机载载荷',
      type: '空间宽带军用保密通信与分布式态势感知',
      halfFov: 32.0,
      status: 'ACTIVE',
      swathWidth: 850,
      beamColor: '#06b6d4'
    },
    telemetry: {
      latitude: 26.2,
      longitude: 127.5,
      altitude: 550.0,
      velocity: 7.59,
      pitch: 0.0,
      roll: 0.0,
      yaw: 53.0,
      batterySoc: 96.0,
      solarPower: 2850,
      propellantMass: 42.0,
      groundCoverageArea: 567450
    },
    threatScore: 91,
    threatLevel: ThreatLevel.CRITICAL,
    linkLatencyMs: 45,
    coverageRate: 82,
    overpassDurationSec: 540,
    strikeFeasibilityScore: 86,
    strikeFeasibilityReason: '搭载加密战术通信与分布式预警载荷，550km低轨部署，适合凌霄-4超宽带电磁压制或HQ-19定点敲除。'
  },
  {
    id: 'SAT-STARLINK-30128',
    name: 'Starlink-30128 (星链宽带通信节点)',
    noradId: 55890,
    cosparId: '2023-031B',
    category: SatelliteCategory.COMMUNICATION,
    orbitType: OrbitType.LEO,
    status: OperationalStatus.ACTIVE,
    launchDate: '2023-02-27',
    owner: 'SpaceX (商业宽带/军民两用战术支援)',
    series: 'Starlink',
    color: '#38bdf8',
    orbitalElements: {
      semiMajorAxis: 6918,
      eccentricity: 0.0005,
      inclination: 53.2,
      raan: 220.0,
      argOfPerigee: 70.0,
      meanAnomaly: 210.0,
      perigeeAltitude: 536,
      apogeeAltitude: 544,
      period: 95.4
    },
    sensor: {
      name: 'Ku/Ka 频段高增益多波束相控阵天线',
      type: '低轨高通量用户下行点波束',
      halfFov: 40.0,
      status: 'ACTIVE',
      swathWidth: 940,
      beamColor: '#38bdf8'
    },
    telemetry: {
      latitude: 21.8,
      longitude: 115.5,
      altitude: 540.8,
      velocity: 7.6,
      pitch: 0.0,
      roll: 0.0,
      yaw: 53.2,
      batterySoc: 91.2,
      solarPower: 2600,
      propellantMass: 35.5,
      groundCoverageArea: 693970
    },
    threatScore: 82,
    threatLevel: ThreatLevel.HIGH,
    linkLatencyMs: 35,
    coverageRate: 94,
    overpassDurationSec: 510,
    strikeFeasibilityScore: 89,
    strikeFeasibilityReason: '典型低轨宽带通信星座节点，Ku/Ka频段下行数传强劲，极为契合凌霄-4机动式电子压制阵列全频段阻断。'
  },
  {
    id: 'SAT-USA-326',
    name: 'USA-326 (FIA-Radar 秘密雷达侦察星)',
    noradId: 51444,
    cosparId: '2022-009A',
    category: SatelliteCategory.RECONNAISSANCE,
    orbitType: OrbitType.LEO,
    status: OperationalStatus.NORMAL,
    launchDate: '2022-02-02',
    owner: 'US-NRO (美国国家侦察局)',
    series: 'FIA-Radar',
    color: '#ec4899',
    orbitalElements: {
      semiMajorAxis: 6890,
      eccentricity: 0.002,
      inclination: 53.0,
      raan: 310.0,
      argOfPerigee: 140.0,
      meanAnomaly: 60.0,
      perigeeAltitude: 502,
      apogeeAltitude: 522,
      period: 94.8
    },
    sensor: {
      name: 'X波段主动相控阵合成孔径雷达 (SAR)',
      type: '全天候全天时穿透性雷达成像 (0.25m SAR)',
      halfFov: 30.0,
      status: 'ACTIVE',
      swathWidth: 720,
      beamColor: '#ec4899'
    },
    telemetry: {
      latitude: 31.5,
      longitude: 124.2,
      altitude: 512.4,
      velocity: 7.61,
      pitch: 0.2,
      roll: -0.1,
      yaw: 53.0,
      batterySoc: 87.5,
      solarPower: 4200,
      propellantMass: 160.0,
      groundCoverageArea: 407150
    },
    threatScore: 93,
    threatLevel: ThreatLevel.CRITICAL,
    linkLatencyMs: 110,
    coverageRate: 72,
    overpassDurationSec: 450,
    strikeFeasibilityScore: 91,
    strikeFeasibilityReason: '合成孔径雷达全天候穿透云层探测，512km轨道高度处于HQ-19极佳交战窗口，微波反射面易受高功率微波/动能杀伤。'
  },
  {
    id: 'SAT-USA-208',
    name: 'USA-208 (STSS-1 低轨导弹追踪预警星)',
    noradId: 35941,
    cosparId: '2009-052A',
    category: SatelliteCategory.EARLY_WARNING,
    orbitType: OrbitType.LEO,
    status: OperationalStatus.NORMAL,
    launchDate: '2009-09-25',
    owner: 'US-MDA (美国导弹防御局)',
    series: 'SBIRS',
    color: '#dc2626',
    orbitalElements: {
      semiMajorAxis: 7728,
      eccentricity: 0.003,
      inclination: 58.0,
      raan: 60.0,
      argOfPerigee: 200.0,
      meanAnomaly: 85.0,
      perigeeAltitude: 1340,
      apogeeAltitude: 1360,
      period: 112.8
    },
    sensor: {
      name: '短/中/长波多波段宽视场红外捕获传感器',
      type: '低轨上升段与中段导弹红外跟踪',
      halfFov: 38.0,
      status: 'ACTIVE',
      swathWidth: 1800,
      beamColor: '#dc2626'
    },
    telemetry: {
      latitude: 38.2,
      longitude: 128.5,
      altitude: 1350.5,
      velocity: 7.18,
      pitch: -1.5,
      roll: 0.5,
      yaw: 58.0,
      batterySoc: 78.4,
      solarPower: 2200,
      propellantMass: 95.0,
      groundCoverageArea: 2544690
    },
    threatScore: 87,
    threatLevel: ThreatLevel.HIGH,
    linkLatencyMs: 95,
    coverageRate: 78,
    overpassDurationSec: 620,
    strikeFeasibilityScore: 83,
    strikeFeasibilityReason: '弹道导弹主动段追踪关键节点，1350km轨道高度接近HQ-19拦截高界，优先建议高能激光致盲其红外低温探测器。'
  },
  {
    id: 'SAT-GPS-III-05',
    name: 'GPS-III SV05 (USA-319 美军军用导航星)',
    noradId: 48859,
    cosparId: '2021-054A',
    category: SatelliteCategory.NAVIGATION,
    orbitType: OrbitType.MEO,
    status: OperationalStatus.NORMAL,
    launchDate: '2021-06-17',
    owner: 'US-SPACE-FORCE (太空军第二三角洲)',
    series: 'GPS',
    color: '#eab308',
    orbitalElements: {
      semiMajorAxis: 26560,
      eccentricity: 0.001,
      inclination: 55.0,
      raan: 120.0,
      argOfPerigee: 15.0,
      meanAnomaly: 190.0,
      perigeeAltitude: 20160,
      apogeeAltitude: 20200,
      period: 718.0
    },
    sensor: {
      name: 'L1C/L2C/M-Code 高功率点波束抗干扰天线',
      type: '高精度定位授时与军用抗干扰伪距导引',
      halfFov: 14.0,
      status: 'ACTIVE',
      swathWidth: 9200,
      beamColor: '#eab308'
    },
    telemetry: {
      latitude: 34.2,
      longitude: 132.0,
      altitude: 20182.0,
      velocity: 3.87,
      pitch: 0.0,
      roll: 0.0,
      yaw: 55.0,
      batterySoc: 94.0,
      solarPower: 4100,
      propellantMass: 180.0,
      groundCoverageArea: 66476100
    },
    threatScore: 85,
    threatLevel: ThreatLevel.HIGH,
    linkLatencyMs: 180,
    coverageRate: 88,
    overpassDurationSec: 18000,
    strikeFeasibilityScore: 65,
    strikeFeasibilityReason: 'MEO轨道高度20200km超出地基动能弹与激光硬杀伤射高，建议采用凌霄-4向其伪码导航频段实施虚假欺骗与大功率压制。'
  },
  {
    id: 'SAT-TDRS-13',
    name: 'TDRS-13 (NASA/USSF 战略数据中继星)',
    noradId: 42915,
    cosparId: '2017-047A',
    category: SatelliteCategory.COMMUNICATION,
    orbitType: OrbitType.GEO,
    status: OperationalStatus.NORMAL,
    launchDate: '2017-08-18',
    owner: 'NASA-USSF (天基网络中继测控)',
    series: 'TDRS',
    color: '#00f0ff',
    orbitalElements: {
      semiMajorAxis: 42164,
      eccentricity: 0.0003,
      inclination: 2.5,
      raan: 0.0,
      argOfPerigee: 0.0,
      meanAnomaly: 140.0,
      perigeeAltitude: 35775,
      apogeeAltitude: 35797,
      period: 1436.1
    },
    sensor: {
      name: '双4.9米大型多频段微波星间跟踪定向天线',
      type: 'S/Ku/Ka 高速数据星间中继与星地测控',
      halfFov: 13.0,
      status: 'ACTIVE',
      swathWidth: 12500,
      beamColor: '#00f0ff'
    },
    telemetry: {
      latitude: 0.2,
      longitude: 140.0,
      altitude: 35786.0,
      velocity: 3.07,
      pitch: 0.0,
      roll: 0.0,
      yaw: 0.0,
      batterySoc: 98.2,
      solarPower: 8900,
      propellantMass: 340.0,
      groundCoverageArea: 122718460
    },
    threatScore: 92,
    threatLevel: ThreatLevel.CRITICAL,
    linkLatencyMs: 240,
    coverageRate: 96,
    overpassDurationSec: 86400,
    strikeFeasibilityScore: 58,
    strikeFeasibilityReason: 'GEO静止轨道35786km关键数据中继枢纽，直接动能打击成本极高，建议对准其下行给地面站的Ku/Ka馈电链路实施饱和电子压制。'
  },
  {
    id: 'SAT-USA-315',
    name: 'USA-315 (SBIRS-GEO 5 天基红外战略预警星)',
    noradId: 48632,
    cosparId: '2021-042A',
    category: SatelliteCategory.EARLY_WARNING,
    orbitType: OrbitType.GEO,
    status: OperationalStatus.NORMAL,
    launchDate: '2021-05-18',
    owner: 'US-SPACE-FORCE (美国太空军)',
    series: 'SBIRS',
    color: '#f43f5e',
    orbitalElements: {
      semiMajorAxis: 42164,
      eccentricity: 0.0004,
      inclination: 3.8,
      raan: 0.0,
      argOfPerigee: 0.0,
      meanAnomaly: 65.0,
      perigeeAltitude: 35770,
      apogeeAltitude: 35802,
      period: 1436.1
    },
    sensor: {
      name: '凝视型高灵敏度双波段短波/中波红外相机',
      type: '战略弹道导弹助推段羽烟红外凝视预警',
      halfFov: 12.5,
      status: 'ACTIVE',
      swathWidth: 11000,
      beamColor: '#f43f5e'
    },
    telemetry: {
      latitude: 0.5,
      longitude: 125.0,
      altitude: 35786.0,
      velocity: 3.07,
      pitch: 0.0,
      roll: 0.0,
      yaw: 0.0,
      batterySoc: 95.0,
      solarPower: 7800,
      propellantMass: 290.0,
      groundCoverageArea: 95033100
    },
    threatScore: 90,
    threatLevel: ThreatLevel.CRITICAL,
    linkLatencyMs: 260,
    coverageRate: 92,
    overpassDurationSec: 86400,
    strikeFeasibilityScore: 55,
    strikeFeasibilityReason: 'GEO红外早期预警骨干节点，建议实施地基大功率同频上行干扰或网络注入瘫痪其指令链路。'
  }
]

/**
 * 初始战术威胁警报与武器打击火控事件流水列表
 */
export const INITIAL_ALERTS: TacticalAlert[] = [
  {
    id: 'ALT-2026-0901',
    timestamp: new Date().toISOString(),
    satelliteName: 'USA-290 (KH-11 锁眼光学侦察星)',
    satelliteId: 'SAT-USA-290',
    severity: AlertSeverity.CRITICAL,
    title: '敌战略光学侦察星过境重点空域预警',
    details: '美军锁眼 KH-11 光学侦察星正在进入胶东半岛反导试验阵地视界(高度402km)，HQ-19 拦截火控雷达已完成闭环截获，处于动能打击拦截窗口内！',
    acknowledged: false
  },
  {
    id: 'ALT-2026-0902',
    timestamp: new Date(Date.now() - 300000).toISOString(),
    satelliteName: 'WorldView-3 (世景三号高分商遥)',
    satelliteId: 'SAT-WORLDVIEW-3',
    severity: AlertSeverity.WARNING,
    title: '商业亚米级光学星对沿海重点海港成像侦察中',
    details: 'WorldView-3 侧摆 22° 对我沿海前沿实施 0.31m 高清成像，光电神威-II 激光武器系统已完成自适应光学校准，建议实施焦平面硬烧蚀致盲。',
    acknowledged: false
  },
  {
    id: 'ALT-2026-0903',
    timestamp: new Date(Date.now() - 900000).toISOString(),
    satelliteName: 'Starlink-30128 (星链宽带通信节点)',
    satelliteId: 'SAT-STARLINK-30128',
    severity: AlertSeverity.INFO,
    title: '星链战术宽带下行波束受华南阵列强电磁压制',
    details: '华南凌霄-4 干扰发射车队对其 Ku/Ka 频段注入大功率同频噪声，目标向第一岛链冲绳前哨终端的数传吞吐率跌落 95%，通信实质瘫痪。',
    acknowledged: true
  }
]
