<script setup lang="ts">
import { computed } from 'vue';

interface Config {
  mode: 'sequential' | 'random';
  randomAlgorithm: 'normal' | 'noise' | 'time';
  speechEnabled: boolean;
  speechRate: number;
  speechPitch: number;
}

const props = defineProps<{
  config: Config;
  hasNames: boolean;
  isRolling: boolean;
}>();

const emit = defineEmits<{
  (e: 'start-rolling'): void;
  (e: 'stop-rolling'): void;
  (e: 'clear-names'): void;
}>();

// 计算属性：控制按钮文本
const rollButtonText = computed(() => {
  if (!props.hasNames) return '请先上传名单';
  if (props.isRolling) return '停止抽取';
  return '开始抽取';
});

// 启动/停止抽取
const toggleRolling = () => {
  if (!props.hasNames) return;
  
  if (props.isRolling) {
    emit('stop-rolling');
  } else {
    emit('start-rolling');
  }
};

// 重置名单
const clearNames = () => {
  if (props.hasNames && !props.isRolling) {
    emit('clear-names');
  }
};
</script>

<template>
  <div class="mt-8">
    <!-- 操作按钮 -->
    <div class="flex flex-col sm:flex-row gap-4">
      <button 
        class="btn btn-primary btn-lg flex-1"
        :class="{ 'btn-disabled': !hasNames }"
        @click="toggleRolling"
      >
        <span v-if="isRolling" class="loading loading-spinner"></span>
        {{ rollButtonText }}
      </button>
      
      <button 
        v-if="hasNames"
        class="btn btn-outline btn-lg"
        :class="{ 'btn-disabled': isRolling }"
        @click="clearNames"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
        重置名单
      </button>
    </div>
  </div>
</template> 