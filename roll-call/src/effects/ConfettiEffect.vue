<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';

interface ConfettiPiece {
  id: number;
  x: number;
  y: number;
  size: number;
  rotation: number;
  color: string;
  speed: number;
  rotationSpeed: number;
  horizontalSpeed: number;
}

const props = defineProps<{
  isActive: boolean;
}>();

const pieces = ref<ConfettiPiece[]>([]);
const colors = ['#f94144', '#f3722c', '#f8961e', '#f9c74f', '#90be6d', '#43aa8b', '#577590'];

// 生成随机庆祝碎片
const generatePieces = (count = 100) => {
  const newPieces: ConfettiPiece[] = [];
  
  for (let i = 0; i < count; i++) {
    newPieces.push({
      id: Date.now() + i,
      x: 50 + (Math.random() - 0.5) * 30, // 中心位置±15%
      y: 40 + (Math.random() - 0.5) * 20, // 中心位置±10%
      size: 5 + Math.random() * 10, // 大小5-15px
      rotation: Math.random() * 360, // 初始旋转角度
      color: colors[Math.floor(Math.random() * colors.length)], // 随机颜色
      speed: 1 + Math.random() * 2, // 下落速度
      rotationSpeed: (Math.random() - 0.5) * 10, // 旋转速度
      horizontalSpeed: (Math.random() - 0.5) * 2, // 水平漂移速度
    });
  }
  
  pieces.value = newPieces;
};

// 监听激活状态
watch(() => props.isActive, (isActive) => {
  if (isActive) {
    generatePieces();
  } else {
    pieces.value = [];
  }
});

// 组件挂载时检查是否需要激活
onMounted(() => {
  if (props.isActive) {
    generatePieces();
  }
});
</script>

<template>
  <div class="absolute inset-0 pointer-events-none overflow-hidden z-10">
    <div 
      v-for="piece in pieces" 
      :key="piece.id"
      class="absolute confetti-piece"
      :style="{
        left: `${piece.x}%`,
        top: `${piece.y}%`,
        width: `${piece.size}px`,
        height: `${piece.size * 0.4}px`,
        backgroundColor: piece.color,
        transform: `rotate(${piece.rotation}deg)`,
        '--fall-speed': `${piece.speed}s`,
        '--rotation-speed': `${piece.rotationSpeed}deg`,
        '--horizontal-speed': `${piece.horizontalSpeed}px`,
      }"
    />
  </div>
</template>

<style scoped>
.confetti-piece {
  position: absolute;
  animation: fall 3s ease-in forwards;
  will-change: transform, opacity;
  opacity: 0.9;
}

@keyframes fall {
  0% {
    transform: translateY(0) translateX(0) rotate(var(--rotation-speed));
    opacity: 1;
  }
  50% {
    opacity: 1;
  }
  100% {
    transform: 
      translateY(60vh) 
      translateX(calc(var(--horizontal-speed) * 30px)) 
      rotate(calc(var(--rotation-speed) * 20));
    opacity: 0;
  }
}
</style> 