<script setup lang="ts">
import { ref, computed } from 'vue';
import { useStorage } from '@vueuse/core';
import { useRouter } from 'vue-router';
import ConfirmDialog from '../components/ui/ConfirmDialog.vue';

interface NameList {
  id: string;
  name: string;
  description: string;
  tags: string[];
  names: string[];
  createdAt: number;
  updatedAt: number;
}

// 路由器
const router = useRouter();

// 存储所有名单
const nameLists = useStorage<NameList[]>('roll-call-lists', []);

// UI状态
const selectedListId = ref<string | null>(null);
const newListForm = ref({
  name: '',
  description: '',
  tags: '',
  namesText: ''
});
const searchQuery = ref('');
const isEditing = ref(false);
const dialogRef = ref<HTMLDialogElement | null>(null);

// 添加确认对话框相关状态
interface ConfirmData {
  title: string;
  message: string;
  type: 'warning' | 'error' | 'info' | 'success';
}

const confirmData = ref<ConfirmData>({
  title: '',
  message: '',
  type: 'warning'
});

interface ConfirmDialogInstance {
  show: () => void;
}

const confirmDialogRef = ref<ConfirmDialogInstance | null>(null);
const confirmAction = ref<() => void>(() => {});

// 设置确认对话框
const setupConfirmDialog = (
  title: string, 
  message: string, 
  action: () => void, 
  type: 'info' | 'warning' | 'error' | 'success' = 'warning'
) => {
  confirmData.value = { title, message, type };
  confirmAction.value = action;
  confirmDialogRef.value?.show();
};

// 从TXT导入名单
const importFromTxt = () => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.txt';
  input.onchange = (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const names = content.split('\n').map(name => name.trim()).filter(Boolean);
      
      if (names.length === 0) {
        alert('文件内容为空');
        return;
      }

      const now = Date.now();
      nameLists.value.push({
        id: `list-${now}`,
        name: file.name.replace('.txt', ''),
        description: `从${file.name}导入的名单`,
        tags: ['导入'],
        names,
        createdAt: now,
        updatedAt: now
      });
    };
    reader.readAsText(file);
  };
  input.click();
};

// 创建/编辑名单
const createOrUpdateList = () => {
  if (!newListForm.value.name.trim()) {
    alert('请输入名单名称');
    return;
  }
  
  const names = newListForm.value.namesText
    .split('\n')
    .map(name => name.trim())
    .filter(name => name);
    
  if (names.length === 0) {
    alert('请至少输入一个名字');
    return;
  }
  
  const now = Date.now();
  const tags = newListForm.value.tags
    .split(',')
    .map(tag => tag.trim())
    .filter(tag => tag);
  
  if (isEditing.value && selectedListId.value) {
    // 更新已有名单
    const index = nameLists.value.findIndex(list => list.id === selectedListId.value);
    if (index !== -1) {
      nameLists.value[index] = {
        ...nameLists.value[index],
        name: newListForm.value.name,
        description: newListForm.value.description,
        tags,
        names,
        updatedAt: now
      };
    }
  } else {
    // 创建新名单
    nameLists.value.push({
      id: `list-${now}`,
      name: newListForm.value.name,
      description: newListForm.value.description,
      tags,
      names,
      createdAt: now,
      updatedAt: now
    });
  }
  
  // 重置表单
  resetForm();
  closeCreateDialog();
};

// 编辑名单
const editList = (listId: string) => {
  const list = nameLists.value.find(list => list.id === listId);
  if (list) {
    isEditing.value = true;
    selectedListId.value = listId;
    newListForm.value = {
      name: list.name,
      description: list.description,
      tags: list.tags.join(', '),
      namesText: list.names.join('\n')
    };
    openCreateDialog();
  }
};

// 打开创建对话框
const openCreateDialog = () => {
  if (dialogRef.value) {
    dialogRef.value.showModal();
  }
};

// 关闭创建对话框
const closeCreateDialog = () => {
  if (dialogRef.value) {
    dialogRef.value.close();
  }
};

// 删除名单
const deleteList = (listId: string) => {
  const list = nameLists.value.find(l => l.id === listId);
  if (!list) return;
  
  setupConfirmDialog(
    '删除名单', 
    `确定要删除名单"${list.name}"吗？此操作不可撤销。`, 
    () => {
      nameLists.value = nameLists.value.filter(l => l.id !== listId);
    },
    'error'
  );
};

// 重置表单
const resetForm = () => {
  newListForm.value = {
    name: '',
    description: '',
    tags: '',
    namesText: ''
  };
  isEditing.value = false;
  selectedListId.value = null;
};

// 导入名单
const importList = (event: Event) => {
  const input = event.target as HTMLInputElement;
  if (!input.files?.length) return;
  
  const file = input.files[0];
  const reader = new FileReader();
  
  reader.onload = (e) => {
    try {
      const content = e.target?.result as string;
      const data = JSON.parse(content);
      
      if (Array.isArray(data)) {
        nameLists.value = [
          ...nameLists.value,
          ...data.filter(item => 
            typeof item === 'object' && 
            item.name && 
            Array.isArray(item.names) &&
            item.names.length > 0
          )
        ];
      }
    } catch (err) {
      alert('导入失败，请检查文件格式');
      console.error(err);
    }
  };
  
  reader.readAsText(file);
};

// 使用名单
const useList = (list: NameList) => {
  // 保存当前名单到本地存储
  localStorage.setItem('current-list', JSON.stringify(list));
  
  // 跳转到主页
  router.push('/');
};

// 过滤后的名单
const filteredLists = computed(() => {
  if (!searchQuery.value) return nameLists.value;
  
  const query = searchQuery.value.toLowerCase();
  return nameLists.value.filter(list => 
    list.name.toLowerCase().includes(query) ||
    list.description.toLowerCase().includes(query) ||
    list.tags.some(tag => tag.toLowerCase().includes(query))
  );
});

// 添加导出单个名单的函数
const exportSingleList = (list: NameList, format: 'txt' | 'json') => {
  let dataStr: string;
  let fileName: string;
  
  if (format === 'json') {
    // JSON格式导出
    dataStr = JSON.stringify([list], null, 2);
    fileName = `名单_${list.name}_${new Date().toISOString().split('T')[0]}.json`;
    const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', fileName);
    linkElement.click();
  } else {
    // TXT格式导出（每行一个名字）
    dataStr = list.names.join('\n');
    fileName = `名单_${list.name}_${new Date().toISOString().split('T')[0]}.txt`;
    const dataUri = `data:text/plain;charset=utf-8,${encodeURIComponent(dataStr)}`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', fileName);
    linkElement.click();
  }
};

// 修改导出函数，添加确认
const exportWithConfirm = (list: NameList, format: 'txt' | 'json') => {
  setupConfirmDialog(
    '导出名单', 
    `确定要将名单"${list.name}"导出为${format.toUpperCase()}格式吗？`, 
    () => exportSingleList(list, format),
    'info'
  );
};

// 导入预览状态
interface ImportPreview {
  fileName: string;
  format: 'txt' | 'json';
  lists: {
    name: string;
    count: number;
    sample: string[];
    allNames: string[];
  }[];
}

const importPreview = ref<ImportPreview | null>(null);
const importPreviewDialogRef = ref<HTMLDialogElement | null>(null);

// 修改预览导入函数，保存完整的名单数据
const previewImport = async (file: File | undefined) => {
  if (!file) return;
  
  try {
    const content = await file.text();
    const format = file.name.endsWith('.json') ? 'json' : 'txt';
    
    if (format === 'json') {
      const data = JSON.parse(content);
      if (!Array.isArray(data)) {
        throw new Error('JSON格式错误，应为名单数组');
      }
      
      // 验证JSON数据结构并保存完整数据
      const validLists = data.filter((item: any) => {
        return (
          item &&
          typeof item === 'object' &&
          typeof item.name === 'string' &&
          Array.isArray(item.names) &&
          item.names.every((name: any) => typeof name === 'string') &&
          item.names.length > 0
        );
      });

      if (validLists.length === 0) {
        throw new Error('没有找到有效的名单数据');
      }
      
      importPreview.value = {
        fileName: file.name,
        format,
        lists: validLists.map(list => ({
          name: list.name,
          count: list.names.length,
          sample: list.names.slice(0, 5),
          allNames: list.names
        }))
      };
    } else {
      // TXT格式处理
      const names = content
        .split('\n')
        .map(n => n.trim())
        .filter(n => n.length > 0);

      if (names.length === 0) {
        throw new Error('文件内容为空');
      }
      
      importPreview.value = {
        fileName: file.name,
        format,
        lists: [{
          name: file.name.replace('.txt', ''),
          count: names.length,
          sample: names.slice(0, 5),
          allNames: names
        }]
      };
    }
    
    importPreviewDialogRef.value?.showModal();
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : '文件格式错误，请检查文件内容';
    setupConfirmDialog(
      '导入失败',
      errorMessage,
      () => {},
      'error'
    );
  }
};

// 修改确认导入函数
const confirmImport = async () => {
  if (!importPreview.value) return;
  
  try {
    // 从 importPreview 中直接获取文件内容，使用完整的 allNames
    if (importPreview.value.format === 'json') {
      const now = Date.now();
      
      // 为每个列表生成唯一ID，使用完整的名单数据
      const newLists = importPreview.value.lists.map(list => ({
        id: `list-${now}-${Math.random().toString(36).slice(2)}`,
        name: list.name,
        description: `从${importPreview.value?.fileName}导入的名单`,
        tags: ['导入'],
        names: list.allNames, // 使用完整的名单数据，而不是sample
        createdAt: now,
        updatedAt: now
      }));

      nameLists.value = [...nameLists.value, ...newLists];
    } else {
      // 处理TXT导入
      const now = Date.now();
      const list = importPreview.value.lists[0]; // TXT格式只有一个列表
      
      nameLists.value.push({
        id: `list-${now}`,
        name: list.name,
        description: `从${importPreview.value.fileName}导入的名单`,
        tags: ['导入'],
        names: list.allNames, // 使用完整的名单数据，而不是sample
        createdAt: now,
        updatedAt: now
      });
    }
    
    importPreviewDialogRef.value?.close();
    importPreview.value = null;
    
    // 显示成功提示
    setupConfirmDialog(
      '导入成功',
      '名单已成功导入',
      () => {},
      'success'
    );
  } catch (err) {
    console.error(err);
    setupConfirmDialog(
      '导入失败',
      '导入过程中发生错误，请重试',
      () => {},
      'error'
    );
  }
};

// 修复文件输入事件处理
const handleFileInput = (event: Event) => {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (file) {
    previewImport(file);
  }
  // 重置input，允许选择相同文件
  input.value = '';
};

// 添加拖拽导入支持
const handleDrop = (e: DragEvent) => {
  e.preventDefault();
  
  const files = e.dataTransfer?.files;
  if (!files?.length) return;
  
  const file = files[0];
  if (!file.name.endsWith('.txt') && !file.name.endsWith('.json')) {
    alert('只支持导入 .txt 或 .json 文件');
    return;
  }
  
  previewImport(file);
};

// 添加批量导出函数
const exportAllLists = (format: 'txt' | 'json') => {
  if (nameLists.value.length === 0) {
    setupConfirmDialog(
      '导出失败',
      '当前没有可导出的名单',
      () => {},
      'error'
    );
    return;
  }
  
  setupConfirmDialog(
    '导出所有名单', 
    `确定要导出所有${nameLists.value.length}个名单为${format.toUpperCase()}格式吗？`, 
    () => {
      if (format === 'json') {
        const dataStr = JSON.stringify(nameLists.value, null, 2);
        const fileName = `所有名单_${new Date().toISOString().split('T')[0]}.json`;
        const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`;
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', fileName);
        linkElement.click();
      } else {
        // TXT格式导出，每个名单用标题分隔
        const txtContent = nameLists.value.map(list => 
          `### ${list.name} ###\n${list.names.join('\n')}`
        ).join('\n\n');
        
        const fileName = `所有名单_${new Date().toISOString().split('T')[0]}.txt`;
        const dataUri = `data:text/plain;charset=utf-8,${encodeURIComponent(txtContent)}`;
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', fileName);
        linkElement.click();
      }
    },
    'info'
  );
};
</script>

<template>
  <div class="container mx-auto py-4">
    <!-- 顶部卡片 -->
    <div class="card bg-base-100 shadow-xl mb-6">
      <div class="card-body">
        <div class="flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h2 class="card-title text-2xl mb-2">
              <i-iconify icon="ph:clipboard-text-fill" class="text-primary mr-2" />
              名单管理
            </h2>
            <p class="text-base-content/70">
              当前共 {{ nameLists.length }} 个名单，{{ 
                nameLists.reduce((total, list) => total + list.names.length, 0) 
              }} 人
            </p>
          </div>
          
          <div class="flex gap-2">
            <!-- 搜索框 -->
            <div class="relative">
              <input 
                v-model="searchQuery"
                type="text" 
                placeholder="搜索名单..." 
                class="input input-bordered w-full md:w-64"
              />
              <i-iconify 
                icon="ph:magnifying-glass" 
                class="absolute right-3 top-1/2 transform -translate-y-1/2 text-base-content/50"
              />
            </div>
            
            <!-- 创建名单按钮 -->
            <button 
              class="btn btn-primary"
              @click="isEditing = false; resetForm(); openCreateDialog()"
            >
              <i-iconify icon="ph:plus" class="mr-1" />
              创建名单
            </button>
            
            <!-- 导入导出按钮 -->
            <div class="dropdown dropdown-end">
              <label tabindex="0" class="btn btn-outline">
                <i-iconify icon="ph:file-arrow-up-down" class="mr-1" />
                导入/导出
              </label>
              <ul tabindex="0" class="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-52">
                <li>
                  <label class="cursor-pointer">
                    <i-iconify icon="ph:file-arrow-up" class="mr-2" />
                    导入JSON
                    <input 
                      type="file" 
                      accept=".json" 
                      class="hidden"
                      @change="handleFileInput"
                    />
                  </label>
                </li>
                <li>
                  <a @click="importFromTxt">
                    <i-iconify icon="ph:file-text" class="mr-2" />
                    导入TXT名单
                  </a>
                </li>
                <li class="menu-title">导出所有名单</li>
                <li>
                  <a @click="exportAllLists('json')">
                    <i-iconify icon="ph:file-json" class="mr-2" />
                    JSON格式
                  </a>
                </li>
                <li>
                  <a @click="exportAllLists('txt')">
                    <i-iconify icon="ph:file-text" class="mr-2" />
                    TXT格式
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 名单卡片列表 -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div 
        v-for="list in filteredLists" 
        :key="list.id"
        class="card bg-base-100 shadow-lg hover:shadow-xl transition-shadow duration-300"
      >
        <div class="card-body">
          <h2 class="card-title">{{ list.name }}</h2>
          
          <p v-if="list.description" class="mt-1 text-base-content/70">
            {{ list.description }}
          </p>
          
          <div class="flex flex-wrap gap-1 mt-2">
            <span 
              v-for="tag in list.tags" 
              :key="tag"
              class="badge badge-outline badge-primary"
            >
              {{ tag }}
            </span>
          </div>
          
          <div class="mt-4 px-2 py-2 bg-base-200 rounded-md">
            <div class="text-sm text-base-content/70 mb-1">名单内容 ({{ list.names.length }}人)</div>
            <div class="max-h-24 overflow-y-auto pr-2">
              <div 
                v-for="(name, index) in list.names.slice(0, 10)" 
                :key="index"
                class="text-sm py-1 border-b border-base-300 last:border-0"
              >
                {{ name }}
              </div>
              <div 
                v-if="list.names.length > 10" 
                class="text-xs text-base-content/50 text-center mt-1"
              >
                还有 {{ list.names.length - 10 }} 人...
              </div>
            </div>
          </div>
          
          <div class="text-xs text-base-content/50 mt-3">
            创建于 {{ new Date(list.createdAt).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }) }}
           <br>
           更新于 {{ new Date(list.updatedAt).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }) }}
          </div>
          
          <div class="card-actions justify-end mt-4">
            <button 
              class="btn btn-ghost btn-sm"
              @click="editList(list.id)"
            >
              <i-iconify icon="ph:pencil" class="mr-1" />
              编辑
            </button>
            
            <!-- 添加导出下拉菜单 -->
            <div class="dropdown dropdown-end">
              <button class="btn btn-ghost btn-sm">
                <i-iconify icon="ph:file-arrow-down" class="mr-1" />
                导出
              </button>
              <ul class="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-36">
                <li><a @click="exportWithConfirm(list, 'txt')">TXT格式</a></li>
                <li><a @click="exportWithConfirm(list, 'json')">JSON格式</a></li>
              </ul>
            </div>
            
            <button 
              class="btn btn-ghost btn-sm text-error"
              @click="deleteList(list.id)"
            >
              <i-iconify icon="ph:trash" class="mr-1" />
              删除
            </button>
            
            <button 
              class="btn btn-primary btn-sm"
              @click="useList(list)"
            >
              <i-iconify icon="ph:check" class="mr-1" />
              使用此名单
            </button>
          </div>
        </div>
      </div>
      
      <!-- 空状态 -->
      <div 
        v-if="filteredLists.length === 0" 
        class="card bg-base-100 shadow-lg md:col-span-2 lg:col-span-3"
        @dragover.prevent
        @drop="handleDrop"
      >
        <div class="card-body flex flex-col items-center justify-center py-12 border-2 border-dashed border-base-300 rounded-box">
          <i-iconify icon="ph:file-arrow-up" class="text-6xl text-base-content/20 mb-4" />
          <p class="text-base-content/60 text-center">
            拖拽文件到此处导入<br>
            支持 .txt 和 .json 格式
          </p>
        </div>
      </div>
    </div>
    
    <!-- 创建/编辑名单模态框 -->
    <dialog ref="dialogRef" class="modal">
      <div class="modal-box w-11/12 max-w-3xl">
        <h3 class="font-bold text-lg">
          <i-iconify icon="ph:clipboard-text" class="mr-2" />
          {{ isEditing ? '编辑名单' : '创建新名单' }}
        </h3>
        
        <div class="mt-4 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
          <div class="md:col-span-2">
            <label class="form-control w-full">
              <div class="label">
                <span class="label-text">名单名称</span>
              </div>
              <input 
                v-model="newListForm.name"
                type="text" 
                placeholder="输入名单名称" 
                class="input input-bordered w-full" 
              />
            </label>
          </div>
          
          <div class="md:col-span-2">
            <label class="form-control w-full">
              <div class="label">
                <span class="label-text">描述</span>
              </div>
              <input 
                v-model="newListForm.description"
                type="text" 
                placeholder="输入名单描述（可选）" 
                class="input input-bordered w-full" 
              />
            </label>
          </div>
          
          <div class="md:col-span-2">
            <label class="form-control w-full">
              <div class="label">
                <span class="label-text">标签</span>
              </div>
              <input 
                v-model="newListForm.tags"
                type="text" 
                placeholder="多个标签用逗号分隔（可选）" 
                class="input input-bordered w-full" 
              />
            </label>
          </div>
          
          <div class="md:col-span-2">
            <label class="form-control w-full">
              <div class="label">
                <span class="label-text">名单内容</span>
                <span class="label-text-alt">每行一个名字</span>
              </div>
              <textarea 
                v-model="newListForm.namesText"
                class="textarea textarea-bordered h-48" 
                placeholder="请输入名单内容，每行一个名字"
              ></textarea>
            </label>
          </div>
        </div>
        
        <div class="modal-action">
          <button 
            class="btn btn-ghost"
            @click="closeCreateDialog"
          >
            取消
          </button>
          
          <button 
            class="btn btn-primary"
            @click="createOrUpdateList"
          >
            {{ isEditing ? '保存修改' : '创建名单' }}
          </button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button>close</button>
      </form>
    </dialog>

    <!-- 在模板末尾添加确认对话框组件 -->
    <ConfirmDialog 
      ref="confirmDialogRef"
      :title="confirmData.title"
      :message="confirmData.message"
      :type="confirmData.type"
      @confirm="confirmAction"
    />

    <!-- 导入预览对话框 -->
    <dialog ref="importPreviewDialogRef" class="modal">
      <div class="modal-box">
        <h3 class="font-bold text-lg mb-4">
          <i-iconify icon="ph:file-arrow-up" class="mr-2" />
          导入预览
        </h3>
        
        <div v-if="importPreview" class="space-y-4">
          <div class="text-sm text-base-content/70">
            文件名：{{ importPreview.fileName }}
          </div>
          
          <div v-for="(list, index) in importPreview.lists" :key="index" class="card bg-base-200">
            <div class="card-body p-4">
              <h4 class="font-medium">{{ list.name }}</h4>
              <p class="text-sm text-base-content/70">共 {{ list.count }} 人</p>
              <div class="text-sm mt-2">
                <div>预览：</div>
                <div class="space-y-1 mt-1">
                  <div v-for="name in list.sample" :key="name" class="text-base-content/80">
                    {{ name }}
                  </div>
                  <div v-if="list.count > list.sample.length" class="text-base-content/50">
                    ...等{{ list.count - list.sample.length }}人
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="modal-action">
          <button class="btn btn-ghost" @click="importPreviewDialogRef?.close()">取消</button>
          <button class="btn btn-primary" @click="confirmImport">确认导入</button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button>close</button>
      </form>
    </dialog>
  </div>
</template>

<style scoped>
.dropdown-content {
  min-width: 12rem;
}
</style> 