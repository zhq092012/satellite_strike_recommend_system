# 卫星态势分析系统 (Satellite Situation Analysis System)

基于 **Vue 3 + TypeScript + Cesium + Tailwind CSS** 构建的现代空间卫星态势感知与分析推荐系统，采用硬核简洁的**军工战术 HUD 界面风格**。

---

## 核心特性

- **军工战术 HUD 界面风格 (Military Tactical HUD)**:
  - 深邃太空暗黑底色与低反差战术网格
  - 雷达荧光青 (`#00f0ff`)、在轨健康绿 (`#10b981`)、警报红 (`#ef4444`)
  - 战术折角（Corner Brackets）、微弱扫描线（Scanlines）、瞄准准星与十字标线
  - 军用时标（UTC/ZULU 协调世界时、北京时间、MET 仿真历元）与战备等级（DEFCON 1-5）
- **高保真 Cesium 三维地球视景**:
  - 空间三维球体交互、大气辉光、太阳光照晨昏线
  - 全球态势、亚太战区、北极俯视、印度洋域等多机位一键平滑跳转
  - 鼠标实时地理坐标（经度、纬度、相机高度）解算
- **全星系轨道推演与传感器覆盖分析**:
  - 覆盖低轨 (LEO)、中轨 (MEO)、地球静止轨道 (GEO) 等多种典型战术卫星（高分系列、遥感系列、尖兵预警、天链中继、北斗导航）
  - 开普勒轨道方程动力学外推（半长轴、偏心率、倾角、升交点赤经等）
  - 闭合空间轨道线、星下点垂直投影线与传感器地面覆盖圆锥/扫描视场
- **多功能战术 HUD 控制面板**:
  - **左侧目标库**：按轨道类型（LEO/MEO/GEO）、任务用途（侦察/预警/通信/导航）筛选，支持目标搜索与平滑镜头跟随
  - **右侧遥测面板**：开普勒轨道六根数高精展示、实时速度高度仪表、蓄电池荷电率 (SoC)、太阳能帆板功率、剩余推进剂及任务态势建议
  - **底部时态推演条**：推演播放/暂停、1x - 300x 多倍速推演、任务历元时钟与空间交会告警事件流水

---

## 技术栈

- **框架**: Vue 3 (Composition API, `<script setup lang="ts">`)
- **语言**: TypeScript (严格类型模式，包含详尽 TSDoc 注释)
- **空间渲染**: Cesium (`cesium` + `vite-plugin-cesium`)
- **样式方案**: Tailwind CSS v3 (军工调色板扩展与战术发光特效)
- **图标系统**: Lucide Vue Next (`lucide-vue-next`)
- **构建工具**: Vite

---

## 本地启动与构建

### 1. 安装依赖
```bash
npm install
```

### 2. 启动开发服务器
```bash
npm run dev
```
启动后访问终端提示的地址（通常为 `http://localhost:3000`）。

### 3. 项目打包构建
```bash
npm run build
```
编译产物将输出至 `dist/` 目录。
# satellite_strike_recommend_system
