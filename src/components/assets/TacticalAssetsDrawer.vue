<script setup lang="ts">
/**
 * @fileoverview 武器装备、敌方地面站、数据中心与空间数据链路综合管理侧边抽屉组件
 * 提供四标签页资产目录检索、卡片式性能态势展示、一键三维球体航向定位、链路电子干扰压制联动与快速录入
 */

import { ref, computed } from 'vue'
import {
  Crosshair,
  Radio,
  Server,
  Share2,
  Search,
  Plus,
  Trash2,
  MapPin,
  X,
  Zap,
  ArrowRight,
  Activity
} from 'lucide-vue-next'
import { useTacticalAssetsState } from '../../composables/useTacticalAssetsState'
import { useSatelliteState } from '../../composables/useSatelliteState'
import { flyToAssetLocation } from '../../services/cesiumManager'
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
} from '../../types/tacticalAssets'

/**
 * 引入战术资产全局状态与操作方法
 */
const {
  weapons,
  groundStations,
  dataCenters,
  dataLinks,
  selectedWeaponId,
  selectedGroundStationId,
  selectedDataCenterId,
  selectedDataLinkId,
  isAssetDrawerOpen,
  isCreateWeaponModalOpen,
  isCreateGroundStationModalOpen,
  isCreateDataCenterModalOpen,
  isCreateDataLinkModalOpen,
  activeAssetTab,
  deleteWeapon,
  deleteGroundStation,
  deleteDataCenter,
  deleteDataLink,
  toggleLinkJamming
} = useTacticalAssetsState()

/**
 * 引入卫星状态以解析链路源星与中继星名称
 */
const { satellites } = useSatelliteState()

/**
 * 资产抽屉内关键字检索过滤词
 */
const searchQuery = ref<string>('')

/**
 * 操作通知提示
 */
const toastMessage = ref<string>('')

/**
 * 过滤后的武器列表
 */
const filteredWeapons = computed<WeaponSystem[]>(() => {
  const query = searchQuery.value.trim().toLowerCase()
  if (!query) return weapons.value
  return weapons.value.filter(
    (w) =>
      w.name.toLowerCase().includes(query) ||
      w.locationName.toLowerCase().includes(query) ||
      w.id.toLowerCase().includes(query)
  )
})

/**
 * 过滤后的地面站列表
 */
const filteredGroundStations = computed<GroundStation[]>(() => {
  const query = searchQuery.value.trim().toLowerCase()
  if (!query) return groundStations.value
  return groundStations.value.filter(
    (g) =>
      g.name.toLowerCase().includes(query) ||
      g.country.toLowerCase().includes(query) ||
      g.id.toLowerCase().includes(query)
  )
})

/**
 * 过滤后的数据中心列表
 */
const filteredDataCenters = computed<DataCenter[]>(() => {
  const query = searchQuery.value.trim().toLowerCase()
  if (!query) return dataCenters.value
  return dataCenters.value.filter(
    (d) =>
      d.name.toLowerCase().includes(query) ||
      d.country.toLowerCase().includes(query) ||
      d.id.toLowerCase().includes(query)
  )
})

/**
 * 过滤后的数据链路列表
 */
const filteredDataLinks = computed<DataLink[]>(() => {
  const query = searchQuery.value.trim().toLowerCase()
  if (!query) return dataLinks.value
  return dataLinks.value.filter(
    (l) =>
      l.name.toLowerCase().includes(query) ||
      l.id.toLowerCase().includes(query) ||
      l.description.toLowerCase().includes(query)
  )
})

/**
 * 显示瞬时战术通知
 *
 * @param msg - 提示文本内容
 */
function showToast(msg: string): void {
  toastMessage.value = msg
  setTimeout(() => {
    toastMessage.value = ''
  }, 2500)
}

/**
 * 转换武器类型中文标签
 *
 * @param type - 武器类型枚举
 * @returns 战术中文名称
 */
function getWeaponTypeLabel(type: WeaponType): string {
  switch (type) {
    case WeaponType.KINETIC:
      return '动能拦截'
    case WeaponType.DIRECTED_ENERGY:
      return '高能激光/定向能'
    case WeaponType.ELECTRONIC_WARFARE:
      return '超宽带电子干扰'
    case WeaponType.CYBER:
      return '网电空间对抗'
    default:
      return '综合打击'
  }
}

/**
 * 转换武器状态中文标签与配色
 *
 * @param status - 战备状态
 * @returns 状态文本与样式类名
 */
function getWeaponStatusBadge(status: WeaponStatus): { text: string; className: string } {
  switch (status) {
    case WeaponStatus.READY:
      return { text: '战备就绪', className: 'bg-emerald-950/60 border-emerald-500/60 text-emerald-400' }
    case WeaponStatus.ENGAGING:
      return { text: '交战发射', className: 'bg-red-950/60 border-red-500/60 text-red-400 animate-pulse' }
    case WeaponStatus.COOLDOWN:
      return { text: '冷却储能', className: 'bg-amber-950/60 border-amber-500/60 text-amber-400' }
    case WeaponStatus.DEPLETED:
      return { text: '弹药耗尽', className: 'bg-slate-900 border-slate-700 text-slate-500' }
  }
}

/**
 * 转换设施状态中文标签与配色
 *
 * @param status - 设施运行工况
 * @returns 状态文本与样式类名
 */
function getFacilityStatusBadge(status: FacilityStatus): { text: string; className: string } {
  switch (status) {
    case FacilityStatus.ACTIVE:
      return { text: '在网运行', className: 'bg-emerald-950/60 border-emerald-500/60 text-emerald-400' }
    case FacilityStatus.JAMMED:
      return { text: '受阻瘫痪', className: 'bg-red-950/60 border-red-500/60 text-red-400 animate-pulse' }
    case FacilityStatus.OFFLINE:
      return { text: '脱网离线', className: 'bg-slate-900 border-slate-700 text-slate-500' }
  }
}

/**
 * 解析数据链路中各个节点的名称
 *
 * @param link - 数据链路实体
 * @returns 格式化的链路节点名称字典
 */
function getLinkNodeNames(link: DataLink): {
  sourceSatName: string
  relaySatName?: string
  groundStationName: string
  dataCenterName: string
} {
  const srcSat = satellites.value.find((s) => s.id === link.sourceSatelliteId)
  const relaySat = link.relaySatelliteId
    ? satellites.value.find((s) => s.id === link.relaySatelliteId)
    : undefined
  const gs = groundStations.value.find((g) => g.id === link.groundStationId)
  const dc = dataCenters.value.find((d) => d.id === link.dataCenterId)

  return {
    sourceSatName: srcSat ? srcSat.name : link.sourceSatelliteId,
    relaySatName: relaySat ? relaySat.name : link.relaySatelliteId,
    groundStationName: gs ? gs.name : link.groundStationId,
    dataCenterName: dc ? dc.name : link.dataCenterId
  }
}

/**
 * 视点平滑飞行至武器部署阵地
 *
 * @param wpn - 武器实体
 */
function handleFlyToWeapon(wpn: WeaponSystem): void {
  selectedWeaponId.value = wpn.id
  // 视距适配武器射程，保证三维立体通道与地面打击圈完全展现
  const rangeM = Math.max(550000, wpn.strikeRange.maxDistanceKm * 1100)
  flyToAssetLocation(wpn.position.longitude, wpn.position.latitude, rangeM, 1.8)
  showToast(`视点已锁定武器阵地：${wpn.name}`)
}

/**
 * 视点平滑飞行至敌方地面站
 *
 * @param gs - 地面站实体
 */
function handleFlyToGroundStation(gs: GroundStation): void {
  selectedGroundStationId.value = gs.id
  flyToAssetLocation(gs.position.longitude, gs.position.latitude, 380000, 1.8)
  showToast(`视点已锁定地面测控站：${gs.name}`)
}

/**
 * 视点平滑飞行至情报数据中心
 *
 * @param dc - 数据中心实体
 */
function handleFlyToDataCenter(dc: DataCenter): void {
  selectedDataCenterId.value = dc.id
  flyToAssetLocation(dc.position.longitude, dc.position.latitude, 320000, 1.8)
  showToast(`视点已锁定情报数据中心：${dc.name}`)
}

/**
 * 视点平滑飞行至数据链路的关键受控地面站
 *
 * @param link - 链路实体
 */
function handleFlyToDataLink(link: DataLink): void {
  selectedDataLinkId.value = link.id
  const gs = groundStations.value.find((g) => g.id === link.groundStationId)
  if (gs) {
    flyToAssetLocation(gs.position.longitude, gs.position.latitude, 500000, 1.8)
    showToast(`视点已聚焦该链路地面端：${gs.name}`)
  } else {
    showToast(`链路：${link.name}`)
  }
}

/**
 * 打开当前标签页对应的新增模态对话框
 */
function handleOpenCreateModal(): void {
  switch (activeAssetTab.value) {
    case 'WEAPONS':
      isCreateWeaponModalOpen.value = true
      break
    case 'GROUND_STATIONS':
      isCreateGroundStationModalOpen.value = true
      break
    case 'DATA_CENTERS':
      isCreateDataCenterModalOpen.value = true
      break
    case 'DATA_LINKS':
      isCreateDataLinkModalOpen.value = true
      break
  }
}
</script>

<template>
  <div
    v-if="isAssetDrawerOpen"
    class="fixed top-16 right-3 z-30 w-[520px] max-w-[calc(100vw-24px)] max-h-[calc(100vh-120px)] bg-[#0c1322]/95 border border-cyan-500/40 rounded-lg backdrop-blur-md shadow-tactical-panel flex flex-col font-mono text-slate-200 select-none overflow-hidden"
  >
    <!-- 顶部抽屉标题栏 -->
    <div class="px-4 py-3 border-b border-cyan-500/30 bg-gradient-to-r from-cyan-950/40 via-transparent to-transparent flex items-center justify-between">
      <div class="flex items-center gap-2">
        <Crosshair class="w-4 h-4 text-cyan-400" />
        <span class="text-sm font-bold tracking-wider text-cyan-300">
          武器装备与天基数据链路态势 [TACTICAL ASSETS]
        </span>
      </div>
      <button
        @click="isAssetDrawerOpen = false"
        class="text-slate-400 hover:text-red-400 transition-colors p-1"
        title="关闭面板"
      >
        <X class="w-4 h-4" />
      </button>
    </div>

    <!-- 瞬时战术通知提示条 -->
    <div
      v-if="toastMessage"
      class="px-4 py-1.5 bg-cyan-950/80 border-b border-cyan-500/40 text-cyan-300 text-xs flex items-center gap-2 animate-fade-in"
    >
      <Activity class="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
      <span>{{ toastMessage }}</span>
    </div>

    <!-- 4 个标签页导航栏 -->
    <div class="grid grid-cols-4 border-b border-cyan-950 bg-black/40 text-[11px]">
      <!-- 武器系统 -->
      <button
        @click="activeAssetTab = 'WEAPONS'"
        class="py-2.5 px-2 flex flex-col items-center gap-1 border-b-2 transition-all"
        :class="activeAssetTab === 'WEAPONS' ? 'border-cyan-400 text-cyan-300 bg-cyan-950/30' : 'border-transparent text-slate-400 hover:text-slate-200'"
      >
        <div class="flex items-center gap-1">
          <Crosshair class="w-3.5 h-3.5" />
          <span>武器系统</span>
        </div>
        <span class="text-[9px] px-1.5 py-0.2 bg-cyan-900/60 rounded text-cyan-300">
          {{ weapons.length }}
        </span>
      </button>

      <!-- 地面站 -->
      <button
        @click="activeAssetTab = 'GROUND_STATIONS'"
        class="py-2.5 px-2 flex flex-col items-center gap-1 border-b-2 transition-all"
        :class="activeAssetTab === 'GROUND_STATIONS' ? 'border-cyan-400 text-cyan-300 bg-cyan-950/30' : 'border-transparent text-slate-400 hover:text-slate-200'"
      >
        <div class="flex items-center gap-1">
          <Radio class="w-3.5 h-3.5" />
          <span>地面站</span>
        </div>
        <span class="text-[9px] px-1.5 py-0.2 bg-sky-900/60 rounded text-sky-300">
          {{ groundStations.length }}
        </span>
      </button>

      <!-- 数据中心 -->
      <button
        @click="activeAssetTab = 'DATA_CENTERS'"
        class="py-2.5 px-2 flex flex-col items-center gap-1 border-b-2 transition-all"
        :class="activeAssetTab === 'DATA_CENTERS' ? 'border-amber-400 text-amber-300 bg-amber-950/30' : 'border-transparent text-slate-400 hover:text-slate-200'"
      >
        <div class="flex items-center gap-1">
          <Server class="w-3.5 h-3.5" />
          <span>数据中心</span>
        </div>
        <span class="text-[9px] px-1.5 py-0.2 bg-amber-900/60 rounded text-amber-300">
          {{ dataCenters.length }}
        </span>
      </button>

      <!-- 数据链路 -->
      <button
        @click="activeAssetTab = 'DATA_LINKS'"
        class="py-2.5 px-2 flex flex-col items-center gap-1 border-b-2 transition-all"
        :class="activeAssetTab === 'DATA_LINKS' ? 'border-purple-400 text-purple-300 bg-purple-950/30' : 'border-transparent text-slate-400 hover:text-slate-200'"
      >
        <div class="flex items-center gap-1">
          <Share2 class="w-3.5 h-3.5" />
          <span>数据链路</span>
        </div>
        <span class="text-[9px] px-1.5 py-0.2 bg-purple-900/60 rounded text-purple-300">
          {{ dataLinks.length }}
        </span>
      </button>
    </div>

    <!-- 检索过滤与新建按钮条 -->
    <div class="p-3 border-b border-cyan-950 flex items-center gap-2 bg-black/20">
      <div class="relative flex-1">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="按名称/代号/区域关键字检索..."
          class="w-full bg-[#070b14] border border-cyan-900/60 rounded pl-7 pr-2.5 py-1 text-slate-200 focus:outline-none focus:border-cyan-400 text-xs"
        />
        <Search class="w-3.5 h-3.5 text-slate-400 absolute left-2 top-2" />
      </div>

      <button
        @click="handleOpenCreateModal"
        class="px-2.5 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded flex items-center gap-1 text-xs font-bold shadow-[0_0_10px_rgba(6,182,212,0.3)] transition-all shrink-0"
      >
        <Plus class="w-3.5 h-3.5" />
        <span v-if="activeAssetTab === 'WEAPONS'">部署武器</span>
        <span v-else-if="activeAssetTab === 'GROUND_STATIONS'">录入地面站</span>
        <span v-else-if="activeAssetTab === 'DATA_CENTERS'">录入数据中心</span>
        <span v-else>组建链路</span>
      </button>
    </div>

    <!-- 列表内容主体 (滚动容器) -->
    <div class="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar text-xs">
      <!-- 1. 武器系统列表 -->
      <template v-if="activeAssetTab === 'WEAPONS'">
        <div
          v-for="wpn in filteredWeapons"
          :key="wpn.id"
          class="p-3 rounded border transition-all cursor-pointer"
          :class="selectedWeaponId === wpn.id ? 'bg-cyan-950/30 border-cyan-400/80 shadow-[0_0_15px_rgba(6,182,212,0.2)]' : 'bg-black/30 border-cyan-950 hover:border-cyan-800'"
          @click="handleFlyToWeapon(wpn)"
        >
          <!-- 武器标题与状态 -->
          <div class="flex items-start justify-between gap-2 mb-2">
            <div>
              <div class="flex items-center gap-1.5 font-bold text-cyan-300 text-xs">
                <span>{{ wpn.name }}</span>
              </div>
              <div class="text-[10px] text-slate-400 mt-0.5 flex items-center gap-2">
                <span>{{ wpn.id }}</span>
                <span>•</span>
                <span class="text-cyan-400">{{ getWeaponTypeLabel(wpn.type) }}</span>
                <span>•</span>
                <span class="text-slate-300">{{ wpn.locationName }}</span>
              </div>
            </div>

            <!-- 战备状态胶囊 -->
            <span
              class="px-1.5 py-0.5 rounded text-[10px] border shrink-0"
              :class="getWeaponStatusBadge(wpn.status).className"
            >
              {{ getWeaponStatusBadge(wpn.status).text }}
            </span>
          </div>

          <!-- 射程与指标矩阵 -->
          <div class="grid grid-cols-3 gap-1.5 bg-[#070b14] p-2 rounded border border-cyan-950 text-[10px] mb-2">
            <div>
              <div class="text-slate-500">射高包络</div>
              <div class="text-cyan-200 font-bold">{{ wpn.strikeRange.minAltitudeKm }}-{{ wpn.strikeRange.maxAltitudeKm }} km</div>
            </div>
            <div>
              <div class="text-slate-500">最大斜距</div>
              <div class="text-cyan-200 font-bold">{{ wpn.strikeRange.maxDistanceKm }} km</div>
            </div>
            <div>
              <div class="text-slate-500">毁伤概率 Pk</div>
              <div class="text-emerald-400 font-bold">{{ wpn.performance.pkProbability }}%</div>
            </div>
            <div>
              <div class="text-slate-500">打击冷却</div>
              <div class="text-amber-300 font-bold">{{ wpn.cooldownSec }} 秒</div>
            </div>
            <div>
              <div class="text-slate-500">可用单元</div>
              <div class="text-cyan-200 font-bold">{{ wpn.quantity }} 单元</div>
            </div>
            <div>
              <div class="text-slate-500">跟踪精度</div>
              <div class="text-cyan-200 font-bold">{{ wpn.performance.trackingAccuracyM }} m</div>
            </div>
          </div>

          <!-- 可打击卫星类型标签 -->
          <div class="flex items-center gap-1 flex-wrap mb-2">
            <span class="text-[10px] text-slate-400">目标卫星:</span>
            <span
              v-for="t in wpn.targetSatelliteTypes"
              :key="t"
              class="px-1.5 py-0.2 bg-cyan-900/30 border border-cyan-700/40 text-cyan-300 rounded text-[9px]"
            >
              {{ t }}
            </span>
          </div>

          <!-- 说明与操作按钮条 -->
          <div class="text-[10px] text-slate-400 border-t border-cyan-950 pt-2 flex items-center justify-between">
            <div class="truncate max-w-[280px]" :title="wpn.description">
              {{ wpn.description }}
            </div>
            <div class="flex items-center gap-2 shrink-0">
              <button
                @click.stop="handleFlyToWeapon(wpn)"
                class="px-2 py-0.5 bg-cyan-900/40 hover:bg-cyan-800/60 border border-cyan-600/40 rounded text-cyan-300 text-[10px] flex items-center gap-1 transition-all"
              >
                <MapPin class="w-3 h-3" />
                <span>定位</span>
              </button>
              <button
                @click.stop="deleteWeapon(wpn.id)"
                class="p-1 text-slate-500 hover:text-red-400 transition-colors"
                title="删除武器"
              >
                <Trash2 class="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        <div v-if="filteredWeapons.length === 0" class="text-center py-8 text-slate-500 text-xs">
          无匹配的武器装备，点击上方按钮部署新武器
        </div>
      </template>

      <!-- 2. 地面站列表 -->
      <template v-if="activeAssetTab === 'GROUND_STATIONS'">
        <div
          v-for="gs in filteredGroundStations"
          :key="gs.id"
          class="p-3 rounded border transition-all cursor-pointer"
          :class="selectedGroundStationId === gs.id ? 'bg-sky-950/30 border-sky-400/80 shadow-[0_0_15px_rgba(56,189,248,0.2)]' : 'bg-black/30 border-cyan-950 hover:border-cyan-800'"
          @click="handleFlyToGroundStation(gs)"
        >
          <div class="flex items-start justify-between gap-2 mb-2">
            <div>
              <div class="flex items-center gap-1.5 font-bold text-sky-300 text-xs">
                <span>{{ gs.name }}</span>
              </div>
              <div class="text-[10px] text-slate-400 mt-0.5 flex items-center gap-2">
                <span>{{ gs.id }}</span>
                <span>•</span>
                <span class="text-sky-400">{{ gs.country }}</span>
                <span>•</span>
                <span>{{ gs.position.longitude.toFixed(2) }}°E, {{ gs.position.latitude.toFixed(2) }}°N</span>
              </div>
            </div>

            <!-- 工况状态 -->
            <span
              class="px-1.5 py-0.5 rounded text-[10px] border shrink-0"
              :class="getFacilityStatusBadge(gs.status).className"
            >
              {{ getFacilityStatusBadge(gs.status).text }}
            </span>
          </div>

          <!-- 通信参数网格 -->
          <div class="grid grid-cols-2 gap-2 bg-[#070b14] p-2 rounded border border-cyan-950 text-[10px] mb-2">
            <div>
              <div class="text-slate-500">主天线口径</div>
              <div class="text-sky-200 font-bold">{{ gs.antennaDiameterM }} 米</div>
            </div>
            <div>
              <div class="text-slate-500">最低俯仰跟踪角</div>
              <div class="text-sky-200 font-bold">{{ gs.elevationLimitDeg }}°</div>
            </div>
            <div class="col-span-2">
              <div class="text-slate-500 mb-1">支持测控通信频段</div>
              <div class="flex items-center gap-1 flex-wrap">
                <span
                  v-for="b in gs.frequencyBands"
                  :key="b"
                  class="px-1.5 py-0.2 bg-sky-950 border border-sky-700/50 text-sky-300 rounded text-[9px]"
                >
                  {{ b }}
                </span>
              </div>
            </div>
          </div>

          <!-- 操作条 -->
          <div class="text-[10px] text-slate-400 border-t border-cyan-950 pt-2 flex items-center justify-between">
            <div class="truncate max-w-[280px]" :title="gs.description">
              {{ gs.description }}
            </div>
            <div class="flex items-center gap-2 shrink-0">
              <button
                @click.stop="handleFlyToGroundStation(gs)"
                class="px-2 py-0.5 bg-sky-900/40 hover:bg-sky-800/60 border border-sky-600/40 rounded text-sky-300 text-[10px] flex items-center gap-1 transition-all"
              >
                <MapPin class="w-3 h-3" />
                <span>定位</span>
              </button>
              <button
                @click.stop="deleteGroundStation(gs.id)"
                class="p-1 text-slate-500 hover:text-red-400 transition-colors"
                title="删除地面站"
              >
                <Trash2 class="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        <div v-if="filteredGroundStations.length === 0" class="text-center py-8 text-slate-500 text-xs">
          无匹配的地面站，点击上方按钮录入
        </div>
      </template>

      <!-- 3. 数据中心列表 -->
      <template v-if="activeAssetTab === 'DATA_CENTERS'">
        <div
          v-for="dc in filteredDataCenters"
          :key="dc.id"
          class="p-3 rounded border transition-all cursor-pointer"
          :class="selectedDataCenterId === dc.id ? 'bg-amber-950/30 border-amber-400/80 shadow-[0_0_15px_rgba(245,158,11,0.2)]' : 'bg-black/30 border-cyan-950 hover:border-cyan-800'"
          @click="handleFlyToDataCenter(dc)"
        >
          <div class="flex items-start justify-between gap-2 mb-2">
            <div>
              <div class="flex items-center gap-1.5 font-bold text-amber-300 text-xs">
                <span>{{ dc.name }}</span>
              </div>
              <div class="text-[10px] text-slate-400 mt-0.5 flex items-center gap-2">
                <span>{{ dc.id }}</span>
                <span>•</span>
                <span class="text-amber-400">{{ dc.country }}</span>
                <span>•</span>
                <span>{{ dc.position.longitude.toFixed(2) }}°E, {{ dc.position.latitude.toFixed(2) }}°N</span>
              </div>
            </div>

            <span
              class="px-1.5 py-0.5 rounded text-[10px] border shrink-0"
              :class="getFacilityStatusBadge(dc.status).className"
            >
              {{ getFacilityStatusBadge(dc.status).text }}
            </span>
          </div>

          <!-- 算力与防护规格 -->
          <div class="grid grid-cols-2 gap-2 bg-[#070b14] p-2 rounded border border-cyan-950 text-[10px] mb-2">
            <div>
              <div class="text-slate-500">基础设施算力规模</div>
              <div class="text-amber-200 font-bold">{{ dc.computeScale }}</div>
            </div>
            <div>
              <div class="text-slate-500">保密与防护等级</div>
              <div class="text-amber-200 font-bold truncate" :title="dc.securityLevel">{{ dc.securityLevel }}</div>
            </div>
          </div>

          <!-- 操作条 -->
          <div class="text-[10px] text-slate-400 border-t border-cyan-950 pt-2 flex items-center justify-between">
            <div class="truncate max-w-[280px]" :title="dc.description">
              {{ dc.description }}
            </div>
            <div class="flex items-center gap-2 shrink-0">
              <button
                @click.stop="handleFlyToDataCenter(dc)"
                class="px-2 py-0.5 bg-amber-900/40 hover:bg-amber-800/60 border border-amber-600/40 rounded text-amber-300 text-[10px] flex items-center gap-1 transition-all"
              >
                <MapPin class="w-3 h-3" />
                <span>定位</span>
              </button>
              <button
                @click.stop="deleteDataCenter(dc.id)"
                class="p-1 text-slate-500 hover:text-red-400 transition-colors"
                title="删除数据中心"
              >
                <Trash2 class="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        <div v-if="filteredDataCenters.length === 0" class="text-center py-8 text-slate-500 text-xs">
          无匹配的数据中心，点击上方按钮录入
        </div>
      </template>

      <!-- 4. 空间数据链路列表 -->
      <template v-if="activeAssetTab === 'DATA_LINKS'">
        <div
          v-for="link in filteredDataLinks"
          :key="link.id"
          class="p-3 rounded border transition-all cursor-pointer"
          :class="selectedDataLinkId === link.id ? 'bg-purple-950/30 border-purple-400/80 shadow-[0_0_15px_rgba(168,85,247,0.2)]' : 'bg-black/30 border-cyan-950 hover:border-cyan-800'"
          @click="handleFlyToDataLink(link)"
        >
          <!-- 链路头部与状态 -->
          <div class="flex items-start justify-between gap-2 mb-2">
            <div>
              <div class="flex items-center gap-1.5 font-bold text-purple-300 text-xs">
                <span>{{ link.name }}</span>
              </div>
              <div class="text-[10px] text-slate-400 mt-0.5 flex items-center gap-2">
                <span>{{ link.id }}</span>
                <span>•</span>
                <span :class="link.topologyType === DataLinkTopologyType.DIRECT ? 'text-cyan-400' : 'text-indigo-400'">
                  {{ link.topologyType === DataLinkTopologyType.DIRECT ? '直连两跳' : '空间中继三跳' }}
                </span>
              </div>
            </div>

            <!-- 链路状态胶囊 -->
            <span
              class="px-1.5 py-0.5 rounded text-[10px] border shrink-0"
              :class="link.status === DataLinkStatus.ACTIVE ? 'bg-emerald-950/60 border-emerald-500/60 text-emerald-400' : 'bg-red-950/60 border-red-500/60 text-red-400 animate-pulse'"
            >
              {{ link.status === DataLinkStatus.ACTIVE ? '通信通畅' : '电子压制阻断' }}
            </span>
          </div>

          <!-- 动态拓扑节点流动图 -->
          <div class="p-2 rounded bg-[#070b14] border border-cyan-950 text-[10px] mb-2 space-y-1">
            <div class="text-slate-500 flex items-center justify-between">
              <span>立体传输路由:</span>
              <span class="text-cyan-300">{{ link.dataRateMbps }} Mbps / {{ link.latencyMs }} ms</span>
            </div>
            <div class="flex items-center gap-1 flex-wrap text-[11px] font-mono">
              <span class="text-cyan-300 font-bold">{{ getLinkNodeNames(link).sourceSatName }}</span>
              <ArrowRight class="w-3 h-3 text-purple-500 shrink-0" />

              <template v-if="link.topologyType === DataLinkTopologyType.RELAY">
                <span class="text-indigo-300 font-bold">{{ getLinkNodeNames(link).relaySatName }}</span>
                <ArrowRight class="w-3 h-3 text-purple-500 shrink-0" />
              </template>

              <span class="text-sky-300 font-bold">{{ getLinkNodeNames(link).groundStationName }}</span>
              <ArrowRight class="w-3 h-3 text-purple-500 shrink-0" />
              <span class="text-amber-300 font-bold">{{ getLinkNodeNames(link).dataCenterName }}</span>
            </div>
          </div>

          <!-- 操作条与电子对抗压制切换 -->
          <div class="text-[10px] text-slate-400 border-t border-cyan-950 pt-2 flex items-center justify-between">
            <!-- 电子干扰压制 / 恢复按钮 -->
            <button
              @click.stop="toggleLinkJamming(link.id)"
              class="px-2.5 py-1 rounded text-[10px] font-bold border transition-all flex items-center gap-1"
              :class="link.status === DataLinkStatus.ACTIVE ? 'bg-red-950/50 hover:bg-red-900/70 border-red-600/50 text-red-300' : 'bg-emerald-950/50 hover:bg-emerald-900/70 border-emerald-600/50 text-emerald-300'"
            >
              <Zap class="w-3 h-3" />
              <span>{{ link.status === DataLinkStatus.ACTIVE ? '实施电子干扰压制' : '解除电子压制' }}</span>
            </button>

            <div class="flex items-center gap-2">
              <button
                @click.stop="handleFlyToDataLink(link)"
                class="px-2 py-0.5 bg-purple-900/40 hover:bg-purple-800/60 border border-purple-600/40 rounded text-purple-300 text-[10px] flex items-center gap-1 transition-all"
              >
                <MapPin class="w-3 h-3" />
                <span>聚焦</span>
              </button>
              <button
                @click.stop="deleteDataLink(link.id)"
                class="p-1 text-slate-500 hover:text-red-400 transition-colors"
                title="拆除链路"
              >
                <Trash2 class="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        <div v-if="filteredDataLinks.length === 0" class="text-center py-8 text-slate-500 text-xs">
          暂无空间数据链路，点击上方按钮组建新链路
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(6, 182, 212, 0.3);
  border-radius: 2px;
}
</style>
