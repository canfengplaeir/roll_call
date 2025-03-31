import { createRouter, createWebHistory } from 'vue-router';

const routes = [
  {
    path: '/',
    name: 'Home',
    component: () => import('../views/HomeView.vue'),
    meta: { title: '点名区' }
  },
  {
    path: '/lists',
    name: 'Lists',
    component: () => import('../views/ListView.vue'),
    meta: { title: '名单管理' }
  },
  {
    path: '/history',
    name: 'History',
    component: () => import('../views/HistoryView.vue'),
    meta: { title: '历史记录' }
  },
  {
    path: '/statistics',
    name: 'Statistics',
    component: () => import('../views/StatisticsView.vue'),
    meta: { title: '统计分析' }
  },
  // 捕获所有未匹配路由
  {
    path: '/:pathMatch(.*)*',
    redirect: '/'
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

// 路由标题
router.beforeEach((to, _, next) => {
  document.title = `${to.meta.title || '智能点名器'} - Roll Call App`;
  next();
});

export default router; 