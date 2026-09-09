<script setup lang="ts">
/**
 * @fileoverview 战场与作战任务态势管理侧边抽屉面板
 * 提供战场编目列表、任务调度编目、多对多双向关联联动查看、关键字检索、地图聚焦定位、以及 JSON 导出导入
 */

import { ref } from 'vue'
import {
  Shield,
  Target,
  Search,
  Plus,
  Trash2,
  Download,
  UploadCloud,
  ChevronRight
} from 'lucide-vue-next'
import { useBattlefieldState } from '../../composables/useBattlefieldState'
import { flyToBattlefield } from '../../services/cesiumManager'
import {
  Battlefield,
  CombatMission,
  PoliticalRedLine
} from '../../types/battlefield'

/**
 * 引入战场与任务全局状态与操作
 */
const {
  battlefields,
  missions,
  selectedBattlefieldId,
  selectedMissionId,
  filteredBattlefields,
  filteredMissions,
  missionsOfSelectedBattlefield,
  battlefieldsOfSelectedMission,
  isBattlefieldDrawerOpen,
  isCreateBattlefieldModalOpen,
  isCreateMissionModalOpen,
  activeDrawerTab,
  searchKeyword,
  redLineFilter,
  deleteBattlefield,
  deleteMission,
  exportAllDataToJson,
  importDataFromJson
} = useBattlefieldState()

/**
 * 状态提示信息
 */
const notificationText = ref<string>('')

/**
 * 点击某个战场卡片，平滑定位至该战场并高亮关联任务
 *
 * @param bf - 目标战场实体
 */
function handleSelectBattlefield(bf: Battlefield): void {
  selectedBattlefieldId.value = bf.id
  flyToBattlefield(bf, 1.8)
}

/**
 * 点击某个任务卡片，聚焦展示其所覆盖的所有战区
 *
 * @param msn - 作战任务实体
 */
function handleSelectMission(msn: CombatMission): void {
  selectedMissionId.value = msn.id
  // 若该任务有关联战场，自动飞向首个关联战场
  if (msn.battlefieldIds.length > 0) {
    const targetBf = battlefields.value.find((b) => b.id === msn.battlefieldIds[0])
    if (targetBf) {
      flyToBattlefield(targetBf, 1.8)
    }
  }
}

/**
 * 执行导出 JSON 文件下载
 */
function handleExportJson(): void {
  const jsonStr = exportAllDataToJson()
  const blob = new Blob([jsonStr], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `SATELLITE_TACTICAL_DATA_${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)

  notificationText.value = '全量战场与任务数据已导出下载'
  setTimeout(() => {
    notificationText.value = ''
  }, 3000)
}

/**
 * 执行文件导入处理
 *
 * @param event - 文件上传事件
 */
function handleImportFile(event: Event): void {
  const target = event.target as HTMLInputElement
  if (!target.files || target.files.length === 0) return

  const file = target.files[0]
  const reader = new FileReader()

  reader.onload = (e) => {
    try {
      const content = e.target?.result as string
      const res = importDataFromJson(content)
      notificationText.value = `导入成功: 载入 ${res.importedBattlefields} 个战场, ${res.importedMissions} 个任务`
      setTimeout(() => {
        notificationText.value = ''
      }, 4000)
    } catch (err: any) {
      notificationText.value = `导入失败: ${err.message}`
    }
  }

  reader.readAsText(file)
}

/**
 * 获取政治红线语义标签与样式
 *
 * @param redLine - 政治红线枚举
 * @returns 包含中文文本与颜色样式的对象
 */
function getRedLineDisplay(redLine: PoliticalRedLine): { label: string; cls: string } {
  switch (redLine) {
    case PoliticalRedLine.MILITARY_ONLY:
      return { label: '仅限军用', cls: 'bg-tactical-green/20 border-tactical-green text-tactical-green' }
    case PoliticalRedLine.CIVILIAN_ONLY:
      return { label: '仅限民用', cls: 'bg-tactical-amber/20 border-tactical-amber text-tactical-amber' }
    case PoliticalRedLine.MILITARY_AND_CIVILIAN:
      return { label: '军民两用全打', cls: 'bg-tactical-red/20 border-tactical-red text-tactical-red' }
    default:
      return { label: redLine, cls: 'bg-slate-800 text-tactical-muted' }
  }
}
</script>

<template>
  <div
    :class="[
      'fixed top-16 right-3 z-30 flex transition-all duration-300 select-none max-h-[calc(100vh-120px)]',
      isBattlefieldDrawerOpen ? 'w-96' : 'w-0 pointer-events-none'
    ]"
  >
    <!-- 抽屉主体 -->
    <div
      v-if="isBattlefieldDrawerOpen"
      class="w-full flex flex-col rounded-lg tactical-panel tactical-corner-bracket border border-tactical-border/90 shadow-tactical-panel overflow-hidden"
    >
      <!-- 头部：Tab 切换与操作栏 -->
      <div class="p-3 border-b border-tactical-border/80 bg-tactical-dark/90 flex flex-col gap-2">
        <div class="flex items-center justify-between">
          <!-- 切换 Tab -->
          <div class="flex items-center gap-1 bg-tactical-bg p-0.5 rounded border border-tactical-border">
            <button
              @click="activeDrawerTab = 'BATTLEFIELDS'"
              :class="[
                'px-3 py-1 rounded text-xs font-mono font-bold transition-all flex items-center gap-1.5',
                activeDrawerTab === 'BATTLEFIELDS'
                  ? 'bg-tactical-cyan/20 border border-tactical-cyan text-tactical-cyan shadow-glow-cyan'
                  : 'text-tactical-muted hover:text-tactical-text border border-transparent'
              ]"
            >
              <Shield class="w-3.5 h-3.5" />
              <span>战场空域 ({{ battlefields.length }})</span>
            </button>
            <button
              @click="activeDrawerTab = 'MISSIONS'"
              :class="[
                'px-3 py-1 rounded text-xs font-mono font-bold transition-all flex items-center gap-1.5',
                activeDrawerTab === 'MISSIONS'
                  ? 'bg-tactical-cyan/20 border border-tactical-cyan text-tactical-cyan shadow-glow-cyan'
                  : 'text-tactical-muted hover:text-tactical-text border border-transparent'
              ]"
            >
              <Target class="w-3.5 h-3.5" />
              <span>作战任务 ({{ missions.length }})</span>
            </button>
          </div>

          <!-- 关闭抽屉 -->
          <button
            @click="isBattlefieldDrawerOpen = false"
            class="p-1 rounded text-tactical-muted hover:text-tactical-cyan hover:bg-tactical-dark transition-colors"
            title="关闭抽屉"
          >
            <ChevronRight class="w-4 h-4" />
          </button>
        </div>

        <!-- 快捷新建操作按钮栏 -->
        <div class="grid grid-cols-2 gap-2 mt-0.5">
          <button
            @click="isCreateMissionModalOpen = true"
            class="py-1.5 px-2 rounded bg-tactical-cyan/20 hover:bg-tactical-cyan/35 border border-tactical-cyan text-tactical-cyan font-bold text-xs flex items-center justify-center gap-1.5 shadow-glow-cyan transition-all"
            title="点击创建作战任务"
          >
            <Plus class="w-3.5 h-3.5" />
            <span>+ 新建作战任务</span>
          </button>
          <button
            @click="isCreateBattlefieldModalOpen = true"
            class="py-1.5 px-2 rounded bg-tactical-dark hover:bg-slate-800 border border-tactical-border hover:border-tactical-cyan text-tactical-text hover:text-tactical-cyan font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
            title="点击创建或导入战区空域"
          >
            <Plus class="w-3.5 h-3.5" />
            <span>+ 新建战区空域</span>
          </button>
        </div>

        <!-- 搜索与快捷工具栏 -->
        <div class="flex items-center gap-2">
          <div class="relative flex-1">
            <Search class="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-tactical-muted" />
            <input
              v-model="searchKeyword"
              type="text"
              :placeholder="activeDrawerTab === 'BATTLEFIELDS' ? '检索战场代号/名称...' : '检索任务名称/代号...'"
              class="w-full pl-8 pr-3 py-1 rounded bg-tactical-bg/90 border border-tactical-border text-xs font-mono text-tactical-text focus:outline-none focus:border-tactical-cyan"
            />
          </div>

          <!-- 导出 / 导入 -->
          <button
            @click="handleExportJson"
            title="导出战场与任务全量 JSON"
            class="p-1.5 rounded bg-tactical-bg border border-tactical-border text-tactical-muted hover:text-tactical-cyan transition-colors"
          >
            <Download class="w-3.5 h-3.5" />
          </button>
          <label
            title="导入战场/任务 JSON"
            class="p-1.5 rounded bg-tactical-bg border border-tactical-border text-tactical-muted hover:text-tactical-cyan transition-colors cursor-pointer"
          >
            <UploadCloud class="w-3.5 h-3.5" />
            <input type="file" accept=".json" @change="handleImportFile" class="hidden" />
          </label>
        </div>

        <!-- 任务专属过滤器 (政治红线与卫星类型) -->
        <div
          v-if="activeDrawerTab === 'MISSIONS'"
          class="flex items-center gap-1.5 text-[10px] font-mono pt-1 overflow-x-auto pb-0.5"
        >
          <span class="text-tactical-muted">红线:</span>
          <button
            v-for="opt in [
              { label: '全部', val: 'ALL' },
              { label: '军用', val: PoliticalRedLine.MILITARY_ONLY },
              { label: '民用', val: PoliticalRedLine.CIVILIAN_ONLY },
              { label: '军民两用', val: PoliticalRedLine.MILITARY_AND_CIVILIAN }
            ]"
            :key="opt.val"
            @click="redLineFilter = opt.val as any"
            :class="[
              'px-1.5 py-0.2 rounded border whitespace-nowrap',
              redLineFilter === opt.val
                ? 'bg-tactical-amber/20 border-tactical-amber text-tactical-amber'
                : 'bg-tactical-bg border-tactical-border text-tactical-muted'
            ]"
          >
            {{ opt.label }}
          </button>
        </div>

        <!-- 临时提示 -->
        <div
          v-if="notificationText"
          class="text-[10px] text-tactical-green font-mono bg-tactical-green/10 border border-tactical-green/40 p-1 rounded text-center"
        >
          {{ notificationText }}
        </div>
      </div>

      <!-- 列表内容区 -->
      <div class="flex-1 overflow-y-auto p-3 space-y-2.5 max-h-[calc(100vh-280px)] font-mono text-xs">
        <!-- ==================== TAB 1: 战场列表 ==================== -->
        <div v-if="activeDrawerTab === 'BATTLEFIELDS'" class="space-y-2">
          <!-- 新建战场触发大按钮 -->
          <button
            @click="isCreateBattlefieldModalOpen = true"
            class="w-full py-2 px-3 rounded bg-tactical-cyan/15 hover:bg-tactical-cyan/25 border border-tactical-cyan/50 hover:border-tactical-cyan text-tactical-cyan font-bold transition-all flex items-center justify-center gap-2"
          >
            <Plus class="w-4 h-4" />
            <span>新建 / 导入战区空域</span>
          </button>

          <!-- 战场实体卡片序列 -->
          <div
            v-for="bf in filteredBattlefields"
            :key="bf.id"
            @click="handleSelectBattlefield(bf)"
            :class="[
              'p-3 rounded border transition-all cursor-pointer relative',
              selectedBattlefieldId === bf.id
                ? 'bg-tactical-cyan/10 border-tactical-cyan shadow-glow-cyan'
                : 'bg-tactical-dark/50 border-tactical-border/70 hover:border-tactical-border hover:bg-tactical-dark/80'
            ]"
          >
            <!-- 左侧高亮边条 -->
            <div
              v-if="selectedBattlefieldId === bf.id"
              class="absolute left-0 top-0 bottom-0 w-1 bg-tactical-cyan rounded-l"
            ></div>

            <div class="flex items-start justify-between">
              <div>
                <div class="flex items-center gap-1.5">
                  <span
                    class="w-2 h-2 rounded-full shrink-0"
                    :style="{ backgroundColor: bf.color }"
                  ></span>
                  <span class="font-bold text-tactical-text text-xs">
                    {{ bf.name }}
                  </span>
                </div>
                <div class="text-[10px] text-tactical-muted mt-0.5">
                  {{ bf.id }} · {{ bf.code }}
                </div>
              </div>

              <!-- 删除战场 -->
              <button
                @click.stop="deleteBattlefield(bf.id)"
                class="p-1 rounded text-tactical-muted hover:text-tactical-red hover:bg-tactical-dark transition-colors"
                title="删除战场"
              >
                <Trash2 class="w-3.5 h-3.5" />
              </button>
            </div>

            <!-- 空域几何信息快照 -->
            <div class="mt-2 grid grid-cols-2 gap-1.5 p-1.5 rounded bg-tactical-bg/70 border border-tactical-border/40 text-[10px]">
              <div>
                中心:
                <span class="text-tactical-text font-bold">
                  {{ bf.area.center.longitude.toFixed(2) }}°, {{ bf.area.center.latitude.toFixed(2) }}°
                </span>
              </div>
              <div>
                作战半径:
                <span class="text-tactical-cyan font-bold">{{ bf.area.radiusKm }} km</span>
              </div>
            </div>

            <!-- 关联作战任务徽章与展开 -->
            <div class="mt-2 pt-1.5 border-t border-tactical-border/40 flex items-center justify-between text-[10px]">
              <span class="text-tactical-muted flex items-center gap-1">
                <Target class="w-3 h-3 text-tactical-cyan" />
                关联任务: <strong class="text-tactical-cyan">{{ bf.missionIds.length }}</strong> 项
              </span>
              <span class="px-1.5 py-0.2 rounded text-[9px] border" :style="{ borderColor: bf.color, color: bf.color }">
                {{ bf.status }}
              </span>
            </div>

            <!-- 若当前选中该战场，且有关联任务，列出关联任务快照 -->
            <div
              v-if="selectedBattlefieldId === bf.id && missionsOfSelectedBattlefield.length > 0"
              class="mt-2 p-2 rounded bg-tactical-dark/90 border border-tactical-border/60 space-y-1"
            >
              <div class="text-[10px] text-tactical-muted font-bold">覆盖的作战任务:</div>
              <div
                v-for="msn in missionsOfSelectedBattlefield"
                :key="msn.id"
                class="flex items-center justify-between text-[10px] p-1 rounded bg-tactical-bg/60 border border-tactical-border/30"
              >
                <span class="text-tactical-text font-bold truncate max-w-[180px]">{{ msn.name }}</span>
                <span :class="['px-1 rounded text-[8px] border', getRedLineDisplay(msn.politicalRedLine).cls]">
                  {{ getRedLineDisplay(msn.politicalRedLine).label }}
                </span>
              </div>
            </div>
          </div>

          <div
            v-if="filteredBattlefields.length === 0"
            class="py-6 text-center text-tactical-muted font-mono text-xs"
          >
            未检索到匹配的战区空域
          </div>
        </div>

        <!-- ==================== TAB 2: 作战任务列表 ==================== -->
        <div v-if="activeDrawerTab === 'MISSIONS'" class="space-y-2">
          <!-- 新建任务触发大按钮 -->
          <button
            @click="isCreateMissionModalOpen = true"
            class="w-full py-2 px-3 rounded bg-tactical-cyan/15 hover:bg-tactical-cyan/25 border border-tactical-cyan/50 hover:border-tactical-cyan text-tactical-cyan font-bold transition-all flex items-center justify-center gap-2"
          >
            <Plus class="w-4 h-4" />
            <span>新建 / 导入作战任务</span>
          </button>

          <!-- 任务实体卡片序列 -->
          <div
            v-for="msn in filteredMissions"
            :key="msn.id"
            @click="handleSelectMission(msn)"
            :class="[
              'p-3 rounded border transition-all cursor-pointer relative',
              selectedMissionId === msn.id
                ? 'bg-tactical-cyan/10 border-tactical-cyan shadow-glow-cyan'
                : 'bg-tactical-dark/50 border-tactical-border/70 hover:border-tactical-border hover:bg-tactical-dark/80'
            ]"
          >
            <!-- 选中高亮左边条 -->
            <div
              v-if="selectedMissionId === msn.id"
              class="absolute left-0 top-0 bottom-0 w-1 bg-tactical-cyan rounded-l"
            ></div>

            <div class="flex items-start justify-between">
              <div>
                <div class="font-bold text-tactical-text text-xs">
                  {{ msn.name }}
                </div>
                <div class="text-[10px] text-tactical-muted mt-0.5">
                  {{ msn.id }} · {{ msn.code }}
                </div>
              </div>

              <!-- 删除任务 -->
              <button
                @click.stop="deleteMission(msn.id)"
                class="p-1 rounded text-tactical-muted hover:text-tactical-red hover:bg-tactical-dark transition-colors"
                title="删除任务"
              >
                <Trash2 class="w-3.5 h-3.5" />
              </button>
            </div>

            <!-- 政治红线与优先级标签 -->
            <div class="mt-2 flex items-center gap-1.5 flex-wrap">
              <span :class="['px-1.5 py-0.5 rounded text-[9px] font-bold border', getRedLineDisplay(msn.politicalRedLine).cls]">
                {{ getRedLineDisplay(msn.politicalRedLine).label }}
              </span>
              <span class="px-1.5 py-0.5 rounded text-[9px] bg-tactical-dark border border-tactical-border text-tactical-cyan">
                {{ msn.priority }}
              </span>
              <span class="px-1.5 py-0.5 rounded text-[9px] bg-tactical-dark border border-tactical-border text-tactical-muted">
                {{ msn.status }}
              </span>
            </div>

            <!-- 打击的卫星类型与星座 -->
            <div class="mt-2 space-y-1 text-[10px] text-tactical-muted">
              <div>
                打击类型:
                <span class="text-tactical-text font-bold">
                  {{ msn.targetSatelliteTypes.join(' · ') }}
                </span>
              </div>
              <div class="flex items-center gap-1 flex-wrap">
                <span class="text-tactical-muted">目标星系:</span>
                <span
                  v-for="c in msn.targetConstellations"
                  :key="c"
                  class="px-1 py-0.2 rounded bg-tactical-bg border border-tactical-border/60 text-tactical-text text-[9px]"
                >
                  {{ c }}
                </span>
              </div>
            </div>

            <!-- 关联战场徽章 -->
            <div class="mt-2 pt-1.5 border-t border-tactical-border/40 flex items-center justify-between text-[10px]">
              <span class="text-tactical-muted flex items-center gap-1">
                <Shield class="w-3 h-3 text-tactical-cyan" />
                关联战场: <strong class="text-tactical-cyan">{{ msn.battlefieldIds.length }}</strong> 个
              </span>
              <span class="text-tactical-muted">
                起算: {{ new Date(msn.startTime).toLocaleDateString() }}
              </span>
            </div>

            <!-- 若当前选中该任务，展示其覆盖的战场 -->
            <div
              v-if="selectedMissionId === msn.id && battlefieldsOfSelectedMission.length > 0"
              class="mt-2 p-2 rounded bg-tactical-dark/90 border border-tactical-border/60 space-y-1"
            >
              <div class="text-[10px] text-tactical-muted font-bold">覆盖的战场空域:</div>
              <div
                v-for="bf in battlefieldsOfSelectedMission"
                :key="bf.id"
                class="flex items-center justify-between text-[10px] p-1 rounded bg-tactical-bg/60 border border-tactical-border/30"
              >
                <span class="text-tactical-text font-bold truncate max-w-[180px]">{{ bf.name }}</span>
                <span class="text-tactical-cyan font-bold">{{ bf.area.radiusKm }}km</span>
              </div>
            </div>
          </div>

          <div
            v-if="filteredMissions.length === 0"
            class="py-6 text-center text-tactical-muted font-mono text-xs"
          >
            未检索到匹配的作战任务
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
