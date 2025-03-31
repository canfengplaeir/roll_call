<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { useStorage } from '@vueuse/core';
import { getRandomIndex, getRandomIndexByNoise, getRandomIndexByNormal, getRandomIndexByTime, cleanupRandomAlgorithms } from '../utils/randomAlgorithms';
import type { PermissionStatus } from '../utils/permissionManager';
import { getPermissionErrorMessage } from '../utils/permissionManager';
import BubbleEffect from '../components/effects/BubbleEffect.vue';
import ConfettiEffect from '../components/effects/ConfettiEffect.vue';
import LoadingIndicator from '../components/ui/LoadingIndicator.vue';


// 路由
const router = useRouter();

// 接口定义
interface Config {
  mode: 'random' | 'sequential';
  randomAlgorithm: 'normal' | 'noise' | 'time';
  speechEnabled: boolean;
  speechRate: number;
  speechPitch: number;
  showAnimation: boolean;
  rollSpeed: number;
}

interface HistoryRecord {
  name: string;
  timestamp: number;
  names: string[];
  type: 'list' | 'selection';
  listId?: string;
}

interface CurrentList {
  id: string;
  name: string;
  names: string[];
}

interface NameList {
  id: string;
  name: string;
  description: string;
  tags: string[];
  names: string[];
  createdAt: number;
  updatedAt: number;
}

// 状态管理 - 使用reactive合并相关状态提高可维护性
const rollState = reactive({
  names: [] as string[],
  currentName: '',
  isRolling: false,
  shouldSpeak: false,
  showConfetti: false,
  currentList: null as CurrentList | null,
});

// 权限状态
const permissionState = reactive({
  microphoneStatus: null as PermissionStatus | null,
  showPermissionToast: false,
  permissionMessage: '',
  isRequestingPermission: false
});

// 名单搜索状态
const listSearchQuery = ref('');

// 对话框引用 - 使用单独的ref而不是reactive对象
const historyDialogRef = ref<HTMLDialogElement | null>(null);
const listDialogRef = ref<HTMLDialogElement | null>(null);

// 计时器引用
const rollInterval = ref<number | null>(null);

// 持久化的配置选项
const config = useStorage<Config>('roll-call-config', {
  mode: 'random',
  randomAlgorithm: 'normal',
  speechEnabled: true,
  speechRate: 1.0,
  speechPitch: 1.0,
  showAnimation: true,
  rollSpeed: 100
});

// 持久化的数据
const history = useStorage<HistoryRecord[]>('roll-call-history', []);
const allNameLists = useStorage<NameList[]>('roll-call-lists', []);

// 过滤后的名单列表
const filteredNameLists = computed(() => {
  if (!listSearchQuery.value) return allNameLists.value;
  
  const query = listSearchQuery.value.toLowerCase();
  return allNameLists.value.filter(list => {
    // 搜索名称、描述和标签
    return list.name.toLowerCase().includes(query) || 
           (list.description && list.description.toLowerCase().includes(query)) ||
           list.tags.some(tag => tag.toLowerCase().includes(query));
  });
});

// 计算属性
const hasNames = computed(() => rollState.names.length > 0);
const rollButtonText = computed(() => {
  if (!hasNames.value) return '请先选择名单';
  if (rollState.isRolling) return '停止抽取';
  return '开始抽取';
});

// 最近记录（仅计算一次，避免重复计算）
const recentRecords = computed(() => {
  return history.value
    .filter(record => record.type === 'selection')
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 10);
});

// 加载当前名单
const loadCurrentList = () => {
  try {
    const savedList = localStorage.getItem('current-list');
    if (savedList) {
      const list = JSON.parse(savedList) as CurrentList;
      rollState.currentList = list;
      rollState.names = list.names;
      rollState.currentName = '';
    }
  } catch (err) {
    console.error('加载当前名单失败:', err);
  }
};

// 从文本文件导入名单
const importFromTxt = () => {
  // 创建一个隐藏的文件输入元素
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.txt';
  
  input.onchange = (event) => {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (!content) return;
      
      // 解析文本内容，按行分割
      const names = content.split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);
      
      if (names.length === 0) {
        alert('文件内容为空或格式不正确');
        return;
      }
      
      // 生成新名单
      const newList: NameList = {
        id: Date.now().toString(),
        name: file.name.replace('.txt', ''),
        description: `从文件 ${file.name} 导入`,
        tags: ['导入'],
        names,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      
      // 添加到名单列表
      allNameLists.value.push(newList);
      
      // 使用这个名单
      selectAndUseList(newList);
    };
    
    reader.readAsText(file, 'UTF-8');
  };
  
  input.click();
};

// 清空历史记录
const clearHistory = () => {
  if (confirm('确定要清空所有抽取记录吗？此操作不可撤销。')) {
    history.value = [];
    closeHistoryDialog();
  }
};

// 格式化日期（简短格式）
const formatDate = (timestamp: number) => {
  return new Date(timestamp).toLocaleDateString('zh-CN');
};

// 打开名单选择对话框
const openListSelectionDialog = () => {
  if (listDialogRef.value) {
    listDialogRef.value.showModal();
  }
};

// 关闭名单选择对话框
const closeListSelectionDialog = () => {
  if (listDialogRef.value) {
    listDialogRef.value.close();
  }
};

// 在 script setup 顶部添加 currentIndex 的定义
const currentIndex = ref(-1);

// 修改 startRolling 函数
const startRolling = async () => {
  if (!hasNames.value) return;
  
  try {
    let index: number;
    
    if (config.value.mode === 'sequential') {
      // 顺序模式
      index = (currentIndex.value + 1) % rollState.names.length;
    } else {
      // 随机模式
      if (config.value.randomAlgorithm === 'noise') {
        index = await getRandomIndexByNoise(rollState.names.length);
      } else if (config.value.randomAlgorithm === 'normal') {
        index = getRandomIndexByNormal(rollState.names.length);
      } else {
        index = getRandomIndexByTime(rollState.names.length);
      }
    }

    currentIndex.value = index;
    rollState.currentName = rollState.names[index];
  } catch (err) {
    console.error('抽取过程出错:', err);
    // 发生错误时使用普通随机
    const fallbackIndex = getRandomIndexByNormal(rollState.names.length);
    currentIndex.value = fallbackIndex;
    rollState.currentName = rollState.names[fallbackIndex];
  }
};

// 修改 toggleRolling 函数
const toggleRolling = async () => {
  if (!hasNames.value) return;

  if (rollState.isRolling) {
    stopRolling();
    playSound('stop');
  } else {
    rollState.isRolling = true;
    playSound('start');
    
    // 开始滚动动画
    const animate = async () => {
      if (!rollState.isRolling) return;
      
      await startRolling();
      
      // 根据速度设置下一帧的延迟
      const delay = 20000 / config.value.rollSpeed;
      rollInterval.value = window.setTimeout(() => {
        requestAnimationFrame(animate);
      }, delay);
    };

    animate();
  }
};

// 修改 clearRollInterval 函数
const clearRollInterval = () => {
  if (rollInterval.value) {
    clearTimeout(rollInterval.value);
    rollInterval.value = null;
  }
};

// 选择最终名字
const selectFinalName = async () => {
  let selectedIndex = 0;
  
  if (config.value.mode === 'sequential') {
    // 顺序模式实现
    const currentIndex = rollState.names.indexOf(rollState.currentName);
    selectedIndex = (currentIndex + 1) % rollState.names.length;
  } else {
    // 处理噪声算法可能需要的权限请求
    if (config.value.randomAlgorithm === 'noise') {
      permissionState.isRequestingPermission = true;
    }
    
    // 使用工具函数实现随机算法，并处理权限状态
    selectedIndex = await getRandomIndex(
      rollState.names.length, 
      config.value.randomAlgorithm,
      [],
      // 权限状态回调
      (status) => {
        permissionState.microphoneStatus = status;
        permissionState.isRequestingPermission = false;
        
        // 如果权限状态不是已授权，显示提示
        if (status !== 'granted' && config.value.randomAlgorithm === 'noise') {
          permissionState.permissionMessage = getPermissionErrorMessage(status);
          permissionState.showPermissionToast = true;
          
          // 5秒后自动关闭提示
          setTimeout(() => {
            permissionState.showPermissionToast = false;
          }, 5000);
        }
      }
    );
  }
  
  rollState.currentName = rollState.names[selectedIndex];
  playSound('select');
  
  // 添加到历史记录
  history.value.push({
    name: rollState.currentName,
    timestamp: Date.now(),
    names: rollState.names,
    type: 'selection',
    listId: rollState.currentList?.id
  });
  
  // 如果启用了语音，触发语音播报
  if (config.value.speechEnabled) {
    rollState.shouldSpeak = true;
  }
  
  // 显示庆祝动画
  if (config.value.showAnimation) {
    rollState.showConfetti = true;
    setTimeout(() => {
      rollState.showConfetti = false;
    }, 3000);
  }
};

// 停止抽取并选择最终名字
const stopRolling = async () => {
  if (!rollState.isRolling) return;
  
  // 清除interval
  clearRollInterval();
  rollState.isRolling = false;
  
  try {
    // 选择最终名字
    await selectFinalName();
  } catch (err) {
    console.error('选择最终名字时发生错误:', err);
  }
};

// 格式化时间
const formatTime = (timestamp: number) => {
  return new Date(timestamp).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// 选择并使用名单
const selectAndUseList = (list: NameList) => {
  // 保存当前名单
  rollState.currentList = {
    id: list.id,
    name: list.name,
    names: list.names
  };
  
  // 更新名字数组
  rollState.names = list.names;
  rollState.currentName = '';
  
  // 保存到localStorage
  localStorage.setItem('current-list', JSON.stringify(rollState.currentList));
  
  // 关闭对话框
  closeListSelectionDialog();
};

// 打开历史记录对话框
const openHistoryDialog = () => {
  if (historyDialogRef.value) {
    historyDialogRef.value.showModal();
  }
};

// 关闭历史记录对话框
const closeHistoryDialog = () => {
  if (historyDialogRef.value) {
    historyDialogRef.value.close();
  }
};

// Web Speech API
const synth = ref(window.speechSynthesis);
const isSpeaking = ref(false);

// 语音播报
watch(() => rollState.shouldSpeak, (newVal) => {
  if (newVal && rollState.currentName) {
    speak(rollState.currentName);
  }
}, { flush: 'post' });

// 执行语音播报
const speak = (text: string) => {
  if (!synth.value) return;
  
  // 取消上一次未完成的语音
  synth.value.cancel();
  
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = typeof config.value.speechRate === 'number' ? config.value.speechRate : Number(config.value.speechRate) || 1.0;
  utterance.pitch = typeof config.value.speechPitch === 'number' ? config.value.speechPitch : Number(config.value.speechPitch) || 1.0;
  
  // 使用中文语音（如果有）
  const voices = synth.value.getVoices();
  const chineseVoice = voices.find(voice => voice.lang.includes('zh'));
  if (chineseVoice) {
    utterance.voice = chineseVoice;
  }
  
  utterance.onstart = () => {
    isSpeaking.value = true;
  };
  
  utterance.onend = () => {
    isSpeaking.value = false;
    rollState.shouldSpeak = false;
  };
  
  utterance.onerror = () => {
    isSpeaking.value = false;
    rollState.shouldSpeak = false;
  };
  
  synth.value.speak(utterance);
};

// 关闭权限提示
const closePermissionToast = () => {
  permissionState.showPermissionToast = false;
};

// 添加重置设置函数
const resetSettings = () => {
  // 重置为默认值
  config.value = {
    mode: 'random',
    randomAlgorithm: 'normal',
    speechEnabled: true,
    speechRate: 1.0,
    speechPitch: 1.0,
    showAnimation: true,
    rollSpeed: 100
  };
};

// 添加设置对话框引用
const settingsDialogRef = ref<HTMLDialogElement | null>(null);

// 添加预览相关的状态
const previewNames = ['张三', '李四', '王五', '赵六', '钱七', '孙八'];
const previewIndex = ref(0);

// 监听设置对话框的开关状态
let previewInterval: number | null = null;

// 开始预览动画
const startPreview = () => {
  if (previewInterval) return;
  
  let lastTime = 0;
  const animate = (timestamp: number) => {
    const interval = 20000 / config.value.rollSpeed;
    
    if (timestamp - lastTime > interval) {
      lastTime = timestamp;
      previewIndex.value = (previewIndex.value + 1) % previewNames.length;
    }
    
    previewInterval = requestAnimationFrame(animate);
  };
  
  previewInterval = requestAnimationFrame(animate);
};

// 停止预览动画
const stopPreview = () => {
  if (previewInterval) {
    cancelAnimationFrame(previewInterval);
    previewInterval = null;
  }
};

// 修改打开设置对话框的函数
const openSettingsDialog = () => {
  if (settingsDialogRef.value) {
    settingsDialogRef.value.showModal();
    startPreview(); // 开始预览
  }
};

// 修改关闭设置对话框的函数
const closeSettingsDialog = () => {
  if (settingsDialogRef.value) {
    settingsDialogRef.value.close();
    stopPreview(); // 停止预览
  }
};

// 添加音效系统
const playSound = (type: 'start' | 'stop' | 'select') => {
  const audio = new Audio();
  switch (type) {
    case 'start':
      audio.src = '/sounds/start.mp3';
      break;
    case 'stop':
      audio.src = '/sounds/stop.mp3';
      break;
    case 'select':
      audio.src = '/sounds/select.mp3';
      break;
  }
  audio.play().catch(() => {});
};

// 生命周期钩子
onMounted(() => {
  // 确保数值类型正确
  if (typeof config.value.speechRate !== 'number') {
    config.value.speechRate = Number(config.value.speechRate) || 1.0;
  }
  if (typeof config.value.speechPitch !== 'number') {
    config.value.speechPitch = Number(config.value.speechPitch) || 1.0;
  }
  // 确保rollSpeed是数字类型
  if (typeof config.value.rollSpeed !== 'number') {
    config.value.rollSpeed = Number(config.value.rollSpeed) || 100;
  }
  
  loadCurrentList();
  
  // 页面离开前的清理工作
  window.addEventListener('beforeunload', clearRollInterval);
  
  // 添加快捷键监听
  window.addEventListener('keydown', handleKeyPress);
});

// 组件卸载时清理资源
onUnmounted(() => {
  clearRollInterval();
  window.removeEventListener('beforeunload', clearRollInterval);
  window.removeEventListener('keydown', handleKeyPress);
  stopPreview();
  cleanupRandomAlgorithms();
});

const handleKeyPress = (event: KeyboardEvent) => {
  if (event.code === 'Space') {
    event.preventDefault();
    toggleRolling();
  } else if (event.code === 'Escape' && rollState.isRolling) {
    stopRolling();
  }
};
</script>

<template>
  <div class="container mx-auto px-4 py-6 animate-fade-in max-w-7xl">
    <!-- 添加主题切换按钮 -->

    
    <!-- 权限请求提示 - 使用动画滑入效果 -->
    <div 
      v-if="permissionState.showPermissionToast" 
      class="toast toast-top toast-center z-50"
    >
      <div class="alert alert-warning shadow-xl animate-slide-down">
        <i-iconify icon="ph:warning-circle-fill" class="text-lg mr-2" />
        <span>{{ permissionState.permissionMessage }}</span>
        <button @click="closePermissionToast" class="btn btn-sm btn-ghost">关闭</button>
      </div>
    </div>
    
    <!-- 顶部导航栏 - 修复粘性定位 -->
    <div class="navbar bg-base-100 shadow-lg rounded-box mb-5 backdrop-blur-sm border border-base-200 sticky top-0 z-30">
      <div class="flex-1">
        <div class="flex flex-col">
          <h2 class="text-xl font-bold flex items-center">
            <i-iconify icon="ph:user-list-fill" class="text-primary mr-2 text-2xl" />
            <span class="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">智能点名系统</span>
          </h2>
          <p v-if="rollState.currentList" class="text-xs text-base-content/70">
            当前名单: {{ rollState.currentList.name }} ({{ rollState.names.length }}人)
          </p>
        </div>
      </div>
      <div class="flex gap-1">
        <button 
          class="btn btn-sm btn-outline"
          @click="openHistoryDialog"
        >
          <i-iconify icon="ph:clock-fill" class="mr-1" />
          历史记录
        </button>
        <button 
          class="btn btn-sm btn-primary"
          @click="openListSelectionDialog"
        >
          <i-iconify icon="ph:clipboard-text-fill" class="mr-1" />
          选择名单
        </button>
      </div>
    </div>
    
    <!-- 主体内容区 - 修改为使用全宽而不是分栏布局 -->
    <div class="flex flex-col gap-5">
      <!-- 左侧内容区域（现在为主要内容区） -->
      <div class="flex-1 flex flex-col gap-5">
        <!-- 名字展示区 -->
        <div class="card bg-base-100 shadow-2xl overflow-hidden transition-all duration-500 hover:shadow-3xl relative rounded-2xl">
          <!-- 添加动态背景效果 -->
          <div class="absolute inset-0 bg-gradient-pattern opacity-5"></div>
          
          <div
            class="card-body flex items-center justify-center py-20 md:py-28 relative overflow-hidden"
            :class="{
              'bg-gradient-to-br from-base-100 to-base-200': !rollState.isRolling,
              'bg-gradient-to-br from-primary/5 to-accent/5': rollState.isRolling
            }"
          >
            <!-- 添加动态光晕效果 -->
            <div v-if="rollState.currentName && !rollState.isRolling"
              class="absolute inset-0 bg-primary/10 blur-3xl transform scale-90 rounded-full transition-all duration-1000"
            ></div>
            
            <!-- 抽取动画背景 -->
            <div 
              v-if="rollState.isRolling"
              class="absolute inset-0 bg-primary/5 background-animation"
            ></div>
            
            <!-- 气泡特效 - 优化后只在抽取过程中显示 -->
            <BubbleEffect 
              v-if="config.showAnimation && rollState.isRolling" 
              :isActive="true" 
            />
            
            <!-- 麦克风权限请求提示 -->
            <div 
              v-if="permissionState.isRequestingPermission && config.randomAlgorithm === 'noise'"
              class="absolute top-3 right-3 badge badge-info gap-2 p-3 shadow-md animate-pulse"
            >
              <span class="loading loading-dots loading-xs"></span>
              请求麦克风权限中...
            </div>
            
            <!-- 加载指示器 - 只在滚动过程中显示 -->
            <LoadingIndicator 
              :active="rollState.isRolling && !rollState.currentName" 
              text="正在随机抽取..."
            />
            
            <!-- 没有名单时的提示 -->
            <div 
              v-if="!hasNames && !rollState.isRolling" 
              class="text-center p-8"
            >
              <i-iconify icon="ph:clipboard-text" class="text-7xl text-base-content/20 mb-4" />
              <p class="text-base-content/60 mb-5 text-lg">还没有选择名单</p>
              <button 
                class="btn btn-primary btn-lg"
                @click="openListSelectionDialog"
              >
                <i-iconify icon="ph:plus" class="mr-2" />
                选择名单
              </button>
            </div>
            
            <!-- 名字显示 - 增强动画和文字效果 -->
            <div 
              v-if="hasNames || rollState.isRolling"
              class="text-center transition-all duration-500 transform z-10"
              :class="{
                'animate-name-enter': !rollState.isRolling && rollState.currentName,
                'animate-name-rolling': rollState.isRolling
              }"
            >
              <h1
                class="text-6xl md:text-8xl font-extrabold mb-5 transition-all duration-500 text-glow"
                :class="{
                  'text-primary': !rollState.isRolling && !rollState.currentName,
                  'text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent': !rollState.isRolling && rollState.currentName,
                  'text-accent animate-pulse': rollState.isRolling
                }"
              >
                {{ rollState.currentName || (hasNames ? '准备开始' : '') }}
              </h1>
              
              <p class="text-base-content/70 text-xl animate-fade-in">
                {{ rollState.isRolling ? '抽取中...' : (rollState.currentName ? '已抽取' : '点击下方按钮开始') }}
                <span v-if="isSpeaking" class="inline-block ml-2 animate-bounce">
                  <i-iconify icon="ph:speaker-high" class="text-primary" />
                </span>
              </p>
            </div>
            
            <!-- 礼花特效 - 只在结果显示后显示 -->
            <ConfettiEffect 
              :isActive="rollState.showConfetti && !rollState.isRolling" 
            />
          </div>
        </div>
        
        <!-- 操作按钮区 -->
        <div class="card bg-base-100 shadow-lg border border-base-200">
          <div class="card-body p-6">
            <h3 class="card-title text-lg mb-4 text-primary/90">
              <i-iconify icon="ph:sliders-horizontal-fill" class="mr-2 text-xl" />
              操作控制
            </h3>
            
            <div class="flex flex-col gap-4">
              <button 
                class="btn btn-lg w-full shadow-md text-lg h-16 transition-all duration-300 transform hover:scale-[1.02]"
                :class="{
                  'btn-primary hover:brightness-110': !rollState.isRolling && hasNames,
                  'btn-accent animate-pulse': rollState.isRolling,
                  'btn-disabled opacity-50': !hasNames && !rollState.isRolling
                }"
                @click="toggleRolling"
              >
                <i-iconify 
                  :icon="rollState.isRolling ? 'ph:stop-fill' : 'ph:play-fill'" 
                  class="mr-2 text-2xl transition-transform"
                  :class="{'animate-spin-slow': rollState.isRolling}"
                />
                {{ rollButtonText }}
              </button>
              
              <!-- 在操作按钮区域添加设置按钮 -->
              <div class="flex items-center justify-between mt-3 pt-3 border-t border-base-200 gap-1">
                <button
                  v-if="rollState.currentName && !rollState.isRolling"
                  class="btn btn-outline btn-sm"
                  @click="rollState.currentName = ''"
                >
                  <i-iconify icon="ph:arrow-counter-clockwise" class="mr-1" />
                  重置
                </button>
                
                <button
                  class="btn btn-sm btn-outline"
                  @click="openSettingsDialog"
                  :disabled="rollState.isRolling"
                >
                  <i-iconify icon="ph:gear" class="mr-1" />
                  抽取设置
                </button>
                
                <div v-if="hasNames" class="text-xs text-base-content/50 ml-auto">
                  总共 {{ rollState.names.length }} 人
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 最近抽取记录对话框 -->
    <dialog ref="historyDialogRef" class="modal modal-bottom sm:modal-middle">
      <div class="modal-box w-11/12 max-w-4xl bg-base-100">
        <h3 class="font-bold text-lg mb-4 flex items-center text-primary">
          <i-iconify icon="ph:clock-fill" class="mr-2 text-xl" />
          历史抽取记录
          <span class="badge badge-sm ml-2">{{ recentRecords.length }}</span>
        </h3>
        
        <div class="overflow-x-auto">
          <table class="table table-zebra w-full">
            <thead>
              <tr class="bg-base-200/50">
                <th class="text-primary/80">抽取结果</th>
                <th class="text-primary/80">来源名单</th>
                <th class="text-primary/80">抽取时间</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="record in recentRecords" :key="record.timestamp" class="hover:bg-base-200/30 transition-colors">
                <td class="font-medium">{{ record.name }}</td>
                <td>{{ record.listId || '未知名单' }}</td>
                <td>{{ formatTime(record.timestamp) }}</td>
              </tr>
              
              <tr v-if="recentRecords.length === 0">
                <td colspan="3" class="text-center py-8 text-base-content/50">
                  <i-iconify icon="ph:clock" class="text-4xl mb-2 opacity-30" />
                  <p>暂无抽取记录</p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <div class="mt-4 text-sm text-base-content/60 bg-info/5 p-3 rounded-lg">
          <i-iconify icon="ph:info" class="inline-block mr-1" />
          显示最近10条记录，查看更多请前往
          <a @click="router.push('/history'); closeHistoryDialog()" class="link link-primary">历史记录</a>
          页面
        </div>
        
        <div class="modal-action">
          <button 
            class="btn btn-outline hover:btn-primary transition-colors" 
            @click="closeHistoryDialog"
          >
            关闭
          </button>
          <!-- 清空按钮 -->
          <button 
            v-if="recentRecords.length > 0"
            class="btn btn-outline btn-error" 
            @click="clearHistory"
          >
            <i-iconify icon="ph:trash" class="mr-1" />
            清空记录
          </button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button>close</button>
      </form>
    </dialog>
    
    <!-- 名单选择对话框 -->
    <dialog ref="listDialogRef" class="modal modal-bottom sm:modal-middle">
      <div class="modal-box w-11/12 max-w-5xl bg-base-100">
        <h3 class="font-bold text-lg mb-4 flex items-center text-primary">
          <i-iconify icon="ph:clipboard-text-fill" class="mr-2 text-xl" />
          选择名单
          <span class="badge badge-sm ml-2">{{ allNameLists.length }}</span>
        </h3>
        
        <!-- 搜索/过滤 -->
        <div class="mb-4" v-if="allNameLists.length > 0">
          <div class="join w-full">
            <input 
              type="text" 
              placeholder="搜索名单..." 
              class="input input-bordered w-full" 
              v-model="listSearchQuery"
            />
          </div>
        </div>
        
        <div class="overflow-y-auto max-h-[60vh]">
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div 
              v-for="list in filteredNameLists" 
              :key="list.id"
              class="card bg-base-100 border border-base-300 hover:border-primary hover:shadow-md transition-all duration-300 cursor-pointer hover:bg-base-200/10"
              @click="selectAndUseList(list)"
            >
              <div class="card-body p-4">
                <h3 class="card-title text-lg flex items-center">
                  <i-iconify icon="ph:users-three" class="mr-2 text-primary/70" />
                  {{ list.name }}
                </h3>
                
                <p v-if="list.description" class="text-sm text-base-content/70 mt-1">
                  {{ list.description }}
                </p>
                
                <div class="flex flex-wrap gap-1 mt-2">
                  <span 
                    v-for="tag in list.tags" 
                    :key="tag"
                    class="badge badge-sm badge-outline badge-primary"
                  >
                    {{ tag }}
                  </span>
                </div>
                
                <div class="flex justify-between items-center text-xs mt-2">
                  <div class="flex items-center">
                    <i-iconify icon="ph:user-list" class="mr-1 text-primary/50" />
                    包含 {{ list.names.length }} 人
                  </div>
                  
                  <div class="flex items-center">
                    <i-iconify icon="ph:calendar" class="mr-1 text-primary/50" />
                    {{ formatDate(list.updatedAt) }}
                  </div>
                </div>
                
                <div class="mt-2 pt-2 border-t border-base-200">
                  <button class="btn btn-primary btn-sm w-full">
                    <i-iconify icon="ph:check" class="mr-1" />
                    使用此名单
                  </button>
                </div>
              </div>
            </div>
            
            <!-- 空状态 - 搜索无结果 -->
            <div 
              v-if="filteredNameLists.length === 0 && listSearchQuery" 
              class="col-span-full p-8 text-center bg-base-200/20 rounded-box"
            >
              <i-iconify icon="ph:magnifying-glass" class="text-5xl text-base-content/20 mb-3" />
              <p class="text-base-content/60 mb-4">没有找到匹配 "{{ listSearchQuery }}" 的名单</p>
              <button 
                class="btn btn-primary"
                @click="listSearchQuery = ''"
              >
                <i-iconify icon="ph:x" class="mr-2" />
                清除搜索
              </button>
            </div>
            
            <!-- 空状态 - 没有名单 -->
            <div 
              v-if="allNameLists.length === 0" 
              class="col-span-full p-8 text-center bg-base-200/20 rounded-box"
            >
              <i-iconify icon="ph:clipboard-text" class="text-5xl text-base-content/20 mb-3" />
              <p class="text-base-content/60 mb-4">暂无可用名单</p>
              <button 
                class="btn btn-primary"
                @click="router.push('/lists'); closeListSelectionDialog()"
              >
                <i-iconify icon="ph:plus" class="mr-2" />
                前往创建名单
              </button>
            </div>
          </div>
        </div>
        
        <div class="divider my-4">快速操作</div>
          
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
          <button 
            class="btn btn-outline btn-sm"
            @click="router.push('/lists'); closeListSelectionDialog()"
          >
            <i-iconify icon="ph:pencil-simple" class="mr-1" />
            管理名单
          </button>
            
          <button 
            class="btn btn-outline btn-sm"
            @click="router.push('/lists/new'); closeListSelectionDialog()"
          >
            <i-iconify icon="ph:plus" class="mr-1" />
            创建名单
          </button>
            
          <button 
            class="btn btn-outline btn-sm"
            @click="importFromTxt"
          >
            <i-iconify icon="ph:file-text" class="mr-1" />
            从文本导入
          </button>
        </div>
        
        <div class="modal-action">
          <button 
            class="btn" 
            @click="closeListSelectionDialog"
          >
            关闭
          </button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button>close</button>
      </form>
    </dialog>
    
    <!-- 设置对话框 -->
    <dialog ref="settingsDialogRef" class="modal modal-bottom sm:modal-middle">
      <div class="modal-box w-11/12 max-w-lg bg-base-100">
        <h3 class="font-bold text-lg mb-4 flex items-center text-primary">
          <i-iconify icon="ph:gear-fill" class="mr-2 text-xl" />
          抽取设置
        </h3>
        
        <!-- 设置组 - 模式选择 -->
        <div class="settings-group mb-4 pb-3 border-b border-base-200">
          <label class="label cursor-pointer">
            <span class="label-text font-medium">抽取模式</span>
            <div class="tabs tabs-boxed bg-base-200/50">
              <a 
                class="tab transition-all duration-300"
                :class="{'tab-active bg-primary text-primary-content': config.mode === 'random'}"
                @click="config.mode = 'random'"
              >
                随机
              </a>
              <a 
                class="tab transition-all duration-300"
                :class="{'tab-active bg-primary text-primary-content': config.mode === 'sequential'}"
                @click="config.mode = 'sequential'"
              >
                顺序
              </a>
            </div>
          </label>
        </div>
        
        <!-- 设置组 - 随机算法 -->
        <div v-if="config.mode === 'random'" class="settings-group mb-4 pb-3 border-b border-base-200 animate-fade-in">
          <label class="label cursor-pointer">
            <span class="label-text font-medium">随机算法</span>
            <select 
              v-model="config.randomAlgorithm"
              class="select select-bordered select-sm bg-base-200/50"
            >
              <option value="normal">普通随机</option>
              <option value="noise">噪声随机</option>
              <option value="time">时间随机</option>
            </select>
          </label>
          
          <!-- 算法描述 -->
          <div class="text-xs text-base-content/70 mt-1 mb-2 bg-base-200/20 p-2 rounded-lg">
            <template v-if="config.randomAlgorithm === 'normal'">
              <i-iconify icon="ph:dice-five" class="inline-block mr-1" />
              使用加密级随机数生成算法，确保完全公平的随机结果
            </template>
            <template v-else-if="config.randomAlgorithm === 'noise'">
              <i-iconify icon="ph:microphone" class="inline-block mr-1" />
              利用环境噪声作为随机种子，需要麦克风权限
            </template>
            <template v-else-if="config.randomAlgorithm === 'time'">
              <i-iconify icon="ph:clock" class="inline-block mr-1" />
              基于精确时间戳生成随机结果，每次结果各不相同
            </template>
          </div>
        </div>
        
        <!-- 设置组 - 自动抽取速度 -->
        <div class="settings-group mb-4 pb-3 border-b border-base-200">
          <label class="label">
            <span class="label-text font-medium flex items-center">
              <i-iconify icon="ph:gauge" class="mr-2 text-primary/70" />
              滚动速度
            </span>
            <span class="label-text-alt text-xs">
              {{ typeof config.rollSpeed === 'number' ? config.rollSpeed : Number(config.rollSpeed) }}
            </span>
          </label>
          
          <input 
            type="range" 
            min="50" 
            max="200" 
            step="10" 
            :value="typeof config.rollSpeed === 'number' ? config.rollSpeed : Number(config.rollSpeed)" 
            @input="event => config.rollSpeed = Number((event.target as HTMLInputElement).value)" 
            class="range range-xs range-primary" 
          />
          
          <div class="flex justify-between text-xs text-base-content/40 mt-1 px-1">
            <span>慢</span>
            <span>中</span>
            <span>快</span>
          </div>
        </div>
        
        <!-- 修改设置面板中的速度预览部分 -->
        <div class="settings-group mb-4 pb-3 border-b border-base-200">
          <label class="label">
            <span class="label-text font-medium flex items-center">
              <i-iconify icon="ph:gauge" class="mr-2 text-primary/70" />
              速度预览
            </span>
          </label>
          
          <!-- 使用与主界面相同的动画效果，但尺寸更小 -->
          <div class="card bg-base-100 shadow-md overflow-hidden rounded-lg">
            <div class="card-body p-4 flex items-center justify-center relative overflow-hidden">
              <!-- 复用主界面的动画背景 -->
              <div class="absolute inset-0 bg-primary/5 background-animation"></div>
              
              <!-- 复用气泡特效 -->
              <BubbleEffect v-if="config.showAnimation" :isActive="true" />
              
              <!-- 预览用的名字显示 -->
              <div class="text-center transform z-10 animate-name-rolling">
                <h2 class="text-2xl font-bold text-accent animate-pulse">
                  {{ previewNames[previewIndex] }}
                </h2>
              </div>
            </div>
          </div>
        </div>
        
        <!-- 其他设置选项 -->
        <div class="settings-group">
          <!-- 语音设置 -->
          <div class="form-control w-full mb-2">
            <label class="label cursor-pointer justify-between">
              <span class="label-text font-medium flex items-center">
                <i-iconify icon="ph:speaker-high" class="mr-2 text-primary/70" />
                语音朗读
              </span>
              <input 
                type="checkbox" 
                v-model="config.speechEnabled" 
                class="toggle toggle-primary" 
              />
            </label>
          </div>
          
          <!-- 动画设置 -->
          <label class="label cursor-pointer justify-between">
            <span class="label-text font-medium flex items-center">
              <i-iconify icon="ph:sparkle" class="mr-2 text-primary/70" />
              动画效果
            </span>
            <input 
              type="checkbox" 
              v-model="config.showAnimation" 
              class="toggle toggle-primary" 
            />
          </label>
        </div>
        
        <!-- 在设置对话框中可以添加这样的提示 -->
        <div class="text-sm text-base-content/70 p-2 bg-base-200/20 rounded-md">
          <i-iconify icon="ph:info-circle" class="mr-1" />
          设置将自动保存并在下次打开时生效
        </div>
        
        <!-- 按钮区域 -->
        <div class="modal-action">
          <button 
            class="btn btn-outline btn-sm"
            @click="resetSettings"
          >
            <i-iconify icon="ph:arrow-counter-clockwise" class="mr-1" />
            重置设置
          </button>
          
          <button 
            class="btn" 
            @click="closeSettingsDialog"
          >
            确认
          </button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button>close</button>
      </form>
    </dialog>
  </div>
</template>

<style scoped>
/* 基础效果 */
.text-glow {
  text-shadow: 0 0 10px rgba(var(--p), 0.2), 
               0 0 20px rgba(var(--p), 0.1), 
               0 0 30px rgba(var(--p), 0.05);
}

.animate-fade-in {
  animation: fade-in 0.5s ease-out;
}

.animate-slide-down {
  animation: slide-down 0.3s ease-out;
}

.bg-grid-pattern {
  background-image: 
    radial-gradient(circle at 50% 50%, 
      rgba(var(--p), 0.1) 0%,
      transparent 50%),
    linear-gradient(45deg,
      rgba(var(--p), 0.05) 25%,
      transparent 25%,
      transparent 75%,
      rgba(var(--p), 0.05) 75%);
  background-size: 60px 60px;
  animation: pattern-shift 20s linear infinite;
}

/* 抽取名字动画效果 */
.animate-name-rolling {
  animation: name-rolling 0.5s ease-in-out infinite alternate;
}

.animate-name-enter {
  animation: name-enter 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}

.background-animation {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: repeating-linear-gradient(
    45deg,
    rgba(var(--p), 0.05),
    rgba(var(--p), 0.05) 10px,
    rgba(var(--a), 0.05) 10px,
    rgba(var(--a), 0.05) 20px
  );
  background-size: 200% 200%;
  animation: gradient-move 3s linear infinite;
}

/* 动画定义 */
@keyframes name-rolling {
  0% {
    transform: translateY(-2px) scale(1);
    opacity: 0.8;
  }
  100% {
    transform: translateY(2px) scale(1.05);
    opacity: 1;
  }
}

@keyframes name-enter {
  0% {
    transform: translateY(30px) scale(0.9);
    opacity: 0;
  }
  50% {
    transform: translateY(-10px) scale(1.1);
  }
  75% {
    transform: translateY(5px) scale(0.95);
  }
  100% {
    transform: translateY(0) scale(1);
    opacity: 1;
  }
}

@keyframes gradient-move {
  0% {
    background-position: 0% 0%;
  }
  100% {
    background-position: 100% 100%;
  }
}

@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slide-down {
  from { transform: translateY(-20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

/* 添加新的动画效果 */
.animate-spin-slow {
  animation: spin 2s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.preview-box {
  mask-image: linear-gradient(
    to bottom,
    transparent 0%,
    black 20%,
    black 80%,
    transparent 100%
  );
}

.preview-names {
  animation: names-scroll linear infinite;
  text-align: center;
}

.preview-names span {
  padding: 0.25rem;
  font-size: 1rem;
  color: var(--primary);
}

@keyframes names-scroll {
  0% { transform: translateY(0); }
  100% { transform: translateY(-50%); }
}
</style> 