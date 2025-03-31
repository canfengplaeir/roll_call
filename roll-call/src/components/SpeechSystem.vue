<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount } from 'vue';

const props = defineProps<{
  name: string;
  rate: number;
  pitch: number;
  shouldSpeak: boolean; // 新增属性，控制是否应该播报
}>();

const isSpeaking = ref(false);
const isSupported = ref(false);
const error = ref<string | null>(null);
let currentUtterance: SpeechSynthesisUtterance | null = null;

// 检查浏览器是否支持语音合成
onMounted(() => {
  if ('speechSynthesis' in window) {
    isSupported.value = true;
  } else {
    error.value = '您的浏览器不支持语音合成';
  }
});

// 清理语音合成实例
onBeforeUnmount(() => {
  if (isSupported.value) {
    window.speechSynthesis.cancel();
  }
});

// 监听名字变化和shouldSpeak属性
watch([() => props.name, () => props.shouldSpeak], ([newName, shouldSpeak]) => {
  if (newName && isSupported.value && shouldSpeak) {
    speak(newName);
  }
});

// 执行语音合成
const speak = (text: string) => {
  if (!isSupported.value || isSpeaking.value) return;
  
  try {
    // 取消之前的语音
    window.speechSynthesis.cancel();
    
    // 创建语音实例
    currentUtterance = new SpeechSynthesisUtterance(text);
    
    // 设置语音参数
    currentUtterance.rate = props.rate;
    currentUtterance.pitch = props.pitch;
    
    // 尝试设置中文语音
    const voices = window.speechSynthesis.getVoices();
    const chineseVoice = voices.find(voice => 
      voice.lang.includes('zh') || voice.lang.includes('cmn')
    );
    
    if (chineseVoice) {
      currentUtterance.voice = chineseVoice;
    }
    
    // 语音事件监听
    currentUtterance.onstart = () => {
      isSpeaking.value = true;
      error.value = null;
    };
    
    currentUtterance.onend = () => {
      isSpeaking.value = false;
      currentUtterance = null;
    };
    
    currentUtterance.onerror = (event) => {
      isSpeaking.value = false;
      currentUtterance = null;
      
      // 根据错误类型显示不同的错误信息
      switch (event.error) {
        case 'interrupted':
          error.value = '语音播放被中断';
          break;
        case 'not-allowed':
          error.value = '浏览器阻止了语音播放';
          break;
        case 'synthesis-failed':
          error.value = '语音合成失败';
          break;
        default:
          error.value = `语音合成错误: ${event.error}`;
      }
      
      console.error('Speech synthesis error:', event);
    };
    
    // 开始语音播放
    window.speechSynthesis.speak(currentUtterance);
  } catch (err) {
    isSpeaking.value = false;
    currentUtterance = null;
    error.value = '语音合成初始化失败';
    console.error('Speech synthesis init error:', err);
  }
};

// 初始化获取可用语音列表
const initVoices = () => {
  if (window.speechSynthesis) {
    window.speechSynthesis.getVoices(); // 触发语音加载
  }
};

// 确保语音列表已加载
if (isSupported.value) {
  if (window.speechSynthesis.onvoiceschanged !== undefined) {
    window.speechSynthesis.onvoiceschanged = initVoices;
  }
  initVoices();
}
</script>

<template>
  <div class="mt-4" v-if="isSupported">
    <!-- 语音状态指示器 -->
    <div class="flex items-center justify-center gap-2" v-if="isSpeaking">
      <div class="rounded-full bg-accent w-3 h-3 animate-pulse"></div>
      <div class="rounded-full bg-accent w-3 h-3 animate-pulse" style="animation-delay: 0.2s"></div>
      <div class="rounded-full bg-accent w-3 h-3 animate-pulse" style="animation-delay: 0.4s"></div>
      <span class="text-sm text-accent">正在朗读...</span>
    </div>
    
    <!-- 错误提示 -->
    <div class="alert alert-error mt-2" v-if="error">
      <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
      <span>{{ error }}</span>
    </div>
  </div>
  
  <!-- 浏览器不支持提示 -->
  <div class="alert alert-warning mt-2" v-else>
    <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
    <span>您的浏览器不支持语音合成功能</span>
  </div>
</template> 