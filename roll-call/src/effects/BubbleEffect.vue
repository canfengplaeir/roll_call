<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';

interface Bubble {
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
  sway: number; // 摇摆幅度
  blur: number; // 模糊程度
  opacity: number; // 透明度
}

const props = defineProps<{
  isActive: boolean;
}>();

const bubbles = ref<Bubble[]>([]);

// 生成随机位置和大小
const generateBubble = (): Bubble => {
  return {
    x: Math.random() * 100, // 0-100%
    y: 100 + Math.random() * 20, // 100-120%
    size: 20 + Math.random() * 40, // 增大气泡尺寸
    duration: 3 + Math.random() * 2, // 缩短动画时间
    delay: Math.random() * 1, // 缩短延迟
    sway: 5 + Math.random() * 10, // 5-15px的摇摆幅度
    blur: 0.5 + Math.random() * 1.5, // 0.5-2px的模糊程度
    opacity: 0.4 + Math.random() * 0.4, // 增加透明度
  };
};

// 创建气泡
const createBubble = () => {
  if (!props.isActive) return;
  
  const bubble = generateBubble();
  bubbles.value.push(bubble);
  
  // 动画结束后移除气泡
  setTimeout(() => {
    bubbles.value = bubbles.value.filter(b => b !== bubble);
  }, bubble.duration * 1000);
};

// 定期创建新气泡
let interval: number | null = null;

onMounted(() => {
  if (props.isActive) {
    interval = window.setInterval(createBubble, 200); // 更频繁地生成气泡
  }
});

onUnmounted(() => {
  if (interval) {
    clearInterval(interval);
  }
});

// 监听isActive变化
watch(() => props.isActive, (newValue: boolean) => {
  if (newValue) {
    interval = window.setInterval(createBubble, 200);
  } else {
    if (interval) {
      clearInterval(interval);
      interval = null;
    }
    bubbles.value = [];
  }
});
</script>

<template>
  <div class="fixed inset-0 pointer-events-none overflow-hidden z-0">
    <div 
      v-for="(bubble, index) in bubbles" 
      :key="index"
      class="absolute rounded-full bg-primary/30 bubble"
      :style="{
        left: `${bubble.x}%`,
        bottom: `${bubble.y}%`,
        width: `${bubble.size}px`,
        height: `${bubble.size}px`,
        animation: `bubble ${bubble.duration}s ease-out ${bubble.delay}s forwards,
                   sway ${bubble.duration * 0.8}s ease-in-out infinite alternate`,
        filter: `blur(${bubble.blur}px)`,
        opacity: bubble.opacity,
        '--sway': `${bubble.sway}px`,
      }"
    />
  </div>
</template>

<style scoped>
@keyframes bubble {
  0% {
    opacity: 0;
    transform: scale(0) translateY(0);
  }
  15% {
    opacity: 0.8;
    transform: scale(1) translateY(0);
  }
  100% {
    opacity: 0;
    transform: scale(1.2) translateY(-100vh);
  }
}

@keyframes sway {
  0% {
    transform: translateX(0) translateY(0);
  }
  100% {
    transform: translateX(var(--sway)) translateY(0);
  }
}

.bubble {
  will-change: transform, opacity;
}

.bubble:nth-child(odd) {
  animation-direction: alternate-reverse;
}
</style> 