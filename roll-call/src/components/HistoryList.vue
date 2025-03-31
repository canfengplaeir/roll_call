<script setup lang="ts">
import { ref, computed } from 'vue';

interface HistoryRecord {
  name: string;
  timestamp: number;
  names: string[];
  type?: 'list' | 'selection'; // 添加可选类型字段，兼容旧数据
}

const props = defineProps<{
  records: HistoryRecord[];
}>();

const emit = defineEmits<{
  (e: 'clear'): void;
  (e: 'load', names: string[]): void;
}>();

// 格式化时间
const formatTime = (timestamp: number) => {
  const date = new Date(timestamp);
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

// 过滤选项
const filterType = ref<'all' | 'list' | 'selection'>('all');

// 过滤和排序后的记录
const filteredRecords = computed(() => {
  let result = [...props.records];
  
  // 应用过滤
  if (filterType.value !== 'all') {
    result = result.filter(record => 
      record.type === filterType.value || 
      // 兼容没有type字段的旧数据，假设它们是名单记录
      (filterType.value === 'list' && !record.type)
    );
  }
  
  // 按时间倒序排序
  return result.sort((a, b) => b.timestamp - a.timestamp);
});

// 加载历史名单
const loadHistory = (names: string[]) => {
  emit('load', names);
};
</script>

<template>
  <div class="card bg-base-100 shadow-xl">
    <div class="card-body">
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-lg font-medium">历史名单</h3>
        <div class="flex gap-2">
          <!-- 过滤按钮组 -->
          <div class="btn-group">
            <button 
              class="btn btn-sm" 
              :class="{ 'btn-active': filterType === 'all' }"
              @click="filterType = 'all'"
            >
              全部
            </button>
            <button 
              class="btn btn-sm" 
              :class="{ 'btn-active': filterType === 'list' }"
              @click="filterType = 'list'"
            >
              名单
            </button>
            <button 
              class="btn btn-sm" 
              :class="{ 'btn-active': filterType === 'selection' }"
              @click="filterType = 'selection'"
            >
              抽取
            </button>
          </div>
          
          <!-- 清空按钮 -->
          <button 
            class="btn btn-sm btn-ghost"
            @click="emit('clear')"
            title="清空历史记录"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
      
      <div class="overflow-x-auto">
        <table class="table w-full">
          <thead>
            <tr>
              <th>时间</th>
              <th>名称</th>
              <th>类型</th>
              <th>人数</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="record in filteredRecords" :key="record.timestamp" 
                :class="{'bg-base-200/50': record.type === 'selection'}">
              <td class="text-sm text-base-content/70">{{ formatTime(record.timestamp) }}</td>
              <td class="font-medium">{{ record.name }}</td>
              <td>
                <span v-if="record.type === 'selection'" class="badge badge-accent">抽取</span>
                <span v-else class="badge badge-primary">名单</span>
              </td>
              <td class="text-sm text-base-content/70">{{ record.names.length }}人</td>
              <td>
                <button 
                  class="btn btn-sm btn-primary"
                  @click="loadHistory(record.names)"
                >
                  加载
                </button>
              </td>
            </tr>
            <tr v-if="filteredRecords.length === 0">
              <td colspan="5" class="text-center py-4">暂无历史记录</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template> 