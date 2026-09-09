<script setup lang="ts">
/**
 * @fileoverview 动态添加/部署情报指挥数据中心模态对话框组件
 * 支持配置数据中心名称、地理坐标(手动录入/地名检索/三维地球单击拾取)、所属国家、算力规模、保密防护等级及战术说明
 */

import { reactive, ref, watch } from 'vue'
import {
  X,
  Server,
  MapPin,
  Search,
  Check,
  AlertCircle,
  Cpu
} from 'lucide-vue-next'
import { useTacticalAssetsState } from '../../composables/useTacticalAssetsState'
import { FacilityStatus } from '../../types/tacticalAssets'
import { searchStrategicLocations } from '../../services/geocodingService'
import { startMapPointPickMode, cancelMapPointPickMode } from '../../services/cesiumManager'

/**
 * 引入战术资产全局状态与操作方法
 */
const {
  isCreateDataCenterModalOpen,
  createDataCenter,
  completeMapLocationPick
} = useTacticalAssetsState()

/**
 * 设施地理选点模式: 'MANUAL' (手动录入), 'SEARCH' (要地检索), 'MAP_CLICK' (三维地图单击拾取)
 */
const locationMode = ref<'MANUAL' | 'SEARCH' | 'MAP_CLICK'>('MANUAL')

/**
 * 表单校验错误提示
 */
const errorMessage = ref<string>('')

/**
 * 地理检索词与联想匹配项
 */
const locationQuery = ref<string>('')
const searchSuggestions = ref<any[]>([])

/**
 * 预设防护保密级别选项
 */
const SECURITY_LEVELS = [
  'Top Secret / SCI (特许最高绝密)',
  'Secret / Tier-4 (国防四级防核EMP)',
  'Confidential (军用机密防灾备份)',
  'Restricted (战略战区专网级别)'
]

/**
 * 数据中心新建表单响应式状态
 */
const form = reactive({
  name: '',
  country: '美国',
  longitude: -157.95,
  latitude: 21.36,
  locationName: '',
  computeScale: '120 PFLOPS 绝密战区融合云',
  securityLevel: 'Top Secret / SCI (特许最高绝密)',
  status: FacilityStatus.ACTIVE,
  description: ''
})

// 监听地名检索联想
watch(locationQuery, (newVal) => {
  searchSuggestions.value = searchStrategicLocations(newVal, 4)
})

/**
 * 选中地名搜索项并自动同步坐标
 *
 * @param loc - 选中的要地实体
 */
function handleSelectLocation(loc: any): void {
  form.longitude = loc.longitude
  form.latitude = loc.latitude
  form.locationName = loc.name
  locationQuery.value = ''
  searchSuggestions.value = []
}

/**
 * 启动三维地球单击拾取数据中心地理坐标
 */
function handleStartMapPointPick(): void {
  // 临时关闭模态框为视景选点让出全屏视野
  isCreateDataCenterModalOpen.value = false

  startMapPointPickMode((lon, lat, _alt) => {
    form.longitude = lon
    form.latitude = lat
    form.locationName = `地图标定中心 (${lon}°, ${lat}°)`
    completeMapLocationPick({ longitude: lon, latitude: lat })
    isCreateDataCenterModalOpen.value = true
  })
}

/**
 * 提交表单创建数据中心实体
 */
function handleCreate(): void {
  if (!form.name.trim()) {
    errorMessage.value = '请输入情报指挥数据中心名称'
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

  createDataCenter({
    name: form.name.trim(),
    country: form.country.trim(),
    position: {
      longitude: Number(form.longitude),
      latitude: Number(form.latitude)
    },
    computeScale: form.computeScale.trim() || '80 PFLOPS 战术边缘云计算集群',
    securityLevel: form.securityLevel,
    status: form.status,
    description: form.description.trim() || `所属${form.country}战区联合情报研判与指挥控制主算力节点。`
  })

  // 重置表单并关闭弹窗
  handleClose()
}

/**
 * 取消并关闭新建数据中心模态框
 */
function handleClose(): void {
  errorMessage.value = ''
  cancelMapPointPickMode()
  isCreateDataCenterModalOpen.value = false
}
</script>

<template>
  <div
    v-if="isCreateDataCenterModalOpen"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fade-in"
    @click.self="handleClose"
  >
    <div
      class="relative w-full max-w-2xl bg-[#0c1322]/95 border border-amber-500/40 shadow-[0_0_30px_rgba(245,158,11,0.25)] rounded-lg flex flex-col max-h-[90vh] overflow-hidden text-slate-200 text-xs font-mono"
    >
      <!-- 模态框顶部标头 -->
      <div class="px-5 py-3.5 border-b border-amber-500/30 flex items-center justify-between bg-gradient-to-r from-amber-950/40 via-transparent to-transparent">
        <div class="flex items-center gap-2.5">
          <Server class="w-4 h-4 text-amber-400 animate-pulse" />
          <span class="text-sm font-bold tracking-wider text-amber-300">
            录入敌方情报指挥数据中心 [DATA CENTER DEPLOYMENT]
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
        <div class="bg-black/30 p-3.5 rounded border border-amber-900/40 space-y-3">
          <div class="text-[11px] font-bold text-amber-400 flex items-center gap-1.5 border-b border-amber-900/50 pb-1.5">
            <Server class="w-3.5 h-3.5" />
            <span>01 / 设施标识与国家阵营</span>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-slate-400 mb-1">数据中心名称 / 代号 <span class="text-red-400">*</span></label>
              <input
                v-model="form.name"
                type="text"
                placeholder="例如：美印太司令部联合情报作战中心 JIOC"
                class="w-full bg-[#070b14] border border-amber-900/60 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-amber-400 text-xs"
              />
            </div>
            <div>
              <label class="block text-slate-400 mb-1">所属国家 / 战区指挥部 <span class="text-red-400">*</span></label>
              <input
                v-model="form.country"
                type="text"
                placeholder="例如：美国 / 印太司令部"
                class="w-full bg-[#070b14] border border-amber-900/60 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-amber-400 text-xs"
              />
            </div>
          </div>
        </div>

        <!-- 2. 地理部署位置 (3 种方式) -->
        <div class="bg-black/30 p-3.5 rounded border border-amber-900/40 space-y-3">
          <div class="flex items-center justify-between border-b border-amber-900/50 pb-1.5">
            <div class="text-[11px] font-bold text-amber-400 flex items-center gap-1.5">
              <MapPin class="w-3.5 h-3.5" />
              <span>02 / 基础设施地理坐标</span>
            </div>

            <!-- 选点模式单选切换 -->
            <div class="flex items-center gap-1 bg-[#070b14] p-0.5 rounded border border-amber-950">
              <button
                type="button"
                @click="locationMode = 'MANUAL'"
                class="px-2 py-0.5 rounded text-[10px] transition-colors"
                :class="locationMode === 'MANUAL' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'text-slate-400 hover:text-slate-200'"
              >
                手动录入
              </button>
              <button
                type="button"
                @click="locationMode = 'SEARCH'"
                class="px-2 py-0.5 rounded text-[10px] transition-colors"
                :class="locationMode === 'SEARCH' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'text-slate-400 hover:text-slate-200'"
              >
                地名检索
              </button>
              <button
                type="button"
                @click="locationMode = 'MAP_CLICK'"
                class="px-2 py-0.5 rounded text-[10px] transition-colors"
                :class="locationMode === 'MAP_CLICK' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'text-slate-400 hover:text-slate-200'"
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
                placeholder="输入基地/城市名称 (例如：夏威夷、科罗拉多、五角大楼)..."
                class="w-full bg-[#070b14] border border-amber-800 rounded pl-8 pr-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-amber-400 text-xs"
              />
              <Search class="w-3.5 h-3.5 text-amber-400 absolute left-2.5 top-2.5" />
            </div>

            <!-- 搜索候选列表 -->
            <div
              v-if="searchSuggestions.length > 0"
              class="bg-[#070b14] border border-amber-500/50 rounded shadow-lg overflow-hidden divide-y divide-amber-950"
            >
              <div
                v-for="item in searchSuggestions"
                :key="item.name"
                @click="handleSelectLocation(item)"
                class="px-3 py-1.5 hover:bg-amber-950/40 cursor-pointer flex items-center justify-between text-[11px]"
              >
                <div class="font-bold text-amber-300">{{ item.name }}</div>
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
              class="w-full py-2 bg-gradient-to-r from-amber-900/40 to-yellow-900/40 hover:from-amber-800/60 hover:to-yellow-800/60 border border-amber-500/50 rounded flex items-center justify-center gap-2 text-amber-300 transition-all font-bold"
            >
              <MapPin class="w-4 h-4 text-amber-400 animate-bounce" />
              <span>点击进入三维地球拾取数据中心坐标</span>
            </button>
            <div class="text-[10px] text-slate-400 text-center">
              点击后将在三维地球任意位置左键单击即可自动捕获地理坐标
            </div>
          </div>

          <!-- 经度/纬度输入框 -->
          <div class="grid grid-cols-2 gap-3 pt-1">
            <div>
              <label class="block text-slate-400 mb-1">经度 (°)</label>
              <input
                v-model.number="form.longitude"
                type="number"
                step="0.0001"
                class="w-full bg-[#070b14] border border-amber-900/60 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-amber-400 text-xs"
              />
            </div>
            <div>
              <label class="block text-slate-400 mb-1">纬度 (°)</label>
              <input
                v-model.number="form.latitude"
                type="number"
                step="0.0001"
                class="w-full bg-[#070b14] border border-amber-900/60 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-amber-400 text-xs"
              />
            </div>
          </div>
        </div>

        <!-- 3. 算力与防护规格 -->
        <div class="bg-black/30 p-3.5 rounded border border-amber-900/40 space-y-3">
          <div class="text-[11px] font-bold text-amber-400 flex items-center gap-1.5 border-b border-amber-900/50 pb-1.5">
            <Cpu class="w-3.5 h-3.5" />
            <span>03 / 算力基础设施与保密防护等级</span>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-slate-400 mb-1">计算基础设施规模</label>
              <input
                v-model="form.computeScale"
                type="text"
                placeholder="例如：120 PFLOPS 绝密国防云集群"
                class="w-full bg-[#070b14] border border-amber-900/60 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-amber-400 text-xs"
              />
            </div>
            <div>
              <label class="block text-slate-400 mb-1">保密与防护等级</label>
              <select
                v-model="form.securityLevel"
                class="w-full bg-[#070b14] border border-amber-900/60 rounded px-2 py-1.5 text-slate-200 focus:outline-none focus:border-amber-400 text-xs"
              >
                <option v-for="level in SECURITY_LEVELS" :key="level" :value="level">
                  {{ level }}
                </option>
              </select>
            </div>
          </div>
        </div>

        <!-- 4. 战术背景资料 -->
        <div class="bg-black/30 p-3.5 rounded border border-amber-900/40 space-y-2">
          <label class="block text-slate-400">指挥中心战术职能与情报处理资料</label>
          <textarea
            v-model="form.description"
            rows="2"
            placeholder="录入有关该数据中心的战区联合指挥网络、合成空天态势图生成与AI图像自动解译等战术资料..."
            class="w-full bg-[#070b14] border border-amber-900/60 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-amber-400 text-xs resize-none"
          ></textarea>
        </div>
      </div>

      <!-- 底部操作按钮 -->
      <div class="px-5 py-3 border-t border-amber-500/30 flex items-center justify-end gap-3 bg-black/40">
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
          class="px-5 py-1.5 rounded bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold flex items-center gap-2 shadow-[0_0_15px_rgba(245,158,11,0.4)] transition-all"
        >
          <Check class="w-4 h-4" />
          <span>确认录入数据中心</span>
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
  background: rgba(245, 158, 11, 0.3);
  border-radius: 2px;
}
</style>
