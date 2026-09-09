/**
 * @fileoverview 武器装备、敌方地面站、数据中心与多跳数据链路全局响应式状态服务
 * 提供装备与基元增删改查、多跳端到端立体数据链路拓扑维护、地图点选坐标取点分发以及对抗干扰演示
 */

import { ref, computed, watch } from 'vue'
import {
  WeaponSystem,
  GroundStation,
  DataCenter,
  DataLink,
  WeaponType,
  WeaponStatus,
  FacilityStatus,
  DataLinkTopologyType,
  DataLinkStatus
} from '../types/tacticalAssets'
import { TargetSatelliteType } from '../types/battlefield'

/**
 * LocalStorage 本地资产持久化存储键名
 */
const TACTICAL_ASSETS_STORAGE_KEY = 'TAC_SATELLITE_ASSETS_V3'

/**
 * 预置真实感初始武器装备数据
 */
const DEFAULT_WEAPONS: WeaponSystem[] = [
  {
    id: 'WPN-HQ19',
    name: 'HQ-19 陆基高空动能反导/反卫拦截系统',
    type: WeaponType.KINETIC,
    targetSatelliteTypes: [
      TargetSatelliteType.RECONNAISSANCE,
      TargetSatelliteType.COMMUNICATION,
      TargetSatelliteType.EARLY_WARNING
    ],
    strikeRange: {
      minAltitudeKm: 120,
      maxAltitudeKm: 1200,
      maxDistanceKm: 900
    },
    performance: {
      pkProbability: 92.5,
      trackingAccuracyM: 1.2,
      responseTimeSec: 18
    },
    cooldownSec: 45,
    quantity: 8,
    position: {
      longitude: 121.35,
      latitude: 37.52,
      altitudeM: 80
    },
    locationName: '胶东半岛某综合反卫阵地',
    status: WeaponStatus.READY,
    description: '采用高能固体火箭助推及红外成像动能拦截器 (KKV)，具备对近地轨道 (LEO) 高分光学与雷达侦察卫星的直接撞击动能摧毁能力。',
    createdAt: new Date().toISOString()
  },
  {
    id: 'WPN-LASER-01',
    name: '光电神威-II 兆瓦级地基高能致盲激光炮',
    type: WeaponType.DIRECTED_ENERGY,
    targetSatelliteTypes: [
      TargetSatelliteType.RECONNAISSANCE,
      TargetSatelliteType.EARLY_WARNING
    ],
    strikeRange: {
      minAltitudeKm: 150,
      maxAltitudeKm: 1500,
      maxDistanceKm: 1100
    },
    performance: {
      pkProbability: 96.0,
      trackingAccuracyM: 0.1,
      responseTimeSec: 3
    },
    cooldownSec: 15,
    quantity: 2,
    position: {
      longitude: 95.8,
      latitude: 36.4,
      altitudeM: 3200
    },
    locationName: '青海高原某高能光电对抗基地',
    status: WeaponStatus.READY,
    description: '部署于高原稀薄大气层，配备自适应光学相差补偿系统，可实施连续兆瓦级激光照射，对敌光学侦察卫星焦平面探测器造成不可逆硬烧蚀。',
    createdAt: new Date(Date.now() - 3600000).toISOString()
  },
  {
    id: 'WPN-EW-JAMMER',
    name: '凌霄-4 机动式超宽带大功率卫星干扰发射阵列',
    type: WeaponType.ELECTRONIC_WARFARE,
    targetSatelliteTypes: [
      TargetSatelliteType.COMMUNICATION,
      TargetSatelliteType.RELAY,
      TargetSatelliteType.NAVIGATION
    ],
    strikeRange: {
      minAltitudeKm: 100,
      maxAltitudeKm: 36000,
      maxDistanceKm: 2500
    },
    performance: {
      pkProbability: 88.0,
      trackingAccuracyM: 15.0,
      responseTimeSec: 5
    },
    cooldownSec: 5,
    quantity: 12,
    position: {
      longitude: 113.85,
      latitude: 22.5,
      altitudeM: 45
    },
    locationName: '华南沿海某车载电子对抗梯队',
    status: WeaponStatus.ENGAGING,
    description: '可对星链 (Starlink) 下行通信载波及 GPS 导航信号实施高增益同频阻断压制与虚假欺骗导航注入。',
    createdAt: new Date(Date.now() - 7200000).toISOString()
  }
]

/**
 * 预置真实感初始敌方地面站数据
 */
const DEFAULT_GROUND_STATIONS: GroundStation[] = [
  {
    id: 'GS-PINE-GAP',
    name: '澳大利亚松树谷天基情报地面站 (Pine Gap)',
    position: {
      longitude: 133.73,
      latitude: -23.79,
      altitudeM: 580
    },
    country: '美国 / 五眼联盟',
    frequencyBands: ['X频段', 'Ka频段', 'Ku频段', 'S频段'],
    antennaDiameterM: 32,
    elevationLimitDeg: 5.0,
    status: FacilityStatus.ACTIVE,
    description: '美五眼联盟在南半球最重要的天基电子截获、导弹早期预警与间谍卫星高速下行数传综合主枢纽站。',
    createdAt: new Date().toISOString()
  },
  {
    id: 'GS-GUAM-ANDERSEN',
    name: '关岛安德森空军基地空天测控跟踪站',
    position: {
      longitude: 144.92,
      latitude: 13.58,
      altitudeM: 160
    },
    country: '美国',
    frequencyBands: ['X频段', 'Ka频段', 'S频段'],
    antennaDiameterM: 18,
    elevationLimitDeg: 8.0,
    status: FacilityStatus.ACTIVE,
    description: '负责西太平洋第二岛链军用高分侦察与宽带中继卫星的遥测遥控指令注入及战区级下行数传。',
    createdAt: new Date(Date.now() - 1800000).toISOString()
  },
  {
    id: 'GS-DIEGO-GARCIA',
    name: '印度洋迪戈加西亚深空天线地面站',
    position: {
      longitude: 72.42,
      latitude: -7.31,
      altitudeM: 10
    },
    country: '美国 / 英国',
    frequencyBands: ['S频段', 'X频段'],
    antennaDiameterM: 24,
    elevationLimitDeg: 6.0,
    status: FacilityStatus.ACTIVE,
    description: '控制印度洋上空预警中继卫星与 GPS 星座监视的核心天线阵列站。',
    createdAt: new Date(Date.now() - 3600000).toISOString()
  },
  {
    id: 'GS-MISAWA-JAPAN',
    name: '日本三泽空军卫星通信与数传接收站',
    position: {
      longitude: 141.36,
      latitude: 40.7,
      altitudeM: 40
    },
    country: '美日同盟',
    frequencyBands: ['Ka频段', 'Ku频段'],
    antennaDiameterM: 15,
    elevationLimitDeg: 10.0,
    status: FacilityStatus.JAMMED,
    description: '接收第一岛链北段商用与军用低轨雷达卫星成像下行，当前通信链路受到局部电磁压制。',
    createdAt: new Date(Date.now() - 5400000).toISOString()
  }
]

/**
 * 预置真实感初始数据中心数据
 */
const DEFAULT_DATA_CENTERS: DataCenter[] = [
  {
    id: 'DC-JIOC-HAWAII',
    name: '美印太司令部联合情报作战中心 (JIOC Hawaii)',
    position: {
      longitude: -157.95,
      latitude: 21.35
    },
    country: '美国',
    computeScale: '450 PFLOPS 战区级国防情报超算',
    securityLevel: 'Top Secret / SCI (特级绝密)',
    status: FacilityStatus.ACTIVE,
    description: '汇聚来自松树谷与关岛下传的天基多源侦察图像，运用 AI 算法实时生成印太战区反舰反潜火力打击清单。',
    createdAt: new Date().toISOString()
  },
  {
    id: 'DC-SCHRIEVER-AFB',
    name: '科罗拉多斯普林斯天基作战指挥中枢 (Schriever AFB)',
    position: {
      longitude: -104.52,
      latitude: 38.8
    },
    country: '美国太空军 (USSF)',
    computeScale: '600 PFLOPS 天基综合调度中枢',
    securityLevel: 'DoD Tier 4 (抗核加固深地地堡)',
    status: FacilityStatus.ACTIVE,
    description: '全球天基星座调度、交会规避与反导预警信息融合总数据中心。',
    createdAt: new Date(Date.now() - 3600000).toISOString()
  },
  {
    id: 'DC-CAMP-COURTNEY',
    name: '冲绳美海军陆战队远征军前沿态势感知边缘算力中心',
    position: {
      longitude: 127.85,
      latitude: 26.39
    },
    country: '美国',
    computeScale: '80 PFLOPS 前沿战术微云',
    securityLevel: 'Secret (机密级)',
    status: FacilityStatus.JAMMED,
    description: '直连前沿低轨侦察下行，直接向第一岛链前哨提供秒级目标瞄准参数。',
    createdAt: new Date(Date.now() - 7200000).toISOString()
  }
]

/**
 * 预置真实感初始多跳空间数据链路 (基于美军目标卫星与基地节点)
 */
const DEFAULT_DATA_LINKS: DataLink[] = [
  {
    id: 'DL-01',
    name: 'WorldView-3 商业高分光学直连关岛下传链路',
    topologyType: DataLinkTopologyType.DIRECT,
    sourceSatelliteId: 'SAT-WORLDVIEW-3',
    groundStationId: 'GS-GUAM-ANDERSEN',
    dataCenterId: 'DC-JIOC-HAWAII',
    status: DataLinkStatus.ACTIVE,
    dataRateMbps: 1200,
    latencyMs: 120,
    description: 'WorldView-3 高分光学侦察卫星将亚米级图像直传关岛地面站，随后通过太平洋国防海底光缆回传夏威夷美军印太司令部联合情报中心。',
    createdAt: new Date().toISOString()
  },
  {
    id: 'DL-02',
    name: '锁眼KH-11经TDRS-13中继至松树谷战略情报链路',
    topologyType: DataLinkTopologyType.RELAY,
    sourceSatelliteId: 'SAT-USA-290',
    relaySatelliteId: 'SAT-TDRS-13',
    groundStationId: 'GS-PINE-GAP',
    dataCenterId: 'DC-SCHRIEVER-AFB',
    status: DataLinkStatus.ACTIVE,
    dataRateMbps: 850,
    latencyMs: 240,
    description: '锁眼高价值战略侦察星通过 Ka 频段星间链路将涉密光学情报发送给 TDRS-13 中继星，再由中继星对地下传松树谷地面站直达美太空军指挥中枢。',
    createdAt: new Date(Date.now() - 1800000).toISOString()
  },
  {
    id: 'DL-03',
    name: '星链战术节点过境第一岛链直达冲绳边缘算力链路 (已受压制)',
    topologyType: DataLinkTopologyType.DIRECT,
    sourceSatelliteId: 'SAT-STARLINK-30128',
    groundStationId: 'GS-MISAWA-JAPAN',
    dataCenterId: 'DC-CAMP-COURTNEY',
    status: DataLinkStatus.JAMMED,
    dataRateMbps: 45,
    latencyMs: 890,
    description: '星链战术节点下行载波遭到我方华南大功率电子干扰阵列强噪声压制，误码率达 85%，有效数传已实质中断。',
    createdAt: new Date(Date.now() - 3600000).toISOString()
  },
  {
    id: 'DL-04',
    name: '星盾军用低轨加密情报直传关岛中心链路',
    topologyType: DataLinkTopologyType.DIRECT,
    sourceSatelliteId: 'SAT-STARSHIELD-01',
    groundStationId: 'GS-GUAM-ANDERSEN',
    dataCenterId: 'DC-JIOC-HAWAII',
    status: DataLinkStatus.ACTIVE,
    dataRateMbps: 1800,
    latencyMs: 95,
    description: 'SpaceX 星盾军用低轨星座为美军印太作战前哨提供抗干扰加密直连情报分发与实时火力打击参数引导。',
    createdAt: new Date(Date.now() - 5400000).toISOString()
  },
  {
    id: 'DL-05',
    name: 'USA-326 秘密雷达侦察星经TDRS中继至施里弗战略链路',
    topologyType: DataLinkTopologyType.RELAY,
    sourceSatelliteId: 'SAT-USA-326',
    relaySatelliteId: 'SAT-TDRS-13',
    groundStationId: 'GS-PINE-GAP',
    dataCenterId: 'DC-SCHRIEVER-AFB',
    status: DataLinkStatus.ACTIVE,
    dataRateMbps: 920,
    latencyMs: 210,
    description: 'FIA-Radar 秘密雷达卫星通过 Ka 频段中继链路向美本土作战中枢回传高分辨率合成孔径雷达 (SAR) 微波穿透成像数据。',
    createdAt: new Date(Date.now() - 7200000).toISOString()
  }
]

/**
 * 从 LocalStorage 读取全部资产
 *
 * @returns 包含武器、地面站、数据中心与数据链路的聚合数据包
 */
function loadInitialAssetsFromStorage(): {
  weapons: WeaponSystem[]
  groundStations: GroundStation[]
  dataCenters: DataCenter[]
  dataLinks: DataLink[]
} {
  try {
    const raw = localStorage.getItem(TACTICAL_ASSETS_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      const wpns = Array.isArray(parsed.weapons) && parsed.weapons.length > 0 ? parsed.weapons : DEFAULT_WEAPONS
      const gs = Array.isArray(parsed.groundStations) && parsed.groundStations.length > 0 ? parsed.groundStations : DEFAULT_GROUND_STATIONS
      const dc = Array.isArray(parsed.dataCenters) && parsed.dataCenters.length > 0 ? parsed.dataCenters : DEFAULT_DATA_CENTERS
      let dl = Array.isArray(parsed.dataLinks) && parsed.dataLinks.length > 0 ? parsed.dataLinks : DEFAULT_DATA_LINKS

      // 确保默认链路均存在
      DEFAULT_DATA_LINKS.forEach((defaultLink) => {
        if (!dl.some((d: DataLink) => d.id === defaultLink.id || d.sourceSatelliteId === defaultLink.sourceSatelliteId)) {
          dl.push(defaultLink)
        }
      })

      return {
        weapons: wpns,
        groundStations: gs,
        dataCenters: dc,
        dataLinks: dl
      }
    }
  } catch (err) {
    console.warn('Failed to parse cached tactical assets from localStorage', err)
  }
  return {
    weapons: JSON.parse(JSON.stringify(DEFAULT_WEAPONS)),
    groundStations: JSON.parse(JSON.stringify(DEFAULT_GROUND_STATIONS)),
    dataCenters: JSON.parse(JSON.stringify(DEFAULT_DATA_CENTERS)),
    dataLinks: JSON.parse(JSON.stringify(DEFAULT_DATA_LINKS))
  }
}

const initialData = loadInitialAssetsFromStorage()

/**
 * 武器系统响应式列表
 */
const weapons = ref<WeaponSystem[]>(initialData.weapons)

/**
 * 敌方地面站响应式列表
 */
const groundStations = ref<GroundStation[]>(initialData.groundStations)

/**
 * 数据中心响应式列表
 */
const dataCenters = ref<DataCenter[]>(initialData.dataCenters)

/**
 * 空间数据链路网络响应式列表
 */
const dataLinks = ref<DataLink[]>(initialData.dataLinks)

/**
 * 当前选中的实体 ID
 */
const selectedWeaponId = ref<string | null>('WPN-HQ19')
const selectedGroundStationId = ref<string | null>('GS-PINE-GAP')
const selectedDataCenterId = ref<string | null>('DC-JIOC-HAWAII')
const selectedDataLinkId = ref<string | null>('DL-01')

import { useRightPanelState } from './useRightPanelState'

/**
 * 引入右侧面板互斥调度中心
 */
const { activeRightPanel, setActivePanel } = useRightPanelState()

/**
 * 武器与数据链路综合抽屉显隐状态
 * 采用计算属性双向绑定至右侧面板调度中心，确保互斥独占显示，杜绝界面重叠
 */
const isAssetDrawerOpen = computed<boolean>({
  get: () => activeRightPanel.value === 'TACTICAL_ASSETS',
  set: (val: boolean) => {
    setActivePanel(val ? 'TACTICAL_ASSETS' : 'NONE')
  }
})

/**
 * 新建武器模态框显隐状态
 */
const isCreateWeaponModalOpen = ref<boolean>(false)

/**
 * 新建地面站模态框显隐状态
 */
const isCreateGroundStationModalOpen = ref<boolean>(false)

/**
 * 新建数据中心模态框显隐状态
 */
const isCreateDataCenterModalOpen = ref<boolean>(false)

/**
 * 新建数据链路模态框显隐状态
 */
const isCreateDataLinkModalOpen = ref<boolean>(false)

/**
 * 抽屉激活标签页
 */
const activeAssetTab = ref<'WEAPONS' | 'GROUND_STATIONS' | 'DATA_CENTERS' | 'DATA_LINKS'>('WEAPONS')

/**
 * 地图单点点选拾取坐标模式
 */
const isPickingLocationOnMap = ref<boolean>(false)
const pickingTarget = ref<'WEAPON' | 'GROUND_STATION' | 'DATA_CENTER' | null>(null)
let onLocationPickedCallback: ((coords: { longitude: number; latitude: number; altitudeM?: number }) => void) | null = null

// 统一持久化存储监听
watch(
  [weapons, groundStations, dataCenters, dataLinks],
  () => {
    try {
      const payload = {
        weapons: weapons.value,
        groundStations: groundStations.value,
        dataCenters: dataCenters.value,
        dataLinks: dataLinks.value
      }
      localStorage.setItem(TACTICAL_ASSETS_STORAGE_KEY, JSON.stringify(payload))
    } catch (e) {
      console.error('Failed to save tactical assets to localStorage', e)
    }
  },
  { deep: true }
)

/**
 * 全局武器与数据链路态势 Composable 钩子
 *
 * @returns 响应式数据源与资产管理控制方法
 */
export function useTacticalAssetsState() {
  /**
   * 当前选中的武器实体计算属性
   */
  const selectedWeapon = computed<WeaponSystem | null>(() => {
    return weapons.value.find((w) => w.id === selectedWeaponId.value) || null
  })

  /**
   * 当前选中的地面站实体计算属性
   */
  const selectedGroundStation = computed<GroundStation | null>(() => {
    return groundStations.value.find((g) => g.id === selectedGroundStationId.value) || null
  })

  /**
   * 当前选中的数据中心实体计算属性
   */
  const selectedDataCenter = computed<DataCenter | null>(() => {
    return dataCenters.value.find((d) => d.id === selectedDataCenterId.value) || null
  })

  /**
   * 当前选中的数据链路实体计算属性
   */
  const selectedDataLink = computed<DataLink | null>(() => {
    return dataLinks.value.find((l) => l.id === selectedDataLinkId.value) || null
  })

  /**
   * 添加并持久化新武器装备
   *
   * @param data - 武器初始化参数
   * @returns 新增的武器实体
   */
  function createWeapon(data: Omit<WeaponSystem, 'id' | 'createdAt'>): WeaponSystem {
    const newId = `WPN-${Date.now().toString().slice(-4)}`
    const newWpn: WeaponSystem = {
      ...data,
      id: newId,
      createdAt: new Date().toISOString()
    }
    weapons.value.unshift(newWpn)
    selectedWeaponId.value = newWpn.id
    return newWpn
  }

  /**
   * 删除指定武器
   *
   * @param id - 武器 ID
   */
  function deleteWeapon(id: string): void {
    weapons.value = weapons.value.filter((w) => w.id !== id)
    if (selectedWeaponId.value === id) {
      selectedWeaponId.value = weapons.value[0]?.id || null
    }
  }

  /**
   * 添加并持久化敌方地面站
   *
   * @param data - 地面站参数
   * @returns 新增的地面站实体
   */
  function createGroundStation(data: Omit<GroundStation, 'id' | 'createdAt'>): GroundStation {
    const newId = `GS-${Date.now().toString().slice(-4)}`
    const newGs: GroundStation = {
      ...data,
      id: newId,
      createdAt: new Date().toISOString()
    }
    groundStations.value.unshift(newGs)
    selectedGroundStationId.value = newGs.id
    return newGs
  }

  /**
   * 删除地面站并同步断开关联链路
   *
   * @param id - 地面站 ID
   */
  function deleteGroundStation(id: string): void {
    groundStations.value = groundStations.value.filter((g) => g.id !== id)
    // 移除依赖该地面站的数据链路
    dataLinks.value = dataLinks.value.filter((l) => l.groundStationId !== id)
    if (selectedGroundStationId.value === id) {
      selectedGroundStationId.value = groundStations.value[0]?.id || null
    }
  }

  /**
   * 添加并持久化数据中心
   *
   * @param data - 数据中心参数
   * @returns 新增的数据中心实体
   */
  function createDataCenter(data: Omit<DataCenter, 'id' | 'createdAt'>): DataCenter {
    const newId = `DC-${Date.now().toString().slice(-4)}`
    const newDc: DataCenter = {
      ...data,
      id: newId,
      createdAt: new Date().toISOString()
    }
    dataCenters.value.unshift(newDc)
    selectedDataCenterId.value = newDc.id
    return newDc
  }

  /**
   * 删除数据中心
   *
   * @param id - 数据中心 ID
   */
  function deleteDataCenter(id: string): void {
    dataCenters.value = dataCenters.value.filter((d) => d.id !== id)
    dataLinks.value = dataLinks.value.filter((l) => l.dataCenterId !== id)
    if (selectedDataCenterId.value === id) {
      selectedDataCenterId.value = dataCenters.value[0]?.id || null
    }
  }

  /**
   * 创建并绑定空间数据链路
   *
   * @param data - 链路参数
   * @returns 新增的链路实体
   */
  function createDataLink(data: Omit<DataLink, 'id' | 'createdAt'>): DataLink {
    const newId = `DL-${Date.now().toString().slice(-4)}`
    const newDl: DataLink = {
      ...data,
      id: newId,
      createdAt: new Date().toISOString()
    }
    dataLinks.value.unshift(newDl)
    selectedDataLinkId.value = newDl.id
    return newDl
  }

  /**
   * 删除指定数据链路
   *
   * @param id - 链路 ID
   */
  function deleteDataLink(id: string): void {
    dataLinks.value = dataLinks.value.filter((l) => l.id !== id)
    if (selectedDataLinkId.value === id) {
      selectedDataLinkId.value = dataLinks.value[0]?.id || null
    }
  }

  /**
   * 切换指定数据链路的电子压制/正常状态 (模拟我方武器实施干扰断链)
   *
   * @param linkId - 链路 ID
   */
  function toggleLinkJamming(linkId: string): void {
    const link = dataLinks.value.find((l) => l.id === linkId)
    if (link) {
      if (link.status === DataLinkStatus.JAMMED) {
        link.status = DataLinkStatus.ACTIVE
        link.dataRateMbps = 1200
      } else {
        link.status = DataLinkStatus.JAMMED
        link.dataRateMbps = 0
      }
    }
  }

  /**
   * 启动地图单点拾取模式
   *
   * @param target - 触发拾取的资产类型
   * @param onPicked - 拾取到坐标后的回调
   */
  function startMapLocationPick(
    target: 'WEAPON' | 'GROUND_STATION' | 'DATA_CENTER',
    onPicked: (coords: { longitude: number; latitude: number; altitudeM?: number }) => void
  ): void {
    isPickingLocationOnMap.value = true
    pickingTarget.value = target
    onLocationPickedCallback = onPicked
  }

  /**
   * 完成地图坐标拾取
   *
   * @param coords - 拾取到的经纬度与海拔
   */
  function completeMapLocationPick(coords: { longitude: number; latitude: number; altitudeM?: number }): void {
    isPickingLocationOnMap.value = false
    pickingTarget.value = null
    if (onLocationPickedCallback) {
      onLocationPickedCallback(coords)
      onLocationPickedCallback = null
    }
  }

  /**
   * 取消地图点选拾取
   */
  function cancelMapLocationPick(): void {
    isPickingLocationOnMap.value = false
    pickingTarget.value = null
    onLocationPickedCallback = null
  }

  return {
    weapons,
    groundStations,
    dataCenters,
    dataLinks,
    selectedWeaponId,
    selectedGroundStationId,
    selectedDataCenterId,
    selectedDataLinkId,
    selectedWeapon,
    selectedGroundStation,
    selectedDataCenter,
    selectedDataLink,
    isAssetDrawerOpen,
    isCreateWeaponModalOpen,
    isCreateGroundStationModalOpen,
    isCreateDataCenterModalOpen,
    isCreateDataLinkModalOpen,
    activeAssetTab,
    isPickingLocationOnMap,
    pickingTarget,
    createWeapon,
    deleteWeapon,
    createGroundStation,
    deleteGroundStation,
    createDataCenter,
    deleteDataCenter,
    createDataLink,
    deleteDataLink,
    toggleLinkJamming,
    startMapLocationPick,
    completeMapLocationPick,
    cancelMapLocationPick
  }
}
