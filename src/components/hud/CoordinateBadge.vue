<script setup lang="ts">
/**
 * @fileoverview 战术鼠标指针经纬度读数与宏观预设机位切换组件
 * 浮动显示当前地面经纬度、视点相机高度以及一键机位跳转
 */

import { Compass, Eye } from 'lucide-vue-next'
import { useSatelliteState } from '../../composables/useSatelliteState'
import { flyToCameraPreset } from '../../services/cesiumManager'
import { CameraPreset } from '../../types/satellite'

/**
 * 引入态势状态管理
 */
const { cursorGeoPosition, cameraAltitude, cameraPresets } = useSatelliteState()

/**
 * 执行切换至指定宏观机位
 *
 * @param preset - 目标机位参数
 */
function handlePresetClick(preset: CameraPreset): void {
  flyToCameraPreset(preset)
}
</script>

<template>
  <div class="pointer-events-auto flex items-center gap-3 px-3 py-1.5 rounded bg-tactical-panel/90 border border-tactical-border backdrop-blur shadow-tactical-panel text-xs select-none">
    <!-- 指针实时地理坐标 -->
    <div class="flex items-center gap-2 border-r border-tactical-border/80 pr-3">
      <Compass class="w-3.5 h-3.5 text-tactical-cyan animate-spin-slow" />
      <div class="flex items-center gap-2 font-mono text-[11px] text-tactical-muted">
        <span>
          LON:
          <span class="text-tactical-cyan font-bold">
            {{ cursorGeoPosition.longitude >= 0 ? '+' : '' }}{{ cursorGeoPosition.longitude.toFixed(2) }}°
          </span>
        </span>
        <span>
          LAT:
          <span class="text-tactical-cyan font-bold">
            {{ cursorGeoPosition.latitude >= 0 ? '+' : '' }}{{ cursorGeoPosition.latitude.toFixed(2) }}°
          </span>
        </span>
        <span class="hidden sm:inline">
          ALT:
          <span class="text-tactical-text font-bold">
            {{ (cameraAltitude / 1000).toFixed(0) }} km
          </span>
        </span>
      </div>
    </div>

    <!-- 战术预设机位快捷切换按钮组 -->
    <div class="flex items-center gap-1.5">
      <Eye class="w-3.5 h-3.5 text-tactical-muted hidden md:inline" />
      <div class="flex items-center gap-1">
        <button
          v-for="preset in cameraPresets"
          :key="preset.code"
          @click="handlePresetClick(preset)"
          class="px-2 py-0.5 text-[11px] font-mono rounded bg-tactical-dark/80 hover:bg-tactical-cyan/20 border border-tactical-border hover:border-tactical-cyan text-tactical-muted hover:text-tactical-cyan transition-all duration-150"
        >
          {{ preset.name }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.animate-spin-slow {
  animation: spin 16s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
