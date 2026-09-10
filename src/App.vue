<script setup lang="ts">
/**
 * @fileoverview 卫星态势分析系统顶层主视图组件
 * 整合 Cesium 三维地球视景、战术指挥顶栏、左侧目标列表、右侧遥测面板、底部推演条、战场与任务管理系统以及 HUD 标尺
 */

import CesiumViewer from './components/cesium/CesiumViewer.vue'
import HeaderBar from './components/hud/HeaderBar.vue'
import LeftSatellitePanel from './components/hud/LeftSatellitePanel.vue'
import RightTelemetryPanel from './components/hud/RightTelemetryPanel.vue'
import BottomTimelinePanel from './components/hud/BottomTimelinePanel.vue'
import CoordinateBadge from './components/hud/CoordinateBadge.vue'
import CornerDecorations from './components/hud/CornerDecorations.vue'
import BattlefieldMissionDrawer from './components/battlefield/BattlefieldMissionDrawer.vue'
import CreateBattlefieldDialog from './components/battlefield/CreateBattlefieldDialog.vue'
import CreateMissionDialog from './components/battlefield/CreateMissionDialog.vue'
import TacticalAssetsDrawer from './components/assets/TacticalAssetsDrawer.vue'
import CreateWeaponDialog from './components/assets/CreateWeaponDialog.vue'
import DeployWeaponDialog from './components/assets/DeployWeaponDialog.vue'
import CreateGroundStationDialog from './components/assets/CreateGroundStationDialog.vue'
import CreateDataCenterDialog from './components/assets/CreateDataCenterDialog.vue'
import CreateDataLinkDialog from './components/assets/CreateDataLinkDialog.vue'
import RightPanelQuickDock from './components/hud/RightPanelQuickDock.vue'
import CombatPlanningModal from './components/planning/CombatPlanningModal.vue'
</script>

<template>
  <div class="relative w-screen h-screen overflow-hidden bg-tactical-bg text-tactical-text select-none">
    <!-- 1. Cesium 核心三维空间视景底座 -->
    <CesiumViewer class="absolute inset-0 z-0" />

    <!-- 2. 战术 HUD 边角折括号与刻度标尺 -->
    <CornerDecorations />

    <!-- 3. 顶部战术指挥状态栏 -->
    <HeaderBar />

    <!-- 4. 浮动在顶栏下方的战术指针坐标读数与预设机位切换条 -->
    <div class="absolute top-16 left-1/2 -translate-x-1/2 z-20">
      <CoordinateBadge />
    </div>

    <!-- 5. 左侧在轨目标检索与编目列表 -->
    <LeftSatellitePanel />

    <!-- 6. 右侧精密遥测与开普勒轨道六根数面板 -->
    <RightTelemetryPanel />

    <!-- 7. 底部时态推演控制与战术告警事件流水 -->
    <BottomTimelinePanel />

    <!-- 8. 战场与作战任务态势管理侧边抽屉 -->
    <BattlefieldMissionDrawer />

    <!-- 9. 动态创建/导入战场空域模态对话框 -->
    <CreateBattlefieldDialog />

    <!-- 10. 动态创建/导入作战任务模态对话框 -->
    <CreateMissionDialog />

    <!-- 11. 武器装备与空间数据链路综合管理侧边抽屉 -->
    <TacticalAssetsDrawer />

    <!-- 12. 右侧面板收起状态下的战术快捷停靠栏 (仅在所有面板收起时显示，单次独占呼出) -->
    <RightPanelQuickDock />

    <!-- 12. 动态添加武器装备基本参数模态对话框 (右侧面板呼出) -->
    <CreateWeaponDialog />

    <!-- 13. 动态部署武器装备到阵地区域模态对话框 (顶部面板呼出) -->
    <DeployWeaponDialog />

    <!-- 14. 动态录入地面测控站模态对话框 -->
    <CreateGroundStationDialog />

    <!-- 14. 动态录入情报数据中心模态对话框 -->
    <CreateDataCenterDialog />

    <!-- 15. 动态组建空间数据链路模态对话框 -->
    <CreateDataLinkDialog />

    <!-- 16. 反卫作战计划推演决策向导模态框 (全流程六步闭环) -->
    <CombatPlanningModal />
  </div>
</template>

<style>
/* 全局页面防滚动 */
body {
  overflow: hidden;
  margin: 0;
  padding: 0;
  background-color: #070b14;
}
</style>
