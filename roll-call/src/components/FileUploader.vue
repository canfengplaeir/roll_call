<script setup lang="ts">
import { ref } from 'vue';

const emit = defineEmits<{
  (e: 'names-loaded', names: string[], name: string): void
}>();

const isDragging = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);
const error = ref<string | null>(null);
const listName = ref('');
const isLoading = ref(false);

// 处理拖拽事件
const onDragEnter = (e: DragEvent) => {
  e.preventDefault();
  isDragging.value = true;
};

const onDragLeave = (e: DragEvent) => {
  e.preventDefault();
  isDragging.value = false;
};

const onDragOver = (e: DragEvent) => {
  e.preventDefault();
};

const onDrop = async (e: DragEvent) => {
  e.preventDefault();
  isDragging.value = false;
  
  if (!e.dataTransfer?.files.length) return;
  
  await processFile(e.dataTransfer.files[0]);
};

// 处理文件选择
const onFileSelected = async (e: Event) => {
  const target = e.target as HTMLInputElement;
  if (!target.files?.length) return;
  
  await processFile(target.files[0]);
};

// 验证并解析名单
const validateAndParseName = (content: string): string[] => {
  // 按行分割并过滤空行
  const lines = content
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);
  
  if (lines.length === 0) {
    throw new Error('文件内容为空');
  }
  
  return lines;
};

// 处理文件解析
const processFile = async (file: File) => {
  error.value = null;
  isLoading.value = true;
  
  try {
    // 文件类型验证
    if (file.type !== 'text/plain' && !file.name.endsWith('.txt')) {
      error.value = '请上传TXT文本文件';
      return;
    }
    
    // 读取并处理文件内容
    const content = await file.text();
    const lines = validateAndParseName(content);
    
    // 设置名单名称 - 如果用户没有输入，使用文件名
    const name = listName.value || file.name.replace('.txt', '');
    
    // 发送事件
    emit('names-loaded', lines, name);
  } catch (err) {
    error.value = err instanceof Error ? err.message : '文件读取错误';
    console.error(err);
  } finally {
    isLoading.value = false;
  }
};

// 点击上传框触发文件选择
const triggerFileSelect = () => {
  fileInput.value?.click();
};

// 手动输入名单
const manualNames = ref('');

const handleManualInput = () => {
  error.value = null;
  
  try {
    if (!manualNames.value.trim()) {
      error.value = '请输入至少一个名字';
      return;
    }
    
    const names = validateAndParseName(manualNames.value);
    emit('names-loaded', names, listName.value || '手动输入名单');
  } catch (err) {
    error.value = err instanceof Error ? err.message : '名单解析错误';
  }
};
</script>

<template>
  <div class="flex flex-col items-center">
    <h2 class="text-2xl font-bold mb-4">上传名单</h2>
    
    <!-- 名单名称输入 -->
    <div class="w-full mb-4">
      <label class="label">
        <span class="label-text">名单名称</span>
      </label>
      <input
        v-model="listName"
        type="text"
        class="input input-bordered w-full"
        placeholder="输入名单名称（可选）"
      />
    </div>
    
    <!-- 文件拖拽区域 -->
    <div
      @dragenter="onDragEnter"
      @dragleave="onDragLeave"
      @dragover="onDragOver"
      @drop="onDrop"
      @click="triggerFileSelect"
      class="w-full p-10 border-2 border-dashed rounded-lg cursor-pointer transition-all duration-300 text-center"
      :class="[
        isDragging 
          ? 'border-primary bg-primary/10' 
          : 'border-base-300 hover:border-primary hover:bg-base-200'
      ]"
    >
      <input
        ref="fileInput"
        type="file"
        accept=".txt"
        class="hidden"
        @change="onFileSelected"
      />
      
      <div class="flex flex-col items-center">
        <div v-if="isLoading" class="loading loading-spinner loading-lg text-primary"></div>
        <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 mb-2 text-base-content/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        <p class="text-lg font-medium">拖拽TXT文件到此处或点击选择</p>
        <p class="text-sm text-base-content/50 mt-1">支持UTF-8编码的TXT文件，每行一个名字</p>
      </div>
    </div>
    
    <!-- 分隔线 -->
    <div class="divider my-6">或者</div>
    
    <!-- 手动输入区域 -->
    <div class="w-full">
      <textarea
        v-model="manualNames"
        class="textarea textarea-bordered w-full h-32"
        placeholder="直接输入名单，每行一个名字"
      ></textarea>
      <button
        @click="handleManualInput"
        class="btn btn-primary mt-2 w-full"
        :class="{ 'loading': isLoading }"
        :disabled="isLoading"
      >
        确认使用
      </button>
    </div>
    
    <!-- 错误提示 -->
    <div
      v-if="error"
      class="alert alert-error mt-4"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
      <span>{{ error }}</span>
    </div>
  </div>
</template> 