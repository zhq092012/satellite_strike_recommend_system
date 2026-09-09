<script setup lang="ts">
/**
 * @fileoverview 动态组建空间立体数据链路模态对话框组件
 * 支持选择直连两跳 (卫星 -> 地面站 -> 数据中心) 或 空间中继三跳 (卫星 -> 中继卫星 -> 地面站 -> 数据中心)
 * 配置传输速率、往返时延及战术下行研判说明
 */

import { reactive, ref, computed } from 'vue'
import {
  X,
  Share2,
  Check,
  AlertCircle,
  ArrowRight,
  Radio,
  Server,
  Zap
} from 'lucide-vue-next'
import { useTacticalAssetsState } from '../../composables/useTacticalAssetsState'
import { useSatelliteState } from '../../composables/useSatelliteState'
import {
  DataLinkTopologyType,
  DataLinkStatus
} from '../../types/tacticalAssets'
import { SatelliteCategory } from '../../types/satellite'

/**
 * 引入战术资产全局状态与操作方法
 */
const {
  isCreateDataLinkModalOpen,
  groundStations,
  dataCenters,
  createDataLink
} = useTacticalAssetsState()

/**
 * 引入全域空间卫星资源列表
 */
const { satellites } = useSatelliteState()

/**
 * 筛选出的中继卫星列表 (优先显示中继类型，如无则可供全量选择)
 */
const relaySatellites = computed(() => {
  const relays = satellites.value.filter(
    (s) =>
      s.category === SatelliteCategory.COMMUNICATION ||
      s.name.includes('中继') ||
      s.name.includes('TDRS') ||
      s.name.includes('天链')
  )
  return relays.length > 0 ? relays : satellites.value
})

/**
 * 错误校验提示
 */
const errorMessage = ref<string>('')

/**
 * 链路组建表单响应式状态
 */
const form = reactive({
  name: '',
  topologyType: DataLinkTopologyType.DIRECT,
  sourceSatelliteId: satellites.value[0]?.id || 'SAT-USA-290',
  relaySatelliteId: relaySatellites.value[0]?.id || 'SAT-TDRS-13',
  groundStationId: groundStations.value[0]?.id || '',
  dataCenterId: dataCenters.value[0]?.id || '',
  dataRateMbps: 1200,
  latencyMs: 140,
  status: DataLinkStatus.ACTIVE,
  description: ''
})

/**
 * 提交表单组建空间数据传输全链路
 */
function handleCreate(): void {
  if (!form.name.trim()) {
    errorMessage.value = '请输入空间数据链路名称'
    return
  }
  if (!form.sourceSatelliteId) {
    errorMessage.value = '请选择链路源端空间卫星'
    return
  }
  if (form.topologyType === DataLinkTopologyType.RELAY && !form.relaySatelliteId) {
    errorMessage.value = '中继三跳拓扑必须指定中继卫星'
    return
  }
  if (!form.groundStationId) {
    errorMessage.value = '请指定地面测控与数据接收站'
    return
  }
  if (!form.dataCenterId) {
    errorMessage.value = '请指定后端汇聚情报数据中心'
    return
  }

  // 自动派生简明描述
  const srcSat = satellites.value.find((s) => s.id === form.sourceSatelliteId)?.name || form.sourceSatelliteId
  const gs = groundStations.value.find((g) => g.id === form.groundStationId)?.name || form.groundStationId
  const dc = dataCenters.value.find((d) => d.id === form.dataCenterId)?.name || form.dataCenterId
  const rly = form.topologyType === DataLinkTopologyType.RELAY
    ? satellites.value.find((s) => s.id === form.relaySatelliteId)?.name || form.relaySatelliteId
    : ''

  const defaultDesc = form.topologyType === DataLinkTopologyType.DIRECT
    ? `[直连两跳] ${srcSat} 高速下行 -> ${gs} 解调 -> 专用光网汇聚至 ${dc}。`
    : `[空间中继三跳] ${srcSat} 激光星间链路 -> ${rly} -> ${gs} 对地下行 -> ${dc}。`

  createDataLink({
    name: form.name.trim(),
    topologyType: form.topologyType,
    sourceSatelliteId: form.sourceSatelliteId,
    relaySatelliteId: form.topologyType === DataLinkTopologyType.RELAY ? form.relaySatelliteId : undefined,
    groundStationId: form.groundStationId,
    dataCenterId: form.dataCenterId,
    status: form.status,
    dataRateMbps: Number(form.dataRateMbps) || 1000,
    latencyMs: Number(form.latencyMs) || 120,
    description: form.description.trim() || defaultDesc
  })

  // 关闭对话框
  handleClose()
}

/**
 * 关闭并重置新建链路弹窗
 */
function handleClose(): void {
  errorMessage.value = ''
  isCreateDataLinkModalOpen.value = false
}
</script>

<template>
  <div
    v-if="isCreateDataLinkModalOpen"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fade-in"
    @click.self="handleClose"
  >
    <div
      class="relative w-full max-w-2xl bg-[#0c1322]/95 border border-purple-500/40 shadow-[0_0_30px_rgba(168,85,247,0.25)] rounded-lg flex flex-col max-h-[90vh] overflow-hidden text-slate-200 text-xs font-mono"
    >
      <!-- 模态框顶部标头 -->
      <div class="px-5 py-3.5 border-b border-purple-500/30 flex items-center justify-between bg-gradient-to-r from-purple-950/40 via-transparent to-transparent">
        <div class="flex items-center gap-2.5">
          <Share2 class="w-4 h-4 text-purple-400 animate-pulse" />
          <span class="text-sm font-bold tracking-wider text-purple-300">
            组建天基立体空间数据链路
          </span>
        </div>
        <button
          @click="handleClose"
          class="text-slate-400 hover:text-red-400 transition-colors p-1"
          title="关闭"
        >
          <X class="w-4 h-4" />
        </button>
      </div>

      <!-- 滚动表单主体 -->
      <div class="p-5 overflow-y-auto space-y-4 flex-1 custom-scrollbar">
        <!-- 错误提示横幅 -->
        <div
          v-if="errorMessage"
          class="flex items-center gap-2 px-3 py-2 bg-red-950/60 border border-red-500/50 rounded text-red-300 text-xs"
        >
          <AlertCircle class="w-4 h-4 text-red-400 shrink-0" />
          <span>{{ errorMessage }}</span>
        </div>

        <!-- 1. 链路名称与拓扑架构 -->
        <div class="bg-black/30 p-3.5 rounded border border-purple-900/40 space-y-3">
          <div class="text-[11px] font-bold text-purple-400 flex items-center gap-1.5 border-b border-purple-900/50 pb-1.5">
            <Share2 class="w-3.5 h-3.5" />
            <span>01 / 链路标识与传输拓扑架构</span>
          </div>

          <div>
            <label class="block text-slate-400 mb-1">数据链路全称 / 代号 <span class="text-red-400">*</span></label>
            <input
              v-model="form.name"
              type="text"
              placeholder="例如：WorldView-3 对地商遥快速下行侦察干线"
              class="w-full bg-[#070b14] border border-purple-900/60 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-purple-400 text-xs"
            />
          </div>

          <!-- 拓扑类型单选卡片 -->
          <div>
            <label class="block text-slate-400 mb-1.5">空间通信拓扑类型</label>
            <div class="grid grid-cols-2 gap-3">
              <div
                @click="form.topologyType = DataLinkTopologyType.DIRECT"
                class="p-2.5 rounded border cursor-pointer transition-all"
                :class="form.topologyType === DataLinkTopologyType.DIRECT ? 'bg-purple-950/30 border-purple-500 text-purple-200' : 'bg-[#070b14] border-purple-950 text-slate-400 hover:border-purple-900'"
              >
                <div class="font-bold flex items-center justify-between text-xs mb-1">
                  <span>直连对地下行链路 (两跳)</span>
                  <div
                    class="w-3.5 h-3.5 rounded-full border flex items-center justify-center"
                    :class="form.topologyType === DataLinkTopologyType.DIRECT ? 'border-purple-400 bg-purple-500' : 'border-slate-600'"
                  >
                    <div v-if="form.topologyType === DataLinkTopologyType.DIRECT" class="w-1.5 h-1.5 bg-black rounded-full"></div>
                  </div>
                </div>
                <div class="text-[10px] text-slate-400 leading-tight">
                  卫星过境直接向可视范围内地面站下传数据，再经专网转发至数据中心。
                </div>
              </div>

              <div
                @click="form.topologyType = DataLinkTopologyType.RELAY"
                class="p-2.5 rounded border cursor-pointer transition-all"
                :class="form.topologyType === DataLinkTopologyType.RELAY ? 'bg-purple-950/30 border-purple-500 text-purple-200' : 'bg-[#070b14] border-purple-950 text-slate-400 hover:border-purple-900'"
              >
                <div class="font-bold flex items-center justify-between text-xs mb-1">
                  <span>空间中继高速转发 (三跳)</span>
                  <div
                    class="w-3.5 h-3.5 rounded-full border flex items-center justify-center"
                    :class="form.topologyType === DataLinkTopologyType.RELAY ? 'border-purple-400 bg-purple-500' : 'border-slate-600'"
                  >
                    <div v-if="form.topologyType === DataLinkTopologyType.RELAY" class="w-1.5 h-1.5 bg-black rounded-full"></div>
                  </div>
                </div>
                <div class="text-[10px] text-slate-400 leading-tight">
                  卫星通过激光/Ka星间链路发送给GEO中继卫星，中继卫星常时对地下传，突破地面站可视弧段限制。
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 2. 节点路由拓扑配置 -->
        <div class="bg-black/30 p-3.5 rounded border border-purple-900/40 space-y-3">
          <div class="text-[11px] font-bold text-purple-400 flex items-center gap-1.5 border-b border-purple-900/50 pb-1.5">
            <Radio class="w-3.5 h-3.5" />
            <span>02 / 传输节点路由序列</span>
          </div>

          <!-- 拓扑流程可视化流向 -->
          <div class="p-2 rounded bg-[#070b14] border border-purple-950 flex items-center justify-between text-[11px]">
            <div class="flex items-center gap-1 text-cyan-300">
              <Zap class="w-3.5 h-3.5 text-cyan-400" />
              <span>源卫星</span>
            </div>
            <ArrowRight class="w-3 h-3 text-purple-500" />
            <template v-if="form.topologyType === DataLinkTopologyType.RELAY">
              <div class="flex items-center gap-1 text-indigo-300">
                <Zap class="w-3.5 h-3.5 text-indigo-400" />
                <span>中继星</span>
              </div>
              <ArrowRight class="w-3 h-3 text-purple-500" />
            </template>
            <div class="flex items-center gap-1 text-emerald-300">
              <Radio class="w-3.5 h-3.5 text-emerald-400" />
              <span>地面站</span>
            </div>
            <ArrowRight class="w-3 h-3 text-purple-500" />
            <div class="flex items-center gap-1 text-amber-300">
              <Server class="w-3.5 h-3.5 text-amber-400" />
              <span>数据中心</span>
            </div>
          </div>

          <!-- 下拉框选择节点 -->
          <div class="grid grid-cols-2 gap-3 pt-1">
            <!-- 源端卫星 -->
            <div>
              <label class="block text-slate-400 mb-1">1. 源端空间卫星 <span class="text-red-400">*</span></label>
              <select
                v-model="form.sourceSatelliteId"
                class="w-full bg-[#070b14] border border-purple-900/60 rounded px-2 py-1.5 text-slate-200 focus:outline-none focus:border-purple-400 text-xs"
              >
                <option v-for="sat in satellites" :key="sat.id" :value="sat.id">
                  {{ sat.name }} ({{ sat.id }})
                </option>
              </select>
            </div>

            <!-- 空间中继卫星 (仅三跳) -->
            <div v-if="form.topologyType === DataLinkTopologyType.RELAY">
              <label class="block text-slate-400 mb-1">2. 空间中继卫星 (GEO/中继星) <span class="text-red-400">*</span></label>
              <select
                v-model="form.relaySatelliteId"
                class="w-full bg-[#070b14] border border-purple-900/60 rounded px-2 py-1.5 text-slate-200 focus:outline-none focus:border-purple-400 text-xs"
              >
                <option v-for="sat in relaySatellites" :key="sat.id" :value="sat.id">
                  {{ sat.name }} ({{ sat.id }})
                </option>
              </select>
            </div>

            <!-- 地面测控站 -->
            <div>
              <label class="block text-slate-400 mb-1">
                {{ form.topologyType === DataLinkTopologyType.RELAY ? '3. 对地接收地面站' : '2. 对地接收地面站' }}
                <span class="text-red-400">*</span>
              </label>
              <select
                v-model="form.groundStationId"
                class="w-full bg-[#070b14] border border-purple-900/60 rounded px-2 py-1.5 text-slate-200 focus:outline-none focus:border-purple-400 text-xs"
              >
                <option v-if="groundStations.length === 0" value="" disabled>暂无可用地面站，请先录入</option>
                <option v-for="gs in groundStations" :key="gs.id" :value="gs.id">
                  {{ gs.name }} ({{ gs.country }})
                </option>
              </select>
            </div>

            <!-- 汇聚数据中心 -->
            <div>
              <label class="block text-slate-400 mb-1">
                {{ form.topologyType === DataLinkTopologyType.RELAY ? '4. 汇聚数据中心' : '3. 汇聚数据中心' }}
                <span class="text-red-400">*</span>
              </label>
              <select
                v-model="form.dataCenterId"
                class="w-full bg-[#070b14] border border-purple-900/60 rounded px-2 py-1.5 text-slate-200 focus:outline-none focus:border-purple-400 text-xs"
              >
                <option v-if="dataCenters.length === 0" value="" disabled>暂无可用数据中心，请先录入</option>
                <option v-for="dc in dataCenters" :key="dc.id" :value="dc.id">
                  {{ dc.name }} ({{ dc.country }})
                </option>
              </select>
            </div>
          </div>
        </div>

        <!-- 3. 通信质量与速率 -->
        <div class="bg-black/30 p-3.5 rounded border border-purple-900/40 space-y-3">
          <div class="text-[11px] font-bold text-purple-400 flex items-center gap-1.5 border-b border-purple-900/50 pb-1.5">
            <Zap class="w-3.5 h-3.5" />
            <span>03 / 传输速率与往返延迟</span>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-slate-400 mb-1">传输速率 (Mbps)</label>
              <input
                v-model.number="form.dataRateMbps"
                type="number"
                step="50"
                class="w-full bg-[#070b14] border border-purple-900/60 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-purple-400 text-xs"
              />
            </div>
            <div>
              <label class="block text-slate-400 mb-1">端到端时延 (毫秒 ms)</label>
              <input
                v-model.number="form.latencyMs"
                type="number"
                step="5"
                class="w-full bg-[#070b14] border border-purple-900/60 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-purple-400 text-xs"
              />
            </div>
          </div>
        </div>

        <!-- 4. 链路战术说明 -->
        <div class="bg-black/30 p-3.5 rounded border border-purple-900/40 space-y-2">
          <label class="block text-slate-400">链路战术价值与下行任务说明</label>
          <textarea
            v-model="form.description"
            rows="2"
            placeholder="说明该数据链路下传的高分辨率SAR雷达图像、光电侦察胶卷或军用加密遥测指令..."
            class="w-full bg-[#070b14] border border-purple-900/60 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-purple-400 text-xs resize-none"
          ></textarea>
        </div>
      </div>

      <!-- 底部操作按钮 -->
      <div class="px-5 py-3 border-t border-purple-500/30 flex items-center justify-end gap-3 bg-black/40">
        <button
          @click="handleClose"
          type="button"
          class="px-4 py-1.5 rounded border border-slate-700 hover:border-slate-500 text-slate-300 transition-colors"
        >
          取消
        </button>
        <button
          @click="handleCreate"
          type="button"
          class="px-5 py-1.5 rounded bg-purple-600 hover:bg-purple-500 text-white font-bold flex items-center gap-2 shadow-[0_0_15px_rgba(168,85,247,0.4)] transition-all"
        >
          <Check class="w-4 h-4" />
          <span>组建空间数据链路</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(168, 85, 247, 0.3);
  border-radius: 2px;
}
</style>
