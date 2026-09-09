<script setup lang="ts">
/**
 * @fileoverview 动态添加/部署武器装备模态对话框组件
 * 支持配置武器类型、可打击卫星类型、射程包络、作战效能、打击间歇、弹药基数与 3 种阵地选点方式 (经纬度/地名搜索/地图点选)
 */

import { reactive, ref, watch } from 'vue'
import {
  X,
  Crosshair,
  MapPin,
  Search,
  Check,
  AlertCircle,
  Zap,
  Gauge
} from 'lucide-vue-next'
import { useTacticalAssetsState } from '../../composables/useTacticalAssetsState'
import { WeaponType, WeaponStatus } from '../../types/tacticalAssets'
import { TargetSatelliteType } from '../../types/battlefield'
import { searchStrategicLocations } from '../../services/geocodingService'
import { startMapPointPickMode, cancelMapPointPickMode } from '../../services/cesiumManager'

/**
 * 引入武器全局状态与操作
 */
const {
  isCreateWeaponModalOpen,
  createWeapon,
  completeMapLocationPick
} = useTacticalAssetsState()

/**
 * 阵地选点模式: 'MANUAL' (手动录入), 'SEARCH' (地名检索), 'MAP_CLICK' (三维地图点选)
 */
const locationMode = ref<'MANUAL' | 'SEARCH' | 'MAP_CLICK'>('MANUAL')

/**
 * 错误校验提示
 */
const errorMessage = ref<string>('')

/**
 * 地名搜索词与联想候选项
 */
const locationQuery = ref<string>('')
const searchSuggestions = ref<any[]>([])

/**
 * 武器表单响应式状态
 */
const form = reactive({
  name: '',
  type: WeaponType.KINETIC,
  targetSatelliteTypes: [
    TargetSatelliteType.RECONNAISSANCE,
    TargetSatelliteType.COMMUNICATION
  ] as TargetSatelliteType[],
  minAltitudeKm: 120,
  maxAltitudeKm: 1000,
  maxDistanceKm: 800,
  pkProbability: 90,
  trackingAccuracyM: 1.5,
  responseTimeSec: 15,
  cooldownSec: 30,
  quantity: 6,
  longitude: 120.5,
  latitude: 36.2,
  altitudeM: 50,
  locationName: '',
  description: ''
})

// 监听地名输入联想
watch(locationQuery, (newVal) => {
  searchSuggestions.value = searchStrategicLocations(newVal, 4)
})

/**
 * 选中某个联想地名
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
 * 启动三维地图单点点击拾取坐标
 */
function handleStartMapPointPick(): void {
  // 临时最小化模态框腾出视景点击空间
  isCreateWeaponModalOpen.value = false

  startMapPointPickMode((lon, lat, alt) => {
    form.longitude = lon
    form.latitude = lat
    form.altitudeM = alt
    form.locationName = `地图标定阵地 (${lon}°, ${lat}°)`
    completeMapLocationPick({ longitude: lon, latitude: lat, altitudeM: alt })
    isCreateWeaponModalOpen.value = true
  })
}

/**
 * 切换可打击卫星类型勾选
 *
 * @param type - 目标卫星类型
 */
function toggleTargetType(type: TargetSatelliteType): void {
  const idx = form.targetSatelliteTypes.indexOf(type)
  if (idx > -1) {
    if (form.targetSatelliteTypes.length > 1) {
      form.targetSatelliteTypes.splice(idx, 1)
    }
  } else {
    form.targetSatelliteTypes.push(type)
  }
}

/**
 * 提交创建新武器
 */
function handleSubmit(): void {
  if (!form.name.trim()) {
    errorMessage.value = '请填写武器装备全称'
    return
  }
  if (!form.locationName.trim()) {
    form.locationName = `部署阵地 (${form.longitude}°, ${form.latitude}°)`
  }

  createWeapon({
    name: form.name.trim(),
    type: form.type,
    targetSatelliteTypes: form.targetSatelliteTypes,
    strikeRange: {
      minAltitudeKm: form.minAltitudeKm,
      maxAltitudeKm: form.maxAltitudeKm,
      maxDistanceKm: form.maxDistanceKm
    },
    performance: {
      pkProbability: form.pkProbability,
      trackingAccuracyM: form.trackingAccuracyM,
      responseTimeSec: form.responseTimeSec
    },
    cooldownSec: form.cooldownSec,
    quantity: form.quantity,
    position: {
      longitude: form.longitude,
      latitude: form.latitude,
      altitudeM: form.altitudeM
    },
    locationName: form.locationName.trim(),
    status: WeaponStatus.READY,
    description: form.description.trim() || '反制反卫作战装备'
  })

  isCreateWeaponModalOpen.value = false
  resetForm()
}

/**
 * 关闭并退出
 */
function handleClose(): void {
  cancelMapPointPickMode()
  isCreateWeaponModalOpen.value = false
}

/**
 * 重置表单
 */
function resetForm(): void {
  form.name = ''
  form.locationName = ''
  form.description = ''
  errorMessage.value = ''
}
</script>

<template>
  <div
    v-if="isCreateWeaponModalOpen"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm select-none p-4 font-mono"
  >
    <div class="relative w-full max-w-2xl bg-tactical-panel/95 border border-tactical-cyan/60 rounded-lg tactical-corner-bracket shadow-tactical-panel flex flex-col max-h-[90vh] overflow-hidden">
      <!-- 头部 -->
      <div class="flex items-center justify-between px-5 py-3.5 border-b border-tactical-border/80 bg-tactical-dark/80">
        <div class="flex items-center gap-2">
          <Crosshair class="w-4 h-4 text-tactical-red animate-pulse" />
          <h3 class="text-sm font-bold tracking-wider text-tactical-text">
            添加武器装备系统 (DEPLOY WEAPON SYSTEM)
          </h3>
        </div>
        <button
          @click="handleClose"
          class="p-1 rounded text-tactical-muted hover:text-tactical-cyan hover:bg-tactical-dark transition-colors"
        >
          <X class="w-4 h-4" />
        </button>
      </div>

      <!-- 表单主体 -->
      <div class="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
        <div
          v-if="errorMessage"
          class="p-2.5 rounded bg-tactical-red/20 border border-tactical-red text-tactical-red flex items-center gap-2"
        >
          <AlertCircle class="w-4 h-4 shrink-0" />
          <span>{{ errorMessage }}</span>
        </div>

        <!-- 基础信息行 -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="block text-tactical-muted text-[11px] mb-1">
              武器装备全称 <span class="text-tactical-cyan">*</span>
            </label>
            <input
              v-model="form.name"
              type="text"
              placeholder="如：HQ-19 陆基高空动能反卫系统"
              class="w-full px-3 py-1.5 rounded bg-tactical-bg border border-tactical-border text-tactical-text focus:outline-none focus:border-tactical-cyan"
            />
          </div>
          <div>
            <label class="block text-tactical-muted text-[11px] mb-1">武器作战分类</label>
            <select
              v-model="form.type"
              class="w-full px-3 py-1.5 rounded bg-tactical-bg border border-tactical-border text-tactical-cyan font-bold focus:outline-none focus:border-tactical-cyan"
            >
              <option :value="WeaponType.KINETIC">动能直接碰撞拦截 (KINETIC)</option>
              <option :value="WeaponType.DIRECTED_ENERGY">高能激光/定向能 (DIRECTED_ENERGY)</option>
              <option :value="WeaponType.ELECTRONIC_WARFARE">超宽带大功率电子干扰 (EW)</option>
              <option :value="WeaponType.CYBER">空间网络指令对抗 (CYBER)</option>
            </select>
          </div>
        </div>

        <!-- 阵地部署位置 (3 种方式) -->
        <div class="p-3 rounded bg-tactical-dark/60 border border-tactical-border/80">
          <div class="flex items-center justify-between mb-2">
            <label class="text-tactical-cyan font-bold text-xs flex items-center gap-1">
              <MapPin class="w-3.5 h-3.5" />
              <span>装备阵地部署位置 (3 种选点方式)</span>
            </label>
            <div class="flex items-center gap-1 text-[10px]">
              <button
                type="button"
                @click="locationMode = 'MANUAL'"
                :class="['px-2 py-0.5 rounded border', locationMode === 'MANUAL' ? 'bg-tactical-cyan/20 border-tactical-cyan text-tactical-cyan' : 'bg-tactical-bg border-tactical-border text-tactical-muted']"
              >
                手动经纬度
              </button>
              <button
                type="button"
                @click="locationMode = 'SEARCH'"
                :class="['px-2 py-0.5 rounded border', locationMode === 'SEARCH' ? 'bg-tactical-cyan/20 border-tactical-cyan text-tactical-cyan' : 'bg-tactical-bg border-tactical-border text-tactical-muted']"
              >
                地名搜索
              </button>
              <button
                type="button"
                @click="locationMode = 'MAP_CLICK'"
                :class="['px-2 py-0.5 rounded border', locationMode === 'MAP_CLICK' ? 'bg-tactical-cyan/20 border-tactical-cyan text-tactical-cyan' : 'bg-tactical-bg border-tactical-border text-tactical-muted']"
              >
                地图点选
              </button>
            </div>
          </div>

          <!-- 地名搜索 -->
          <div v-if="locationMode === 'SEARCH'" class="space-y-2 mb-2">
            <div class="relative">
              <Search class="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-tactical-muted" />
              <input
                v-model="locationQuery"
                type="text"
                placeholder="搜索战略阵地：胶东半岛、海南三亚、青海基地、西北沿线..."
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
                <span class="text-tactical-muted">{{ loc.longitude }}°, {{ loc.latitude }}°</span>
              </div>
            </div>
          </div>

          <!-- 地图点选 -->
          <div v-if="locationMode === 'MAP_CLICK'" class="text-center py-2 mb-2">
            <button
              type="button"
              @click="handleStartMapPointPick"
              class="px-4 py-1.5 rounded bg-tactical-cyan/20 border border-tactical-cyan text-tactical-cyan font-bold hover:bg-tactical-cyan/35 shadow-glow-cyan transition-all inline-flex items-center gap-1.5"
            >
              <Crosshair class="w-4 h-4 animate-spin-slow" />
              <span>点击进入三维地图点选阵地位置</span>
            </button>
          </div>

          <!-- 经纬度读数与阵地名称 -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div>
              <label class="text-[10px] text-tactical-muted">阵地经度 (°)</label>
              <input
                v-model.number="form.longitude"
                type="number"
                step="0.01"
                class="w-full px-2 py-1 rounded bg-tactical-bg border border-tactical-border text-tactical-cyan font-bold focus:outline-none"
              />
            </div>
            <div>
              <label class="text-[10px] text-tactical-muted">阵地纬度 (°)</label>
              <input
                v-model.number="form.latitude"
                type="number"
                step="0.01"
                class="w-full px-2 py-1 rounded bg-tactical-bg border border-tactical-border text-tactical-cyan font-bold focus:outline-none"
              />
            </div>
            <div>
              <label class="text-[10px] text-tactical-muted">阵地部署名称</label>
              <input
                v-model="form.locationName"
                type="text"
                placeholder="如：华北某阵地"
                class="w-full px-2 py-1 rounded bg-tactical-bg border border-tactical-border text-tactical-text focus:outline-none"
              />
            </div>
          </div>
        </div>

        <!-- 射程包络参数 (射高与斜距) -->
        <div class="p-3 rounded bg-tactical-dark/60 border border-tactical-border/80">
          <label class="text-tactical-cyan font-bold text-xs flex items-center gap-1 mb-2">
            <Gauge class="w-3.5 h-3.5" />
            <span>射程包络范围 (STRIKE ENVELOPE)</span>
          </label>
          <div class="grid grid-cols-3 gap-2">
            <div>
              <label class="text-[10px] text-tactical-muted">最低交战射高 (km)</label>
              <input
                v-model.number="form.minAltitudeKm"
                type="number"
                class="w-full px-2 py-1 rounded bg-tactical-bg border border-tactical-border text-tactical-text focus:outline-none"
              />
            </div>
            <div>
              <label class="text-[10px] text-tactical-muted">最大有效射高 (km)</label>
              <input
                v-model.number="form.maxAltitudeKm"
                type="number"
                class="w-full px-2 py-1 rounded bg-tactical-bg border border-tactical-border text-tactical-cyan font-bold focus:outline-none"
              />
            </div>
            <div>
              <label class="text-[10px] text-tactical-muted">最大倾斜距离 (km)</label>
              <input
                v-model.number="form.maxDistanceKm"
                type="number"
                class="w-full px-2 py-1 rounded bg-tactical-bg border border-tactical-border text-tactical-cyan font-bold focus:outline-none"
              />
            </div>
          </div>
        </div>

        <!-- 性能、间歇与备弹量 -->
        <div class="grid grid-cols-1 sm:grid-cols-4 gap-2 p-3 rounded bg-tactical-dark/60 border border-tactical-border/80">
          <div>
            <label class="text-[10px] text-tactical-muted">毁伤/压制概率 Pk(%)</label>
            <input
              v-model.number="form.pkProbability"
              type="number"
              min="1"
              max="100"
              class="w-full px-2 py-1 rounded bg-tactical-bg border border-tactical-border text-tactical-green font-bold focus:outline-none"
            />
          </div>
          <div>
            <label class="text-[10px] text-tactical-muted">打击间歇/冷却(秒)</label>
            <input
              v-model.number="form.cooldownSec"
              type="number"
              min="1"
              class="w-full px-2 py-1 rounded bg-tactical-bg border border-tactical-border text-tactical-amber font-bold focus:outline-none"
            />
          </div>
          <div>
            <label class="text-[10px] text-tactical-muted">最快响应时间(秒)</label>
            <input
              v-model.number="form.responseTimeSec"
              type="number"
              class="w-full px-2 py-1 rounded bg-tactical-bg border border-tactical-border text-tactical-text focus:outline-none"
            />
          </div>
          <div>
            <label class="text-[10px] text-tactical-muted">部署单元/备弹数</label>
            <input
              v-model.number="form.quantity"
              type="number"
              class="w-full px-2 py-1 rounded bg-tactical-bg border border-tactical-border text-tactical-cyan font-bold focus:outline-none"
            />
          </div>
        </div>

        <!-- 可打击的卫星类型多选 -->
        <div class="p-3 rounded bg-tactical-dark/60 border border-tactical-border/80">
          <label class="block text-tactical-cyan font-bold text-xs mb-2 flex items-center gap-1">
            <Zap class="w-3.5 h-3.5" />
            <span>可打击/压制的卫星类型 (多选)</span>
          </label>
          <div class="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
            <button
              type="button"
              v-for="(label, key) in {
                [TargetSatelliteType.RECONNAISSANCE]: '对地侦察',
                [TargetSatelliteType.COMMUNICATION]: '通信卫星',
                [TargetSatelliteType.RELAY]: '数据中继',
                [TargetSatelliteType.NAVIGATION]: '导航授时',
                [TargetSatelliteType.EARLY_WARNING]: '导弹预警'
              }"
              :key="key"
              @click="toggleTargetType(key as TargetSatelliteType)"
              :class="[
                'px-2 py-1.5 rounded text-[11px] border transition-all',
                form.targetSatelliteTypes.includes(key as TargetSatelliteType)
                  ? 'bg-tactical-cyan/20 border-tactical-cyan text-tactical-cyan font-bold'
                  : 'bg-tactical-bg border-tactical-border text-tactical-muted hover:text-tactical-text'
              ]"
            >
              {{ label }}
            </button>
          </div>
        </div>

        <!-- 详细说明 -->
        <div>
          <label class="block text-tactical-muted text-[11px] mb-1">装备技术战术说明</label>
          <textarea
            v-model="form.description"
            rows="2"
            placeholder="填写武器装备杀伤机理、多目标交战能力与火控雷达参数等..."
            class="w-full px-3 py-1.5 rounded bg-tactical-bg border border-tactical-border text-tactical-text focus:outline-none focus:border-tactical-cyan"
          ></textarea>
        </div>
      </div>

      <!-- 底部 -->
      <div class="px-5 py-3 border-t border-tactical-border/80 bg-tactical-dark/80 flex items-center justify-end gap-2 text-xs">
        <button
          type="button"
          @click="handleClose"
          class="px-4 py-1.5 rounded bg-tactical-dark border border-tactical-border text-tactical-muted hover:text-tactical-text transition-colors"
        >
          取消
        </button>
        <button
          type="button"
          @click="handleSubmit"
          class="px-5 py-1.5 rounded bg-tactical-cyan text-black font-bold hover:bg-cyan-300 shadow-glow-cyan transition-all flex items-center gap-1.5"
        >
          <Check class="w-3.5 h-3.5" />
          <span>确认部署武器</span>
        </button>
      </div>
    </div>
  </div>
</template>
