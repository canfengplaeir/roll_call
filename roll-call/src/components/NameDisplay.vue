<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useMotion } from '@vueuse/motion';

const props = defineProps<{
  currentName: string;
  isRolling: boolean;
}>();

// 使用motion创建动画元素引用
const nameElement = ref(null);

// 配置动画
const nameMotion = useMotion(nameElement, {
  initial: {
    opacity: 0,
    scale: 0.8,
  },
  enter: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 500,
    },
  },
  rolling: {
    scale: [0.95, 1.05],
    opacity: 1,
    transition: {
      repeat: Infinity,
      duration: 200,
      repeatType: 'mirror',
    },
  },
  selected: {
    scale: [0.8, 1.3, 1],
    opacity: 1,
    transition: {
      duration: 800,
      ease: 'easeInOut',
    },
  },
});

// 监听滚动状态变化，应用不同的动画
watch(() => props.isRolling, (isRolling) => {
  if (isRolling) {
    nameMotion.apply('rolling');
  } else if (props.currentName) {
    nameMotion.apply('selected');
  }
});

// 监听名字变化，如果不是滚动中，应用淡入效果
watch(() => props.currentName, (newName) => {
  if (!props.isRolling && newName) {
    nameMotion.apply('enter');
  }
});

// 根据状态应用不同的颜色类
const nameClasses = computed(() => {
  return {
    'text-primary': !props.isRolling,
    'text-accent': props.isRolling,
  };
});

// 添加粒子效果
const particles = ref<Array<{ id: number; x: number; y: number; size: number; speed: number; opacity: number }>>([]);

const generateParticles = () => {
  particles.value = [];
  for (let i = 0; i < 50; i++) {
    particles.value.push({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 10 + 3,
      speed: Math.random() * 1 + 0.5,
      opacity: Math.random() * 0.5 + 0.3,
    });
  }
};

// 当名字被选中时生成粒子
watch(() => props.isRolling, (isRolling, wasRolling) => {
  if (wasRolling && !isRolling) {
    generateParticles();
    // 3秒后清除粒子
    setTimeout(() => {
      particles.value = [];
    }, 3000);
  }
});
</script>

<template>
  <div class="relative flex flex-col items-center justify-center py-20">
    <!-- 粒子效果 -->
    <div class="absolute inset-0 overflow-hidden pointer-events-none">
      <div
        v-for="particle in particles"
        :key="particle.id"
        class="absolute rounded-full bg-primary"
        :style="{
          left: `${particle.x}%`,
          top: `${particle.y}%`,
          width: `${particle.size}px`,
          height: `${particle.size}px`,
          opacity: particle.opacity,
          transform: `translateY(${particle.speed * 50}px)`,
          transition: `transform ${3000}ms ease-out, opacity ${3000}ms ease-out`,
        }"
      ></div>
    </div>
    
    <!-- 名字显示 -->
    <div ref="nameElement" class="text-center">
      <h3 class="text-lg font-medium mb-1">当前选中</h3>
      <div 
        class="text-6xl font-bold transition-colors duration-300"
        :class="nameClasses"
      >
        {{ currentName || '准备开始' }}
      </div>
    </div>
    
    <!-- 滚动状态指示器 -->
    <div v-if="isRolling" class="mt-8 flex items-center">
      <span class="loading loading-dots loading-lg text-accent"></span>
      <span class="ml-2 text-accent">正在选择...</span>
    </div>
  </div>
</template> 