<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useStorage } from '@vueuse/core';

interface HistoryRecord {
  name: string;
  timestamp: number;
  names: string[];
  type: 'list' | 'selection';
  listId?: string;
}

// 添加在import语句之后
interface RefElements {
  detailsModal: HTMLDialogElement
}

// 然后声明$refs类型
const $refs = ref<RefElements>({} as RefElements);

// 历史记录数据
const history = useStorage<HistoryRecord[]>('roll-call-history', []);

// UI状态
const filterType = ref<'all' | 'list' | 'selection'>('all');
const searchQuery = ref('');
const sortOrder = ref<'newest' | 'oldest'>('newest');
const currentPage = ref(1);
const itemsPerPage = ref(20);
const selectedRecord = ref<HistoryRecord | null>(null);

// 格式化时间
const formatTime = (timestamp: number) => {
  return new Date(timestamp).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};

// 过滤和排序的记录
const filteredRecords = computed(() => {
  let result = [...history.value];
  
  // 按类型过滤
  if (filterType.value !== 'all') {
    result = result.filter(record => record.type === filterType.value);
  }
  
  // 按搜索查询过滤
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    result = result.filter(record => 
      record.name.toLowerCase().includes(query)
    );
  }
  
  // 按时间排序
  result.sort((a, b) => {
    return sortOrder.value === 'newest'
      ? b.timestamp - a.timestamp
      : a.timestamp - b.timestamp;
  });
  
  return result;
});

// 分页记录
const paginatedRecords = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value;
  const end = start + itemsPerPage.value;
  return filteredRecords.value.slice(start, end);
});

// 总页数
const totalPages = computed(() => {
  return Math.ceil(filteredRecords.value.length / itemsPerPage.value) || 1;
});

// 页码数组
const pageNumbers = computed(() => {
  const pageArray = [];
  const maxVisiblePages = 5;
  
  if (totalPages.value <= maxVisiblePages) {
    // 显示所有页码
    for (let i = 1; i <= totalPages.value; i++) {
      pageArray.push(i);
    }
  } else {
    // 显示当前页附近的页码
    let startPage = Math.max(1, currentPage.value - Math.floor(maxVisiblePages / 2));
    let endPage = startPage + maxVisiblePages - 1;
    
    if (endPage > totalPages.value) {
      endPage = totalPages.value;
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    // 始终显示第一页
    if (startPage > 1) {
      pageArray.push(1);
      if (startPage > 2) {
        pageArray.push('...');
      }
    }
    
    // 中间页码
    for (let i = startPage; i <= endPage; i++) {
      pageArray.push(i);
    }
    
    // 始终显示最后一页
    if (endPage < totalPages.value) {
      if (endPage < totalPages.value - 1) {
        pageArray.push('...');
      }
      pageArray.push(totalPages.value);
    }
  }
  
  return pageArray;
});

// 切换页面
const changePage = (page: number) => {
  currentPage.value = page;
};

// 跳转到上一页
const prevPage = () => {
  if (currentPage.value > 1) {
    currentPage.value--;
  }
};

// 跳转到下一页
const nextPage = () => {
  if (currentPage.value < totalPages.value) {
    currentPage.value++;
  }
};

// 清空历史记录
const clearHistory = () => {
  if (confirm('确定要清空所有历史记录吗？此操作不可撤销。')) {
    history.value = [];
  }
};

// 导出历史记录
const exportHistory = () => {
  const dataStr = JSON.stringify(filteredRecords.value, null, 2);
  const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`;
  
  const linkElement = document.createElement('a');
  linkElement.setAttribute('href', dataUri);
  linkElement.setAttribute('download', `历史记录_${new Date().toISOString().split('T')[0]}.json`);
  linkElement.click();
};

// 监听过滤或搜索变化，重置页码
watch([filterType, searchQuery], () => {
  currentPage.value = 1;
});
</script>

<template>
  <div class="container mx-auto">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold text-base-content">历史记录</h1>
      
      <div class="flex gap-2">
        <!-- 搜索框 -->
        <div class="relative">
          <input 
            v-model="searchQuery"
            type="text" 
            placeholder="搜索记录..." 
            class="input input-bordered w-64"
          />
          <i-iconify 
            icon="ph:magnifying-glass" 
            class="absolute right-3 top-1/2 transform -translate-y-1/2 text-base-content/50"
          />
        </div>
        
        <!-- 过滤选项 -->
        <select 
          v-model="filterType"
          class="select select-bordered"
        >
          <option value="all">全部</option>
          <option value="selection">抽取记录</option>
          <option value="list">名单记录</option>
        </select>
        
        <!-- 排序选项 -->
        <select 
          v-model="sortOrder"
          class="select select-bordered"
        >
          <option value="newest">最新优先</option>
          <option value="oldest">最早优先</option>
        </select>
        
        <!-- 导出按钮 -->
        <button 
          class="btn btn-outline"
          @click="exportHistory"
        >
          <i-iconify icon="ph:export" class="mr-1" />
          导出
        </button>
        
        <!-- 清空按钮 -->
        <button 
          class="btn btn-error btn-outline"
          @click="clearHistory"
        >
          <i-iconify icon="ph:trash" class="mr-1" />
          清空
        </button>
      </div>
    </div>
    
    <!-- 历史记录表格 -->
    <div class="card bg-base-100 shadow-lg">
      <div class="card-body">
        <div class="overflow-x-auto">
          <table class="table w-full">
            <thead>
              <tr>
                <th>时间</th>
                <th>类型</th>
                <th>名称</th>
                <th>数量</th>
                <th>详情</th>
              </tr>
            </thead>
            <tbody>
              <tr 
                v-for="record in paginatedRecords" 
                :key="record.timestamp"
                :class="{ 'bg-base-200/50': record.type === 'selection' }"
              >
                <td class="whitespace-nowrap">{{ formatTime(record.timestamp) }}</td>
                <td>
                  <span 
                    v-if="record.type === 'selection'" 
                    class="badge badge-accent"
                  >
                    抽取记录
                  </span>
                  <span 
                    v-else 
                    class="badge badge-primary"
                  >
                    名单记录
                  </span>
                </td>
                <td class="font-medium">{{ record.name }}</td>
                <td>{{ record.names.length }}</td>
                <td>
                  <button 
                    class="btn btn-ghost btn-xs"
                    @click="$refs.detailsModal.showModal(); selectedRecord = record"
                  >
                    查看
                  </button>
                </td>
              </tr>
              
              <!-- 空状态 -->
              <tr v-if="paginatedRecords.length === 0">
                <td colspan="5" class="text-center py-8 text-base-content/50">
                  暂无记录
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <!-- 分页控件 -->
        <div class="flex justify-between items-center mt-4">
          <div class="text-sm text-base-content/70">
            共 {{ filteredRecords.length }} 条记录，当前显示 {{ paginatedRecords.length }} 条
          </div>
          
          <div class="join">
            <button 
              class="join-item btn btn-sm"
              :disabled="currentPage === 1"
              @click="prevPage"
            >
              <i-iconify icon="ph:caret-left" />
            </button>
            
            <button 
              v-for="page in pageNumbers" 
              :key="page"
              class="join-item btn btn-sm"
              :class="{ 'btn-active': page === currentPage }"
              :disabled="page === '...'"
              @click="typeof page === 'number' && changePage(page)"
            >
              {{ page }}
            </button>
            
            <button 
              class="join-item btn btn-sm"
              :disabled="currentPage === totalPages"
              @click="nextPage"
            >
              <i-iconify icon="ph:caret-right" />
            </button>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 详情模态框 -->
    <dialog ref="detailsModal" class="modal">
      <div class="modal-box w-11/12 max-w-3xl">
        <h3 class="font-bold text-lg">
          记录详情
        </h3>
        
        <div v-if="selectedRecord" class="mt-4">
          <div class="grid grid-cols-2 gap-4 mb-4">
            <div>
              <div class="text-sm text-base-content/70">记录类型</div>
              <div class="font-medium">
                {{ selectedRecord.type === 'selection' ? '抽取记录' : '名单记录' }}
              </div>
            </div>
            
            <div>
              <div class="text-sm text-base-content/70">时间</div>
              <div class="font-medium">{{ formatTime(selectedRecord.timestamp) }}</div>
            </div>
            
            <div>
              <div class="text-sm text-base-content/70">名称</div>
              <div class="font-medium">{{ selectedRecord.name }}</div>
            </div>
            
            <div>
              <div class="text-sm text-base-content/70">包含名字数量</div>
              <div class="font-medium">{{ selectedRecord.names.length }}</div>
            </div>
          </div>
          
          <div class="divider">名单内容</div>
          
          <div class="max-h-60 overflow-y-auto p-2 bg-base-200 rounded-lg">
            <div 
              v-for="(name, index) in selectedRecord.names"
              :key="index"
              class="p-2 border-b border-base-300 last:border-0"
              :class="{ 'bg-primary/10 font-medium': name === selectedRecord.name }"
            >
              {{ name }}
            </div>
          </div>
        </div>
        
        <div class="modal-action">
          <form method="dialog">
            <button class="btn">关闭</button>
          </form>
        </div>
      </div>
      
      <form method="dialog" class="modal-backdrop">
        <button>关闭</button>
      </form>
    </dialog>
  </div>
</template> 