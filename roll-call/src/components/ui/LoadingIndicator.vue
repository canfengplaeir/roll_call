<template>
  <div 
    class="loading-indicator"
    :class="{'is-active': active}"
  >
    <div class="loading-spinner">
      <div class="dots-wrapper">
        <div class="dot" v-for="n in 3" :key="n" :style="{ animationDelay: `${(n-1) * 0.15}s` }"></div>
      </div>
      <div v-if="text" class="loading-text">{{ text }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps({
  active: {
    type: Boolean,
    default: true
  },
  text: {
    type: String,
    default: ''
  }
});
</script>

<style scoped>
.loading-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
  background-color: rgba(var(--b1), 0.7);
  backdrop-filter: blur(2px);
  opacity: 0;
  transition: opacity 0.3s ease;
  pointer-events: none;
  z-index: 50;
}

.is-active {
  opacity: 1;
  pointer-events: auto;
}

.loading-spinner {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: rgba(var(--b2), 0.8);
  border-radius: 1rem;
  padding: 1.5rem 2rem;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(var(--p), 0.1);
  transform: translateY(10px);
  animation: slide-up 0.5s ease forwards;
}

.dots-wrapper {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.dot {
  width: 0.75rem;
  height: 0.75rem;
  border-radius: 50%;
  background-color: rgba(var(--p), 1);
  animation: dot-bounce 1.4s ease-in-out infinite;
}

.loading-text {
  color: rgba(var(--bc), 0.8);
  font-size: 0.875rem;
  margin-top: 0.5rem;
  text-align: center;
}

@keyframes dot-bounce {
  0%, 80%, 100% { 
    transform: scale(0.6);
    opacity: 0.6;
  }
  40% { 
    transform: scale(1);
    opacity: 1;
  }
}

@keyframes slide-up {
  from { 
    transform: translateY(10px);
    opacity: 0;
  }
  to { 
    transform: translateY(0);
    opacity: 1;
  }
}
</style> 