<script setup lang="ts">
/**
 * @fileoverview 动态添加武器装备基本参数模态对话框组件
 * 专门负责录入武器装备基础型号、作战机理分类、射程包络范围、作战效能指标与目标卫星类型
 * (注：经纬度区域部署由顶部面板“部署武器”专职负责)
 */

import { reactive, ref } from 'vue'
import {
  X,
  Crosshair,
  Check,
  AlertCircle,
  Zap,
  Gauge
} from 'lucide-vue-next'
import { useTacticalAssetsState } from '../../composables/useTacticalAssetsState'
import { WeaponType, WeaponStatus } from '../../types/tacticalAssets'
import { TargetSatelliteType } from '../../types/battlefield'

/**
 * 引入武器全局状态与操作
 */
const {
  isCreateWeaponModalOpen,
  createWeapon
} = useTacticalAssetsState()

/**
 * 错误校验提示
 */
const errorMessage = ref<string>('')

/**
 * 武器基础参数表单响应式状态
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
  description: ''
})

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
 * 提交添加新武器基本参数
 */
function handleSubmit(): void {
  if (!form.name.trim()) {
    errorMessage.value = '请填写武器装备全称'
    return
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
    locationName: '待部署阵地',
    isDeployed: false,
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
  isCreateWeaponModalOpen.value = false
  errorMessage.value = ''
}

/**
 * 重置表单
 */
function resetForm(): void {
  form.name = ''
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
          <Crosshair class="w-4 h-4 text-tactical-cyan animate-pulse" />
          <div>
            <h3 class="text-sm font-bold tracking-wider text-tactical-text">
              添加武器装备 (基本参数配置)
            </h3>
            <p class="text-[10px] text-tactical-muted mt-0.5">
              录入武器装备基础型号与作战指标参数；阵地经纬度部署可在顶部面板【部署武器】完成
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
            <label class="text-[10px] text-tactical-muted">基数单元数</label>
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
      <div class="px-5 py-3 border-t border-tactical-border/80 bg-tactical-dark/80 flex items-center justify-between text-xs">
        <div class="text-[11px] text-tactical-muted flex items-center gap-1">
          <span class="w-1.5 h-1.5 rounded-full bg-tactical-cyan"></span>
          <span>添加完成后可在顶栏点击【部署武器】放置到指定经纬度战区</span>
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
            @click="handleSubmit"
            class="px-5 py-1.5 rounded bg-tactical-cyan text-black font-bold hover:bg-cyan-300 shadow-glow-cyan transition-all flex items-center gap-1.5"
          >
            <Check class="w-3.5 h-3.5" />
            <span>确认添加武器</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
