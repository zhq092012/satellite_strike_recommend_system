<script setup lang="ts">
/**
 * @fileoverview 动态添加/部署敌方地面测控与数据接收站模态对话框组件
 * 支持配置地面站名称、位置(手动经纬度/地名搜索/地图点选)、所属国家、通信频段、天线口径、俯仰角与战术背景资料
 */

import { reactive, ref, watch } from 'vue'
import {
  X,
  Radio,
  MapPin,
  Search,
  Check,
  AlertCircle,
  Globe,
  Sliders
} from 'lucide-vue-next'
import { useTacticalAssetsState } from '../../composables/useTacticalAssetsState'
import { FacilityStatus } from '../../types/tacticalAssets'
import { searchStrategicLocations } from '../../services/geocodingService'
import { startMapPointPickMode, cancelMapPointPickMode } from '../../services/cesiumManager'

/**
 * 引入战术资产全局状态与操作方法
 */
const {
  isCreateGroundStationModalOpen,
  createGroundStation,
  completeMapLocationPick
} = useTacticalAssetsState()

/**
 * 站址坐标选点模式: 'MANUAL' (手动录入), 'SEARCH' (要地搜索), 'MAP_CLICK' (三维球体点选)
 */
const locationMode = ref<'MANUAL' | 'SEARCH' | 'MAP_CLICK'>('MANUAL')

/**
 * 校验失败提示信息
 */
const errorMessage = ref<string>('')

/**
 * 地理位置搜索词与候选匹配列表
 */
const locationQuery = ref<string>('')
const searchSuggestions = ref<any[]>([])

/**
 * 预设可选通信频段列表
 */
const AVAILABLE_BANDS = ['X频段', 'Ka频段', 'Ku频段', 'S频段', 'C频段', 'UHF超高频']

/**
 * 地面站新建表单响应式状态
 */
const form = reactive({
  name: '',
  country: '美国',
  longitude: 133.88,
  latitude: -23.7,
  altitudeM: 610,
  locationName: '',
  frequencyBands: ['X频段', 'Ka频段'] as string[],
  antennaDiameterM: 18.0,
  elevationLimitDeg: 5.0,
  status: FacilityStatus.ACTIVE,
  description: ''
})

// 监听地名输入搜索联想
watch(locationQuery, (newVal) => {
  searchSuggestions.value = searchStrategicLocations(newVal, 4)
})

/**
 * 选中地名搜索联想项并自动填入坐标
 *
 * @param loc - 选中的要地实体信息
 */
function handleSelectLocation(loc: any): void {
  form.longitude = loc.longitude
  form.latitude = loc.latitude
  form.locationName = loc.name
  locationQuery.value = ''
  searchSuggestions.value = []
}

/**
 * 启动三维地球单击拾取地面站点位坐标
 */
function handleStartMapPointPick(): void {
  // 临时收起模态窗以便用户在三维场景中选点
  isCreateGroundStationModalOpen.value = false

  startMapPointPickMode((lon, lat, alt) => {
    form.longitude = lon
    form.latitude = lat
    form.altitudeM = alt
    form.locationName = `地图标定站址 (${lon}°, ${lat}°)`
    completeMapLocationPick({ longitude: lon, latitude: lat, altitudeM: alt })
    isCreateGroundStationModalOpen.value = true
  })
}

/**
 * 切换通信频段的勾选状态
 *
 * @param band - 频段名称 (如 'X频段')
 */
function toggleFrequencyBand(band: string): void {
  const idx = form.frequencyBands.indexOf(band)
  if (idx > -1) {
    if (form.frequencyBands.length > 1) {
      form.frequencyBands.splice(idx, 1)
    }
  } else {
    form.frequencyBands.push(band)
  }
}

/**
 * 提交表单创建地面站实体
 */
function handleCreate(): void {
  if (!form.name.trim()) {
    errorMessage.value = '请输入地面测控与数据接收站名称'
    return
  }
  if (!form.country.trim()) {
    errorMessage.value = '请输入所属国家或阵营'
    return
  }
  if (form.longitude < -180 || form.longitude > 180 || form.latitude < -90 || form.latitude > 90) {
    errorMessage.value = '经纬度数值超出有效地理范围 [-180~180, -90~90]'
    return
  }

  createGroundStation({
    name: form.name.trim(),
    country: form.country.trim(),
    position: {
      longitude: Number(form.longitude),
      latitude: Number(form.latitude),
      altitudeM: Number(form.altitudeM) || 0
    },
    frequencyBands: [...form.frequencyBands],
    antennaDiameterM: Number(form.antennaDiameterM) || 12.0,
    elevationLimitDeg: Number(form.elevationLimitDeg) || 5.0,
    status: form.status,
    description: form.description.trim() || `所属${form.country}核心天基数据下行与卫星测控枢纽，配有${form.antennaDiameterM}米主天线。`
  })

  // 重置表单并关闭弹窗
  handleClose()
}

/**
 * 关闭并清理新建地面站弹窗
 */
function handleClose(): void {
  errorMessage.value = ''
  cancelMapPointPickMode()
  isCreateGroundStationModalOpen.value = false
}
</script>

<template>
  <div
    v-if="isCreateGroundStationModalOpen"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fade-in"
    @click.self="handleClose"
  >
    <div
      class="relative w-full max-w-2xl bg-[#0c1322]/95 border border-cyan-500/40 shadow-[0_0_30px_rgba(6,182,212,0.25)] rounded-lg flex flex-col max-h-[90vh] overflow-hidden text-slate-200 text-xs font-mono"
    >
      <!-- 模态框顶部标头 -->
      <div class="px-5 py-3.5 border-b border-cyan-500/30 flex items-center justify-between bg-gradient-to-r from-cyan-950/40 via-transparent to-transparent">
        <div class="flex items-center gap-2.5">
          <Radio class="w-4 h-4 text-cyan-400 animate-pulse" />
          <span class="text-sm font-bold tracking-wider text-cyan-300">
            录入敌方地面测控与数据接收站 [GROUND STATION DEPLOYMENT]
          </span>
        </div>
        <button
          @click="handleClose"
          class="text-slate-400 hover:text-red-400 transition-colors p-1"
          title="关闭"
        >
          <X class="w-4 h-4" />
        </button>
      </div>

      <!-- 滚动表单主体 -->
      <div class="p-5 overflow-y-auto space-y-4 flex-1 custom-scrollbar">
        <!-- 错误提示横幅 -->
        <div
          v-if="errorMessage"
          class="flex items-center gap-2 px-3 py-2 bg-red-950/60 border border-red-500/50 rounded text-red-300 text-xs"
        >
          <AlertCircle class="w-4 h-4 text-red-400 shrink-0" />
          <span>{{ errorMessage }}</span>
        </div>

        <!-- 1. 基本信息 -->
        <div class="bg-black/30 p-3.5 rounded border border-cyan-900/40 space-y-3">
          <div class="text-[11px] font-bold text-cyan-400 flex items-center gap-1.5 border-b border-cyan-900/50 pb-1.5">
            <Globe class="w-3.5 h-3.5" />
            <span>01 / 设施标识与阵营归属</span>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-slate-400 mb-1">地面站名称 / 代号 <span class="text-red-400">*</span></label>
              <input
                v-model="form.name"
                type="text"
                placeholder="例如：松树谷天基情报地面站"
                class="w-full bg-[#070b14] border border-cyan-900/60 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-400 text-xs"
              />
            </div>
            <div>
              <label class="block text-slate-400 mb-1">所属国家 / 军事阵营 <span class="text-red-400">*</span></label>
              <input
                v-model="form.country"
                type="text"
                placeholder="例如：美国 / 五眼联盟 / 澳大利亚"
                class="w-full bg-[#070b14] border border-cyan-900/60 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-400 text-xs"
              />
            </div>
          </div>
        </div>

        <!-- 2. 地理站址标定 (3 种方式) -->
        <div class="bg-black/30 p-3.5 rounded border border-cyan-900/40 space-y-3">
          <div class="flex items-center justify-between border-b border-cyan-900/50 pb-1.5">
            <div class="text-[11px] font-bold text-cyan-400 flex items-center gap-1.5">
              <MapPin class="w-3.5 h-3.5" />
              <span>02 / 站址地理部署位置</span>
            </div>

            <!-- 模式切换单选按钮组 -->
            <div class="flex items-center gap-1 bg-[#070b14] p-0.5 rounded border border-cyan-950">
              <button
                type="button"
                @click="locationMode = 'MANUAL'"
                class="px-2 py-0.5 rounded text-[10px] transition-colors"
                :class="locationMode === 'MANUAL' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400 hover:text-slate-200'"
              >
                手动录入
              </button>
              <button
                type="button"
                @click="locationMode = 'SEARCH'"
                class="px-2 py-0.5 rounded text-[10px] transition-colors"
                :class="locationMode === 'SEARCH' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400 hover:text-slate-200'"
              >
                地名检索
              </button>
              <button
                type="button"
                @click="locationMode = 'MAP_CLICK'"
                class="px-2 py-0.5 rounded text-[10px] transition-colors"
                :class="locationMode === 'MAP_CLICK' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400 hover:text-slate-200'"
              >
                球体点选
              </button>
            </div>
          </div>

          <!-- 地名搜索交互卡片 -->
          <div v-if="locationMode === 'SEARCH'" class="relative space-y-2">
            <div class="relative">
              <input
                v-model="locationQuery"
                type="text"
                placeholder="输入要地/岛礁/基地地名 (例如：关岛、松树谷、迪戈加西亚)..."
                class="w-full bg-[#070b14] border border-cyan-800 rounded pl-8 pr-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-400 text-xs"
              />
              <Search class="w-3.5 h-3.5 text-cyan-400 absolute left-2.5 top-2.5" />
            </div>

            <!-- 搜索候选项列表 -->
            <div
              v-if="searchSuggestions.length > 0"
              class="bg-[#070b14] border border-cyan-500/50 rounded shadow-lg overflow-hidden divide-y divide-cyan-950"
            >
              <div
                v-for="item in searchSuggestions"
                :key="item.name"
                @click="handleSelectLocation(item)"
                class="px-3 py-1.5 hover:bg-cyan-950/40 cursor-pointer flex items-center justify-between text-[11px]"
              >
                <div class="font-bold text-cyan-300">{{ item.name }}</div>
                <div class="text-[10px] text-slate-400">
                  {{ item.longitude.toFixed(2) }}°E, {{ item.latitude.toFixed(2) }}°N
                </div>
              </div>
            </div>
          </div>

          <!-- 地图单击拾取触发器 -->
          <div v-if="locationMode === 'MAP_CLICK'" class="space-y-2">
            <button
              type="button"
              @click="handleStartMapPointPick"
              class="w-full py-2 bg-gradient-to-r from-cyan-900/40 to-blue-900/40 hover:from-cyan-800/60 hover:to-blue-800/60 border border-cyan-500/50 rounded flex items-center justify-center gap-2 text-cyan-300 transition-all font-bold"
            >
              <MapPin class="w-4 h-4 text-cyan-400 animate-bounce" />
              <span>点击进入三维地球拾取站址坐标</span>
            </button>
            <div class="text-[10px] text-slate-400 text-center">
              点击后将进入全屏选点模式，在三维地球任意位置左键单击即可自动捕获经纬度
            </div>
          </div>

          <!-- 经度/纬度/海拔只读或编辑框 -->
          <div class="grid grid-cols-3 gap-3 pt-1">
            <div>
              <label class="block text-slate-400 mb-1">经度 (°)</label>
              <input
                v-model.number="form.longitude"
                type="number"
                step="0.0001"
                class="w-full bg-[#070b14] border border-cyan-900/60 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-400 text-xs"
              />
            </div>
            <div>
              <label class="block text-slate-400 mb-1">纬度 (°)</label>
              <input
                v-model.number="form.latitude"
                type="number"
                step="0.0001"
                class="w-full bg-[#070b14] border border-cyan-900/60 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-400 text-xs"
              />
            </div>
            <div>
              <label class="block text-slate-400 mb-1">海拔高度 (米)</label>
              <input
                v-model.number="form.altitudeM"
                type="number"
                step="1"
                class="w-full bg-[#070b14] border border-cyan-900/60 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-400 text-xs"
              />
            </div>
          </div>
        </div>

        <!-- 3. 通信与天线性能指标 -->
        <div class="bg-black/30 p-3.5 rounded border border-cyan-900/40 space-y-3">
          <div class="text-[11px] font-bold text-cyan-400 flex items-center gap-1.5 border-b border-cyan-900/50 pb-1.5">
            <Sliders class="w-3.5 h-3.5" />
            <span>03 / 测控通信频段与天线规格</span>
          </div>

          <!-- 通信频段多选 -->
          <div>
            <label class="block text-slate-400 mb-1.5">支持通信频段 (多选)</label>
            <div class="grid grid-cols-3 gap-2">
              <button
                v-for="band in AVAILABLE_BANDS"
                :key="band"
                type="button"
                @click="toggleFrequencyBand(band)"
                class="px-2.5 py-1.5 rounded border text-[11px] flex items-center justify-between transition-all"
                :class="form.frequencyBands.includes(band) ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300' : 'bg-[#070b14] border-cyan-950 text-slate-400 hover:border-cyan-900'"
              >
                <span>{{ band }}</span>
                <Check v-if="form.frequencyBands.includes(band)" class="w-3 h-3 text-cyan-400" />
              </button>
            </div>
          </div>

          <!-- 天线口径与仰角门限 -->
          <div class="grid grid-cols-2 gap-3 pt-1">
            <div>
              <label class="block text-slate-400 mb-1">主抛物面天线口径 (米)</label>
              <input
                v-model.number="form.antennaDiameterM"
                type="number"
                step="0.5"
                class="w-full bg-[#070b14] border border-cyan-900/60 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-400 text-xs"
              />
            </div>
            <div>
              <label class="block text-slate-400 mb-1">最低俯仰跟踪门限角 (°)</label>
              <input
                v-model.number="form.elevationLimitDeg"
                type="number"
                step="0.5"
                class="w-full bg-[#070b14] border border-cyan-900/60 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-400 text-xs"
              />
            </div>
          </div>
        </div>

        <!-- 4. 战术资料与背景描述 -->
        <div class="bg-black/30 p-3.5 rounded border border-cyan-900/40 space-y-2">
          <label class="block text-slate-400">地面站职能与战术情报背景资料</label>
          <textarea
            v-model="form.description"
            rows="2"
            placeholder="录入有关该地面站的驻防力量、雷达罩天线阵群、海底光缆交汇点等补充战术资料..."
            class="w-full bg-[#070b14] border border-cyan-900/60 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-400 text-xs resize-none"
          ></textarea>
        </div>
      </div>

      <!-- 底部操作按钮 -->
      <div class="px-5 py-3 border-t border-cyan-500/30 flex items-center justify-end gap-3 bg-black/40">
        <button
          @click="handleClose"
          type="button"
          class="px-4 py-1.5 rounded border border-slate-700 hover:border-slate-500 text-slate-300 transition-colors"
        >
          取消
        </button>
        <button
          @click="handleCreate"
          type="button"
          class="px-5 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-bold flex items-center gap-2 shadow-[0_0_15px_rgba(6,182,212,0.4)] transition-all"
        >
          <Check class="w-4 h-4" />
          <span>确认录入地面站</span>
        </button>
      </div>
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
