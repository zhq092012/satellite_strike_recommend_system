<script setup lang="ts">
/**
 * @fileoverview Cesium 三维地球视景容器组件
 * 承载 WebGL 渲染上下文，管理生命周期、驱动时态步进动画，并与全局态势状态及战场实体进行双向同步
 */

import { ref, onMounted, onUnmounted, watch } from 'vue'
import {
  initCesiumViewer,
  registerSatellites,
  updateAllSatellitePositions,
  flyToSatellite,
  renderBattlefields,
  flyToBattlefield,
  renderWeapons,
  renderGroundStations,
  renderDataCenters,
  renderDataLinks,
  destroyCesiumViewer
} from '../../services/cesiumManager'
import { useSatelliteState } from '../../composables/useSatelliteState'
import { useBattlefieldState } from '../../composables/useBattlefieldState'
import { useTacticalAssetsState } from '../../composables/useTacticalAssetsState'

/**
 * DOM 容器元素引用
 */
const cesiumContainer = ref<HTMLDivElement | null>(null)

/**
 * 全局卫星态势状态及控制方法
 */
const {
  satellites,
  selectedSatellite,
  isTracked,
  clockState,
  selectSatellite,
  stepSimulation,
  updateCursorCoordinates,
  updateCameraAltitude
} = useSatelliteState()

/**
 * 全局战场与作战任务状态管理
 */
const {
  battlefields,
  selectedBattlefieldId,
  selectedBattlefield,
  isBattlefieldDrawerOpen
} = useBattlefieldState()

/**
 * 全局武器装备、地面站、数据中心与数据链路状态管理
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
  activeAssetTab,
  isAssetDrawerOpen
} = useTacticalAssetsState()

/**
 * 动画帧渲染请求 ID (requestAnimationFrame handle)
 */
let animationFrameId: number | null = null

/**
 * 上一次时钟刻度更新时间戳 (毫秒)
 */
let lastFrameTimestamp = performance.now()

/**
 * 主渲染循环循环迭代器：计算真实帧时间差并推动卫星动力学推演与空间实体位置更新
 *
 * @param currentTimestamp - 当前高精度时间戳
 */
function renderLoop(currentTimestamp: number): void {
  const deltaSeconds = (currentTimestamp - lastFrameTimestamp) / 1000.0
  lastFrameTimestamp = currentTimestamp

  // 限制单帧最大步长以防止切后台恢复时的物理穿透或跳跃
  if (deltaSeconds > 0 && deltaSeconds < 1.0) {
    stepSimulation(deltaSeconds)
    if (clockState.isPlaying) {
      updateAllSatellitePositions(satellites.value)
      // 随着卫星轨道位置实时前移，动态更新天基数据链路射线端点
      renderDataLinks(dataLinks.value, satellites.value, groundStations.value, dataCenters.value)
    }
  }

  animationFrameId = requestAnimationFrame(renderLoop)
}

// 监听选中卫星变化，自动执行平滑聚焦镜头过渡
watch(
  () => selectedSatellite.value,
  (newSatellite) => {
    if (newSatellite && isTracked.value && !isBattlefieldDrawerOpen.value) {
      flyToSatellite(newSatellite)
    }
  }
)

// 监听战场数据与选中状态变化，更新战场三维空域渲染
watch(
  [battlefields, selectedBattlefieldId],
  ([newBfs, newSelId]) => {
    renderBattlefields(newBfs, newSelId)
  },
  { deep: true }
)

// 监听选中战场变化，自动相机平滑飞向目标战区
watch(
  () => selectedBattlefield.value,
  (newBf) => {
    if (newBf && isBattlefieldDrawerOpen.value) {
      flyToBattlefield(newBf, 1.8)
    }
  }
)

// 监听武器数据与选定状态变化，更新武器阵地及射程包络渲染
watch(
  [weapons, selectedWeaponId],
  ([newWpns, newWpnId]) => {
    renderWeapons(newWpns, newWpnId)
  },
  { deep: true }
)

// 监听地面站数据与选定状态变化，更新地面天线站渲染
watch(
  [groundStations, selectedGroundStationId],
  ([newGs, newGsId]) => {
    renderGroundStations(newGs, newGsId)
  },
  { deep: true }
)

// 监听数据中心数据与选定状态变化，更新情报数据中心渲染
watch(
  [dataCenters, selectedDataCenterId],
  ([newDc, newDcId]) => {
    renderDataCenters(newDc, newDcId)
  },
  { deep: true }
)

// 监听数据链路数据变化，更新天基立体通信网络
watch(
  [dataLinks, selectedDataLinkId],
  () => {
    renderDataLinks(dataLinks.value, satellites.value, groundStations.value, dataCenters.value)
  },
  { deep: true }
)

onMounted(() => {
  if (cesiumContainer.value) {
    // 初始化三维球体视景，传入卫星与战场单击回调
    initCesiumViewer(
      cesiumContainer.value,
      (lon, lat, alt) => {
        updateCursorCoordinates(lon, lat, alt)
      },
      (satId) => {
        selectSatellite(satId)
      },
      (bfId) => {
        selectedBattlefieldId.value = bfId
        isBattlefieldDrawerOpen.value = true
      },
      (cameraHeight) => {
        updateCameraAltitude(cameraHeight)
      },
      (type, assetId) => {
        if (type === 'WEAPON') {
          selectedWeaponId.value = assetId
          activeAssetTab.value = 'WEAPONS'
          isAssetDrawerOpen.value = true
        } else if (type === 'GROUND_STATION') {
          selectedGroundStationId.value = assetId
          activeAssetTab.value = 'GROUND_STATIONS'
          isAssetDrawerOpen.value = true
        } else if (type === 'DATA_CENTER') {
          selectedDataCenterId.value = assetId
          activeAssetTab.value = 'DATA_CENTERS'
          isAssetDrawerOpen.value = true
        }
      }
    )

    // 批量注册卫星实体
    registerSatellites(satellites.value)

    // 批量渲染战场空域实体
    renderBattlefields(battlefields.value, selectedBattlefieldId.value)

    // 批量渲染武器系统阵地与射程包络
    renderWeapons(weapons.value, selectedWeaponId.value)

    // 批量渲染敌方地面测控站
    renderGroundStations(groundStations.value, selectedGroundStationId.value)

    // 批量渲染情报数据中心
    renderDataCenters(dataCenters.value, selectedDataCenterId.value)

    // 批量渲染空间天基数据链路
    renderDataLinks(dataLinks.value, satellites.value, groundStations.value, dataCenters.value)

    // 默认聚焦选中的第一颗卫星
    if (selectedSatellite.value) {
      flyToSatellite(selectedSatellite.value, 1.0)
    }

    // 启动物理仿真与渲染循环
    lastFrameTimestamp = performance.now()
    animationFrameId = requestAnimationFrame(renderLoop)
  }
})

onUnmounted(() => {
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId)
    animationFrameId = null
  }
  destroyCesiumViewer()
})
</script>

<template>
  <div class="absolute inset-0 w-full h-full overflow-hidden bg-tactical-bg select-none z-0">
    <!-- Cesium 实体渲染 Canvas 承载容器 -->
    <div ref="cesiumContainer" class="w-full h-full" />
    
    <!-- 极低透明度战术微光网格背景 -->
    <div class="pointer-events-none absolute inset-0 tactical-scanlines opacity-40 z-0"></div>
  </div>
</template>

<style scoped>
div {
  overflow: hidden;
}
</style>
