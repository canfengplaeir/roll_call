/** @type {import('tailwindcss').Config} */
import daisyui from 'daisyui';

export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [daisyui],
  daisyui: {
    themes: [
      {
        light: {
          "primary": "#3b82f6",  // 更清新的蓝色
          "secondary": "#8b5cf6", // 紫色
          "accent": "#10b981",   // 绿色
          "neutral": "#334155",   // 深灰色
          "base-100": "#f8fafc",  // 浅灰白
          "info": "#3b82f6",
          "success": "#10b981",
          "warning": "#f59e0b",
          "error": "#ef4444",
        },
        dark: {
          "primary": "#60a5fa",  // 亮蓝色
          "secondary": "#a78bfa", // 浅紫色
          "accent": "#34d399",    // 亮绿色
          "neutral": "#1e293b",   // 深蓝灰
          "base-100": "#0f172a",  // 深蓝黑
          "info": "#60a5fa",
          "success": "#34d399",
          "warning": "#fbbf24",
          "error": "#f87171",
        }
      }
    ],
    darkTheme: "dark",
  },
}

