<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue';

const props = defineProps({
  isActive: {
    type: Boolean,
    default: false
  },
  maxBubbles: {
    type: Number,
    default: 25
  }
});

interface Bubble {
  id: number;
  x: number;
  size: number;
  duration: number;
  delay: number;
  opacity: number;
}

const bubbles = ref<Bubble[]>([]);
let bubbleInterval: number | null = null;
let bubbleId = 0;

// 创建单个气泡
const createBubble = () => {
  const size = Math.random() * 30 + 10; // 10-40px
  const x = Math.random() * 100; // 0-100%
  const duration = Math.random() * 3 + 4; // 4-7秒
  const delay = Math.random() * 2; // 0-2秒
  const opacity = Math.random() * 0.3 + 0.1; // 0.1-0.4

  bubbles.value.push({
    id: bubbleId++,
    x,
    size,
    duration,
    delay,
    opacity
  });

  // 当气泡数量超过最大值时，移除最早的气泡
  if (bubbles.value.length > props.maxBubbles) {
    bubbles.value.shift();
  }
};

// 开始生成气泡
const startBubbles = () => {
  if (bubbleInterval !== null) return;
  
  // 初始创建一批气泡
  for (let i = 0; i < Math.min(10, props.maxBubbles); i++) {
    createBubble();
  }
  
  // 每隔一段时间创建新气泡
  bubbleInterval = window.setInterval(() => {
    if (props.isActive) {
      createBubble();
    }
  }, 300);
};

// 停止生成气泡
const stopBubbles = () => {
  if (bubbleInterval !== null) {
    clearInterval(bubbleInterval);
    bubbleInterval = null;
  }
  bubbles.value = [];
};

// 监听活动状态变化
watch(() => props.isActive, (newValue) => {
  if (newValue) {
    startBubbles();
  } else {
    stopBubbles();
  }
}, { immediate: true });

// 组件挂载和卸载时的处理
onMounted(() => {
  if (props.isActive) {
    startBubbles();
  }
});

onUnmounted(() => {
  stopBubbles();
});
</script>

<template>
  <div 
    class="bubble-container" 
    :class="{ 'is-active': isActive }"
  >
    <div 
      v-for="bubble in bubbles" 
      :key="bubble.id" 
      class="bubble"
      :style="{
        left: `${bubble.x}%`,
        width: `${bubble.size}px`,
        height: `${bubble.size}px`,
        animationDuration: `${bubble.duration}s`,
        animationDelay: `${bubble.delay}s`,
        opacity: bubble.opacity
      }"
    ></div>
  </div>
</template>

<style scoped>
.bubble-container {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 10;
  overflow: hidden;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.is-active {
  opacity: 1;
}

.bubble {
  position: absolute;
  bottom: -50px;
  border-radius: 50%;
  background: radial-gradient(
    circle at 30% 30%, 
    rgba(var(--p), 0.6) 0%, 
    rgba(var(--p), 0.2) 60%, 
    rgba(var(--p), 0) 100%
  );
  transform: translateZ(0);
  will-change: transform;
  animation: bubble-rise cubic-bezier(0.4, 0, 0.6, 1) forwards;
}

@keyframes bubble-rise {
  0% {
    transform: translateY(0) scale(0.8);
    opacity: 0;
  }
  10% {
    opacity: 1;
  }
  30% {
    transform: translateY(-30%) scale(1) translateX(-10px);
  }
  50% {
    transform: translateY(-50%) scale(1.1) translateX(10px);
  }
  75% {
    transform: translateY(-75%) scale(1) translateX(-5px);
    opacity: 0.8;
  }
  100% {
    transform: translateY(-100%) scale(0.8) translateX(0);
    opacity: 0;
  }
}
</style> 