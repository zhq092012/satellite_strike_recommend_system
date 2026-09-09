<script setup lang="ts">
/**
 * @fileoverview 动态添加/导入作战任务模态对话框组件
 * 支持配置任务起止时间、目标打击卫星类型、政治红线策略、打击星座系列与多战场双向关联勾选
 */

import { reactive, ref } from 'vue'
import {
  X,
  Target,
  Clock,
  ShieldAlert,
  Radio,
  Layers,
  UploadCloud,
  Check,
  AlertCircle,
  Plus
} from 'lucide-vue-next'
import { useBattlefieldState } from '../../composables/useBattlefieldState'
import {
  PoliticalRedLine,
  TargetSatelliteType,
  MissionStatus,
  MissionPriority
} from '../../types/battlefield'

/**
 * 引入全局战场与任务状态管理器
 */
const {
  battlefields,
  isCreateMissionModalOpen,
  createMission,
  importDataFromJson
} = useBattlefieldState()

/**
 * 错误与校验信息
 */
const errorMessage = ref<string>('')

/**
 * 自定义星座标签输入暂存
 */
const customConstellationInput = ref<string>('')

/**
 * 任务表单响应式状态
 */
const form = reactive({
  name: '',
  code: '',
  priority: MissionPriority.CRITICAL,
  status: MissionStatus.PLANNING,
  startTime: new Date().toISOString().slice(0, 16),
  endTime: new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 16),
  targetSatelliteTypes: [
    TargetSatelliteType.RECONNAISSANCE,
    TargetSatelliteType.COMMUNICATION
  ] as TargetSatelliteType[],
  politicalRedLine: PoliticalRedLine.MILITARY_AND_CIVILIAN,
  targetConstellations: [
    'Starlink (星链)',
    'Starshield (星盾)',
    'WorldView (高分商遥)'
  ] as string[],
  selectedBattlefieldIds: [] as string[],
  description: ''
})

/**
 * 预设可选常用打击卫星系列
 */
const availablePresetConstellations = [
  'Starlink (星链)',
  'Starshield (星盾)',
  'WorldView (高分商遥)',
  'Keyhole / KH (锁眼)',
  'OneWeb (低轨宽带)',
  'GPS (军用M码导航)',
  'Capella SAR (雷达成像)',
  'SBIRS (红外预警)'
]

/**
 * 切换预置星座标签的选中状态
 *
 * @param name - 星座系列名称
 */
function toggleConstellation(name: string): void {
  const index = form.targetConstellations.indexOf(name)
  if (index > -1) {
    form.targetConstellations.splice(index, 1)
  } else {
    form.targetConstellations.push(name)
  }
}

/**
 * 添加自定义卫星星座标签
 */
function handleAddCustomConstellation(): void {
  const val = customConstellationInput.value.trim()
  if (val && !form.targetConstellations.includes(val)) {
    form.targetConstellations.push(val)
    customConstellationInput.value = ''
  }
}

/**
 * 移除指定目标星座标签
 *
 * @param tag - 待移除的星座标签
 */
function removeConstellationTag(tag: string): void {
  form.targetConstellations = form.targetConstellations.filter((t) => t !== tag)
}

/**
 * 切换打击卫星类型复选状态
 *
 * @param type - 目标卫星类型
 */
function toggleSatelliteType(type: TargetSatelliteType): void {
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
 * 解析并批量导入作战任务 JSON 文件
 *
 * @param event - 文件上传事件
 */
function handleImportMissionFile(event: Event): void {
  const target = event.target as HTMLInputElement
  if (!target.files || target.files.length === 0) return

  const file = target.files[0]
  const reader = new FileReader()

  reader.onload = (e) => {
    try {
      const content = e.target?.result as string
      const res = importDataFromJson(content)
      if (res.importedMissions > 0) {
        isCreateMissionModalOpen.value = false
      } else {
        errorMessage.value = res.error || '未在文件中检测到有效的作战任务数据'
      }
    } catch (err: any) {
      errorMessage.value = `导入任务解析失败: ${err.message}`
    }
  }

  reader.readAsText(file)
}

/**
 * 提交保存新任务
 */
function handleSubmit(): void {
  if (!form.name.trim()) {
    errorMessage.value = '请填写任务名称'
    return
  }
  if (form.targetSatelliteTypes.length === 0) {
    errorMessage.value = '至少选择一种打击卫星类型'
    return
  }

  createMission({
    name: form.name.trim(),
    code: form.code.trim() || `MSN-${Date.now().toString().slice(-4)}`,
    status: form.status,
    priority: form.priority,
    startTime: new Date(form.startTime).toISOString(),
    endTime: new Date(form.endTime).toISOString(),
    targetSatelliteTypes: form.targetSatelliteTypes,
    politicalRedLine: form.politicalRedLine,
    targetConstellations: form.targetConstellations,
    battlefieldIds: form.selectedBattlefieldIds,
    description: form.description.trim() || '暂无任务战术描述'
  })

  isCreateMissionModalOpen.value = false
  resetForm()
}

/**
 * 重置表单
 */
function resetForm(): void {
  form.name = ''
  form.code = ''
  form.description = ''
  form.selectedBattlefieldIds = []
  errorMessage.value = ''
  customConstellationInput.value = ''
}
</script>

<template>
  <!-- 模态框遮罩 -->
  <div
    v-if="isCreateMissionModalOpen"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm select-none p-4"
  >
    <!-- 对话框主体容器 -->
    <div class="relative w-full max-w-2xl bg-tactical-panel/95 border border-tactical-cyan/60 rounded-lg tactical-corner-bracket shadow-tactical-panel flex flex-col max-h-[90vh] overflow-hidden">
      <!-- 头部：标题与关闭按钮 -->
      <div class="flex items-center justify-between px-5 py-3.5 border-b border-tactical-border/80 bg-tactical-dark/80">
        <div class="flex items-center gap-2">
          <Target class="w-4 h-4 text-tactical-cyan animate-pulse" />
          <h3 class="font-mono text-sm font-bold tracking-wider text-tactical-text">
            新建作战任务 (CREATE COMBAT MISSION)
          </h3>
        </div>
        <div class="flex items-center gap-2">
          <!-- 快捷导入任务按钮 -->
          <label class="px-2.5 py-1 rounded bg-tactical-dark/80 hover:bg-tactical-cyan/20 border border-tactical-border hover:border-tactical-cyan text-tactical-muted hover:text-tactical-cyan text-[11px] font-mono cursor-pointer transition-all flex items-center gap-1">
            <UploadCloud class="w-3 h-3" />
            <span>导入任务文件</span>
            <input
              type="file"
              accept=".json"
              @change="handleImportMissionFile"
              class="hidden"
            />
          </label>
          <button
            @click="isCreateMissionModalOpen = false"
            class="p-1 rounded text-tactical-muted hover:text-tactical-cyan hover:bg-tactical-dark transition-colors"
          >
            <X class="w-4 h-4" />
          </button>
        </div>
      </div>

      <!-- 表单内容滚动区 -->
      <div class="flex-1 overflow-y-auto p-5 space-y-4 font-mono text-xs">
        <!-- 错误提示条 -->
        <div
          v-if="errorMessage"
          class="p-2.5 rounded bg-tactical-red/20 border border-tactical-red text-tactical-red flex items-center gap-2"
        >
          <AlertCircle class="w-4 h-4 shrink-0" />
          <span>{{ errorMessage }}</span>
        </div>

        <!-- 基础信息行：名称、代号、阶段、战略优先级 -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label class="block text-tactical-muted text-[11px] mb-1">
              任务全称 <span class="text-tactical-cyan">*</span>
            </label>
            <input
              v-model="form.name"
              type="text"
              placeholder="如：低轨商用高分遥感卫星电磁压制行动"
              class="w-full px-3 py-1.5 rounded bg-tactical-bg border border-tactical-border text-tactical-text focus:border-tactical-cyan focus:outline-none"
            />
          </div>
          <div>
            <label class="block text-tactical-muted text-[11px] mb-1">行动战术代号</label>
            <input
              v-model="form.code"
              type="text"
              placeholder="如：OPERATION-SKY-INTERCEPT"
              class="w-full px-3 py-1.5 rounded bg-tactical-bg border border-tactical-border text-tactical-text focus:border-tactical-cyan focus:outline-none"
            />
          </div>
          <div>
            <label class="block text-tactical-muted text-[11px] mb-1">任务阶段</label>
            <select
              v-model="form.status"
              class="w-full px-3 py-1.5 rounded bg-tactical-bg border border-tactical-border text-tactical-text focus:border-tactical-cyan focus:outline-none"
            >
              <option :value="MissionStatus.PLANNING">作战计划拟制中 (PLANNING)</option>
              <option :value="MissionStatus.EXECUTING">任务下发执行中 (EXECUTING)</option>
              <option :value="MissionStatus.COMPLETED">已圆满完成 (COMPLETED)</option>
            </select>
          </div>
          <div>
            <label class="block text-tactical-muted text-[11px] mb-1">战略响应优先级</label>
            <select
              v-model="form.priority"
              class="w-full px-3 py-1.5 rounded bg-tactical-bg border border-tactical-border text-tactical-text focus:border-tactical-cyan focus:outline-none"
            >
              <option :value="MissionPriority.CRITICAL">特级最高优先级 (CRITICAL)</option>
              <option :value="MissionPriority.HIGH">高级优先级 (HIGH)</option>
              <option :value="MissionPriority.MEDIUM">常态中级优先级 (MEDIUM)</option>
            </select>
          </div>
        </div>

        <!-- 任务起止时间选择 -->
        <div class="p-3 rounded bg-tactical-dark/60 border border-tactical-border/80">
          <label class="block text-tactical-cyan font-bold text-xs mb-2 flex items-center gap-1.5">
            <Clock class="w-3.5 h-3.5" />
            <span>任务有效时域窗口 (TIME WINDOW)</span>
          </label>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="text-tactical-muted text-[10px] block mb-1">任务起算时间</label>
              <input
                v-model="form.startTime"
                type="datetime-local"
                class="w-full px-2.5 py-1.5 rounded bg-tactical-bg border border-tactical-border text-tactical-text focus:outline-none focus:border-tactical-cyan"
              />
            </div>
            <div>
              <label class="text-tactical-muted text-[10px] block mb-1">任务终止时间</label>
              <input
                v-model="form.endTime"
                type="datetime-local"
                class="w-full px-2.5 py-1.5 rounded bg-tactical-bg border border-tactical-border text-tactical-text focus:outline-none focus:border-tactical-cyan"
              />
            </div>
          </div>
        </div>

        <!-- 任务政治红线单选控制 (核心用户诉求) -->
        <div class="p-3 rounded bg-tactical-dark/60 border border-tactical-border/80">
          <div class="flex items-center justify-between mb-2">
            <label class="text-tactical-amber font-bold text-xs flex items-center gap-1.5">
              <ShieldAlert class="w-3.5 h-3.5" />
              <span>任务政治红线约束 (POLITICAL RED LINE)</span>
            </label>
            <span class="text-tactical-muted text-[10px]">严格按最高指挥规则约束</span>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <!-- 仅打击纯军用 -->
            <label
              :class="[
                'p-2.5 rounded border cursor-pointer transition-all flex flex-col justify-between',
                form.politicalRedLine === PoliticalRedLine.MILITARY_ONLY
                  ? 'bg-tactical-green/20 border-tactical-green shadow-glow-green text-green-200'
                  : 'bg-tactical-bg border-tactical-border text-tactical-muted hover:border-tactical-muted'
              ]"
            >
              <div class="flex items-center gap-1.5 font-bold mb-1">
                <input
                  type="radio"
                  :value="PoliticalRedLine.MILITARY_ONLY"
                  v-model="form.politicalRedLine"
                  class="accent-tactical-green"
                />
                <span>仅打击军用</span>
              </div>
              <p class="text-[10px] opacity-80 leading-relaxed">
                严格限制在纯军用天基平台，杜绝民用附带外溢。
              </p>
            </label>

            <!-- 仅打击民用 -->
            <label
              :class="[
                'p-2.5 rounded border cursor-pointer transition-all flex flex-col justify-between',
                form.politicalRedLine === PoliticalRedLine.CIVILIAN_ONLY
                  ? 'bg-tactical-amber/20 border-tactical-amber shadow-glow-cyan text-amber-200'
                  : 'bg-tactical-bg border-tactical-border text-tactical-muted hover:border-tactical-muted'
              ]"
            >
              <div class="flex items-center gap-1.5 font-bold mb-1">
                <input
                  type="radio"
                  :value="PoliticalRedLine.CIVILIAN_ONLY"
                  v-model="form.politicalRedLine"
                  class="accent-tactical-amber"
                />
                <span>仅打击民用</span>
              </div>
              <p class="text-[10px] opacity-80 leading-relaxed">
                仅阻断关键民用基础设施链路（受限谨慎审批）。
              </p>
            </label>

            <!-- 军民两用一体打击 -->
            <label
              :class="[
                'p-2.5 rounded border cursor-pointer transition-all flex flex-col justify-between',
                form.politicalRedLine === PoliticalRedLine.MILITARY_AND_CIVILIAN
                  ? 'bg-tactical-red/20 border-tactical-red shadow-glow-red text-red-200'
                  : 'bg-tactical-bg border-tactical-border text-tactical-muted hover:border-tactical-muted'
              ]"
            >
              <div class="flex items-center gap-1.5 font-bold mb-1">
                <input
                  type="radio"
                  :value="PoliticalRedLine.MILITARY_AND_CIVILIAN"
                  v-model="form.politicalRedLine"
                  class="accent-tactical-red"
                />
                <span>军民两用全打</span>
              </div>
              <p class="text-[10px] opacity-80 leading-relaxed">
                全维立体打击，覆盖军商两用（如星链、高分商遥）。
              </p>
            </label>
          </div>
        </div>

        <!-- 打击的卫星类型复选 -->
        <div class="p-3 rounded bg-tactical-dark/60 border border-tactical-border/80">
          <label class="block text-tactical-cyan font-bold text-xs mb-2 flex items-center gap-1.5">
            <Radio class="w-3.5 h-3.5" />
            <span>任务打击卫星类型 (多选复选)</span>
          </label>
          <div class="grid grid-cols-2 sm:grid-cols-5 gap-2">
            <button
              type="button"
              v-for="(label, key) in {
                [TargetSatelliteType.RECONNAISSANCE]: '对地侦察',
                [TargetSatelliteType.COMMUNICATION]: '卫星通讯',
                [TargetSatelliteType.RELAY]: '数据中继',
                [TargetSatelliteType.NAVIGATION]: '导航定位',
                [TargetSatelliteType.EARLY_WARNING]: '早期预警'
              }"
              :key="key"
              @click="toggleSatelliteType(key as TargetSatelliteType)"
              :class="[
                'px-2 py-1.5 rounded text-[11px] font-mono border transition-all',
                form.targetSatelliteTypes.includes(key as TargetSatelliteType)
                  ? 'bg-tactical-cyan/20 border-tactical-cyan text-tactical-cyan'
                  : 'bg-tactical-bg border-tactical-border text-tactical-muted hover:text-tactical-text'
              ]"
            >
              {{ label }}
            </button>
          </div>
        </div>

        <!-- 打击的卫星星座/系列标签与自定义添加 -->
        <div class="p-3 rounded bg-tactical-dark/60 border border-tactical-border/80">
          <div class="flex items-center justify-between mb-2">
            <label class="text-tactical-cyan font-bold text-xs flex items-center gap-1.5">
              <Layers class="w-3.5 h-3.5" />
              <span>打击的卫星系列/星座 (星链/星盾/WorldView等)</span>
            </label>
            <span class="text-tactical-muted text-[10px]">
              已选中 {{ form.targetConstellations.length }} 个系列
            </span>
          </div>

          <!-- 预置候选星座快速点击勾选 -->
          <div class="flex flex-wrap gap-1.5 mb-2.5">
            <button
              type="button"
              v-for="item in availablePresetConstellations"
              :key="item"
              @click="toggleConstellation(item)"
              :class="[
                'px-2 py-0.5 rounded text-[10px] border transition-colors',
                form.targetConstellations.includes(item)
                  ? 'bg-tactical-blue/20 border-tactical-blue text-tactical-blue font-bold'
                  : 'bg-tactical-bg border-tactical-border text-tactical-muted hover:text-tactical-text'
              ]"
            >
              {{ item }}
            </button>
          </div>

          <!-- 自定义星座输入条 -->
          <div class="flex gap-2 mb-2">
            <input
              v-model="customConstellationInput"
              type="text"
              placeholder="输入自定义卫星系列名称..."
              @keyup.enter="handleAddCustomConstellation"
              class="flex-1 px-3 py-1 rounded bg-tactical-bg border border-tactical-border text-[11px] text-tactical-text focus:outline-none focus:border-tactical-cyan"
            />
            <button
              type="button"
              @click="handleAddCustomConstellation"
              class="px-3 py-1 rounded bg-tactical-dark border border-tactical-border hover:border-tactical-cyan text-tactical-muted hover:text-tactical-cyan transition-colors flex items-center gap-1"
            >
              <Plus class="w-3 h-3" />
              <span>添加</span>
            </button>
          </div>

          <!-- 当前已激活的打击星座标签栏 -->
          <div class="flex flex-wrap gap-1.5">
            <span
              v-for="tag in form.targetConstellations"
              :key="tag"
              class="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-tactical-cyan/10 border border-tactical-cyan/40 text-tactical-cyan text-[10px]"
            >
              {{ tag }}
              <button
                type="button"
                @click="removeConstellationTag(tag)"
                class="hover:text-white"
              >
                <X class="w-2.5 h-2.5" />
              </button>
            </span>
          </div>
        </div>

        <!-- 关联覆盖的战场 (多对多关联勾选) -->
        <div class="p-3 rounded bg-tactical-dark/60 border border-tactical-border/80">
          <div class="flex items-center justify-between mb-2">
            <label class="text-tactical-cyan font-bold text-xs flex items-center gap-1.5">
              <ShieldAlert class="w-3.5 h-3.5" />
              <span>覆盖关联战场 (多对多关系勾选)</span>
            </label>
            <span class="text-tactical-muted text-[10px]">
              已关联 {{ form.selectedBattlefieldIds.length }} 个战区
            </span>
          </div>

          <div
            v-if="battlefields.length === 0"
            class="text-tactical-muted text-[11px] py-2 text-center"
          >
            当前系统中暂无战区空域，可先创建任务并在之后关联战区
          </div>

          <div v-else class="max-h-32 overflow-y-auto space-y-1.5 pr-1">
            <label
              v-for="bf in battlefields"
              :key="bf.id"
              class="flex items-center justify-between p-2 rounded bg-tactical-bg/70 border border-tactical-border/60 hover:border-tactical-border cursor-pointer text-[11px]"
            >
              <div class="flex items-center gap-2">
                <input
                  type="checkbox"
                  :value="bf.id"
                  v-model="form.selectedBattlefieldIds"
                  class="accent-tactical-cyan"
                />
                <div>
                  <div class="font-bold text-tactical-text">{{ bf.name }}</div>
                  <div class="text-[10px] text-tactical-muted">
                    {{ bf.id }} · 半径 {{ bf.area.radiusKm }}km
                  </div>
                </div>
              </div>
              <span class="px-1.5 py-0.2 rounded text-[9px] bg-tactical-dark border border-tactical-border text-tactical-muted">
                {{ bf.status }}
              </span>
            </label>
          </div>
        </div>

        <!-- 任务描述 -->
        <div>
          <label class="block text-tactical-muted text-[11px] mb-1">作战方案详细部署说明</label>
          <textarea
            v-model="form.description"
            rows="2"
            placeholder="填写任务行动纲要、电磁频段干扰参数、动能拦截窗口等详细说明..."
            class="w-full px-3 py-1.5 rounded bg-tactical-bg border border-tactical-border text-tactical-text focus:border-tactical-cyan focus:outline-none"
          ></textarea>
        </div>
      </div>

      <!-- 底部操作按钮 -->
      <div class="px-5 py-3 border-t border-tactical-border/80 bg-tactical-dark/80 flex items-center justify-end gap-2 font-mono text-xs">
        <button
          type="button"
          @click="isCreateMissionModalOpen = false"
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
          <span>确认并创建任务</span>
        </button>
      </div>
    </div>
  </div>
</template>
