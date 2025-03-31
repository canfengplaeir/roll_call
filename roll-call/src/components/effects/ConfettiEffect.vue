<template>
  <div 
    class="confetti-container" 
    :class="{ 'is-active': isActive }"
  >
    <canvas ref="canvasRef" class="confetti-canvas"></canvas>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';

const props = defineProps({
  isActive: {
    type: Boolean,
    default: false
  },
  particleCount: {
    type: Number,
    default: 150
  },
  duration: {
    type: Number,
    default: 3000
  }
});

const canvasRef = ref<HTMLCanvasElement | null>(null);
let ctx: CanvasRenderingContext2D | null = null;
let animationFrame: number | null = null;
let particles: Particle[] = [];
let startTime: number = 0;

// 粒子类
class Particle {
  x: number;
  y: number;
  size: number;
  color: string;
  speed: number;
  angle: number;
  tilt: number;
  tiltAngleIncrement: number;
  tiltAngle: number;
  gravity: number;
  rotation: number;
  shape: 'circle' | 'rect' | 'star';

  constructor(canvas: HTMLCanvasElement) {
    this.x = Math.random() * canvas.width;
    this.y = Math.random() * canvas.height / 2 - 100;
    this.size = (Math.random() * 12) + 5;
    this.speed = (Math.random() * 5) + 2;
    this.angle = Math.random() * Math.PI * 2;
    this.tilt = 0;
    this.tiltAngleIncrement = Math.random() * 0.1 + 0.05;
    this.tiltAngle = 0;
    this.gravity = 0.1;
    this.rotation = Math.random() * 360;
    
    // 随机形状
    const shapes = ['circle', 'rect', 'star'] as const;
    this.shape = shapes[Math.floor(Math.random() * shapes.length)];
    
    // 随机颜色
    const colors = [
      '#FF5252', // 红色
      '#FFD740', // 黄色
      '#64FFDA', // 青色
      '#448AFF', // 蓝色
      '#B388FF', // 紫色
      '#69F0AE', // 绿色
      '#FF80AB'  // 粉色
    ];
    this.color = colors[Math.floor(Math.random() * colors.length)];
  }

  update() {
    this.tiltAngle += this.tiltAngleIncrement;
    this.tilt = Math.sin(this.tiltAngle) * 15;
    this.y += this.speed;
    this.x += Math.sin(this.angle) * 2;
    this.rotation += 2;
    this.speed += this.gravity;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation * Math.PI / 180);
    ctx.fillStyle = this.color;
    
    switch (this.shape) {
      case 'circle':
        ctx.beginPath();
        ctx.arc(0, 0, this.size, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'rect':
        ctx.fillRect(-this.size/2, -this.size/2, this.size, this.size);
        break;
      case 'star':
        this.drawStar(ctx, 0, 0, 5, this.size/2, this.size/4);
        break;
    }
    
    ctx.restore();
  }
  
  // 绘制星形
  drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, spikes: number, outerRadius: number, innerRadius: number) {
    let rot = Math.PI / 2 * 3;
    let x = cx;
    let y = cy;
    let step = Math.PI / spikes;

    ctx.beginPath();
    ctx.moveTo(cx, cy - outerRadius);
    
    for(let i = 0; i < spikes; i++) {
      x = cx + Math.cos(rot) * outerRadius;
      y = cy + Math.sin(rot) * outerRadius;
      ctx.lineTo(x, y);
      rot += step;

      x = cx + Math.cos(rot) * innerRadius;
      y = cy + Math.sin(rot) * innerRadius;
      ctx.lineTo(x, y);
      rot += step;
    }
    
    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();
    ctx.fill();
  }
}

// 创建粒子
const createParticles = () => {
  if (!canvasRef.value) return;
  
  particles = [];
  for (let i = 0; i < props.particleCount; i++) {
    particles.push(new Particle(canvasRef.value));
  }
};

// 重置画布尺寸
const resizeCanvas = () => {
  if (!canvasRef.value) return;
  
  const canvas = canvasRef.value;
  const container = canvas.parentElement;
  
  if (container) {
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
  }
};

// 动画循环
const animate = (timestamp: number) => {
  if (!ctx || !canvasRef.value) return;
  
  // 检查是否超过持续时间
  if (props.isActive && timestamp - startTime > props.duration) {
    stopConfetti();
    return;
  }
  
  // 清空画布
  ctx.clearRect(0, 0, canvasRef.value.width, canvasRef.value.height);
  
  // 更新并绘制粒子
  for (let i = 0; i < particles.length; i++) {
    particles[i].update();
    particles[i].draw(ctx);
  }
  
  // 继续动画
  if (props.isActive) {
    animationFrame = requestAnimationFrame(animate);
  }
};

// 开始礼花效果
const startConfetti = () => {
  if (!canvasRef.value) return;
  
  // 停止可能的现有动画
  stopConfetti();
  
  // 获取绘图上下文
  ctx = canvasRef.value.getContext('2d');
  if (!ctx) return;
  
  // 调整画布大小
  resizeCanvas();
  
  // 创建粒子
  createParticles();
  
  // 记录开始时间
  startTime = performance.now();
  
  // 开始动画
  animationFrame = requestAnimationFrame(animate);
};

// 停止礼花效果
const stopConfetti = () => {
  if (animationFrame !== null) {
    cancelAnimationFrame(animationFrame);
    animationFrame = null;
  }
  
  // 清空画布
  if (ctx && canvasRef.value) {
    ctx.clearRect(0, 0, canvasRef.value.width, canvasRef.value.height);
  }
  
  particles = [];
};

// 监听活动状态变化
watch(() => props.isActive, (newValue) => {
  if (newValue) {
    startConfetti();
  } else {
    stopConfetti();
  }
});

// 组件挂载和卸载时的处理
onMounted(() => {
  window.addEventListener('resize', resizeCanvas);
  
  if (props.isActive) {
    startConfetti();
  }
});

onUnmounted(() => {
  window.removeEventListener('resize', resizeCanvas);
  stopConfetti();
});
</script>

<style scoped>
.confetti-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 20;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.is-active {
  opacity: 1;
}

.confetti-canvas {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}
</style> 