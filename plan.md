请协助开发一个基于Vue3+Vite+TailwindCSS+DaisyUI的点名器应用，需实现以下核心功能：

1. **抽取模式**
- 双模式切换：顺序模式（循环遍历） / 随机模式（需三种算法）
- 随机算法实现：
  ▸ 普通算法：使用crypto.getRandomValues()生成高随机性
  ▸ 噪声算法：通过Web Audio API采集环境噪音生成随机种子
  ▸ 时间算法：根据高精度时间戳生成时间哈希种子

2. **名单管理**
- 实现TXT文件解析器：支持UTF-8编码，自动过滤空行
- 提供拖拽上传+手动选择两种文件加载方式
- 可视化名单预览（带滚动条区域展示）
- 错误处理：空文件检测/格式错误提示

3. **语音系统**
- 集成Web Speech Synthesis API
- 语音控制：语速/音调调节控件
- 实时语音状态反馈（通过图标动画表示）

4. **交互体验**
- 动态过渡效果：
  ✓ 抽取时粒子动画（使用vueuse/motion）
  ✓ 名单切换淡入淡出效果
- 模式切换动效：流畅的布局变形动画
- DaisyUI组件深度定制：主题色匹配教学场景

5. **辅助功能**
- 状态持久化：localStorage记忆配置
- 响应式布局：移动端触控优化
- 无障碍支持：ARIA标签完善

技术实现要求：
- 使用Vue3组合式API组织逻辑
- 复杂动画逻辑封装为自定义hook
- 音频处理使用Web Worker避免阻塞
- 采用动态导入优化语音模块体积
