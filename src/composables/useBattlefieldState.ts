/**
 * @fileoverview 战场态势与作战任务全局响应式状态管理 Composable
 * 负责战场与任务的增删改查、多对多双向关联、LocalStorage 自动持久化、地图交互式绘制状态分发及 JSON 导入导出
 */

import { ref, computed, watch } from 'vue'
import {
  Battlefield,
  CombatMission,
  CombatAreaType,
  BattlefieldStatus,
  PoliticalRedLine,
  TargetSatelliteType,
  MissionStatus,
  MissionPriority
} from '../types/battlefield'

/**
 * LocalStorage 本地持久化缓存键名常量
 */
const BATTLEFIELDS_STORAGE_KEY = 'TAC_SATELLITE_BATTLEFIELDS_V2'
const MISSIONS_STORAGE_KEY = 'TAC_SATELLITE_MISSIONS_V2'

/**
 * 预置真实感初始战场数据
 */
const DEFAULT_BATTLEFIELDS: Battlefield[] = [
  {
    id: 'BF-2026-001',
    name: '台海战区空天联合侦察与防空封锁区',
    code: 'TAIWAN-STRAIT-AO',
    status: BattlefieldStatus.ACTIVE,
    color: '#ef4444',
    description: '涵盖台湾海峡、台湾岛及周边毗连海空域，重点压制过境商用高分遥感与低轨星链通信支援链路。',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    missionIds: ['MSN-2026-01', 'MSN-2026-02'],
    area: {
      type: CombatAreaType.CIRCLE,
      center: {
        longitude: 120.5,
        latitude: 23.8
      },
      radiusKm: 380
    }
  },
  {
    id: 'BF-2026-002',
    name: '关岛周边远海反导预警与电磁侦测区',
    code: 'GUAM-MARIANA-AO',
    status: BattlefieldStatus.PREPARING,
    color: '#f59e0b',
    description: '覆盖马里亚纳群岛与关岛安德森基地空天走廊，监控美军天基早期导弹预警与通信中继星座活动。',
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    updatedAt: new Date(Date.now() - 3600000).toISOString(),
    missionIds: ['MSN-2026-02'],
    area: {
      type: CombatAreaType.CIRCLE,
      center: {
        longitude: 144.92,
        latitude: 13.58
      },
      radiusKm: 550
    }
  },
  {
    id: 'BF-2026-003',
    name: '南海中南沙战略纵深机动护航区',
    code: 'SOUTH-CHINA-SEA-AO',
    status: BattlefieldStatus.ACTIVE,
    color: '#00f0ff',
    description: '重点保障南海航线及岛礁前沿态势感知，防止外军合成孔径雷达 (SAR) 持续穿云侦察。',
    createdAt: new Date(Date.now() - 7200000).toISOString(),
    updatedAt: new Date(Date.now() - 7200000).toISOString(),
    missionIds: ['MSN-2026-03'],
    area: {
      type: CombatAreaType.CIRCLE,
      center: {
        longitude: 114.5,
        latitude: 12.0
      },
      radiusKm: 460
    }
  }
]

/**
 * 预置真实感初始作战任务数据
 */
const DEFAULT_MISSIONS: CombatMission[] = [
  {
    id: 'MSN-2026-01',
    name: '低轨高分商遥过境电磁盲化行动',
    code: 'OPERATION-BLACKOUT-01',
    startTime: new Date().toISOString(),
    endTime: new Date(Date.now() + 86400000 * 2).toISOString(),
    targetSatelliteTypes: [
      TargetSatelliteType.RECONNAISSANCE,
      TargetSatelliteType.COMMUNICATION
    ],
    politicalRedLine: PoliticalRedLine.MILITARY_AND_CIVILIAN,
    targetConstellations: ['Starlink (星链)', 'WorldView (高分商遥)', 'Capella SAR'],
    battlefieldIds: ['BF-2026-001'],
    status: MissionStatus.EXECUTING,
    priority: MissionPriority.CRITICAL,
    description: '对过境台海上空的商业亚米级高分光学及合成孔径雷达卫星执行强电磁压制与激光致盲，阻止敏感态势实时外泄。',
    createdAt: new Date().toISOString()
  },
  {
    id: 'MSN-2026-02',
    name: '第二岛链天基早期预警侦察网络侦测拦截',
    code: 'OPERATION-SKY-INTERCEPT',
    startTime: new Date(Date.now() - 3600000 * 4).toISOString(),
    endTime: new Date(Date.now() + 86400000 * 5).toISOString(),
    targetSatelliteTypes: [
      TargetSatelliteType.EARLY_WARNING,
      TargetSatelliteType.RELAY
    ],
    politicalRedLine: PoliticalRedLine.MILITARY_ONLY,
    targetConstellations: ['SBIRS (天基红外预警)', 'Keyhole / KH (锁眼)', 'WGS (宽带全球通信)'],
    battlefieldIds: ['BF-2026-001', 'BF-2026-002'],
    status: MissionStatus.PLANNING,
    priority: MissionPriority.HIGH,
    description: '严格执行政治红线，仅对明确编目的纯军用预警与中继卫星实施多波段跟踪与反演试射预备。',
    createdAt: new Date(Date.now() - 3600000 * 4).toISOString()
  },
  {
    id: 'MSN-2026-03',
    name: '南海纵深星链低轨分布式中继网络压制演练',
    code: 'OPERATION-SHIELD-TRIDENT',
    startTime: new Date().toISOString(),
    endTime: new Date(Date.now() + 86400000 * 3).toISOString(),
    targetSatelliteTypes: [TargetSatelliteType.COMMUNICATION],
    politicalRedLine: PoliticalRedLine.CIVILIAN_ONLY,
    targetConstellations: ['Starlink (星链)', 'OneWeb'],
    battlefieldIds: ['BF-2026-003'],
    status: MissionStatus.EXECUTING,
    priority: MissionPriority.MEDIUM,
    description: '演练在特定海域切断外军租用的民用低轨卫星宽带通信下行波束，评估干扰效能。',
    createdAt: new Date(Date.now() - 7200000).toISOString()
  }
]

/**
 * 从 LocalStorage 读取战场数据，若为空则返回默认数据
 *
 * @returns 战场数据列表
 */
function loadInitialBattlefields(): Battlefield[] {
  try {
    const raw = localStorage.getItem(BATTLEFIELDS_STORAGE_KEY)
    if (raw) {
      return JSON.parse(raw)
    }
  } catch (err) {
    console.warn('Failed to parse cached battlefields from localStorage', err)
  }
  return JSON.parse(JSON.stringify(DEFAULT_BATTLEFIELDS))
}

/**
 * 从 LocalStorage 读取任务数据，若为空则返回默认数据
 *
 * @returns 任务数据列表
 */
function loadInitialMissions(): CombatMission[] {
  try {
    const raw = localStorage.getItem(MISSIONS_STORAGE_KEY)
    if (raw) {
      return JSON.parse(raw)
    }
  } catch (err) {
    console.warn('Failed to parse cached missions from localStorage', err)
  }
  return JSON.parse(JSON.stringify(DEFAULT_MISSIONS))
}

/**
 * 战场响应式状态列表
 */
const battlefields = ref<Battlefield[]>(loadInitialBattlefields())

/**
 * 任务响应式状态列表
 */
const missions = ref<CombatMission[]>(loadInitialMissions())

/**
 * 当前选中的战场 ID (用于高亮与详情展示)
 */
const selectedBattlefieldId = ref<string | null>('BF-2026-001')

/**
 * 当前选中的作战任务 ID (用于高亮与关联战场反查)
 */
const selectedMissionId = ref<string | null>('MSN-2026-01')

import { useRightPanelState } from './useRightPanelState'

/**
 * 引入右侧面板互斥调度中心
 */
const { activeRightPanel, setActivePanel } = useRightPanelState()

/**
 * 战场与任务管理侧边抽屉显隐状态
 * 采用计算属性双向绑定至右侧面板调度中心，确保互斥独占显示，杜绝界面重叠
 */
const isBattlefieldDrawerOpen = computed<boolean>({
  get: () => activeRightPanel.value === 'BATTLEFIELD',
  set: (val: boolean) => {
    setActivePanel(val ? 'BATTLEFIELD' : 'NONE')
  }
})

/**
 * 新建战场模态框显隐状态
 */
const isCreateBattlefieldModalOpen = ref<boolean>(false)

/**
 * 新建任务模态框显隐状态
 */
const isCreateMissionModalOpen = ref<boolean>(false)

/**
 * 抽屉当前激活的标签页 ('BATTLEFIELDS' | 'MISSIONS')
 */
const activeDrawerTab = ref<'BATTLEFIELDS' | 'MISSIONS'>('BATTLEFIELDS')

/**
 * 搜索关键词
 */
const searchKeyword = ref<string>('')

/**
 * 任务政治红线筛选条件
 */
const redLineFilter = ref<PoliticalRedLine | 'ALL'>('ALL')

/**
 * 打击卫星类型筛选条件
 */
const targetTypeFilter = ref<TargetSatelliteType | 'ALL'>('ALL')

/**
 * 地图交互式绘制战场半径状态控制
 */
const isDrawingMode = ref<boolean>(false)

/**
 * 地图绘制交互回调函数暂存
 */
let onDrawCompleteCallback: ((center: { longitude: number; latitude: number }, radiusKm: number) => void) | null = null

// 监听战场数据变动，自动写入 LocalStorage
watch(
  battlefields,
  (newVal) => {
    try {
      localStorage.setItem(BATTLEFIELDS_STORAGE_KEY, JSON.stringify(newVal))
    } catch (e) {
      console.error('LocalStorage save battlefields failed', e)
    }
  },
  { deep: true }
)

// 监听任务数据变动，自动写入 LocalStorage
watch(
  missions,
  (newVal) => {
    try {
      localStorage.setItem(MISSIONS_STORAGE_KEY, JSON.stringify(newVal))
    } catch (e) {
      console.error('LocalStorage save missions failed', e)
    }
  },
  { deep: true }
)

/**
 * 全局战场与任务状态 Composable 钩子
 *
 * @returns 包含战场、任务、交互模式及持久化方法的管理对象
 */
export function useBattlefieldState() {
  /**
   * 当前选中的战场对象计算属性
   */
  const selectedBattlefield = computed<Battlefield | null>(() => {
    if (!selectedBattlefieldId.value) return null
    return battlefields.value.find((b) => b.id === selectedBattlefieldId.value) || null
  })

  /**
   * 当前选中的任务对象计算属性
   */
  const selectedMission = computed<CombatMission | null>(() => {
    if (!selectedMissionId.value) return null
    return missions.value.find((m) => m.id === selectedMissionId.value) || null
  })

  /**
   * 过滤后的战场列表
   */
  const filteredBattlefields = computed<Battlefield[]>(() => {
    const kw = searchKeyword.value.trim().toLowerCase()
    return battlefields.value.filter((bf) => {
      const matchKeyword =
        !kw ||
        bf.name.toLowerCase().includes(kw) ||
        bf.code.toLowerCase().includes(kw) ||
        bf.id.toLowerCase().includes(kw)
      return matchKeyword
    })
  })

  /**
   * 过滤后的任务列表
   */
  const filteredMissions = computed<CombatMission[]>(() => {
    const kw = searchKeyword.value.trim().toLowerCase()
    return missions.value.filter((msn) => {
      const matchKeyword =
        !kw ||
        msn.name.toLowerCase().includes(kw) ||
        msn.code.toLowerCase().includes(kw) ||
        msn.id.toLowerCase().includes(kw)
      const matchRedLine =
        redLineFilter.value === 'ALL' || msn.politicalRedLine === redLineFilter.value
      const matchType =
        targetTypeFilter.value === 'ALL' ||
        msn.targetSatelliteTypes.includes(targetTypeFilter.value)
      return matchKeyword && matchRedLine && matchType
    })
  })

  /**
   * 选中战场下关联的所有任务列表
   */
  const missionsOfSelectedBattlefield = computed<CombatMission[]>(() => {
    if (!selectedBattlefield.value) return []
    return missions.value.filter((m) =>
      selectedBattlefield.value!.missionIds.includes(m.id)
    )
  })

  /**
   * 选中任务所覆盖的所有战场列表
   */
  const battlefieldsOfSelectedMission = computed<Battlefield[]>(() => {
    if (!selectedMission.value) return []
    return battlefields.value.filter((b) =>
      selectedMission.value!.battlefieldIds.includes(b.id)
    )
  })

  /**
   * 创建并保存一个新战场
   *
   * @param data - 战场基础创建参数
   * @returns 新增的战场实体对象
   */
  function createBattlefield(
    data: Omit<Battlefield, 'id' | 'createdAt' | 'updatedAt'>
  ): Battlefield {
    const timestamp = Date.now()
    const newId = `BF-${new Date().getFullYear()}-${String(battlefields.value.length + 1).padStart(3, '0')}`
    const nowIso = new Date(timestamp).toISOString()

    const newBf: Battlefield = {
      ...data,
      id: newId,
      createdAt: nowIso,
      updatedAt: nowIso
    }

    battlefields.value.unshift(newBf)
    selectedBattlefieldId.value = newBf.id

    // 双向同步：将该战场 ID 添加至关联的任务中
    data.missionIds.forEach((missionId) => {
      const msn = missions.value.find((m) => m.id === missionId)
      if (msn && !msn.battlefieldIds.includes(newId)) {
        msn.battlefieldIds.push(newId)
      }
    })

    return newBf
  }

  /**
   * 删除指定战场并解绑相关任务关联
   *
   * @param id - 待删除的战场 ID
   */
  function deleteBattlefield(id: string): void {
    battlefields.value = battlefields.value.filter((b) => b.id !== id)
    if (selectedBattlefieldId.value === id) {
      selectedBattlefieldId.value = battlefields.value[0]?.id || null
    }

    // 双向同步：从所有任务中移除该战场 ID
    missions.value.forEach((msn) => {
      msn.battlefieldIds = msn.battlefieldIds.filter((bfId) => bfId !== id)
    })
  }

  /**
   * 创建并保存一个新作战任务
   *
   * @param data - 任务基础参数
   * @returns 新增的任务实体对象
   */
  function createMission(
    data: Omit<CombatMission, 'id' | 'createdAt'>
  ): CombatMission {
    const timestamp = Date.now()
    const newId = `MSN-${new Date().getFullYear()}-${String(missions.value.length + 1).padStart(2, '0')}`
    const nowIso = new Date(timestamp).toISOString()

    const newMsn: CombatMission = {
      ...data,
      id: newId,
      createdAt: nowIso
    }

    missions.value.unshift(newMsn)
    selectedMissionId.value = newMsn.id

    // 双向同步：将该任务 ID 添加至其关联的战场中
    data.battlefieldIds.forEach((bfId) => {
      const bf = battlefields.value.find((b) => b.id === bfId)
      if (bf && !bf.missionIds.includes(newId)) {
        bf.missionIds.push(newId)
      }
    })

    return newMsn
  }

  /**
   * 删除指定任务并从关联的战场中移除
   *
   * @param id - 待删除的任务 ID
   */
  function deleteMission(id: string): void {
    missions.value = missions.value.filter((m) => m.id !== id)
    if (selectedMissionId.value === id) {
      selectedMissionId.value = missions.value[0]?.id || null
    }

    // 双向同步：从所有战场中移除该任务 ID
    battlefields.value.forEach((bf) => {
      bf.missionIds = bf.missionIds.filter((mId) => mId !== id)
    })
  }

  /**
   * 启动地图交互式拉取半径绘制模式
   *
   * @param onComplete - 绘制完成时的经纬度与半径回调
   */
  function startInteractiveMapDrawing(
    onComplete: (center: { longitude: number; latitude: number }, radiusKm: number) => void
  ): void {
    isDrawingMode.value = true
    onDrawCompleteCallback = onComplete
  }

  /**
   * 地图绘制完成触发处理
   *
   * @param center - 确认的中心点坐标
   * @param radiusKm - 确认的作战半径 (公里)
   */
  function completeInteractiveMapDrawing(
    center: { longitude: number; latitude: number },
    radiusKm: number
  ): void {
    isDrawingMode.value = false
    if (onDrawCompleteCallback) {
      onDrawCompleteCallback(center, radiusKm)
      onDrawCompleteCallback = null
    }
  }

  /**
   * 取消当前地图绘制模式
   */
  function cancelInteractiveMapDrawing(): void {
    isDrawingMode.value = false
    onDrawCompleteCallback = null
  }

  /**
   * 导出全部战场与任务配置为 JSON 字符串
   *
   * @returns 格式化后的 JSON 字符串
   */
  function exportAllDataToJson(): string {
    const payload = {
      exportVersion: '2.0',
      exportedAt: new Date().toISOString(),
      battlefields: battlefields.value,
      missions: missions.value
    }
    return JSON.stringify(payload, null, 2)
  }

  /**
   * 从 JSON 文本批量导入战场或作战任务
   *
   * @param jsonString - 待解析的 JSON 字符串
   * @returns 导入结果报告 (包含成功数量与可能存在的错误描述)
   */
  function importDataFromJson(jsonString: string): {
    importedBattlefields: number
    importedMissions: number
    error?: string
  } {
    try {
      const parsed = JSON.parse(jsonString)
      let importedBfs = 0
      let importedMsns = 0

      // 1. 如果包含完整的导出版式
      if (Array.isArray(parsed.battlefields)) {
        parsed.battlefields.forEach((bf: Battlefield) => {
          if (bf.name && bf.area) {
            // 生成新 ID 防止碰撞
            bf.id = `BF-IMP-${Date.now().toString().slice(-4)}-${Math.floor(Math.random() * 100)}`
            battlefields.value.unshift(bf)
            importedBfs++
          }
        })
      }

      if (Array.isArray(parsed.missions)) {
        parsed.missions.forEach((msn: CombatMission) => {
          if (msn.name && msn.politicalRedLine) {
            msn.id = `MSN-IMP-${Date.now().toString().slice(-4)}-${Math.floor(Math.random() * 100)}`
            missions.value.unshift(msn)
            importedMsns++
          }
        })
      }

      // 2. 如果直接是单个战场或战场数组
      if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].area) {
        parsed.forEach((bf: Battlefield) => {
          bf.id = `BF-IMP-${Date.now().toString().slice(-4)}-${Math.floor(Math.random() * 100)}`
          battlefields.value.unshift(bf)
          importedBfs++
        })
      }

      return {
        importedBattlefields: importedBfs,
        importedMissions: importedMsns
      }
    } catch (err: any) {
      return {
        importedBattlefields: 0,
        importedMissions: 0,
        error: err.message || 'JSON 解析异常'
      }
    }
  }

  return {
    battlefields,
    missions,
    selectedBattlefieldId,
    selectedMissionId,
    selectedBattlefield,
    selectedMission,
    filteredBattlefields,
    filteredMissions,
    missionsOfSelectedBattlefield,
    battlefieldsOfSelectedMission,
    isBattlefieldDrawerOpen,
    isCreateBattlefieldModalOpen,
    isCreateMissionModalOpen,
    activeDrawerTab,
    searchKeyword,
    redLineFilter,
    targetTypeFilter,
    isDrawingMode,
    createBattlefield,
    deleteBattlefield,
    createMission,
    deleteMission,
    startInteractiveMapDrawing,
    completeInteractiveMapDrawing,
    cancelInteractiveMapDrawing,
    exportAllDataToJson,
    importDataFromJson
  }
}
