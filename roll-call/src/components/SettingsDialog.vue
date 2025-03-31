<script setup lang="ts">
interface Config {
  mode: 'sequential' | 'random';
  randomAlgorithm: 'normal' | 'noise' | 'time';
  speechEnabled: boolean;
  speechRate: number;
  speechPitch: number;
}

defineProps<{
  config: Config;
  isOpen: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:isOpen', value: boolean): void;
  (e: 'update-config', config: Partial<Config>): void;
}>();

// 更新模式
const updateMode = (mode: 'sequential' | 'random') => {
  emit('update-config', { mode });
};

// 更新随机算法
const updateRandomAlgorithm = (algorithm: 'normal' | 'noise' | 'time') => {
  emit('update-config', { randomAlgorithm: algorithm });
};

// 更新语音设置
const updateSpeechEnabled = (enabled: boolean) => {
  emit('update-config', { speechEnabled: enabled });
};

// 更新语音速率
const updateSpeechRate = (e: Event) => {
  const target = e.target as HTMLInputElement;
  if (target && target.value) {
    emit('update-config', { speechRate: parseFloat(target.value) });
  }
};

// 更新语音音调
const updateSpeechPitch = (e: Event) => {
  const target = e.target as HTMLInputElement;
  if (target && target.value) {
    emit('update-config', { speechPitch: parseFloat(target.value) });
  }
};
</script>

<template>
  <dialog :class="['modal', { 'modal-open': isOpen }]">
    <div class="modal-box max-w-2xl">
      <div class="flex justify-between items-center mb-6">
        <div>
          <h3 class="font-bold text-2xl">设置</h3>
          <p class="text-sm text-base-content/70">自定义点名器的各项功能</p>
        </div>
        <button class="btn btn-sm btn-circle btn-ghost" @click="emit('update:isOpen', false)">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      <!-- 模式选择 -->
      <div class="card bg-base-200 mb-6">
        <div class="card-body">
          <h4 class="card-title text-lg">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            抽取模式
          </h4>
          <p class="text-sm text-base-content/70 mb-4">选择点名的方式</p>
          <div class="tabs tabs-boxed bg-base-100">
            <a 
              class="tab tab-lg flex-1"
              :class="{ 'tab-active': config.mode === 'sequential' }"
              @click="updateMode('sequential')"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              顺序模式
            </a>
            <a 
              class="tab tab-lg flex-1"
              :class="{ 'tab-active': config.mode === 'random' }"
              @click="updateMode('random')"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              随机模式
            </a>
          </div>
        </div>
      </div>
      
      <!-- 随机算法选择 -->
      <div v-if="config.mode === 'random'" class="card bg-base-200 mb-6">
        <div class="card-body">
          <h4 class="card-title text-lg">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            随机算法
          </h4>
          <p class="text-sm text-base-content/70 mb-4">选择随机数生成的方式</p>
          <div class="flex flex-col gap-4">
            <label class="label cursor-pointer justify-start gap-4 p-4 bg-base-100 rounded-lg hover:bg-base-200 transition-colors">
              <input 
                type="radio" 
                name="algorithm" 
                class="radio radio-primary" 
                :checked="config.randomAlgorithm === 'normal'"
                @change="updateRandomAlgorithm('normal')"
              />
              <div class="flex-1">
                <span class="label-text font-medium">普通随机</span>
                <p class="text-sm text-base-content/60">使用Crypto API生成高质量随机数</p>
              </div>
            </label>
            
            <label class="label cursor-pointer justify-start gap-4 p-4 bg-base-100 rounded-lg hover:bg-base-200 transition-colors">
              <input 
                type="radio" 
                name="algorithm" 
                class="radio radio-primary" 
                :checked="config.randomAlgorithm === 'noise'"
                @change="updateRandomAlgorithm('noise')"
              />
              <div class="flex-1">
                <span class="label-text font-medium">噪声随机</span>
                <p class="text-sm text-base-content/60">通过环境噪音生成随机种子（需要麦克风权限）</p>
              </div>
            </label>
            
            <label class="label cursor-pointer justify-start gap-4 p-4 bg-base-100 rounded-lg hover:bg-base-200 transition-colors">
              <input 
                type="radio" 
                name="algorithm" 
                class="radio radio-primary" 
                :checked="config.randomAlgorithm === 'time'"
                @change="updateRandomAlgorithm('time')"
              />
              <div class="flex-1">
                <span class="label-text font-medium">时间随机</span>
                <p class="text-sm text-base-content/60">基于当前时间的高精度时间戳生成随机数</p>
              </div>
            </label>
          </div>
        </div>
      </div>
      
      <!-- 语音设置 -->
      <div class="card bg-base-200">
        <div class="card-body">
          <h4 class="card-title text-lg flex justify-between items-center">
            <div class="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
              语音设置
            </div>
            <input 
              type="checkbox" 
              class="toggle toggle-primary" 
              :checked="config.speechEnabled"
              @change="updateSpeechEnabled(!config.speechEnabled)" 
            />
          </h4>
          <p class="text-sm text-base-content/70 mb-4">配置语音播报的相关选项</p>
          
          <div v-if="config.speechEnabled" class="space-y-6 mt-4">
            <!-- 语音速率设置 -->
            <div>
              <label class="label">
                <span class="label-text font-medium">语速：{{ config.speechRate.toFixed(1) }}</span>
              </label>
              <input 
                type="range" 
                min="0.1" 
                max="2" 
                step="0.1" 
                class="range range-primary" 
                :value="config.speechRate"
                @input="updateSpeechRate($event)" 
              />
              <div class="flex justify-between text-xs px-2 mt-1">
                <span>慢</span>
                <span>适中</span>
                <span>快</span>
              </div>
            </div>
            
            <!-- 语音音调设置 -->
            <div>
              <label class="label">
                <span class="label-text font-medium">音调：{{ config.speechPitch.toFixed(1) }}</span>
              </label>
              <input 
                type="range" 
                min="0.1" 
                max="2" 
                step="0.1" 
                class="range range-primary" 
                :value="config.speechPitch"
                @input="updateSpeechPitch($event)" 
              />
              <div class="flex justify-between text-xs px-2 mt-1">
                <span>低</span>
                <span>适中</span>
                <span>高</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </dialog>
</template> 