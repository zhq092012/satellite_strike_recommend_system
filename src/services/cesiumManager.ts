/**
 * @fileoverview Cesium 三维地球视景与态势实体渲染管理器
 * 负责 Cesium Viewer 的初始化、卫星与轨道线绘制、战场空域三维警戒罩、武器系统阵地与射程包络、敌方地面站、数据中心、以及空间-地面多跳数据链路拓扑动态渲染与地图点选拾取
 */

import * as Cesium from 'cesium'
import { Satellite, CameraPreset } from '../types/satellite'
import { Battlefield } from '../types/battlefield'
import {
  WeaponSystem,
  GroundStation,
  DataCenter,
  DataLink,
  DataLinkStatus,
  DataLinkTopologyType,
  FacilityStatus
} from '../types/tacticalAssets'
import { generateOrbitPath, calculateSensorFootprint } from './satelliteService'

/**
 * 内部存储的 Cesium Viewer 实例引用
 */
let viewer: Cesium.Viewer | null = null

/**
 * 屏幕空间事件处理器引用
 */
let eventHandler: Cesium.ScreenSpaceEventHandler | null = null

/**
 * 卫星实体映射表 (Key: satellite.id, Value: Cesium.Entity)
 */
const satelliteEntities = new Map<string, Cesium.Entity>()

/**
 * 卫星整轨路径折线实体映射表
 */
const orbitPolylineEntities = new Map<string, Cesium.Entity>()

/**
 * 卫星传感器地面视场多边形实体映射表
 */
const sensorFootprintEntities = new Map<string, Cesium.Entity>()

/**
 * 卫星星下点垂直投影线实体映射表
 */
const nadirLineEntities = new Map<string, Cesium.Entity>()

/**
 * 战场空域三维圆柱实体映射表 (Key: battlefield.id, Value: Cesium.Entity)
 */
const battlefieldEntities = new Map<string, Cesium.Entity>()

/**
 * 战场中心锚点与标牌实体映射表
 */
const battlefieldPinEntities = new Map<string, Cesium.Entity>()

/**
 * 武器系统装备阵地实体映射表 (Key: weapon.id, Value: Cesium.Entity)
 */
const weaponEntities = new Map<string, Cesium.Entity>()

/**
 * 武器装备立体射程包络地面覆盖圆圈实体映射表
 */
const weaponRangeEntities = new Map<string, Cesium.Entity>()

/**
 * 武器装备空间立体射高垂直引导光柱实体映射表
 */
const weaponBeamEntities = new Map<string, Cesium.Entity[]>()

/**
 * 敌方地面站实体映射表 (Key: groundStation.id, Value: Cesium.Entity)
 */
const groundStationEntities = new Map<string, Cesium.Entity>()

/**
 * 敌方地面站周边安全警戒圈实体映射表
 */
const groundStationPerimeterEntities = new Map<string, Cesium.Entity>()

/**
 * 数据中心实体映射表 (Key: dataCenter.id, Value: Cesium.Entity)
 */
const dataCenterEntities = new Map<string, Cesium.Entity>()

/**
 * 数据中心防御边界与信息立柱实体映射表
 */
const dataCenterPerimeterEntities = new Map<string, Cesium.Entity>()

/**
 * 多跳数据链路多段折线实体映射表 (Key: link.id, Value: Cesium.Entity[])
 */
const dataLinkEntities = new Map<string, Cesium.Entity[]>()

/**
 * 交互式绘制临时实体引用
 */
let drawingCenterEntity: Cesium.Entity | null = null
let drawingCircleEntity: Cesium.Entity | null = null

/**
 * 交互式绘制内部状态
 */
let isDrawingActive = false
let drawingCenterCartesian: Cesium.Cartesian3 | null = null
let drawingCurrentRadiusMeters = 0

/**
 * 交互式绘制回调
 */
let drawingRadiusCallback: ((radiusKm: number) => void) | null = null
let drawingCompleteCallback: ((center: { longitude: number; latitude: number }, radiusKm: number) => void) | null = null

/**
 * 地图单点拾取模式状态
 */
let isPointPickingActive = false
let pointPickCallback: ((lon: number, lat: number, alt: number) => void) | null = null

/**
 * 鼠标移动地理坐标变化回调函数类型
 */
export type CursorMoveCallback = (longitude: number, latitude: number, altitude: number) => void

/**
 * 卫星被用户点击选中的回调函数类型
 */
export type SatelliteClickCallback = (satelliteId: string) => void

/**
 * 战场被用户点击选中的回调函数类型
 */
export type BattlefieldClickCallback = (battlefieldId: string) => void

/**
 * 相机视角变化回调函数类型
 */
export type CameraChangeCallback = (altitude: number) => void

/**
 * 战术资产 (武器/地面站/数据中心) 被用户点击选中的回调函数类型
 */
export type AssetClickCallback = (
  type: 'WEAPON' | 'GROUND_STATION' | 'DATA_CENTER',
  assetId: string
) => void

/**
 * 创建生成战术风格的卫星发光十字瞄准指示器 Canvas 纹理
 *
 * @param colorHex - 卫星主题色彩 Hex 字符串 (例如 '#00f0ff')
 * @returns 离屏生成的 Canvas DOM 对象
 */
function createTacticalTargetCanvas(colorHex: string): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = 48
  canvas.height = 48
  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas

  const center = 24
  const radius = 12

  // 外围半透明光晕圈
  const grad = ctx.createRadialGradient(center, center, 4, center, center, radius + 8)
  grad.addColorStop(0, colorHex)
  grad.addColorStop(0.6, `${colorHex}88`)
  grad.addColorStop(1, 'transparent')
  ctx.fillStyle = grad
  ctx.beginPath()
  ctx.arc(center, center, radius + 8, 0, Math.PI * 2)
  ctx.fill()

  // 中心十字准星瞄准标线
  ctx.strokeStyle = colorHex
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(center - 18, center)
  ctx.lineTo(center - 8, center)
  ctx.moveTo(center + 8, center)
  ctx.lineTo(center + 18, center)
  ctx.moveTo(center, center - 18)
  ctx.lineTo(center, center - 8)
  ctx.moveTo(center, center + 8)
  ctx.lineTo(center, center + 18)
  ctx.arc(center, center, 10, 0, Math.PI * 2)
  ctx.stroke()

  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.arc(center, center, 3, 0, Math.PI * 2)
  ctx.fill()

  return canvas
}

/**
 * 创建生成战术武器阵地图标纹理
 *
 * @param colorHex - 武器主题色 (默认红/橙)
 * @param isSelected - 是否处于选中高亮状态
 * @returns 离屏生成的 Canvas DOM 对象
 */
function createWeaponMarkerCanvas(colorHex: string = '#ef4444', isSelected: boolean = false): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = 64
  canvas.height = 64
  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas

  const center = 32

  // 选中时外围微光光环
  if (isSelected) {
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.arc(center, center, 28, 0, Math.PI * 2)
    ctx.stroke()
  }

  // 绘制战术高亮底板圆
  ctx.fillStyle = 'rgba(7, 11, 20, 0.85)'
  ctx.beginPath()
  ctx.arc(center, center, 22, 0, Math.PI * 2)
  ctx.fill()

  // 绘制战术菱形框
  ctx.strokeStyle = colorHex
  ctx.fillStyle = isSelected ? `${colorHex}66` : `${colorHex}33`
  ctx.lineWidth = 2.5

  ctx.beginPath()
  ctx.moveTo(center, 12)
  ctx.lineTo(52, center)
  ctx.lineTo(center, 52)
  ctx.lineTo(12, center)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()

  // 十字准星瞄准标线
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(center, 18)
  ctx.lineTo(center, 46)
  ctx.moveTo(18, center)
  ctx.lineTo(46, center)
  ctx.stroke()

  // 核心交战点
  ctx.fillStyle = isSelected ? '#ffffff' : colorHex
  ctx.beginPath()
  ctx.arc(center, center, 4, 0, Math.PI * 2)
  ctx.fill()

  return canvas
}

/**
 * 创建生成地面天线测控站图标纹理
 *
 * @param isSelected - 是否处于选中高亮状态
 * @returns 离屏生成的 Canvas DOM 对象
 */
function createGroundStationMarkerCanvas(isSelected: boolean = false): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = 64
  canvas.height = 64
  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas

  const center = 32
  const colorHex = '#38bdf8'

  // 选中时外围微光光环
  if (isSelected) {
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.arc(center, center, 28, 0, Math.PI * 2)
    ctx.stroke()
  }

  // 战术深底
  ctx.fillStyle = 'rgba(7, 11, 20, 0.85)'
  ctx.beginPath()
  ctx.arc(center, center, 22, 0, Math.PI * 2)
  ctx.fill()

  // 抛物面天线弧面
  ctx.strokeStyle = colorHex
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.arc(center, 38, 18, Math.PI * 1.15, Math.PI * 1.85)
  ctx.stroke()

  // 天线支撑柱与馈源
  ctx.beginPath()
  ctx.moveTo(center, 38)
  ctx.lineTo(center, 18)
  ctx.stroke()

  // 馈源高亮球与信号放射波
  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.arc(center, 16, 3.5, 0, Math.PI * 2)
  ctx.fill()

  ctx.strokeStyle = 'rgba(56, 189, 248, 0.7)'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.arc(center, 16, 7, Math.PI * 1.2, Math.PI * 1.8)
  ctx.stroke()

  return canvas
}

/**
 * 创建生成情报数据中心图标纹理
 *
 * @param isSelected - 是否处于选中高亮状态
 * @returns 离屏生成的 Canvas DOM 对象
 */
function createDataCenterMarkerCanvas(isSelected: boolean = false): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = 64
  canvas.height = 64
  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas

  const center = 32
  const colorHex = '#f59e0b'

  // 选中时外围金色光环
  if (isSelected) {
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.arc(center, center, 28, 0, Math.PI * 2)
    ctx.stroke()
  }

  // 战术深底
  ctx.fillStyle = 'rgba(7, 11, 20, 0.85)'
  ctx.beginPath()
  ctx.arc(center, center, 22, 0, Math.PI * 2)
  ctx.fill()

  // 绘制六边形堡垒外廓
  ctx.strokeStyle = colorHex
  ctx.fillStyle = isSelected ? 'rgba(245, 158, 11, 0.4)' : 'rgba(245, 158, 11, 0.2)'
  ctx.lineWidth = 2.5
  ctx.beginPath()
  for (let i = 0; i < 6; i++) {
    const angle = (i * Math.PI) / 3
    const x = center + 20 * Math.cos(angle)
    const y = center + 20 * Math.sin(angle)
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.closePath()
  ctx.fill()
  ctx.stroke()

  // 内部服务器机柜格栅线条
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(center - 8, center - 6)
  ctx.lineTo(center + 8, center - 6)
  ctx.moveTo(center - 8, center)
  ctx.lineTo(center + 8, center)
  ctx.moveTo(center - 8, center + 6)
  ctx.lineTo(center + 8, center + 6)
  ctx.stroke()

  // 核心芯片绿/蓝状态灯
  ctx.fillStyle = '#10b981'
  ctx.beginPath()
  ctx.arc(center + 5, center - 6, 1.5, 0, Math.PI * 2)
  ctx.arc(center + 5, center, 1.5, 0, Math.PI * 2)
  ctx.arc(center + 5, center + 6, 1.5, 0, Math.PI * 2)
  ctx.fill()

  return canvas
}

/**
 * 初始化 Cesium 三维地球视景与战术暗夜风格
 *
 * @param container - 承载 Cesium 视景的 DOM 挂载容器元素
 * @param onCursorMove - 鼠标移动时地理坐标回调
 * @param onSatelliteClick - 鼠标拾取点击卫星实体回调
 * @param onBattlefieldClick - 鼠标拾取点击战场实体回调
 * @param onCameraChange - 相机高度变化回调
 * @param onAssetClick - 鼠标拾取点击战术资产实体回调 (武器/地面站/数据中心)
 * @returns 初始化完成的 Cesium.Viewer 实例
 * @throws {Error} 若 DOM 容器未就绪或 WebGL 不受支持则抛出异常
 */
export function initCesiumViewer(
  container: HTMLElement,
  onCursorMove?: CursorMoveCallback,
  onSatelliteClick?: SatelliteClickCallback,
  onBattlefieldClick?: BattlefieldClickCallback,
  onCameraChange?: CameraChangeCallback,
  onAssetClick?: AssetClickCallback
): Cesium.Viewer {
  if (!container) {
    throw new Error('Cesium initialization failed: target container DOM element is null')
  }

  // 构建 Viewer，剔除原生控件以适配硬核军工战术 HUD 风格
  viewer = new Cesium.Viewer(container, {
    animation: false,
    baseLayerPicker: false,
    fullscreenButton: false,
    vrButton: false,
    geocoder: false,
    homeButton: false,
    infoBox: false,
    sceneModePicker: false,
    selectionIndicator: false,
    timeline: false,
    navigationHelpButton: false,
    navigationInstructionsInitiallyVisible: false,
    scene3DOnly: true,
    shouldAnimate: true
  })

  // 场景渲染视觉调优：深色太空背景与大气辉光
  const scene = viewer.scene
  scene.backgroundColor = Cesium.Color.fromCssColorString('#070b14')
  scene.globe.baseColor = Cesium.Color.fromCssColorString('#0a101d')
  scene.globe.enableLighting = true // 开启太阳光照与晨昏线
  scene.globe.depthTestAgainstTerrain = true // 开启深度检测：彻底阻断地球背面实体穿透显示

  // 默认相机机位初始化 (亚太上空战术总览)
  viewer.camera.setView({
    destination: Cesium.Cartesian3.fromDegrees(108.0, 32.0, 22000000),
    orientation: {
      heading: Cesium.Math.toRadians(0),
      pitch: Cesium.Math.toRadians(-90),
      roll: 0
    }
  })

  // 绑定相机移动监听以报告高度
  if (onCameraChange) {
    viewer.camera.changed.addEventListener(() => {
      if (!viewer) return
      const cartographic = Cesium.Cartographic.fromCartesian(viewer.camera.position)
      onCameraChange(cartographic.height)
    })
  }

  // 屏幕空间鼠标交互事件配置
  eventHandler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas)

  // 1. 鼠标移动监听：用于更新实时经纬度或驱动交互式圆环拉伸
  eventHandler.setInputAction((movement: Cesium.ScreenSpaceEventHandler.MotionEvent) => {
    if (!viewer) return
    const ray = viewer.camera.getPickRay(movement.endPosition)
    if (!ray) return
    const cartesian = viewer.scene.globe.pick(ray, viewer.scene)
    if (!cartesian) return

    const cartographic = Cesium.Cartographic.fromCartesian(cartesian)
    const lon = Cesium.Math.toDegrees(cartographic.longitude)
    const lat = Cesium.Math.toDegrees(cartographic.latitude)
    const alt = cartographic.height

    if (onCursorMove) {
      onCursorMove(lon, lat, alt)
    }

    // 处于交互式拉出半径绘制流程中，且已确认中心点
    if (isDrawingActive && drawingCenterCartesian) {
      const centerCarto = Cesium.Cartographic.fromCartesian(drawingCenterCartesian)
      const geodesic = new Cesium.EllipsoidGeodesic()
      geodesic.setEndPoints(centerCarto, cartographic)
      drawingCurrentRadiusMeters = Math.max(10000, geodesic.surfaceDistance)

      if (drawingRadiusCallback) {
        drawingRadiusCallback(drawingCurrentRadiusMeters / 1000.0)
      }
    }
  }, Cesium.ScreenSpaceEventType.MOUSE_MOVE)

  // 2. 鼠标单击拾取实体或交互式绘制点击确认
  eventHandler.setInputAction((click: Cesium.ScreenSpaceEventHandler.PositionedEvent) => {
    if (!viewer) return

    // 地图单点点选拾取坐标模式
    if (isPointPickingActive && pointPickCallback) {
      const ray = viewer.camera.getPickRay(click.position)
      if (!ray) return
      const cartesian = viewer.scene.globe.pick(ray, viewer.scene)
      if (!cartesian) return

      const carto = Cesium.Cartographic.fromCartesian(cartesian)
      const lon = parseFloat(Cesium.Math.toDegrees(carto.longitude).toFixed(4))
      const lat = parseFloat(Cesium.Math.toDegrees(carto.latitude).toFixed(4))
      const alt = parseFloat(carto.height.toFixed(1))

      isPointPickingActive = false
      const cb = pointPickCallback
      pointPickCallback = null
      cb(lon, lat, alt)
      return
    }

    // 交互绘制模式拦截处理
    if (isDrawingActive) {
      const ray = viewer.camera.getPickRay(click.position)
      if (!ray) return
      const cartesian = viewer.scene.globe.pick(ray, viewer.scene)
      if (!cartesian) return

      if (!drawingCenterCartesian) {
        // 步骤一：第一次单击，确认中心锚点
        drawingCenterCartesian = cartesian
        drawingCurrentRadiusMeters = 50000 // 默认初始 50km

        // 创建临时中心锚点标示
        drawingCenterEntity = viewer.entities.add({
          id: 'temp-drawing-center',
          position: cartesian,
          point: {
            pixelSize: 10,
            color: Cesium.Color.fromCssColorString('#00f0ff'),
            outlineColor: Cesium.Color.WHITE,
            outlineWidth: 2
          },
          label: {
            text: '战场中心锚点\n[移动鼠标拖拽设置半径，再次点击确认]',
            font: '12px SFMono-Regular, monospace',
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            fillColor: Cesium.Color.fromCssColorString('#00f0ff'),
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 3,
            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
            pixelOffset: new Cesium.Cartesian2(0, -15)
          }
        })

        // 创建临时动态半径圆环
        drawingCircleEntity = viewer.entities.add({
          id: 'temp-drawing-circle',
          position: new Cesium.CallbackProperty(() => drawingCenterCartesian, false) as any,
          ellipse: {
            semiMajorAxis: new Cesium.CallbackProperty(() => drawingCurrentRadiusMeters, false) as any,
            semiMinorAxis: new Cesium.CallbackProperty(() => drawingCurrentRadiusMeters, false) as any,
            material: Cesium.Color.fromCssColorString('#00f0ff').withAlpha(0.2),
            outline: true,
            outlineColor: Cesium.Color.fromCssColorString('#00f0ff'),
            outlineWidth: 2
          }
        })
      } else {
        // 步骤二：第二次单击，锁定半径，完成绘制
        const finalRadiusKm = parseFloat((drawingCurrentRadiusMeters / 1000.0).toFixed(1))
        const fixedCenterCarto = Cesium.Cartographic.fromCartesian(drawingCenterCartesian)
        const finalCenter = {
          longitude: parseFloat(Cesium.Math.toDegrees(fixedCenterCarto.longitude).toFixed(4)),
          latitude: parseFloat(Cesium.Math.toDegrees(fixedCenterCarto.latitude).toFixed(4))
        }

        cleanupDrawingEntities()
        isDrawingActive = false

        if (drawingCompleteCallback) {
          drawingCompleteCallback(finalCenter, finalRadiusKm)
        }
      }
      return
    }

    // 常态常规拾取处理
    const pickedObject = viewer.scene.pick(click.position)
    if (Cesium.defined(pickedObject) && pickedObject.id && pickedObject.id.id) {
      const entityId = pickedObject.id.id as string

      // 卫星拾取
      if (satelliteEntities.has(entityId) && onSatelliteClick) {
        onSatelliteClick(entityId)
        return
      }

      // 战场拾取
      if (entityId.startsWith('bf-') && onBattlefieldClick) {
        const bfId = entityId.replace('bf-', '').replace('-pin', '')
        onBattlefieldClick(bfId)
        return
      }

      // 武器装备阵地拾取
      if (entityId.startsWith('wpn-') && onAssetClick) {
        const wpnId = entityId
          .replace('wpn-range-', '')
          .replace('wpn-beam-', '')
          .replace('wpn-apex-', '')
          .replace('wpn-', '')
        onAssetClick('WEAPON', wpnId)
        return
      }

      // 地面测控站拾取
      if (entityId.startsWith('gs-') && onAssetClick) {
        const gsId = entityId.replace('gs-perim-', '').replace('gs-', '')
        onAssetClick('GROUND_STATION', gsId)
        return
      }

      // 数据中心拾取
      if (entityId.startsWith('dc-') && onAssetClick) {
        const dcId = entityId.replace('dc-perim-', '').replace('dc-', '')
        onAssetClick('DATA_CENTER', dcId)
        return
      }
    }
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK)

  return viewer
}

/**
 * 启动三维地球单点点击拾取经纬度模式
 *
 * @param onPicked - 单击拾取到点位经纬度及海拔时的回调函数
 */
export function startMapPointPickMode(
  onPicked: (lon: number, lat: number, alt: number) => void
): void {
  isPointPickingActive = true
  pointPickCallback = onPicked
}

/**
 * 取消地图单点拾取模式
 */
export function cancelMapPointPickMode(): void {
  isPointPickingActive = false
  pointPickCallback = null
}

/**
 * 启动三维球体交互式拉拽半径绘制模式
 *
 * @param onRadiusChange - 鼠标移动时实时半径变化回调 (km)
 * @param onComplete - 第二次点击确认时的经纬度与半径回调
 */
export function startInteractiveDrawingMode(
  onRadiusChange?: (radiusKm: number) => void,
  onComplete?: (center: { longitude: number; latitude: number }, radiusKm: number) => void
): void {
  cleanupDrawingEntities()
  isDrawingActive = true
  drawingCenterCartesian = null
  drawingCurrentRadiusMeters = 0
  drawingRadiusCallback = onRadiusChange || null
  drawingCompleteCallback = onComplete || null
}

/**
 * 取消当前交互式绘制并还原状态
 */
export function cancelInteractiveDrawingMode(): void {
  cleanupDrawingEntities()
  isDrawingActive = false
  drawingCenterCartesian = null
  drawingRadiusCallback = null
  drawingCompleteCallback = null
}

/**
 * 清除交互式绘制产生的临时 Cesium 实体
 */
function cleanupDrawingEntities(): void {
  if (!viewer) return
  if (drawingCenterEntity) {
    viewer.entities.remove(drawingCenterEntity)
    drawingCenterEntity = null
  }
  if (drawingCircleEntity) {
    viewer.entities.remove(drawingCircleEntity)
    drawingCircleEntity = null
  }
}

/**
 * 批量注册并渲染武器阵地与立体射程包络光柱
 *
 * @param weapons - 武器装备列表
 * @param selectedId - 当前选中的高亮武器 ID
 */
export function renderWeapons(weapons: WeaponSystem[], selectedId?: string | null): void {
  if (!viewer) return

  const currentIds = new Set(weapons.map((w) => w.id))
  for (const [wpnId, entity] of weaponEntities.entries()) {
    if (!currentIds.has(wpnId)) {
      viewer.entities.remove(entity)
      weaponEntities.delete(wpnId)
    }
  }
  for (const [wpnId, rangeEntity] of weaponRangeEntities.entries()) {
    if (!currentIds.has(wpnId)) {
      viewer.entities.remove(rangeEntity)
      weaponRangeEntities.delete(wpnId)
    }
  }
  for (const [wpnId, entities] of weaponBeamEntities.entries()) {
    if (!currentIds.has(wpnId)) {
      entities.forEach((ent) => viewer!.entities.remove(ent))
      weaponBeamEntities.delete(wpnId)
    }
  }

  weapons.forEach((wpn) => {
    const isSelected = wpn.id === selectedId
    const pos = Cesium.Cartesian3.fromDegrees(
      wpn.position.longitude,
      wpn.position.latitude,
      wpn.position.altitudeM || 0
    )
    const colorHex = wpn.type === 'KINETIC' ? '#ef4444' : wpn.type === 'DIRECTED_ENERGY' ? '#f59e0b' : '#38bdf8'
    const color = Cesium.Color.fromCssColorString(colorHex)
    const radiusM = wpn.strikeRange.maxDistanceKm * 1000.0
    const topAltitudeM = wpn.strikeRange.maxAltitudeKm * 1000.0
    const apexPos = Cesium.Cartesian3.fromDegrees(
      wpn.position.longitude,
      wpn.position.latitude,
      topAltitudeM
    )

    // 1. 武器阵地标牌与地标实体
    let wpnEntity = weaponEntities.get(wpn.id)
    if (!wpnEntity) {
      wpnEntity = viewer!.entities.add({
        id: `wpn-${wpn.id}`,
        name: wpn.name,
        position: pos,
        billboard: {
          image: createWeaponMarkerCanvas(colorHex, isSelected),
          width: isSelected ? 38 : 32,
          height: isSelected ? 38 : 32,
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
          eyeOffset: new Cesium.ConstantProperty(new Cesium.Cartesian3(0, 0, -30))
        },
        label: {
          text: `[武器] ${wpn.name}\n阵地: ${wpn.locationName}\n射高: ${wpn.strikeRange.minAltitudeKm}-${wpn.strikeRange.maxAltitudeKm}km | 斜距: ${wpn.strikeRange.maxDistanceKm}km`,
          font: isSelected ? 'bold 12px SFMono-Regular, monospace' : '11px SFMono-Regular, monospace',
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          fillColor: isSelected ? Cesium.Color.WHITE : color,
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 3,
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          pixelOffset: new Cesium.Cartesian2(0, -42),
          eyeOffset: new Cesium.ConstantProperty(new Cesium.Cartesian3(0, 0, -35)),
          distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 25000000)
        }
      })
      weaponEntities.set(wpn.id, wpnEntity)
    } else {
      wpnEntity.position = new Cesium.ConstantPositionProperty(pos)
      if (wpnEntity.billboard) {
        wpnEntity.billboard.image = new Cesium.ConstantProperty(createWeaponMarkerCanvas(colorHex, isSelected))
        wpnEntity.billboard.width = new Cesium.ConstantProperty(isSelected ? 38 : 32)
        wpnEntity.billboard.height = new Cesium.ConstantProperty(isSelected ? 38 : 32)
      }
      if (wpnEntity.label) {
        wpnEntity.label.fillColor = new Cesium.ConstantProperty(isSelected ? Cesium.Color.WHITE : color)
        wpnEntity.label.font = new Cesium.ConstantProperty(isSelected ? 'bold 12px SFMono-Regular, monospace' : '11px SFMono-Regular, monospace')
      }
    }

    // 2. 地面立体射程打击包络圆圈
    let rangeEntity = weaponRangeEntities.get(wpn.id)
    if (!rangeEntity) {
      rangeEntity = viewer!.entities.add({
        id: `wpn-range-${wpn.id}`,
        position: pos,
        ellipse: {
          semiMajorAxis: radiusM,
          semiMinorAxis: radiusM,
          material: new Cesium.ColorMaterialProperty(color.withAlpha(isSelected ? 0.22 : 0.1)),
          outline: true,
          outlineColor: new Cesium.ConstantProperty(color.withAlpha(isSelected ? 0.95 : 0.6)),
          outlineWidth: new Cesium.ConstantProperty(isSelected ? 3.0 : 1.5),
          height: 50
        }
      })
      weaponRangeEntities.set(wpn.id, rangeEntity)
    } else if (rangeEntity.ellipse) {
      rangeEntity.position = new Cesium.ConstantPositionProperty(pos)
      rangeEntity.ellipse.semiMajorAxis = new Cesium.ConstantProperty(radiusM)
      rangeEntity.ellipse.semiMinorAxis = new Cesium.ConstantProperty(radiusM)
      rangeEntity.ellipse.material = new Cesium.ColorMaterialProperty(color.withAlpha(isSelected ? 0.22 : 0.1))
      rangeEntity.ellipse.outlineColor = new Cesium.ConstantProperty(color.withAlpha(isSelected ? 0.95 : 0.6))
      rangeEntity.ellipse.outlineWidth = new Cesium.ConstantProperty(isSelected ? 3.0 : 1.5)
    }

    // 3. 空间立体射高垂直引导光柱
    let beamList = weaponBeamEntities.get(wpn.id)
    if (!beamList) {
      beamList = []
      // 垂直主杀伤射束 (空间直线，必须配置 ArcType.NONE 杜绝沿椭球大圆弧插值退化计算)
      const vertLine = viewer!.entities.add({
        id: `wpn-beam-${wpn.id}`,
        polyline: {
          positions: [pos, apexPos],
          width: isSelected ? 3 : 2,
          arcType: Cesium.ArcType.NONE,
          material: new Cesium.PolylineGlowMaterialProperty({
            glowPower: 0.35,
            color: color
          })
        }
      })
      // 顶点拦截空域标识
      const apexNode = viewer!.entities.add({
        id: `wpn-apex-${wpn.id}`,
        position: apexPos,
        point: {
          pixelSize: isSelected ? 8 : 6,
          color: color,
          outlineColor: Cesium.Color.WHITE,
          outlineWidth: 1.5
        },
        label: {
          text: `[${wpn.id}] 极限射高: ${wpn.strikeRange.maxAltitudeKm}km`,
          font: '10px SFMono-Regular, monospace',
          fillColor: color,
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 2,
          pixelOffset: new Cesium.Cartesian2(0, -12),
          distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 30000000)
        }
      })
      beamList.push(vertLine, apexNode)
      weaponBeamEntities.set(wpn.id, beamList)
    } else {
      if (beamList[0] && beamList[0].polyline) {
        beamList[0].polyline.positions = new Cesium.ConstantProperty([pos, apexPos])
      }
      if (beamList[1]) {
        beamList[1].position = new Cesium.ConstantPositionProperty(apexPos)
      }
    }
  })
}

/**
 * 批量注册并渲染敌方地面测控站与周边警戒圈
 *
 * @param groundStations - 地面站列表
 * @param selectedId - 当前选中的地面站 ID
 */
export function renderGroundStations(
  groundStations: GroundStation[],
  selectedId?: string | null
): void {
  if (!viewer) return

  const currentIds = new Set(groundStations.map((g) => g.id))
  for (const [gsId, entity] of groundStationEntities.entries()) {
    if (!currentIds.has(gsId)) {
      viewer.entities.remove(entity)
      groundStationEntities.delete(gsId)
    }
  }
  for (const [gsId, entity] of groundStationPerimeterEntities.entries()) {
    if (!currentIds.has(gsId)) {
      viewer.entities.remove(entity)
      groundStationPerimeterEntities.delete(gsId)
    }
  }

  groundStations.forEach((gs) => {
    const isSelected = gs.id === selectedId
    const pos = Cesium.Cartesian3.fromDegrees(
      gs.position.longitude,
      gs.position.latitude,
      gs.position.altitudeM || 0
    )
    const isJammed = gs.status === FacilityStatus.JAMMED
    const colorHex = isJammed ? '#ef4444' : '#38bdf8'
    const color = Cesium.Color.fromCssColorString(colorHex)

    // 1. 地面站地标与标牌
    let entity = groundStationEntities.get(gs.id)
    if (!entity) {
      entity = viewer!.entities.add({
        id: `gs-${gs.id}`,
        name: gs.name,
        position: pos,
        billboard: {
          image: createGroundStationMarkerCanvas(isSelected),
          width: isSelected ? 36 : 30,
          height: isSelected ? 36 : 30,
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
          eyeOffset: new Cesium.ConstantProperty(new Cesium.Cartesian3(0, 0, -30))
        },
        label: {
          text: `[地面测控站] ${gs.name}\n${gs.country} · 天线: ${gs.antennaDiameterM}m · 频段: ${gs.frequencyBands.join('/')}`,
          font: isSelected ? 'bold 12px SFMono-Regular, monospace' : '11px SFMono-Regular, monospace',
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          fillColor: isSelected ? Cesium.Color.WHITE : color,
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 3,
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          pixelOffset: new Cesium.Cartesian2(0, -40),
          eyeOffset: new Cesium.ConstantProperty(new Cesium.Cartesian3(0, 0, -35)),
          distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 25000000)
        }
      })
      groundStationEntities.set(gs.id, entity)
    } else {
      entity.position = new Cesium.ConstantPositionProperty(pos)
      if (entity.billboard) {
        entity.billboard.image = new Cesium.ConstantProperty(createGroundStationMarkerCanvas(isSelected))
        entity.billboard.width = new Cesium.ConstantProperty(isSelected ? 36 : 30)
        entity.billboard.height = new Cesium.ConstantProperty(isSelected ? 36 : 30)
      }
      if (entity.label) {
        entity.label.fillColor = new Cesium.ConstantProperty(isSelected ? Cesium.Color.WHITE : color)
        entity.label.font = new Cesium.ConstantProperty(isSelected ? 'bold 12px SFMono-Regular, monospace' : '11px SFMono-Regular, monospace')
      }
    }

    // 2. 地面防护警戒圈 (Perimeter Ring)
    let perimEntity = groundStationPerimeterEntities.get(gs.id)
    if (!perimEntity) {
      perimEntity = viewer!.entities.add({
        id: `gs-perim-${gs.id}`,
        position: pos,
        ellipse: {
          semiMajorAxis: 80000,
          semiMinorAxis: 80000,
          material: new Cesium.ColorMaterialProperty(color.withAlpha(0.08)),
          outline: true,
          outlineColor: new Cesium.ConstantProperty(color.withAlpha(0.7)),
          outlineWidth: 1.5,
          height: 30
        }
      })
      groundStationPerimeterEntities.set(gs.id, perimEntity)
    } else if (perimEntity.ellipse) {
      perimEntity.position = new Cesium.ConstantPositionProperty(pos)
    }
  })
}

/**
 * 批量注册并渲染情报数据中心与防御边界
 *
 * @param dataCenters - 数据中心列表
 * @param selectedId - 当前选中的数据中心 ID
 */
export function renderDataCenters(dataCenters: DataCenter[], selectedId?: string | null): void {
  if (!viewer) return

  const currentIds = new Set(dataCenters.map((d) => d.id))
  for (const [dcId, entity] of dataCenterEntities.entries()) {
    if (!currentIds.has(dcId)) {
      viewer.entities.remove(entity)
      dataCenterEntities.delete(dcId)
    }
  }
  for (const [dcId, entity] of dataCenterPerimeterEntities.entries()) {
    if (!currentIds.has(dcId)) {
      viewer.entities.remove(entity)
      dataCenterPerimeterEntities.delete(dcId)
    }
  }

  dataCenters.forEach((dc) => {
    const isSelected = dc.id === selectedId
    const pos = Cesium.Cartesian3.fromDegrees(dc.position.longitude, dc.position.latitude, 0)
    const isJammed = dc.status === FacilityStatus.JAMMED
    const colorHex = isJammed ? '#ef4444' : '#f59e0b'
    const color = Cesium.Color.fromCssColorString(colorHex)

    // 1. 数据中心地标实体
    let entity = dataCenterEntities.get(dc.id)
    if (!entity) {
      entity = viewer!.entities.add({
        id: `dc-${dc.id}`,
        name: dc.name,
        position: pos,
        billboard: {
          image: createDataCenterMarkerCanvas(isSelected),
          width: isSelected ? 34 : 28,
          height: isSelected ? 34 : 28,
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
          eyeOffset: new Cesium.ConstantProperty(new Cesium.Cartesian3(0, 0, -30))
        },
        label: {
          text: `[情报数据中心] ${dc.name}\n${dc.country} · ${dc.computeScale} · ${dc.securityLevel}`,
          font: isSelected ? 'bold 12px SFMono-Regular, monospace' : '11px SFMono-Regular, monospace',
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          fillColor: isSelected ? Cesium.Color.WHITE : color,
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 3,
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          pixelOffset: new Cesium.Cartesian2(0, -36),
          eyeOffset: new Cesium.ConstantProperty(new Cesium.Cartesian3(0, 0, -35)),
          distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 25000000)
        }
      })
      dataCenterEntities.set(dc.id, entity)
    } else {
      entity.position = new Cesium.ConstantPositionProperty(pos)
      if (entity.billboard) {
        entity.billboard.image = new Cesium.ConstantProperty(createDataCenterMarkerCanvas(isSelected))
        entity.billboard.width = new Cesium.ConstantProperty(isSelected ? 34 : 28)
        entity.billboard.height = new Cesium.ConstantProperty(isSelected ? 34 : 28)
      }
      if (entity.label) {
        entity.label.fillColor = new Cesium.ConstantProperty(isSelected ? Cesium.Color.WHITE : color)
        entity.label.font = new Cesium.ConstantProperty(isSelected ? 'bold 12px SFMono-Regular, monospace' : '11px SFMono-Regular, monospace')
      }
    }

    // 2. 数据中心防护边界
    let perimEntity = dataCenterPerimeterEntities.get(dc.id)
    if (!perimEntity) {
      perimEntity = viewer!.entities.add({
        id: `dc-perim-${dc.id}`,
        position: pos,
        ellipse: {
          semiMajorAxis: 60000,
          semiMinorAxis: 60000,
          material: new Cesium.ColorMaterialProperty(color.withAlpha(0.08)),
          outline: true,
          outlineColor: new Cesium.ConstantProperty(color.withAlpha(0.7)),
          outlineWidth: 1.5,
          height: 30
        }
      })
      dataCenterPerimeterEntities.set(dc.id, perimEntity)
    } else if (perimEntity.ellipse) {
      perimEntity.position = new Cesium.ConstantPositionProperty(pos)
    }
  })
}

/**
 * 动态推演更新并渲染空间-地面多跳数据链路网络折线
 *
 * @param dataLinks - 数据链路列表
 * @param satellites - 最新推演卫星列表
 * @param groundStations - 地面站列表
 * @param dataCenters - 数据中心列表
 */
export function renderDataLinks(
  dataLinks: DataLink[],
  satellites: Satellite[],
  groundStations: GroundStation[],
  dataCenters: DataCenter[]
): void {
  if (!viewer) return

  // 1. 清理已删除链路实体
  const currentIds = new Set(dataLinks.map((l) => l.id))
  for (const [linkId, entities] of dataLinkEntities.entries()) {
    if (!currentIds.has(linkId)) {
      entities.forEach((ent) => viewer!.entities.remove(ent))
      dataLinkEntities.delete(linkId)
    }
  }

  // 卫星实体位置快速哈希表
  const satMap = new Map(satellites.map((s) => [s.id, s]))
  const gsMap = new Map(groundStations.map((g) => [g.id, g]))
  const dcMap = new Map(dataCenters.map((d) => [d.id, d]))

  dataLinks.forEach((link) => {
    const srcSat = satMap.get(link.sourceSatelliteId)
    const gs = gsMap.get(link.groundStationId)
    const dc = dcMap.get(link.dataCenterId)
    if (!srcSat || !gs || !dc) return

    const isJammed = link.status === DataLinkStatus.JAMMED
    const beamColor = isJammed
      ? Cesium.Color.fromCssColorString('#ef4444')
      : Cesium.Color.fromCssColorString('#00f0ff')

    const satPos = Cesium.Cartesian3.fromDegrees(
      srcSat.telemetry.longitude,
      srcSat.telemetry.latitude,
      srcSat.telemetry.altitude * 1000.0
    )
    const gsPos = Cesium.Cartesian3.fromDegrees(
      gs.position.longitude,
      gs.position.latitude,
      gs.position.altitudeM || 0
    )
    const dcPos = Cesium.Cartesian3.fromDegrees(dc.position.longitude, dc.position.latitude, 0)

    let entities = dataLinkEntities.get(link.id)
    // 若链路压制工况发生变化，则销毁旧光束并重建
    if (entities && (entities[0] as any)?._status !== link.status) {
      entities.forEach((ent) => viewer!.entities.remove(ent))
      dataLinkEntities.delete(link.id)
      entities = undefined
    }

    if (!entities) {
      entities = []

      if (link.topologyType === DataLinkTopologyType.RELAY && link.relaySatelliteId) {
        // 三跳中继拓扑: 卫星 -> 中继星 -> 地面站 -> 数据中心
        const relaySat = satMap.get(link.relaySatelliteId)
        const relayPos = relaySat
          ? Cesium.Cartesian3.fromDegrees(
              relaySat.telemetry.longitude,
              relaySat.telemetry.latitude,
              relaySat.telemetry.altitude * 1000.0
            )
          : null

        // 1. 星间中继光束 (仅当源星与中继星不同时渲染，空间直线 ArcType.NONE)
        const s2r = viewer!.entities.add({
          id: `dl-${link.id}-s2r`,
          polyline: {
            positions: relayPos && !Cesium.Cartesian3.equalsEpsilon(satPos, relayPos, 1.0)
              ? [satPos, relayPos]
              : [satPos, satPos],
            show: Boolean(relayPos && !Cesium.Cartesian3.equalsEpsilon(satPos, relayPos, 1.0)),
            width: isJammed ? 2 : 3,
            arcType: Cesium.ArcType.NONE,
            material: new Cesium.PolylineGlowMaterialProperty({
              glowPower: 0.35,
              color: beamColor
            })
          }
        })
        // 2. 中继对地光束
        const r2g = viewer!.entities.add({
          id: `dl-${link.id}-r2g`,
          polyline: {
            positions: [relayPos || satPos, gsPos],
            width: isJammed ? 2 : 3,
            arcType: Cesium.ArcType.NONE,
            material: new Cesium.PolylineDashMaterialProperty({
              color: beamColor,
              dashLength: 16.0
            })
          }
        })
        // 3. 地面站至数据中心陆缆
        const g2d = viewer!.entities.add({
          id: `dl-${link.id}-g2d`,
          polyline: {
            positions: [gsPos, dcPos],
            width: 2,
            arcType: Cesium.ArcType.GEODESIC,
            material: Cesium.Color.fromCssColorString('#a855f7').withAlpha(0.8)
          }
        })
        entities.push(s2r, r2g, g2d)
      } else {
        // 两跳直连拓扑: 卫星 -> 地面站 -> 数据中心
        const s2g = viewer!.entities.add({
          id: `dl-${link.id}-s2g`,
          polyline: {
            positions: [satPos, gsPos],
            width: isJammed ? 2 : 3,
            arcType: Cesium.ArcType.NONE,
            material: new Cesium.PolylineGlowMaterialProperty({
              glowPower: 0.4,
              color: beamColor
            })
          }
        })
        const g2d = viewer!.entities.add({
          id: `dl-${link.id}-g2d`,
          polyline: {
            positions: [gsPos, dcPos],
            width: 2,
            arcType: Cesium.ArcType.GEODESIC,
            material: Cesium.Color.fromCssColorString('#38bdf8').withAlpha(0.8)
          }
        })
        entities.push(s2g, g2d)
      }

      if (entities.length > 0) {
        ;(entities[0] as any)._status = link.status
      }
      dataLinkEntities.set(link.id, entities)
    } else {
      // 动态推演帧中更新折线两端坐标
      if (link.topologyType === DataLinkTopologyType.RELAY && link.relaySatelliteId) {
        const relaySat = satMap.get(link.relaySatelliteId)
        if (relaySat) {
          const relayPos = Cesium.Cartesian3.fromDegrees(
            relaySat.telemetry.longitude,
            relaySat.telemetry.latitude,
            relaySat.telemetry.altitude * 1000.0
          )

          if (entities[0] && entities[0].polyline && !Cesium.Cartesian3.equalsEpsilon(satPos, relayPos, 1.0)) {
            entities[0].polyline.positions = new Cesium.ConstantProperty([satPos, relayPos])
            entities[0].polyline.show = new Cesium.ConstantProperty(true)
          }
          if (entities[1] && entities[1].polyline) {
            entities[1].polyline.positions = new Cesium.ConstantProperty([relayPos, gsPos])
          }
        }
      } else {
        if (entities[0] && entities[0].polyline) {
          entities[0].polyline.positions = new Cesium.ConstantProperty([satPos, gsPos])
        }
      }
    }
  })
}

/**
 * 平滑飞向并精准聚焦指定地理坐标资产
 * 使用 BoundingSphere 精确将目标置于视口正中心，并以战术斜视视线观察
 *
 * @param longitude - 目标经度 (度)
 * @param latitude - 目标纬度 (度)
 * @param rangeM - 视线观察斜距 (米，默认 500km)
 * @param durationSeconds - 过渡耗时 (秒)
 */
export function flyToAssetLocation(
  longitude: number,
  latitude: number,
  rangeM: number = 500000,
  durationSeconds: number = 1.8
): void {
  if (!viewer) return

  // 保证安全射距与过渡耗时
  const safeRange = Math.max(10000, rangeM)
  const safeDuration = Math.max(0.5, durationSeconds)

  const targetCartesian = Cesium.Cartesian3.fromDegrees(longitude, latitude, 0)
  // 基于目标点东-北-天 (ENU) 局部空间坐标系计算斜视机位，确保目标 100% 居中且彻底杜绝 BoundingSphere 退化投影导致的 normalize 报错
  const transform = Cesium.Transforms.eastNorthUpToFixedFrame(targetCartesian)
  const pitchRad = Cesium.Math.toRadians(45)
  // 向南偏移并抬高天顶高度，形成 45° 俯瞰朝正北瞄准线
  const localOffset = new Cesium.Cartesian3(
    0,
    -safeRange * Math.cos(pitchRad),
    safeRange * Math.sin(pitchRad)
  )
  const cameraDestination = Cesium.Matrix4.multiplyByPoint(
    transform,
    localOffset,
    new Cesium.Cartesian3()
  )

  viewer.camera.flyTo({
    destination: cameraDestination,
    orientation: {
      heading: Cesium.Math.toRadians(0),
      pitch: Cesium.Math.toRadians(-45),
      roll: 0.0
    },
    duration: safeDuration
  })
}

/**
 * 批量注册并渲染战场三维空域防空警戒罩、中心标牌与雷达边界
 *
 * @param battlefields - 战场态势列表
 * @param selectedBattlefieldId - 当前选中的高亮战场 ID
 */
export function renderBattlefields(
  battlefields: Battlefield[],
  selectedBattlefieldId?: string | null
): void {
  if (!viewer) return

  // 1. 清理已删除的战场实体
  const currentIds = new Set(battlefields.map((b) => b.id))
  for (const [bfId, entity] of battlefieldEntities.entries()) {
    if (!currentIds.has(bfId)) {
      viewer.entities.remove(entity)
      battlefieldEntities.delete(bfId)
    }
  }
  for (const [bfId, pinEntity] of battlefieldPinEntities.entries()) {
    if (!currentIds.has(bfId)) {
      viewer.entities.remove(pinEntity)
      battlefieldPinEntities.delete(bfId)
    }
  }

  // 2. 遍历渲染或更新战场实体
  battlefields.forEach((bf) => {
    const isSelected = bf.id === selectedBattlefieldId
    const radiusMeters = bf.area.radiusKm * 1000.0
    const centerCartesian = Cesium.Cartesian3.fromDegrees(
      bf.area.center.longitude,
      bf.area.center.latitude,
      0
    )
    const baseColor = Cesium.Color.fromCssColorString(bf.color || '#ef4444')

    // 更新或创建战场圆柱态势罩
    let bfEntity = battlefieldEntities.get(bf.id)
    if (!bfEntity) {
      bfEntity = viewer!.entities.add({
        id: `bf-${bf.id}`,
        name: `Battlefield ${bf.name}`,
        position: centerCartesian,
        ellipse: {
          semiMajorAxis: radiusMeters,
          semiMinorAxis: radiusMeters,
          material: isSelected
            ? baseColor.withAlpha(0.28)
            : baseColor.withAlpha(0.14),
          outline: true,
          outlineColor: isSelected ? Cesium.Color.WHITE : baseColor.withAlpha(0.85),
          outlineWidth: isSelected ? 3.0 : 1.5,
          height: 10
        }
      })
      battlefieldEntities.set(bf.id, bfEntity)
    } else {
      if (bfEntity.ellipse) {
        bfEntity.ellipse.semiMajorAxis = new Cesium.ConstantProperty(radiusMeters)
        bfEntity.ellipse.semiMinorAxis = new Cesium.ConstantProperty(radiusMeters)
        bfEntity.ellipse.material = new Cesium.ColorMaterialProperty(
          isSelected ? baseColor.withAlpha(0.28) : baseColor.withAlpha(0.14)
        )
        bfEntity.ellipse.outlineWidth = new Cesium.ConstantProperty(isSelected ? 3.0 : 1.5)
        bfEntity.ellipse.outlineColor = new Cesium.ConstantProperty(
          isSelected ? Cesium.Color.WHITE : baseColor.withAlpha(0.85)
        )
      }
      bfEntity.position = new Cesium.ConstantPositionProperty(centerCartesian)
    }

    // 更新或创建战场中心瞄准标牌实体
    let pinEntity = battlefieldPinEntities.get(bf.id)
    const labelText = `[战区] ${bf.name}\n半径: ${bf.area.radiusKm}km | 关联任务: ${bf.missionIds.length}项`

    if (!pinEntity) {
      pinEntity = viewer!.entities.add({
        id: `bf-${bf.id}-pin`,
        position: centerCartesian,
        point: {
          pixelSize: isSelected ? 12 : 8,
          color: baseColor,
          outlineColor: Cesium.Color.WHITE,
          outlineWidth: isSelected ? 2 : 1
        },
        label: {
          text: labelText,
          font: '11px SFMono-Regular, Menlo, monospace',
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          fillColor: isSelected ? Cesium.Color.WHITE : baseColor,
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 3,
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          pixelOffset: new Cesium.Cartesian2(0, -14),
          eyeOffset: new Cesium.ConstantProperty(new Cesium.Cartesian3(0, 0, -25)),
          distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 30000000)
        }
      })
      battlefieldPinEntities.set(bf.id, pinEntity)
    } else {
      pinEntity.position = new Cesium.ConstantPositionProperty(centerCartesian)
      if (pinEntity.point) {
        pinEntity.point.pixelSize = new Cesium.ConstantProperty(isSelected ? 12 : 8)
        pinEntity.point.outlineWidth = new Cesium.ConstantProperty(isSelected ? 2 : 1)
      }
      if (pinEntity.label) {
        pinEntity.label.text = new Cesium.ConstantProperty(labelText)
        pinEntity.label.fillColor = new Cesium.ConstantProperty(
          isSelected ? Cesium.Color.WHITE : baseColor
        )
      }
    }
  })
}

/**
 * 平滑飞向并聚焦指定战场
 *
 * @param battlefield - 目标战场实体
 * @param durationSeconds - 过渡耗时 (秒)
 */
export function flyToBattlefield(
  battlefield: Battlefield,
  durationSeconds: number = 2.0
): void {
  if (!viewer) return

  const cameraHeight = Math.max(800000, battlefield.area.radiusKm * 3500)

  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(
      battlefield.area.center.longitude,
      battlefield.area.center.latitude - 1.5,
      cameraHeight
    ),
    orientation: {
      heading: Cesium.Math.toRadians(0),
      pitch: Cesium.Math.toRadians(-65),
      roll: 0
    },
    duration: durationSeconds
  })
}

/**
 * 批量注册并渲染卫星空间实体、轨道轨迹线与地面覆盖视场
 *
 * @param satellites - 卫星数据列表
 */
export function registerSatellites(satellites: Satellite[]): void {
  if (!viewer) return

  satellites.forEach((sat) => {
    const position = Cesium.Cartesian3.fromDegrees(
      sat.telemetry.longitude,
      sat.telemetry.latitude,
      sat.telemetry.altitude * 1000.0
    )
    const groundPosition = Cesium.Cartesian3.fromDegrees(
      sat.telemetry.longitude,
      sat.telemetry.latitude,
      0
    )
    const color = Cesium.Color.fromCssColorString(sat.color)
    const canvasTexture = createTacticalTargetCanvas(sat.color)

    // 1. 创建卫星本体发光瞄准标牌实体
    const satEntity = viewer!.entities.add({
      id: sat.id,
      name: sat.name,
      position: position,
      billboard: {
        image: canvasTexture,
        width: 32,
        height: 32,
        scale: 1.0,
        verticalOrigin: Cesium.VerticalOrigin.CENTER,
        horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
        eyeOffset: new Cesium.ConstantProperty(new Cesium.Cartesian3(0, 0, -100))
      },
      label: {
        text: `[${sat.id}] ${sat.name}\nH: ${sat.telemetry.altitude.toFixed(0)}km | V: ${sat.telemetry.velocity}km/s`,
        font: '11px SFMono-Regular, Menlo, monospace',
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        fillColor: Cesium.Color.fromCssColorString('#00f0ff'),
        outlineColor: Cesium.Color.BLACK,
        outlineWidth: 3,
        verticalOrigin: Cesium.VerticalOrigin.TOP,
        pixelOffset: new Cesium.Cartesian2(0, 20),
        distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 80000000)
      }
    })
    satelliteEntities.set(sat.id, satEntity)

    // 2. 创建整轨闭合空间轨迹线
    const orbitPoints = generateOrbitPath(sat.orbitalElements, 120)
    const orbitCartesians = orbitPoints.map((p) =>
      Cesium.Cartesian3.fromDegrees(p.longitude, p.latitude, p.altitude)
    )

    const orbitEntity = viewer!.entities.add({
      id: `orbit-${sat.id}`,
      name: `Orbit ${sat.name}`,
      polyline: {
        positions: orbitCartesians,
        width: 1.5,
        arcType: Cesium.ArcType.NONE,
        material: new Cesium.PolylineDashMaterialProperty({
          color: color.withAlpha(0.65),
          dashLength: 16.0
        })
      }
    })
    orbitPolylineEntities.set(sat.id, orbitEntity)

    // 3. 创建星下点地面垂直投影虚线
    const nadirEntity = viewer!.entities.add({
      id: `nadir-${sat.id}`,
      polyline: {
        positions: [position, groundPosition],
        width: 1,
        arcType: Cesium.ArcType.NONE,
        material: new Cesium.PolylineDashMaterialProperty({
          color: color.withAlpha(0.4),
          dashLength: 8.0
        })
      }
    })
    nadirLineEntities.set(sat.id, nadirEntity)

    // 4. 创建传感器地面视场覆盖多边形实体
    const footprintCoords = calculateSensorFootprint(
      sat.telemetry.longitude,
      sat.telemetry.latitude,
      sat.telemetry.altitude,
      sat.sensor.halfFov
    )
    const footprintCartesians = footprintCoords.map((c) =>
      Cesium.Cartesian3.fromDegrees(c.longitude, c.latitude, 100)
    )

    const footprintEntity = viewer!.entities.add({
      id: `footprint-${sat.id}`,
      name: `Sensor Footprint ${sat.name}`,
      polygon: {
        hierarchy: new Cesium.PolygonHierarchy(footprintCartesians),
        material: Cesium.Color.fromCssColorString(sat.sensor.beamColor).withAlpha(0.18),
        outline: true,
        outlineColor: Cesium.Color.fromCssColorString(sat.sensor.beamColor).withAlpha(0.75),
        outlineWidth: 1.5,
        height: 100
      }
    })
    sensorFootprintEntities.set(sat.id, footprintEntity)
  })
}

/**
 * 步进推演时高频更新所有卫星在轨位置、文字标牌、垂直投影与地面覆盖多边形
 *
 * @param satellites - 包含最新推演遥测数据的卫星列表
 */
export function updateAllSatellitePositions(satellites: Satellite[]): void {
  if (!viewer) return

  satellites.forEach((sat) => {
    const satEntity = satelliteEntities.get(sat.id)
    if (satEntity) {
      const position = Cesium.Cartesian3.fromDegrees(
        sat.telemetry.longitude,
        sat.telemetry.latitude,
        sat.telemetry.altitude * 1000.0
      )
      satEntity.position = new Cesium.ConstantPositionProperty(position)

      if (satEntity.label) {
        satEntity.label.text = new Cesium.ConstantProperty(
          `[${sat.id}] ${sat.name}\nH: ${sat.telemetry.altitude.toFixed(0)}km | V: ${sat.telemetry.velocity}km/s`
        )
      }

      const nadirEntity = nadirLineEntities.get(sat.id)
      if (nadirEntity && nadirEntity.polyline) {
        const groundPos = Cesium.Cartesian3.fromDegrees(
          sat.telemetry.longitude,
          sat.telemetry.latitude,
          0
        )
        nadirEntity.polyline.positions = new Cesium.ConstantProperty([position, groundPos])
      }

      const footprintEntity = sensorFootprintEntities.get(sat.id)
      if (footprintEntity && footprintEntity.polygon) {
        const coords = calculateSensorFootprint(
          sat.telemetry.longitude,
          sat.telemetry.latitude,
          sat.telemetry.altitude,
          sat.sensor.halfFov
        )
        const cartesians = coords.map((c) =>
          Cesium.Cartesian3.fromDegrees(c.longitude, c.latitude, 100)
        )
        footprintEntity.polygon.hierarchy = new Cesium.ConstantProperty(
          new Cesium.PolygonHierarchy(cartesians)
        )
      }
    }
  })
}

/**
 * 将三维相机平滑飞行定位至指定卫星并保持战术追踪视角
 *
 * @param satellite - 目标卫星
 * @param durationSeconds - 飞行过渡耗时 (秒，缺省为 1.5s)
 */
export function flyToSatellite(satellite: Satellite, durationSeconds: number = 1.5): void {
  if (!viewer) return

  const targetHeight = satellite.telemetry.altitude * 1000.0
  const viewHeight = targetHeight + Math.max(targetHeight * 0.8, 800000)

  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(
      satellite.telemetry.longitude,
      satellite.telemetry.latitude - 4.0,
      viewHeight
    ),
    orientation: {
      heading: Cesium.Math.toRadians(0),
      pitch: Cesium.Math.toRadians(-60),
      roll: 0
    },
    duration: durationSeconds
  })
}

/**
 * 切换相机至预设宏观战术机位
 *
 * @param preset - 预设机位数据
 * @param durationSeconds - 过渡耗时 (秒)
 */
export function flyToCameraPreset(preset: CameraPreset, durationSeconds: number = 2.0): void {
  if (!viewer) return

  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(
      preset.longitude,
      preset.latitude,
      preset.height
    ),
    orientation: {
      heading: preset.heading,
      pitch: preset.pitch,
      roll: preset.roll
    },
    duration: durationSeconds
  })
}

/**
 * 销毁 Cesium Viewer 与释放相关事件监听资源
 */
export function destroyCesiumViewer(): void {
  cleanupDrawingEntities()
  if (eventHandler) {
    eventHandler.destroy()
    eventHandler = null
  }
  if (viewer) {
    viewer.destroy()
    viewer = null
  }
  satelliteEntities.clear()
  orbitPolylineEntities.clear()
  sensorFootprintEntities.clear()
  nadirLineEntities.clear()
  battlefieldEntities.clear()
  battlefieldPinEntities.clear()
  weaponEntities.clear()
  weaponRangeEntities.clear()
  groundStationEntities.clear()
  dataCenterEntities.clear()
  dataLinkEntities.clear()
}
