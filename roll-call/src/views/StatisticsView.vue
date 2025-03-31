<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick, onUnmounted } from 'vue';
import { useStorage } from '@vueuse/core';
import * as echarts from 'echarts';

interface HistoryRecord {
  name: string;
  timestamp: number;
  names: string[];
  type: 'list' | 'selection';
  listId?: string;
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

// 获取历史记录和名单数据
const history = useStorage<HistoryRecord[]>('roll-call-history', []);
const nameLists = useStorage<NameList[]>('roll-call-lists', []);

// 获取主题设置
const theme = useStorage('roll-call-theme', 'light');

// 基础统计数据
const statistics = computed(() => {
  const selectionRecords = history.value.filter(record => record.type === 'selection');
  
  return {
    // 总抽取次数
    totalSelections: selectionRecords.length,
    // 今日抽取次数
    todaySelections: selectionRecords.filter(record => {
      const today = new Date();
      const recordDate = new Date(record.timestamp);
      return today.toDateString() === recordDate.toDateString();
    }).length,
    // 名单总数
    totalLists: nameLists.value.length,
    // 总人数（所有名单去重）
    totalPeople: new Set(nameLists.value.flatMap(list => list.names)).size,
  };
});

// 被抽取频率统计
const frequencyStats = computed(() => {
  const frequency: Record<string, number> = {};
  const selectionRecords = history.value.filter(record => record.type === 'selection');
  
  selectionRecords.forEach(record => {
    frequency[record.name] = (frequency[record.name] || 0) + 1;
  });
  
  return Object.entries(frequency)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([name, count]) => ({
      name,
      count,
      percentage: (count / selectionRecords.length * 100).toFixed(1)
    }));
});

// 时段分布统计
const timeDistribution = computed(() => {
  const distribution = Array(24).fill(0);
  
  history.value
    .filter(record => record.type === 'selection')
    .forEach(record => {
      const hour = new Date(record.timestamp).getHours();
      distribution[hour]++;
    });
  
  return distribution;
});

// 添加每日抽取趋势统计
const dailyTrends = computed(() => {
  const trends: Record<string, number> = {};
  const days = 7; // 统计最近7天
  
  // 初始化最近7天的数据
  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    trends[date.toDateString()] = 0;
  }
  
  // 统计数据
  history.value
    .filter(record => record.type === 'selection')
    .forEach(record => {
      const date = new Date(record.timestamp);
      if (trends.hasOwnProperty(date.toDateString())) {
        trends[date.toDateString()]++;
      }
    });
  
  return Object.entries(trends)
    .sort(([dateA], [dateB]) => new Date(dateA).getTime() - new Date(dateB).getTime())
    .map(([date, count]) => ({
      date: new Date(date).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }),
      count
    }));
});

// 添加名单使用率统计
const listUsageStats = computed(() => {
  const usage: Record<string, number> = {};
  
  // 初始化所有名单的使用次数
  nameLists.value.forEach(list => {
    usage[list.id] = 0;
  });
  
  // 统计每个名单的使用次数
  history.value
    .filter(record => record.type === 'selection' && record.listId)
    .forEach(record => {
      if (record.listId && usage.hasOwnProperty(record.listId)) {
        usage[record.listId]++;
      }
    });
  
  return nameLists.value
    .map(list => ({
      name: list.name,
      count: usage[list.id],
      total: list.names.length,
      lastUsed: history.value
        .filter(record => record.listId === list.id)
        .sort((a, b) => b.timestamp - a.timestamp)[0]?.timestamp
    }))
    .sort((a, b) => b.count - a.count);
});

// 添加未被抽取统计
const unselectedStats = computed(() => {
  const selectedNames = new Set(
    history.value
      .filter(record => record.type === 'selection')
      .map(record => record.name)
  );
  
  return nameLists.value.map(list => ({
    listName: list.name,
    unselected: list.names.filter(name => !selectedNames.has(name))
  }));
});

// 日期格式化
const formatDate = (timestamp: number) => {
  return new Date(timestamp).toLocaleDateString('zh-CN');
};

// 图表实例引用
const timeChartRef = ref<HTMLElement | null>(null);
const trendChartRef = ref<HTMLElement | null>(null);
let timeChart: echarts.ECharts | null = null;
let trendChart: echarts.ECharts | null = null;

// 修改 getThemeColors 函数，根据当前主题返回对应的颜色
const getThemeColors = () => {
  const isDark = theme.value === 'dark';
  
  return {
    primary: isDark ? '#661AE6' : '#570DF8',
    primaryLight: isDark ? '#854DFF' : '#7B2FFF',
    success: isDark ? '#2FB344' : '#36D399',
    successLight: isDark ? '#3ECC57' : '#87FFD4'
  };
};

// 初始化图表
const initCharts = () => {
  try {
    if (timeChartRef.value) {
      timeChart = echarts.init(timeChartRef.value);
      updateTimeChart();
    }
    
    if (trendChartRef.value) {
      trendChart = echarts.init(trendChartRef.value);
      updateTrendChart();
    }
  } catch (error) {
    console.error('图表初始化失败:', error);
  }
};

// 清理图表
const disposeCharts = () => {
  if (timeChart) {
    timeChart.dispose();
    timeChart = null;
  }
  if (trendChart) {
    trendChart.dispose();
    trendChart = null;
  }
};

// 处理窗口大小变化
const handleResize = () => {
  timeChart?.resize();
  trendChart?.resize();
};

// 组件挂载时初始化
onMounted(() => {
  nextTick(() => {
    initCharts();
    window.addEventListener('resize', handleResize);
  });
});

// 组件卸载时清理
onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
  disposeCharts();
});

// 监听数据变化
watch([timeDistribution, dailyTrends], () => {
  nextTick(() => {
    updateTimeChart();
    updateTrendChart();
  });
});

// 监听主题变化
watch(() => theme.value, () => {
  nextTick(() => {
    disposeCharts();
    initCharts();
  });
});

// 更新时段分布图表
const updateTimeChart = () => {
  if (!timeChart) return;
  
  try {
    const colors = getThemeColors();
    const option = {
      tooltip: {
        trigger: 'axis',
        formatter: '{b}时: {c}次'
      },
      xAxis: {
        type: 'category',
        data: Array.from({ length: 24 }, (_, i) => `${i}`)
      },
      yAxis: {
        type: 'value',
        name: '抽取次数'
      },
      series: [{
        data: timeDistribution.value,
        type: 'bar',
        name: '抽取次数',
        itemStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [{
              offset: 0,
              color: colors.primary // 使用实际的颜色值
            }, {
              offset: 1,
              color: colors.primaryLight
            }]
          }
        }
      }]
    };
    
    timeChart.setOption(option);
  } catch (error) {
    console.error('时段分布图表更新失败:', error);
  }
};

// 更新趋势图表
const updateTrendChart = () => {
  if (!trendChart) return;
  
  try {
    const colors = getThemeColors();
    const option = {
      tooltip: {
        trigger: 'axis'
      },
      xAxis: {
        type: 'category',
        data: dailyTrends.value.map(item => item.date)
      },
      yAxis: {
        type: 'value',
        name: '抽取次数'
      },
      series: [{
        data: dailyTrends.value.map(item => item.count),
        type: 'line',
        name: '抽取次数',
        smooth: true,
        symbolSize: 8,
        lineStyle: {
          width: 3
        },
        areaStyle: {
          opacity: 0.3,
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [{
              offset: 0,
              color: colors.success
            }, {
              offset: 1,
              color: colors.successLight
            }]
          }
        },
        itemStyle: {
          color: colors.success
        }
      }]
    };
    
    trendChart.setOption(option);
  } catch (error) {
    console.error('趋势图表更新失败:', error);
  }
};
</script>

<template>
  <div class="container mx-auto px-4 py-6 max-w-7xl">
    <h1 class="text-2xl font-bold mb-6 flex items-center">
      <i-iconify icon="ph:chart-pie-fill" class="text-primary mr-2" />
      统计分析
    </h1>
    
    <!-- 基础统计卡片 -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <div class="card bg-primary text-primary-content">
        <div class="card-body">
          <h2 class="card-title text-2xl">{{ statistics.totalSelections }}</h2>
          <p>总抽取次数</p>
        </div>
      </div>
      
      <div class="card bg-accent text-accent-content">
        <div class="card-body">
          <h2 class="card-title text-2xl">{{ statistics.todaySelections }}</h2>
          <p>今日抽取</p>
        </div>
      </div>
      
      <div class="card bg-secondary text-secondary-content">
        <div class="card-body">
          <h2 class="card-title text-2xl">{{ statistics.totalLists }}</h2>
          <p>名单总数</p>
        </div>
      </div>
      
      <div class="card bg-neutral text-neutral-content">
        <div class="card-body">
          <h2 class="card-title text-2xl">{{ statistics.totalPeople }}</h2>
          <p>总人数</p>
        </div>
      </div>
    </div>
    
    <!-- 抽取频率排行 -->
    <div class="card bg-base-100 shadow-lg mb-8">
      <div class="card-body">
        <h2 class="card-title mb-4">
          <i-iconify icon="ph:trophy" class="text-warning mr-2" />
          抽取频率排行
        </h2>
        
        <div class="overflow-x-auto">
          <table class="table table-zebra w-full">
            <thead>
              <tr>
                <th>排名</th>
                <th>姓名</th>
                <th>次数</th>
                <th>占比</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, index) in frequencyStats" :key="item.name">
                <td>
                  <div class="flex items-center">
                    <span v-if="index < 3" class="text-xl mr-2">
                      {{ ['🥇', '🥈', '🥉'][index] }}
                    </span>
                    <span v-else>{{ index + 1 }}</span>
                  </div>
                </td>
                <td>{{ item.name }}</td>
                <td>{{ item.count }}次</td>
                <td>{{ item.percentage }}%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
    
    <!-- 修改时段分布图表 -->
    <div class="card bg-base-100 shadow-lg">
      <div class="card-body">
        <h2 class="card-title mb-4">
          <i-iconify icon="ph:clock" class="text-info mr-2" />
          时段分布
        </h2>
        <div ref="timeChartRef" class="w-full h-[300px]"></div>
      </div>
    </div>
    
    <!-- 修改每日趋势图表 -->
    <div class="card bg-base-100 shadow-lg mb-8">
      <div class="card-body">
        <h2 class="card-title mb-4">
          <i-iconify icon="ph:trend-up" class="text-success mr-2" />
          每日抽取趋势
        </h2>
        <div ref="trendChartRef" class="w-full h-[300px]"></div>
      </div>
    </div>
    
    <!-- 添加名单使用统计 -->
    <div class="card bg-base-100 shadow-lg mb-8">
      <div class="card-body">
        <h2 class="card-title mb-4">
          <i-iconify icon="ph:list-checks" class="text-secondary mr-2" />
          名单使用统计
        </h2>
        
        <div class="overflow-x-auto">
          <table class="table table-zebra w-full">
            <thead>
              <tr>
                <th>名单</th>
                <th>使用次数</th>
                <th>包含人数</th>
                <th>最后使用</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="list in listUsageStats" :key="list.name">
                <td>{{ list.name }}</td>
                <td>{{ list.count }}次</td>
                <td>{{ list.total }}人</td>
                <td>
                  {{ list.lastUsed ? formatDate(list.lastUsed) : '从未使用' }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
    
    <!-- 添加未抽取统计 -->
    <div class="card bg-base-100 shadow-lg">
      <div class="card-body">
        <h2 class="card-title mb-4">
          <i-iconify icon="ph:user-circle-minus" class="text-error mr-2" />
          未被抽取统计
        </h2>
        
        <div class="grid gap-4">
          <div v-for="stat in unselectedStats" :key="stat.listName" class="collapse collapse-arrow bg-base-200">
            <input type="checkbox" /> 
            <div class="collapse-title font-medium">
              {{ stat.listName }}
              <span class="badge badge-sm ml-2">{{ stat.unselected.length }}人未抽取</span>
            </div>
            <div class="collapse-content">
              <div class="flex flex-wrap gap-2 mt-2">
                <span 
                  v-for="name in stat.unselected" 
                  :key="name"
                  class="badge badge-outline"
                >
                  {{ name }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.grid-cols-24 {
  grid-template-columns: repeat(24, minmax(0, 1fr));
}
</style>