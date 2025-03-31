<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useStorage } from '@vueuse/core';

// 路由
const router = useRouter();
const route = useRoute();

// 侧边栏状态管理，但不再提供给组件
const isSidebarOpen = ref(window.innerWidth >= 768);

// 当前激活的导航项
const activeNavItem = computed(() => {
  const path = route.path;
  if (path === '/') return 'home';
  return path.substring(1); // 去除前导斜杠
});

// 导航到指定路由
const navigateTo = (path: string) => {
  router.push(path);
  // 在移动设备上自动收起侧边栏
  if (window.innerWidth < 768) {
    isSidebarOpen.value = false;
  }
};

// 导航项配置
const navItems = [
  { id: 'home', name: '点名区', icon: 'ph:user-list-fill', path: '/' },
  { id: 'lists', name: '名单管理', icon: 'ph:clipboard-text-fill', path: '/lists' },
  { id: 'history', name: '历史记录', icon: 'ph:clock-fill', path: '/history' },
  { id: 'statistics', name: '统计分析', icon: 'ph:chart-pie-fill', path: '/statistics' }
];

// 应用主题
const theme = useStorage('roll-call-theme', 'light');
</script>

<template>
  <div
    class="min-h-screen flex bg-gradient-to-br from-base-100 to-base-200 transition-all duration-500"
    :data-theme="theme"
  >
    <!-- 侧边栏 -->
    <div
      class="sidebar bg-base-100/90 backdrop-blur-md transition-all duration-500 border-r border-base-300/30 fixed top-0 bottom-0 left-0 flex flex-col shadow-2xl z-30"
      :class="{ 'w-72 translate-x-0': isSidebarOpen, 'w-72 -translate-x-full lg:w-20 lg:translate-x-0': !isSidebarOpen }"
    >
      <!-- Logo -->
      <div class="p-5 flex items-center border-b border-base-300/20">
        <div class="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center shadow-md">
          <span class="font-bold text-2xl text-primary-content">RC</span>
        </div>
        <h1
          v-if="isSidebarOpen"
          class="ml-4 font-bold text-xl transition-all duration-500 opacity-100 text-base-content bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent"
        >
          智能点名器
        </h1>
      </div>
      
      <!-- 菜单 -->
      <nav class="flex-1 overflow-y-auto p-2 pt-5">
        <ul class="space-y-2">
          <li v-for="item in navItems" :key="item.id">
            <a
              @click="navigateTo(item.path)"
              class="group flex items-center p-4 rounded-xl text-base-content/80 hover:bg-base-200/50 cursor-pointer transition-all duration-300"
              :class="{
                'bg-gradient-to-r from-primary/10 to-secondary/10 !text-primary shadow-sm': activeNavItem === item.id
              }"
            >
              <div class="relative">
                <i-iconify
                  :icon="item.icon"
                  class="text-xl transition-transform duration-300 group-hover:scale-110"
                  :class="{
                    'text-primary': activeNavItem === item.id,
                    'group-hover:text-secondary': activeNavItem !== item.id
                  }"
                />
              </div>
              <span
                v-if="isSidebarOpen"
                class="ml-4 transition-all duration-500 whitespace-nowrap font-medium"
                :class="{
                  'text-primary': activeNavItem === item.id,
                  'group-hover:text-secondary': activeNavItem !== item.id
                }"
              >
                {{ item.name }}
              </span>
            </a>
          </li>
        </ul>
      </nav>
      
      <!-- 折叠按钮 -->
      <div class="p-4 border-t border-base-200">
        <button 
          @click="isSidebarOpen = !isSidebarOpen"
          class="w-full flex items-center justify-center rounded-lg p-2 bg-base-200 hover:bg-base-300 transition-colors"
          :title="isSidebarOpen ? '收起侧边栏' : '展开侧边栏'"
        >
          <i-iconify 
            :icon="isSidebarOpen ? 'ph:caret-left-bold' : 'ph:caret-right-bold'"
            class="text-base-content/70" 
          />
        </button>
      </div>
    </div>
    
    <!-- 背景遮罩 (移动端) -->
    <div 
      v-if="isSidebarOpen" 
      @click="isSidebarOpen = false"
      class="fixed inset-0 bg-black/50 z-20 lg:hidden"
    ></div>
    
    <!-- 主内容区 -->
    <div 
      class="flex-1 transition-all duration-500"
      :class="{
        'lg:ml-72': isSidebarOpen,
        'lg:ml-20': !isSidebarOpen
      }"
    >
      <!-- 顶部导航栏 -->
      <header class="bg-base-100/80 backdrop-blur-md border-b border-base-300/30 shadow-sm p-4 flex items-center justify-between sticky top-0 z-10">
        <div class="flex items-center">
          <!-- 移动端菜单按钮 -->
          <button
            @click="isSidebarOpen = !isSidebarOpen"
            class="btn btn-square btn-ghost hover:bg-base-200/50 mr-2 lg:hidden transition-colors"
          >
            <i-iconify icon="ph:list" class="text-2xl text-base-content/80 hover:text-primary transition-colors" />
          </button>
          
          <!-- 页面标题 -->
          <h1 class="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            {{ route.meta.title || '智能点名器' }}
          </h1>
        </div>
        
        <!-- 主题切换按钮 -->
        <button
          @click="theme = theme === 'light' ? 'dark' : 'light'"
          class="btn btn-ghost btn-circle hover:bg-base-200/50 transition-colors"
          :title="theme === 'light' ? '切换深色模式' : '切换浅色模式'"
        >
          <i-iconify
            :icon="theme === 'light' ? 'ph:moon-fill' : 'ph:sun-fill'"
            class="text-xl text-base-content/80 hover:text-primary transition-colors"
          />
        </button>
      </header>
      
      <!-- 主要内容 -->
      <main class="flex-1 overflow-auto p-6">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </main>
    </div>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.fade-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

.fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

/* 侧边栏折叠动画 */
.sidebar-transition {
  transition-property: transform, width;
  transition-duration: 0.3s;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
}
</style>
