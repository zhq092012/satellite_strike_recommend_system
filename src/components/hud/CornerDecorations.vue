<script setup lang="ts">
/**
 * @fileoverview 军工战术 HUD 边角装饰与刻度标尺组件
 * 渲染战术边角折括号、瞄准十字线、装甲刻度条与系统状态流水指示
 */
</script>

<template>
  <div class="pointer-events-none absolute inset-0 z-10 overflow-hidden select-none">
    <!-- 左上角战术标尺折角 -->
    <div class="absolute top-3 left-3 w-16 h-16 border-t-2 border-l-2 border-tactical-cyan/70">
      <div class="absolute top-1 left-1 font-mono text-[9px] text-tactical-cyan/60 tracking-widest">
        SYS//01
      </div>
      <div class="absolute top-0 left-6 w-8 h-[1px] bg-tactical-cyan/40"></div>
      <div class="absolute top-6 left-0 w-[1px] h-8 bg-tactical-cyan/40"></div>
    </div>

    <!-- 右上角战术标尺折角 -->
    <div class="absolute top-3 right-3 w-16 h-16 border-t-2 border-r-2 border-tactical-cyan/70">
      <div class="absolute top-1 right-1 font-mono text-[9px] text-tactical-cyan/60 tracking-widest text-right">
        TAC//SEC
      </div>
      <div class="absolute top-0 right-6 w-8 h-[1px] bg-tactical-cyan/40"></div>
      <div class="absolute top-6 right-0 w-[1px] h-8 bg-tactical-cyan/40"></div>
    </div>

    <!-- 左下角战术标尺折角 -->
    <div class="absolute bottom-3 left-3 w-16 h-16 border-b-2 border-l-2 border-tactical-cyan/70">
      <div class="absolute bottom-1 left-1 font-mono text-[9px] text-tactical-cyan/60 tracking-widest">
        GRID//24
      </div>
      <div class="absolute bottom-0 left-6 w-8 h-[1px] bg-tactical-cyan/40"></div>
      <div class="absolute bottom-6 left-0 w-[1px] h-8 bg-tactical-cyan/40"></div>
    </div>

    <!-- 右下角战术标尺折角 -->
    <div class="absolute bottom-3 right-3 w-16 h-16 border-b-2 border-r-2 border-tactical-cyan/70">
      <div class="absolute bottom-1 right-1 font-mono text-[9px] text-tactical-cyan/60 tracking-widest text-right">
        DEF//OK
      </div>
      <div class="absolute bottom-0 right-6 w-8 h-[1px] bg-tactical-cyan/40"></div>
      <div class="absolute bottom-6 right-0 w-[1px] h-8 bg-tactical-cyan/40"></div>
    </div>

    <!-- 屏幕正中心微弱战术准星 -->
    <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 opacity-25">
      <div class="absolute top-1/2 left-0 w-2.5 h-[1px] bg-tactical-cyan -translate-y-1/2"></div>
      <div class="absolute top-1/2 right-0 w-2.5 h-[1px] bg-tactical-cyan -translate-y-1/2"></div>
      <div class="absolute top-0 left-1/2 h-2.5 w-[1px] bg-tactical-cyan -translate-x-1/2"></div>
      <div class="absolute bottom-0 left-1/2 h-2.5 w-[1px] bg-tactical-cyan -translate-x-1/2"></div>
      <div class="absolute top-1/2 left-1/2 w-1.5 h-1.5 border border-tactical-cyan rounded-full -translate-x-1/2 -translate-y-1/2"></div>
    </div>
  </div>
</template>
