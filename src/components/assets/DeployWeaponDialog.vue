<script setup lang="ts">
/**
 * @fileoverview 部署武器装备到阵地区域模态对话框组件
 * 专职负责将选定的武器系统放置部署到指定的地理经纬度区域 (支持手动录入、战略要地搜索与三维地球交互点选拾取)
 */

import { reactive, ref, watch, computed, nextTick } from 'vue'
import {
  X,
  Crosshair,
  MapPin,
  Search,
  Check,
  AlertCircle,
  ArrowRight
} from 'lucide-vue-next'
import { useTacticalAssetsState } from '../../composables/useTacticalAssetsState'
import { WeaponType } from '../../types/tacticalAssets'
import { searchStrategicLocations } from '../../services/geocodingService'
import { startMapPointPickMode, cancelMapPointPickMode, flyToAssetLocation } from '../../services/cesiumManager'

/**
 * 引入武器资产状态与部署控制
 */
const {
  weapons,
  isDeployWeaponModalOpen,
  deployTargetWeaponId,
  isCreateWeaponModalOpen,
  deployWeapon,
  startMapLocationPick,
  completeMapLocationPick,
  cancelMapLocationPick
} = useTacticalAssetsState()

/**
 * 阵地选点模式: 'MANUAL' (手动录入), 'SEARCH' (要地检索), 'MAP_CLICK' (三维地球点选拾取)
 */
const locationMode = ref<'MANUAL' | 'SEARCH' | 'MAP_CLICK'>('MANUAL')

/**
 * 错误校验提示信息
 */
const errorMessage = ref<string>('')

/**
 * 要地搜索关键字与搜索候选项
 */
const locationQuery = ref<string>('')
const searchSuggestions = ref<any[]>([])

/**
 * 当前选择要部署的武器 ID
 */
const selectedWeaponId = ref<string>('')

/**
 * 标记当前是否刚从三维地球点选回调返回 (防覆盖重置关键守卫)
 */
const justPickedFromMap = ref<boolean>(false)

/**
 * 拾取成功提示文字
 */
const pickedSuccessMessage = ref<string>('')

/**
 * 部署表单数据
 */
const deployForm = reactive({
  locationName: '华北某防空反导发射阵地',
  longitude: 117.20,
  latitude: 39.10,
  altitudeM: 60,
  quantity: 8
})

/**
 * 当前选中的武器实体
 */
const currentWeapon = computed(() => {
  return weapons.value.find((w) => w.id === selectedWeaponId.value) || weapons.value[0] || null
})

// 监听目标武器预选与弹窗打开状态
watch(
  [isDeployWeaponModalOpen, deployTargetWeaponId],
  ([isOpen, targetId]) => {
    if (isOpen) {
      // 关键防覆盖拦截：如果刚刚完成从三维地球拾取点位，保持拾取到的经纬度与阵地名，绝对不重置
      if (justPickedFromMap.value) {
        justPickedFromMap.value = false
        return
      }

      if (targetId && weapons.value.some((w) => w.id === targetId)) {
        selectedWeaponId.value = targetId
      } else if (!selectedWeaponId.value || !weapons.value.some((w) => w.id === selectedWeaponId.value)) {
        // 优先预选尚未部署的武器，否则选择第一个
        const undeployed = weapons.value.find((w) => !w.isDeployed)
        selectedWeaponId.value = undeployed ? undeployed.id : (weapons.value[0]?.id || '')
      }

      // 初始化表单为当前武器已有位置或默认战区推荐位置
      initFormForSelectedWeapon()
    }
  },
  { immediate: true }
)

// 当用户主动在下拉列表中切换选择的武器时同步更新表单初始值
watch(selectedWeaponId, (newId, oldId) => {
  if (newId && newId !== oldId && !justPickedFromMap.value && isDeployWeaponModalOpen.value) {
    pickedSuccessMessage.value = ''
    initFormForSelectedWeapon()
  }
})

/**
 * 初始化部署表单
 */
function initFormForSelectedWeapon(): void {
  const wpn = currentWeapon.value
  if (!wpn) {
    deployForm.locationName = '华北某防空反导发射阵地'
    deployForm.longitude = 117.20
    deployForm.latitude = 39.10
    deployForm.altitudeM = 60
    deployForm.quantity = 8
    return
  }

  // 严密校验 position 中经纬度是否为有效数字，避免 NaN 或空值导致输入框空白
  const hasValidPosition = wpn.position &&
    typeof wpn.position.longitude === 'number' && !isNaN(wpn.position.longitude) &&
    typeof wpn.position.latitude === 'number' && !isNaN(wpn.position.latitude)

  if (hasValidPosition && (wpn.isDeployed || wpn.locationName !== '待部署阵地')) {
    deployForm.locationName = wpn.locationName || '某防空反导发射阵地'
    deployForm.longitude = Number(Number(wpn.position!.longitude).toFixed(4))
    deployForm.latitude = Number(Number(wpn.position!.latitude).toFixed(4))
    deployForm.altitudeM = Number(wpn.position!.altitudeM || 50)
  } else {
    // 针对新录入或尚未部署阵地的武器，提供推荐初始坐标
    deployForm.locationName = wpn.locationName && wpn.locationName !== '待部署阵地' ? wpn.locationName : '华北某防空反导发射阵地'
    deployForm.longitude = 117.20
    deployForm.latitude = 39.10
    deployForm.altitudeM = 60
  }

  deployForm.quantity = (typeof wpn.quantity === 'number' && wpn.quantity > 0) ? wpn.quantity : 8
  errorMessage.value = ''
}

// 监听地名输入搜索联想
watch(locationQuery, (newVal) => {
  searchSuggestions.value = searchStrategicLocations(newVal, 5)
})

/**
 * 选中某个联想战略要地
 *
 * @param loc - 要地坐标与名称对象
 */
function handleSelectLocation(loc: any): void {
  deployForm.longitude = Number(Number(loc.longitude).toFixed(4))
  deployForm.latitude = Number(Number(loc.latitude).toFixed(4))
  deployForm.locationName = loc.name
  pickedSuccessMessage.value = `✓ 已填入要地坐标：${loc.name} (${deployForm.longitude}°E, ${deployForm.latitude}°N)`
  locationQuery.value = ''
  searchSuggestions.value = []
}

/**
 * 启动三维地球交互点选坐标拾取模式
 */
function handleStartMapPointPick(): void {
  // 1. 设置标记
  justPickedFromMap.value = false
  pickedSuccessMessage.value = ''

  // 2. 临时收起模态框腾出地球视景交互空间
  isDeployWeaponModalOpen.value = false

  // 3. 激活全局顶栏通告条提示（点击任意位置即可拾取）
  startMapLocationPick('WEAPON', (coords) => {
    applyPickedCoordinates(coords.longitude, coords.latitude, coords.altitudeM)
  })

  // 4. 激活 Cesium 屏幕空间点位拾取并直接通过 completeMapLocationPick 分发
  startMapPointPickMode((lon, lat, alt) => {
    completeMapLocationPick({ longitude: lon, latitude: lat, altitudeM: alt })
  })
}

/**
 * 将从地球成功拾取到的经纬度注入表单并重新打开模态框
 */
function applyPickedCoordinates(lon: number, lat: number, alt?: number): void {
  deployForm.longitude = Number(lon.toFixed(4))
  deployForm.latitude = Number(lat.toFixed(4))
  deployForm.altitudeM = (alt !== undefined && !isNaN(alt)) ? Math.round(alt) : 50
  deployForm.locationName = `地图标定阵地 (${deployForm.longitude}°, ${deployForm.latitude}°)`
  
  // 保持处于地球点选模式，便于指挥员查看
  locationMode.value = 'MAP_CLICK'
  pickedSuccessMessage.value = `✓ 已从三维地球成功拾取目标战区坐标：东经 ${deployForm.longitude}°，北纬 ${deployForm.latitude}° (海拔 ${deployForm.altitudeM}m)`
  
  // 关键防覆盖标记：保护刚拾取的数据不被 initForm 重置
  justPickedFromMap.value = true

  // 重新展开模态框
  isDeployWeaponModalOpen.value = true
}

/**
 * 提交确认部署武器到经纬度阵地区域
 */
function handleSubmitDeploy(): void {
  if (!selectedWeaponId.value) {
    errorMessage.value = '请先选择要部署的武器装备'
    return
  }
  if (!deployForm.locationName.trim()) {
    deployForm.locationName = `发射阵地 (${deployForm.longitude}°, ${deployForm.latitude}°)`
  }

  const deployed = deployWeapon(selectedWeaponId.value, {
    locationName: deployForm.locationName.trim(),
    longitude: deployForm.longitude,
    latitude: deployForm.latitude,
    altitudeM: deployForm.altitudeM,
    quantity: deployForm.quantity
  })

  if (deployed && deployed.position) {
    // 摄像机视点平滑聚焦至新部署的阵地
    const rangeM = Math.max(deployed.strikeRange.maxDistanceKm * 1500, 350000)
    flyToAssetLocation(deployed.position.longitude, deployed.position.latitude, rangeM, 1.8)
  }

  isDeployWeaponModalOpen.value = false
}

/**
 * 关闭并退出
 */
function handleClose(): void {
  justPickedFromMap.value = false
  pickedSuccessMessage.value = ''
  cancelMapPointPickMode()
  cancelMapLocationPick()
  isDeployWeaponModalOpen.value = false
  errorMessage.value = ''
}

/**
 * 获取武器作战机理分类中文
 */
function getWeaponTypeLabel(type: WeaponType): string {
  switch (type) {
    case WeaponType.KINETIC:
      return '动能碰撞拦截'
    case WeaponType.DIRECTED_ENERGY:
      return '高能定向激光'
    case WeaponType.ELECTRONIC_WARFARE:
      return '宽带电磁压制'
    case WeaponType.CYBER:
      return '天基网络对抗'
    default:
      return '战术武器'
  }
}
</script>

<template>
  <div
    v-if="isDeployWeaponModalOpen"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm select-none p-4 font-mono"
  >
    <div class="relative w-full max-w-2xl bg-tactical-panel/95 border border-tactical-cyan/70 rounded-lg tactical-corner-bracket shadow-tactical-panel flex flex-col max-h-[92vh] overflow-hidden animate-fade-in">
      <!-- 头部 -->
      <div class="flex items-center justify-between px-5 py-3.5 border-b border-tactical-border/80 bg-tactical-dark/80">
        <div class="flex items-center gap-2.5">
          <div class="w-7 h-7 rounded bg-tactical-cyan/15 border border-tactical-cyan/50 flex items-center justify-center text-tactical-cyan">
            <Crosshair class="w-4 h-4 animate-spin-slow" />
          </div>
          <div>
            <h3 class="text-sm font-bold tracking-wider text-tactical-text">
              部署武器装备到阵地区域
            </h3>
            <p class="text-[10px] text-tactical-muted mt-0.5">
              将选定的武器系统放置到对应的地理经纬度战区与发射阵地
            </p>
          </div>
        </div>
        <button
          @click="handleClose"
          class="p-1 rounded text-tactical-muted hover:text-tactical-cyan hover:bg-tactical-dark transition-colors"
        >
          <X class="w-4 h-4" />
        </button>
      </div>

      <!-- 表单主体 -->
      <div class="flex-1 overflow-y-auto p-5 space-y-4 text-xs custom-scrollbar">
        <!-- 错误提示信息 -->
        <div
          v-if="errorMessage"
          class="p-2.5 rounded bg-tactical-red/20 border border-tactical-red text-tactical-red flex items-center gap-2 text-xs"
        >
          <AlertCircle class="w-4 h-4 shrink-0" />
          <span>{{ errorMessage }}</span>
        </div>

        <!-- 步骤 1：选择要部署的武器型号 -->
        <div class="p-3.5 rounded bg-tactical-dark/60 border border-tactical-border/80 space-y-2.5">
          <div class="flex items-center justify-between">
            <label class="text-tactical-cyan font-bold text-xs flex items-center gap-1.5">
              <span class="w-4 h-4 rounded-full bg-tactical-cyan/20 text-tactical-cyan flex items-center justify-center text-[10px] font-bold">1</span>
              <span>选择要部署的武器装备型号</span>
            </label>
            <button
              type="button"
              @click="isDeployWeaponModalOpen = false; isCreateWeaponModalOpen = true"
              class="text-[10px] text-cyan-400 hover:text-cyan-300 underline flex items-center gap-1"
            >
              <span>+ 录入新武器参数</span>
              <ArrowRight class="w-2.5 h-2.5" />
            </button>
          </div>

          <div v-if="weapons.length === 0" class="text-center py-4 text-tactical-muted">
            暂无可部署的武器，请先在右侧面板点击【添加武器】录入参数。
          </div>

          <!-- 武器下拉单选与快速卡片 -->
          <div v-else class="space-y-2">
            <select
              v-model="selectedWeaponId"
              class="w-full px-3 py-1.5 rounded bg-tactical-bg border border-tactical-border text-tactical-text font-bold focus:outline-none focus:border-tactical-cyan"
            >
              <option
                v-for="w in weapons"
                :key="w.id"
                :value="w.id"
              >
                {{ w.name }} ({{ w.isDeployed ? `已部署: ${w.locationName}` : '待部署' }})
              </option>
            </select>

            <!-- 选定武器的高清效能摘要卡片 -->
            <div
              v-if="currentWeapon"
              class="p-2.5 rounded bg-[#070b14] border border-cyan-900/60 text-[11px] space-y-1.5"
            >
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <span class="font-bold text-tactical-text">{{ currentWeapon.name }}</span>
                  <span class="px-1.5 py-0.2 rounded text-[9px] bg-cyan-900/50 text-cyan-300 border border-cyan-700/50">
                    {{ getWeaponTypeLabel(currentWeapon.type) }}
                  </span>
                </div>
                <span
                  class="px-1.5 py-0.2 rounded text-[9px] font-mono"
                  :class="currentWeapon.isDeployed ? 'bg-emerald-950 text-emerald-400 border border-emerald-700/50' : 'bg-amber-950 text-amber-400 border border-amber-700/50'"
                >
                  {{ currentWeapon.isDeployed ? '已在网部署' : '尚未部署阵地' }}
                </span>
              </div>

              <!-- 射程与效能数据矩阵 -->
              <div class="grid grid-cols-3 gap-2 pt-1 border-t border-tactical-border/40 text-[10px]">
                <div>
                  <span class="text-tactical-muted">射高包络: </span>
                  <span class="text-tactical-cyan font-bold">{{ currentWeapon.strikeRange.minAltitudeKm }}-{{ currentWeapon.strikeRange.maxAltitudeKm }} km</span>
                </div>
                <div>
                  <span class="text-tactical-muted">最大斜距: </span>
                  <span class="text-tactical-cyan font-bold">{{ currentWeapon.strikeRange.maxDistanceKm }} km</span>
                </div>
                <div>
                  <span class="text-tactical-muted">毁伤概率 Pk: </span>
                  <span class="text-emerald-400 font-bold">{{ currentWeapon.performance.pkProbability }}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 步骤 2：放置到对应的经纬度区域 -->
        <div class="p-3.5 rounded bg-tactical-dark/60 border border-tactical-border/80 space-y-3">
          <div class="flex items-center justify-between">
            <label class="text-tactical-cyan font-bold text-xs flex items-center gap-1.5">
              <span class="w-4 h-4 rounded-full bg-tactical-cyan/20 text-tactical-cyan flex items-center justify-center text-[10px] font-bold">2</span>
              <span>放置到指定战区阵地与地理经纬度</span>
            </label>

            <!-- 3 种选点方式切换 -->
            <div class="flex items-center gap-1 text-[10px]">
              <button
                type="button"
                @click="locationMode = 'MANUAL'"
                :class="['px-2 py-0.5 rounded border transition-colors', locationMode === 'MANUAL' ? 'bg-tactical-cyan/20 border-tactical-cyan text-tactical-cyan font-bold' : 'bg-tactical-bg border-tactical-border text-tactical-muted hover:text-tactical-text']"
              >
                手动经纬度
              </button>
              <button
                type="button"
                @click="locationMode = 'SEARCH'"
                :class="['px-2 py-0.5 rounded border transition-colors', locationMode === 'SEARCH' ? 'bg-tactical-cyan/20 border-tactical-cyan text-tactical-cyan font-bold' : 'bg-tactical-bg border-tactical-border text-tactical-muted hover:text-tactical-text']"
              >
                要地检索
              </button>
              <button
                type="button"
                @click="locationMode = 'MAP_CLICK'"
                :class="['px-2 py-0.5 rounded border transition-colors', locationMode === 'MAP_CLICK' ? 'bg-tactical-cyan/20 border-tactical-cyan text-tactical-cyan font-bold' : 'bg-tactical-bg border-tactical-border text-tactical-muted hover:text-tactical-text']"
              >
                地球点选拾取
              </button>
            </div>
          </div>

          <!-- 选点模式 A：要地地名快速搜索 -->
          <div v-if="locationMode === 'SEARCH'" class="space-y-2">
            <div class="relative">
              <Search class="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-tactical-muted" />
              <input
                v-model="locationQuery"
                type="text"
                placeholder="搜索战略阵地：胶东半岛、海南三亚、青海基地、西北发射场..."
                class="w-full pl-8 pr-3 py-1.5 rounded bg-tactical-bg border border-tactical-border text-xs text-tactical-text focus:outline-none focus:border-tactical-cyan"
              />
            </div>
            <div v-if="searchSuggestions.length > 0" class="border border-tactical-border rounded bg-tactical-dark p-1 space-y-1">
              <div
                v-for="loc in searchSuggestions"
                :key="loc.name"
                @click="handleSelectLocation(loc)"
                class="px-2 py-1 rounded hover:bg-tactical-cyan/20 cursor-pointer flex justify-between text-[11px]"
              >
                <span class="text-tactical-text font-bold">{{ loc.name }}</span>
                <span class="text-tactical-cyan">{{ loc.longitude }}°E, {{ loc.latitude }}°N</span>
              </div>
            </div>
          </div>

          <!-- 选点模式 B：三维地球交互点击拾取 -->
          <div v-if="locationMode === 'MAP_CLICK'" class="text-center py-2.5 bg-cyan-950/20 border border-cyan-900/50 rounded">
            <p class="text-[11px] text-tactical-muted mb-2">
              点击下方按钮将临时收起面板，在三维地球任意目标战区单机左键即可拾取真实地理坐标并自动填入
            </p>
            <button
              type="button"
              @click="handleStartMapPointPick"
              class="px-4 py-1.5 rounded bg-tactical-cyan/20 border border-tactical-cyan text-tactical-cyan font-bold hover:bg-tactical-cyan/35 shadow-glow-cyan transition-all inline-flex items-center gap-1.5 text-xs cursor-pointer active:scale-95"
            >
              <Crosshair class="w-4 h-4 animate-spin-slow" />
              <span>进入三维地球点选阵地位置</span>
            </button>

            <!-- 拾取成功高亮状态条 -->
            <div
              v-if="pickedSuccessMessage"
              class="mt-2.5 mx-3 px-3 py-1.5 rounded bg-tactical-cyan/20 border border-tactical-cyan text-tactical-cyan flex items-center justify-center gap-1.5 text-[11px] font-bold animate-fade-in"
            >
              <Check class="w-4 h-4 text-tactical-cyan shrink-0" />
              <span>{{ pickedSuccessMessage }}</span>
            </div>
          </div>

          <!-- 阵地名称与经纬度输入 -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div class="sm:col-span-3">
              <label class="block text-[10px] text-tactical-muted mb-1">
                阵地部署名称 <span class="text-tactical-cyan">*</span>
              </label>
              <input
                v-model="deployForm.locationName"
                type="text"
                placeholder="如：华北某防空反导发射阵地"
                class="w-full px-3 py-1.5 rounded bg-tactical-bg border border-tactical-border text-tactical-text focus:outline-none focus:border-tactical-cyan"
              />
            </div>

            <div>
              <label class="block text-[10px] text-tactical-muted mb-1">
                部署经度 Longitude (°)
              </label>
              <input
                v-model.number="deployForm.longitude"
                type="number"
                step="0.0001"
                min="-180"
                max="180"
                class="w-full px-2.5 py-1.5 rounded bg-tactical-bg border border-tactical-border text-tactical-cyan font-bold focus:outline-none focus:border-tactical-cyan"
              />
            </div>

            <div>
              <label class="block text-[10px] text-tactical-muted mb-1">
                部署纬度 Latitude (°)
              </label>
              <input
                v-model.number="deployForm.latitude"
                type="number"
                step="0.0001"
                min="-90"
                max="90"
                class="w-full px-2.5 py-1.5 rounded bg-tactical-bg border border-tactical-border text-tactical-cyan font-bold focus:outline-none focus:border-tactical-cyan"
              />
            </div>

            <div>
              <label class="block text-[10px] text-tactical-muted mb-1">
                阵地海拔高度 (米)
              </label>
              <input
                v-model.number="deployForm.altitudeM"
                type="number"
                step="1"
                class="w-full px-2.5 py-1.5 rounded bg-tactical-bg border border-tactical-border text-tactical-text focus:outline-none focus:border-tactical-cyan"
              />
            </div>
          </div>

          <!-- 备弹与发射单元数配置 -->
          <div>
            <label class="block text-[10px] text-tactical-muted mb-1">
              本次部署可用单元数 / 备弹基数
            </label>
            <input
              v-model.number="deployForm.quantity"
              type="number"
              min="1"
              max="99"
              class="w-full sm:w-1/3 px-2.5 py-1.5 rounded bg-tactical-bg border border-tactical-border text-tactical-cyan font-bold focus:outline-none"
            />
          </div>
        </div>
      </div>

      <!-- 底部操作按钮 -->
      <div class="px-5 py-3 border-t border-tactical-border/80 bg-tactical-dark/80 flex items-center justify-between text-xs">
        <div class="text-[11px] text-tactical-muted flex items-center gap-1.5">
          <MapPin class="w-3.5 h-3.5 text-tactical-cyan" />
          <span>确认部署后，系统将自动把该武器放置到对应经纬度区域并平滑聚焦</span>
        </div>
        <div class="flex items-center gap-2">
          <button
            type="button"
            @click="handleClose"
            class="px-4 py-1.5 rounded bg-tactical-dark border border-tactical-border text-tactical-muted hover:text-tactical-text transition-colors"
          >
            取消
          </button>
          <button
            type="button"
            @click="handleSubmitDeploy"
            class="px-5 py-1.5 rounded bg-tactical-cyan text-black font-bold hover:bg-cyan-300 shadow-glow-cyan transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Check class="w-3.5 h-3.5" />
            <span>确认放置并部署武器</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
