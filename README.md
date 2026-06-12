# IELTS Master — 120天备考应用

> 3.0 → 8.0 · 四阶段渐进式备考系统

## 快速启动

```bash
cd ielts-master
npm install
npm run dev
# 打开 http://localhost:5173
```

## 项目结构

```
src/
├── App.jsx                    # 根组件，视图路由
├── main.jsx                   # 入口，注入 StoreProvider
├── store.jsx                  # 全局状态 (useReducer + localStorage)
│
├── utils/
│   ├── api.js                 # Anthropic API 封装（流式+普通）
│   ├── sm2.js                 # SM-2 间隔重复算法
│   └── tasks.js               # 每日任务生成 + 阶段元数据
│
└── components/
    ├── ui.jsx                 # 共享 UI 原子组件
    ├── Layout/Layout.jsx      # 侧边栏 + 主框架
    ├── Dashboard/Dashboard.jsx  # 今日计划 + 任务清单
    ├── Speaking/Speaking.jsx    # 口语对话 + AI评分
    ├── Reading/Reading.jsx      # 三阶段限时阅读 + 词查询
    ├── Vocab/Vocab.jsx          # SRS词汇记忆卡
    └── Progress/Progress.jsx   # 进度曲线 + 四阶段追踪
```

## 四阶段计划

| 阶段 | 时间 | 目标分 | 重点 |
|------|------|--------|------|
| 语感启蒙 | 第1月 (Day 1–30) | 5.0 | 词汇800词，口语Part1，自由阅读 |
| 技能夯实 | 第2月 (Day 31–60) | 6.0 | 词汇1800词，口语Part2，倒计时阅读 |
| 专项突破 | 第3月 (Day 61–90) | 7.5 | 词汇2800词，口语Part3，写作双题型 |
| 全真冲刺 | 第4月 (Day 91–120) | 8.0 | 全套模考，限时锁定，弱项补强 |

## 核心模块说明

### 口语对话 (Speaking)
- Web Speech API 语音识别（Chrome/Edge）
- 流式 AI 考官对话（Part 1/2/3）
- 对话结束后调用独立评分接口
- 四维评分：流利度 / 词汇多样性 / 语法准确度 / 发音
- 自动存储历史记录到 localStorage

### 限时阅读 (Reading)
- 阶段一：自由阅读，点词即查（调用 Claude API）
- 阶段二：60分钟倒计时 + 每10分钟浏览器通知
- 阶段三：全真模考 + 切换标签页立刻警告
- 查到的生词一键加入 SRS 词库

### 词汇 SRS (Vocab)
- SM-2 算法（Anki 同款）
- 不记得 → 1天，模糊 → 3天，记住 → 7天+
- 支持手动添加生词
- 数据持久化到 localStorage

### 备考进度 (Progress)
- 实时 SVG 分数曲线（实际 vs 预测）
- 四阶段里程碑可视化
- 口语历史记录列表

## 注意事项

本项目通过浏览器直接调用 Anthropic API（无需后端）。
生产部署时建议通过自己的后端代理 API 请求以保护密钥。
