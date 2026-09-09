<script setup lang="ts">
/**
 * @fileoverview 动态添加/导入战场模态对话框组件
 * 支持 4 种区域生成方式 (手动输入、地名检索、地图交互拖拉半径、文件导入) 与多任务双向关联选择
 */

import { ref, reactive, watch } from 'vue'
import {
  X,
  MapPin,
  Search,
  Crosshair,
  UploadCloud,
  Layers,
  Shield,
  Check,
  AlertCircle
} from 'lucide-vue-next'
import { useBattlefieldState } from '../../composables/useBattlefieldState'
import {
  CombatAreaType,
  BattlefieldStatus,
  AreaCreationMode,
  StrategicLocationOption
} from '../../types/battlefield'
import { searchStrategicLocations } from '../../services/geocodingService'
import { startInteractiveDrawingMode, cancelInteractiveDrawingMode } from '../../services/cesiumManager'

/**
 * 引入战场与任务状态管理器
 */
const {
  missions,
  isCreateBattlefieldModalOpen,
  isDrawingMode,
  createBattlefield,
  completeInteractiveMapDrawing,
  cancelInteractiveMapDrawing
} = useBattlefieldState()

/**
 * 当前选择的区域创建模式 (默认手动经纬度)
 */
const activeMode = ref<AreaCreationMode>(AreaCreationMode.MANUAL_COORDINATES)

/**
 * 手动输入子模式: 'CIRCLE' (中心点+半径) 或 'BOUNDS' (经纬度范围包围盒)
 */
const manualSubMode = ref<'CIRCLE' | 'BOUNDS'>('CIRCLE')

/**
 * 地名搜索关键词与联想候选列表
 */
const locationQuery = ref<string>('')
const locationSuggestions = ref<StrategicLocationOption[]>([])
const selectedLocation = ref<StrategicLocationOption | null>(null)

/**
 * 表单校验错误提示信息
 */
const errorMessage = ref<string>('')

/**
 * 导入文件状态提示
 */
const importSuccessInfo = ref<string>('')

/**
 * 战场表单响应式状态
 */
const form = reactive({
  name: '',
  code: '',
  status: BattlefieldStatus.ACTIVE,
  color: '#ef4444',
  description: '',
  centerLon: 120.0,
  centerLat: 24.0,
  radiusKm: 300,
  minLon: 118.0,
  maxLon: 122.0,
  minLat: 22.0,
  maxLat: 26.0,
  selectedMissionIds: [] as string[]
})

// 监听地名搜索词输入，实时模糊联想
watch(locationQuery, (newVal) => {
  locationSuggestions.value = searchStrategicLocations(newVal, 5)
})

/**
 * 选中某个联想的战略要地
 *
 * @param loc - 选中的要地实体
 */
function handleSelectLocation(loc: StrategicLocationOption): void {
  selectedLocation.value = loc
  form.centerLon = loc.longitude
  form.centerLat = loc.latitude
  form.radiusKm = loc.defaultRadiusKm
  if (!form.name) {
    form.name = `${loc.name}空天作战区`
  }
}

/**
 * 启动三维地图点击拖拽拉出半径模式
 */
function handleStartMapDraw(): void {
  // 临时最小化模态框以腾出视景操作空间
  isCreateBattlefieldModalOpen.value = false
  errorMessage.value = ''

  startInteractiveDrawingMode(
    (draggedRadiusKm) => {
      form.radiusKm = parseFloat(draggedRadiusKm.toFixed(1))
    },
    (center, radiusKm) => {
      form.centerLon = center.longitude
      form.centerLat = center.latitude
      form.radiusKm = radiusKm
      completeInteractiveMapDrawing(center, radiusKm)
      // 绘制完成后重新弹出对话框确认提交
      isCreateBattlefieldModalOpen.value = true
    }
  )
}

/**
 * 解析并导入外部 GeoJSON 或 JSON 区域文件
 *
 * @param event - 文件上传事件
 */
function handleFileUpload(event: Event): void {
  const target = event.target as HTMLInputElement
  if (!target.files || target.files.length === 0) return

  const file = target.files[0]
  const reader = new FileReader()

  reader.onload = (e) => {
    try {
      const content = e.target?.result as string
      const parsed = JSON.parse(content)

      // 解析 GeoJSON 格式
      if (parsed.type === 'FeatureCollection' || parsed.type === 'Feature') {
        const feature = parsed.type === 'FeatureCollection' ? parsed.features[0] : parsed
        if (feature.geometry && feature.geometry.type === 'Polygon') {
          const coords = feature.geometry.coordinates[0]
          if (coords.length > 0) {
            // 计算多边形质心作为中心点
            let sumLon = 0
            let sumLat = 0
            coords.forEach((pt: number[]) => {
              sumLon += pt[0]
              sumLat += pt[1]
            })
            form.centerLon = parseFloat((sumLon / coords.length).toFixed(4))
            form.centerLat = parseFloat((sumLat / coords.length).toFixed(4))
            form.radiusKm = 250
            if (feature.properties?.name) {
              form.name = feature.properties.name
            }
            importSuccessInfo.value = `成功解析 GeoJSON 边界，已提取中心点: (${form.centerLon}°, ${form.centerLat}°)`
          }
        }
      } else if (parsed.name && parsed.center) {
        // 解析标准作战区域 JSON
        form.name = parsed.name || form.name
        form.centerLon = parsed.center.longitude ?? form.centerLon
        form.centerLat = parsed.center.latitude ?? form.centerLat
        form.radiusKm = parsed.radiusKm ?? form.radiusKm
        importSuccessInfo.value = `成功导入作战空域数据: ${form.name}`
      } else {
        errorMessage.value = '文件格式无法识别，请导入标准 GeoJSON 或包含 center/radiusKm 的 JSON'
      }
    } catch (err: any) {
      errorMessage.value = `导入文件解析失败: ${err.message}`
    }
  }

  reader.readAsText(file)
}

/**
 * 提交保存新战场
 */
function handleSubmit(): void {
  if (!form.name.trim()) {
    errorMessage.value = '请填写战场名称'
    return
  }

  // 整理区域参数
  let areaType = CombatAreaType.CIRCLE
  let center = { longitude: form.centerLon, latitude: form.centerLat }
  let radius = form.radiusKm

  if (activeMode.value === AreaCreationMode.MANUAL_COORDINATES && manualSubMode.value === 'BOUNDS') {
    areaType = CombatAreaType.BOUNDING_BOX
    center = {
      longitude: (form.minLon + form.maxLon) / 2.0,
      latitude: (form.minLat + form.maxLat) / 2.0
    }
    // 由包围盒换算等效半径
    radius = Math.round(Math.abs(form.maxLon - form.minLon) * 55)
  }

  createBattlefield({
    name: form.name.trim(),
    code: form.code.trim() || `BF-${Date.now().toString().slice(-4)}`,
    status: form.status,
    color: form.color,
    description: form.description.trim() || '暂无详细描述',
    missionIds: form.selectedMissionIds,
    area: {
      type: areaType,
      center,
      radiusKm: radius,
      bounds: {
        minLon: form.minLon,
        maxLon: form.maxLon,
        minLat: form.minLat,
        maxLat: form.maxLat
      }
    }
  })

  // 关闭对话框并清理表单
  isCreateBattlefieldModalOpen.value = false
  resetForm()
}

/**
 * 关闭并退出对话框
 */
function handleClose(): void {
  if (isDrawingMode.value) {
    cancelInteractiveDrawingMode()
    cancelInteractiveMapDrawing()
  }
  isCreateBattlefieldModalOpen.value = false
}

/**
 * 重置表单字段
 */
function resetForm(): void {
  form.name = ''
  form.code = ''
  form.description = ''
  form.selectedMissionIds = []
  errorMessage.value = ''
  importSuccessInfo.value = ''
  selectedLocation.value = null
  locationQuery.value = ''
}
</script>

<template>
  <!-- 模态框遮罩 -->
  <div
    v-if="isCreateBattlefieldModalOpen"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm select-none p-4"
  >
    <!-- 对话框主体容器 -->
    <div class="relative w-full max-w-2xl bg-tactical-panel/95 border border-tactical-cyan/60 rounded-lg tactical-corner-bracket shadow-tactical-panel flex flex-col max-h-[90vh] overflow-hidden">
      <!-- 头部：标题与关闭按钮 -->
      <div class="flex items-center justify-between px-5 py-3.5 border-b border-tactical-border/80 bg-tactical-dark/80">
        <div class="flex items-center gap-2">
          <Shield class="w-4 h-4 text-tactical-cyan animate-pulse" />
          <h3 class="font-mono text-sm font-bold tracking-wider text-tactical-text">
            新建/导入战区空域 (CREATE BATTLEFIELD)
          </h3>
        </div>
        <button
          @click="handleClose"
          class="p-1 rounded text-tactical-muted hover:text-tactical-cyan hover:bg-tactical-dark transition-colors"
        >
          <X class="w-4 h-4" />
        </button>
      </div>

      <!-- 表单内容滚动区 -->
      <div class="flex-1 overflow-y-auto p-5 space-y-4 font-mono text-xs">
        <!-- 错误与成功提示条 -->
        <div
          v-if="errorMessage"
          class="p-2.5 rounded bg-tactical-red/20 border border-tactical-red text-tactical-red flex items-center gap-2"
        >
          <AlertCircle class="w-4 h-4 shrink-0" />
          <span>{{ errorMessage }}</span>
        </div>
        <div
          v-if="importSuccessInfo"
          class="p-2.5 rounded bg-tactical-green/20 border border-tactical-green text-tactical-green flex items-center gap-2"
        >
          <Check class="w-4 h-4 shrink-0" />
          <span>{{ importSuccessInfo }}</span>
        </div>

        <!-- 基础信息行：名称、代号、状态、色彩 -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label class="block text-tactical-muted text-[11px] mb-1">
              战场全称 <span class="text-tactical-cyan">*</span>
            </label>
            <input
              v-model="form.name"
              type="text"
              placeholder="如：东海第一岛链防空演训区"
              class="w-full px-3 py-1.5 rounded bg-tactical-bg border border-tactical-border text-tactical-text focus:border-tactical-cyan focus:outline-none"
            />
          </div>
          <div>
            <label class="block text-tactical-muted text-[11px] mb-1">战术代号</label>
            <input
              v-model="form.code"
              type="text"
              placeholder="如：EAST-SEA-ADIZ-01"
              class="w-full px-3 py-1.5 rounded bg-tactical-bg border border-tactical-border text-tactical-text focus:border-tactical-cyan focus:outline-none"
            />
          </div>
          <div>
            <label class="block text-tactical-muted text-[11px] mb-1">战区战备状态</label>
            <select
              v-model="form.status"
              class="w-full px-3 py-1.5 rounded bg-tactical-bg border border-tactical-border text-tactical-text focus:border-tactical-cyan focus:outline-none"
            >
              <option :value="BattlefieldStatus.ACTIVE">高度戒备中 (ACTIVE)</option>
              <option :value="BattlefieldStatus.PREPARING">战前演训准备 (PREPARING)</option>
              <option :value="BattlefieldStatus.STANDBY">常态监视待命 (STANDBY)</option>
            </select>
          </div>
          <div>
            <label class="block text-tactical-muted text-[11px] mb-1">战区标定色彩</label>
            <div class="flex items-center gap-2 mt-1">
              <button
                v-for="col in ['#ef4444', '#f59e0b', '#00f0ff', '#10b981', '#a855f7']"
                :key="col"
                type="button"
                @click="form.color = col"
                :class="[
                  'w-6 h-6 rounded-full border-2 transition-all',
                  form.color === col ? 'border-white scale-110 shadow-glow-cyan' : 'border-transparent opacity-60'
                ]"
                :style="{ backgroundColor: col }"
              ></button>
            </div>
          </div>
        </div>

        <!-- 核心：作战区域标注方式 Tab 切换 -->
        <div class="p-3 rounded bg-tactical-dark/60 border border-tactical-border/80">
          <label class="block text-tactical-cyan font-bold text-xs mb-2">
            作战空域生成方式 (4 种模式可选)
          </label>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-1 mb-3">
            <button
              type="button"
              @click="activeMode = AreaCreationMode.MANUAL_COORDINATES"
              :class="[
                'px-2 py-1.5 rounded text-[11px] font-mono border transition-all flex items-center justify-center gap-1',
                activeMode === AreaCreationMode.MANUAL_COORDINATES
                  ? 'bg-tactical-cyan/20 border-tactical-cyan text-tactical-cyan'
                  : 'bg-tactical-bg border-tactical-border text-tactical-muted hover:text-tactical-text'
              ]"
            >
              <MapPin class="w-3 h-3" />
              <span>经纬度录入</span>
            </button>
            <button
              type="button"
              @click="activeMode = AreaCreationMode.SEARCH_LOCATION"
              :class="[
                'px-2 py-1.5 rounded text-[11px] font-mono border transition-all flex items-center justify-center gap-1',
                activeMode === AreaCreationMode.SEARCH_LOCATION
                  ? 'bg-tactical-cyan/20 border-tactical-cyan text-tactical-cyan'
                  : 'bg-tactical-bg border-tactical-border text-tactical-muted hover:text-tactical-text'
              ]"
            >
              <Search class="w-3 h-3" />
              <span>地名检索</span>
            </button>
            <button
              type="button"
              @click="activeMode = AreaCreationMode.INTERACTIVE_DRAG"
              :class="[
                'px-2 py-1.5 rounded text-[11px] font-mono border transition-all flex items-center justify-center gap-1',
                activeMode === AreaCreationMode.INTERACTIVE_DRAG
                  ? 'bg-tactical-cyan/20 border-tactical-cyan text-tactical-cyan'
                  : 'bg-tactical-bg border-tactical-border text-tactical-muted hover:text-tactical-text'
              ]"
            >
              <Crosshair class="w-3 h-3" />
              <span>地图拖拉半径</span>
            </button>
            <button
              type="button"
              @click="activeMode = AreaCreationMode.IMPORT_FILE"
              :class="[
                'px-2 py-1.5 rounded text-[11px] font-mono border transition-all flex items-center justify-center gap-1',
                activeMode === AreaCreationMode.IMPORT_FILE
                  ? 'bg-tactical-cyan/20 border-tactical-cyan text-tactical-cyan'
                  : 'bg-tactical-bg border-tactical-border text-tactical-muted hover:text-tactical-text'
              ]"
            >
              <UploadCloud class="w-3 h-3" />
              <span>导入文件</span>
            </button>
          </div>

          <!-- 模式 1: 手动输入经纬度与半径 / 经纬度范围 -->
          <div v-if="activeMode === AreaCreationMode.MANUAL_COORDINATES" class="space-y-2.5">
            <div class="flex items-center gap-3 text-[11px] pb-1 border-b border-tactical-border/40">
              <label class="flex items-center gap-1 cursor-pointer">
                <input
                  type="radio"
                  value="CIRCLE"
                  v-model="manualSubMode"
                  class="accent-tactical-cyan"
                />
                <span>中心点 + 半径模式</span>
              </label>
              <label class="flex items-center gap-1 cursor-pointer">
                <input
                  type="radio"
                  value="BOUNDS"
                  v-model="manualSubMode"
                  class="accent-tactical-cyan"
                />
                <span>经纬度包围盒范围 (BBox)</span>
              </label>
            </div>

            <!-- 中心点 + 半径 -->
            <div v-if="manualSubMode === 'CIRCLE'" class="grid grid-cols-3 gap-2">
              <div>
                <label class="text-tactical-muted text-[10px]">中心经度 (°)</label>
                <input
                  v-model.number="form.centerLon"
                  type="number"
                  step="0.01"
                  class="w-full px-2 py-1 rounded bg-tactical-bg border border-tactical-border text-tactical-cyan font-bold focus:outline-none"
                />
              </div>
              <div>
                <label class="text-tactical-muted text-[10px]">中心纬度 (°)</label>
                <input
                  v-model.number="form.centerLat"
                  type="number"
                  step="0.01"
                  class="w-full px-2 py-1 rounded bg-tactical-bg border border-tactical-border text-tactical-cyan font-bold focus:outline-none"
                />
              </div>
              <div>
                <label class="text-tactical-muted text-[10px]">作战半径 (km)</label>
                <input
                  v-model.number="form.radiusKm"
                  type="number"
                  step="10"
                  class="w-full px-2 py-1 rounded bg-tactical-bg border border-tactical-border text-tactical-cyan font-bold focus:outline-none"
                />
              </div>
            </div>

            <!-- 经纬度包围盒 -->
            <div v-else class="grid grid-cols-4 gap-2">
              <div>
                <label class="text-tactical-muted text-[10px]">西边界 MinLon</label>
                <input
                  v-model.number="form.minLon"
                  type="number"
                  class="w-full px-2 py-1 rounded bg-tactical-bg border border-tactical-border text-tactical-cyan focus:outline-none"
                />
              </div>
              <div>
                <label class="text-tactical-muted text-[10px]">东边界 MaxLon</label>
                <input
                  v-model.number="form.maxLon"
                  type="number"
                  class="w-full px-2 py-1 rounded bg-tactical-bg border border-tactical-border text-tactical-cyan focus:outline-none"
                />
              </div>
              <div>
                <label class="text-tactical-muted text-[10px]">南边界 MinLat</label>
                <input
                  v-model.number="form.minLat"
                  type="number"
                  class="w-full px-2 py-1 rounded bg-tactical-bg border border-tactical-border text-tactical-cyan focus:outline-none"
                />
              </div>
              <div>
                <label class="text-tactical-muted text-[10px]">北边界 MaxLat</label>
                <input
                  v-model.number="form.maxLat"
                  type="number"
                  class="w-full px-2 py-1 rounded bg-tactical-bg border border-tactical-border text-tactical-cyan focus:outline-none"
                />
              </div>
            </div>
          </div>

          <!-- 模式 2: 地图搜索地点名称 -->
          <div v-if="activeMode === AreaCreationMode.SEARCH_LOCATION" class="space-y-2">
            <div class="relative">
              <Search class="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-tactical-muted" />
              <input
                v-model="locationQuery"
                type="text"
                placeholder="输入战略要地：台湾海峡、关岛、钓鱼岛、巴士海峡..."
                class="w-full pl-8 pr-3 py-1.5 rounded bg-tactical-bg border border-tactical-border text-xs text-tactical-text focus:border-tactical-cyan focus:outline-none"
              />
            </div>

            <!-- 联想建议列表 -->
            <div
              v-if="locationSuggestions.length > 0"
              class="border border-tactical-border rounded bg-tactical-dark p-1 space-y-1"
            >
              <div
                v-for="loc in locationSuggestions"
                :key="loc.name"
                @click="handleSelectLocation(loc)"
                class="px-2 py-1.5 rounded hover:bg-tactical-cyan/20 cursor-pointer flex items-center justify-between text-[11px]"
              >
                <div class="flex items-center gap-1.5">
                  <MapPin class="w-3 h-3 text-tactical-cyan" />
                  <span class="font-bold text-tactical-text">{{ loc.name }}</span>
                  <span class="text-tactical-muted text-[10px]">({{ loc.region }})</span>
                </div>
                <div class="text-tactical-muted text-[10px]">
                  {{ loc.longitude }}°, {{ loc.latitude }}°
                </div>
              </div>
            </div>

            <div class="grid grid-cols-3 gap-2 pt-2">
              <div>
                <label class="text-tactical-muted text-[10px]">锁定中心经度</label>
                <input
                  v-model.number="form.centerLon"
                  type="number"
                  readonly
                  class="w-full px-2 py-1 rounded bg-tactical-bg/60 border border-tactical-border text-tactical-cyan"
                />
              </div>
              <div>
                <label class="text-tactical-muted text-[10px]">锁定中心纬度</label>
                <input
                  v-model.number="form.centerLat"
                  type="number"
                  readonly
                  class="w-full px-2 py-1 rounded bg-tactical-bg/60 border border-tactical-border text-tactical-cyan"
                />
              </div>
              <div>
                <label class="text-tactical-muted text-[10px]">作战半径 (km)</label>
                <input
                  v-model.number="form.radiusKm"
                  type="number"
                  step="10"
                  class="w-full px-2 py-1 rounded bg-tactical-bg border border-tactical-border text-tactical-cyan font-bold"
                />
              </div>
            </div>
          </div>

          <!-- 模式 3: 地图鼠标直接拖动拉出半径 -->
          <div v-if="activeMode === AreaCreationMode.INTERACTIVE_DRAG" class="space-y-3 text-center py-2">
            <div class="p-3 rounded bg-tactical-cyan/10 border border-tactical-cyan/40 text-left">
              <div class="font-bold text-tactical-cyan flex items-center gap-1 mb-1">
                <Crosshair class="w-3.5 h-3.5" />
                <span>地图直拉半径交互指南</span>
              </div>
              <ol class="list-decimal list-inside text-tactical-muted text-[11px] space-y-1">
                <li>点击下方“进入三维地图交互拾取”按钮，对话框将临时收起；</li>
                <li>在地球上**左键单击**：确认战场中心锚点；</li>
                <li>**移动鼠标**：三维视景将实时拉伸发光雷达圆环与距离数值；</li>
                <li>再次**左键单击**：锁定作战半径并自动回填数据恢复对话框。</li>
              </ol>
            </div>

            <div class="flex items-center justify-center gap-4">
              <button
                type="button"
                @click="handleStartMapDraw"
                class="px-4 py-2 rounded bg-tactical-cyan/20 border border-tactical-cyan text-tactical-cyan font-bold hover:bg-tactical-cyan/30 shadow-glow-cyan transition-all flex items-center gap-2"
              >
                <Crosshair class="w-4 h-4 animate-spin-slow" />
                <span>进入三维地图交互拾取</span>
              </button>
            </div>

            <div class="text-tactical-muted text-[11px]">
              当前已拾取数据: 中心 ({{ form.centerLon }}°, {{ form.centerLat }}°)，半径: {{ form.radiusKm }} km
            </div>
          </div>

          <!-- 模式 4: 导入作战区域文件 -->
          <div v-if="activeMode === AreaCreationMode.IMPORT_FILE" class="space-y-3">
            <div class="border-2 border-dashed border-tactical-border hover:border-tactical-cyan rounded p-4 text-center cursor-pointer transition-colors bg-tactical-bg/40">
              <UploadCloud class="w-8 h-8 text-tactical-muted mx-auto mb-2" />
              <label class="cursor-pointer">
                <span class="text-tactical-cyan underline">点击上传作战区域文件</span>
                <span class="text-tactical-muted block text-[10px] mt-1">
                  支持标准 GeoJSON (Polygon/FeatureCollection) 或战术空域 JSON
                </span>
                <input
                  type="file"
                  accept=".json,.geojson"
                  @change="handleFileUpload"
                  class="hidden"
                />
              </label>
            </div>
          </div>
        </div>

        <!-- 关联作战任务 (多对多关联勾选) -->
        <div class="p-3 rounded bg-tactical-dark/60 border border-tactical-border/80">
          <div class="flex items-center justify-between mb-2">
            <label class="text-tactical-cyan font-bold text-xs flex items-center gap-1.5">
              <Layers class="w-3.5 h-3.5" />
              <span>关联作战任务 (多对多关系勾选)</span>
            </label>
            <span class="text-tactical-muted text-[10px]">
              已关联 {{ form.selectedMissionIds.length }} 个任务
            </span>
          </div>

          <div
            v-if="missions.length === 0"
            class="text-tactical-muted text-[11px] py-2 text-center"
          >
            当前系统中暂无预设作战任务，可稍后在任务管理中建立关联
          </div>

          <div v-else class="max-h-32 overflow-y-auto space-y-1.5 pr-1">
            <label
              v-for="msn in missions"
              :key="msn.id"
              class="flex items-center justify-between p-2 rounded bg-tactical-bg/70 border border-tactical-border/60 hover:border-tactical-border cursor-pointer text-[11px]"
            >
              <div class="flex items-center gap-2">
                <input
                  type="checkbox"
                  :value="msn.id"
                  v-model="form.selectedMissionIds"
                  class="accent-tactical-cyan"
                />
                <div>
                  <div class="font-bold text-tactical-text">{{ msn.name }}</div>
                  <div class="text-[10px] text-tactical-muted">{{ msn.id }} · {{ msn.politicalRedLine }}</div>
                </div>
              </div>
              <span class="px-1.5 py-0.2 rounded text-[9px] bg-tactical-dark border border-tactical-border text-tactical-muted">
                {{ msn.status }}
              </span>
            </label>
          </div>
        </div>

        <!-- 作战任务简述 -->
        <div>
          <label class="block text-tactical-muted text-[11px] mb-1">战场背景与战略部署说明</label>
          <textarea
            v-model="form.description"
            rows="2"
            placeholder="填写战区作战任务描述、防御兵力、关键防空通道等背景信息..."
            class="w-full px-3 py-1.5 rounded bg-tactical-bg border border-tactical-border text-tactical-text focus:border-tactical-cyan focus:outline-none"
          ></textarea>
        </div>
      </div>

      <!-- 底部操作按钮 -->
      <div class="px-5 py-3 border-t border-tactical-border/80 bg-tactical-dark/80 flex items-center justify-end gap-2 font-mono text-xs">
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
          <span>确认并创建战场</span>
        </button>
      </div>
    </div>
  </div>
</template>
