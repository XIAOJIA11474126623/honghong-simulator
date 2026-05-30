# 项目上下文

## 项目概述

哄哄模拟器 — 帮助恋爱中总踩雷的男生学会识别情绪信号并正确回应的模拟器。用户选择角色（男朋友/女朋友），选择常见吵架场景，通过 AI 生成的10道选择题进行闯关，答题过程中 AI 氛围（文字语气、表情、背景色）随分数变化，最终给出局后小结。

### 版本技术栈

- **Framework**: Next.js 16 (App Router)
- **Core**: React 19
- **Language**: TypeScript 5
- **UI 组件**: shadcn/ui (基于 Radix UI)
- **Styling**: Tailwind CSS 4
- **AI**: coze-coding-dev-sdk (doubao-seed-2-0-lite-260215)

## 目录结构

```
├── public/                 # 静态资源
├── scripts/                # 构建与启动脚本
├── src/
│   ├── app/
│   │   ├── page.tsx        # 首页 - 角色选择 + 语音选择
│   │   ├── layout.tsx      # 根布局
│   │   ├── globals.css     # 全局样式 + Design Tokens
│   │   ├── game/
│   │   │   └── page.tsx    # 答题闯关页（含 TTS 语音播报）
│   │   ├── result/
│   │   │   └── page.tsx    # 结果与局后小结页
│   │   └── api/
│   │       ├── generate-questions/route.ts  # AI 出题接口
│   │       ├── generate-summary/route.ts    # AI 局后小结接口
│   │       └── tts/route.ts                # TTS 语音合成接口
│   ├── components/ui/      # Shadcn UI 组件库
│   ├── hooks/              # 自定义 Hooks
│   ├── lib/
│   │   ├── utils.ts        # 通用工具函数 (cn)
│   │   ├── scenarios.ts    # 吵架场景数据（男女各15个）
│   │   └── voices.ts       # 语音选项数据（男女各6种）
│   └── server.ts           # 自定义服务端入口
├── next.config.ts
├── package.json
└── tsconfig.json
```

## API 接口

### POST /api/generate-questions
- 请求: `{ role: 'boyfriend'|'girlfriend', scenario: string, batch: 'first'|'second'|'third'|'all' }`
  - batch='first': 生成前2题(id=1,2)，情绪苗头阶段，约10秒
  - batch='second': 生成第3-6题(id=3,4,5,6)，情绪升级到爆发阶段
  - batch='third': 生成第7-10题(id=7,8,9,10)，情绪缓和到化解阶段
  - batch='all': 一次生成全部10题（默认）
- 响应: `{ questions: [{ id, situation, question, options: [{ label, text, score }], aiReaction: { high, medium, low } }] }`
- 使用3批次渐进加载策略：前端先加载first批次让用户开始答题，同时并行请求second和third批次
- AI模型：doubao-seed-2-0-lite-260215（速度快）

### POST /api/generate-summary
- 请求: `{ role, scenario, totalScore, questionResults: [{ id, selectedScore, selectedLabel }] }`
- 响应: `{ dimensions: { emotionRecognition, responseMethod, toneControl, timingJudgment }, weaknessAnalysis, improvementAdvice, overallComment }`

### POST /api/tts
- 请求: `{ text: string, speaker: string }`
- 响应: `{ audioUri: string, audioSize: number }`
- 使用 coze-coding-dev-sdk TTSClient 进行语音合成
- speaker 参数对应 voices.ts 中的 Voice.speaker 字段

## 包管理规范

**仅允许使用 pnpm** 作为包管理器，严禁使用 npm 或 yarn。

## 开发规范

### 编码规范

- 默认按 TypeScript `strict` 心智写代码
- 禁止隐式 `any` 和 `as any`
- 函数参数、返回值、事件对象必须有明确类型

### Hydration 问题防范

1. 严禁在 JSX 中直接使用 typeof window、Date.now()、Math.random()
2. 必须使用 'use client' + useEffect + useState
3. 根布局已添加 suppressHydrationWarning 防止浏览器扩展导致的 hydration mismatch

## UI 设计规范

- 设计风格：温暖纸感风（DESIGN.md）
- 主色：#C96F3D（暖橙），背景：#FBF3E7（米黄）
- 圆角卡片，轻柔阴影
- 使用 shadcn/ui 组件

## 核心业务逻辑

1. 首页选择角色 → 选择对方语音 → 场景选择 → AI生成10题 → 答题闯关 → 局后小结
2. 评分：A=10分 B=8分 C=6分 D=4分 E=2分 F=0分，满分100，80分以上通关
3. AI 氛围联动：表情😠→😐→😊→😄→🥰 + 语气变化 + 背景色变化 + TTS语音播报
4. 语音选择：选角色后展示对方性别语音选项（男6种/女6种），答题时用所选语音播报AI反应
5. 低分引导：连续2题≤2分时显示引导提示
6. 局后小结：4维度评分 + 薄弱分析 + 改善建议
