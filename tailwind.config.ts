import type { Config } from 'tailwindcss'

/**
 * Tailwind CSS 军工战术风格配置
 * 定制深色战术底色、荧光雷达与告警色彩、战术 HUD 边框发光等效果
 */
const config: Config = {
  content: [
    './index.html',
    './src/**/*.{vue,js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        /** 战术主题色系定义 */
        tactical: {
          /** 系统深邃战术暗黑背景色 */
          bg: '#070b14',
          /** 半透明 HUD 控制面板背景底色 */
          panel: 'rgba(12, 19, 34, 0.85)',
          /** 实色面板背景色 */
          'panel-solid': '#0c1322',
          /** 战术线条与网格边框色 */
          border: '#1d2b45',
          /** 高亮边框青光色 */
          'border-highlight': '#00f0ff',
          /** 战术雷达青（核心主色，用于遥测读数、高亮状态） */
          cyan: '#00f0ff',
          /** 战术电光蓝 */
          blue: '#38bdf8',
          /** 战术健康指示绿（在轨正常、通讯健康） */
          green: '#10b981',
          /** 战术预警指示橙（轨道交会预警、接近极限） */
          amber: '#f59e0b',
          /** 战术危险指示红（碰撞威胁、设备故障） */
          red: '#ef4444',
          /** 战术高亮文字白 */
          text: '#f1f5f9',
          /** 战术次要/遥测说明文本灰色 */
          muted: '#94a3b8',
          /** 战术深灰网格修饰色 */
          dark: '#0f172a'
        }
      },
      fontFamily: {
        /** 战术科技等宽字体栈，用于坐标、时间、六根数等精密遥测数据 */
        mono: [
          'SFMono-Regular',
          'Menlo',
          'Monaco',
          'Consolas',
          '"Liberation Mono"',
          '"Courier New"',
          'monospace'
        ],
        /** 战术界面主要正文字体栈 */
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'sans-serif'
        ]
      },
      boxShadow: {
        /** 战术青色荧光发光投影 */
        'glow-cyan': '0 0 15px rgba(0, 240, 255, 0.35)',
        /** 战术绿色荧光发光投影 */
        'glow-green': '0 0 15px rgba(16, 185, 129, 0.35)',
        /** 战术红色紧急告警投影 */
        'glow-red': '0 0 15px rgba(239, 68, 68, 0.45)',
        /** 战术 HUD 面板立体阴影 */
        'tactical-panel': '0 8px 32px 0 rgba(0, 0, 0, 0.5)'
      }
    },
  },
  plugins: [],
}

export default config
