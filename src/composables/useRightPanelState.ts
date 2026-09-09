/**
 * @fileoverview 右侧面板与侧边抽屉互斥显示状态调度管理
 * 统一调度右侧三大面板（目标遥测面板、战场空域任务抽屉、武器装备链路抽屉），
 * 确保同一时间严格仅激活并显示一个面板，杜绝界面重叠或多重遮挡。
 */

import { ref, computed } from 'vue'

/**
 * 右侧面板与抽屉类型标识枚举
 * - TELEMETRY: 卫星目标精密遥测与开普勒六根数面板
 * - BATTLEFIELD: 战场空域与作战任务态势调度抽屉
 * - TACTICAL_ASSETS: 武器装备部署与天基数据链路综合抽屉
 * - NONE: 全部收起折叠（留出全屏三维视景空间）
 */
export type RightPanelType = 'TELEMETRY' | 'BATTLEFIELD' | 'TACTICAL_ASSETS' | 'NONE'

/**
 * 全局共享的当前激活面板类型状态
 * 默认为 'TELEMETRY'（系统初始化时展示卫星遥测分析面板）
 */
const activeRightPanel = ref<RightPanelType>('TELEMETRY')

/**
 * 右侧面板独占调度 Composable
 *
 * @returns 包含当前激活面板状态及互斥切换操作方法
 */
export function useRightPanelState() {
  /**
   * 遥测面板是否处于激活显示中
   */
  const isTelemetryActive = computed<boolean>(() => activeRightPanel.value === 'TELEMETRY')

  /**
   * 战场与任务抽屉是否处于激活显示中
   */
  const isBattlefieldActive = computed<boolean>(() => activeRightPanel.value === 'BATTLEFIELD')

  /**
   * 武器与数据链路抽屉是否处于激活显示中
   */
  const isTacticalAssetsActive = computed<boolean>(() => activeRightPanel.value === 'TACTICAL_ASSETS')

  /**
   * 当前是否有任意右侧面板处于展开显示中
   */
  const hasActivePanel = computed<boolean>(() => activeRightPanel.value !== 'NONE')

  /**
   * 设定当前唯一激活显示的右侧面板
   * 自动关闭并收起其余所有面板
   *
   * @param panel - 目标面板类型 ('TELEMETRY' | 'BATTLEFIELD' | 'TACTICAL_ASSETS' | 'NONE')
   */
  function setActivePanel(panel: RightPanelType): void {
    activeRightPanel.value = panel
  }

  /**
   * 切换指定面板的展开/收起状态
   * 若目标面板当前已展开，则收起并切换为 'NONE'；
   * 若目标面板当前未展开，则独占展开该面板并关闭其他面板。
   *
   * @param panel - 目标面板类型 ('TELEMETRY' | 'BATTLEFIELD' | 'TACTICAL_ASSETS')
   */
  function togglePanel(panel: 'TELEMETRY' | 'BATTLEFIELD' | 'TACTICAL_ASSETS'): void {
    if (activeRightPanel.value === panel) {
      activeRightPanel.value = 'NONE'
    } else {
      activeRightPanel.value = panel
    }
  }

  /**
   * 一键收起并隐藏所有右侧面板与抽屉
   */
  function closeAllRightPanels(): void {
    activeRightPanel.value = 'NONE'
  }

  return {
    activeRightPanel,
    isTelemetryActive,
    isBattlefieldActive,
    isTacticalAssetsActive,
    hasActivePanel,
    setActivePanel,
    togglePanel,
    closeAllRightPanels
  }
}
