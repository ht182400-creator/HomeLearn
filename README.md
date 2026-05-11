# 🏠 家学 HomeLearn

> 家庭智能学习平台 - 让家长成为孩子学习的智慧引路人

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](https://www.typescriptlang.org/)

## ✨ 特性

- 🤖 **AI 智能辅导** - 拍照即识别，AI 详细讲解每道题
- 📚 **科学艾宾浩斯复习** - 基于遗忘曲线自动安排复习时间
- 👨‍👩‍👧 **家长深度参与** - 家长可手写讲解、录制视频
- 🔒 **数据完全私有** - 部署在本地，数据不出家门
- 🌐 **多专项学科支持** - 数学公式、几何画板、英语语音评测、文言文注音
- 💰 **零成本启动** - 使用免费 AI API，家庭使用零成本

## 🚀 快速开始

### 环境要求

- Node.js >= 18.0.0
- PostgreSQL >= 16
- Redis (可选，用于缓存)

### 1. 克隆项目

```bash
git clone <repository-url>
cd HomeLearn
```

### 2. 安装依赖

```bash
npm install
```

### 3. 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env` 文件，填入您的配置：

```env
# 数据库
DATABASE_URL="postgresql://postgres:password@localhost:5432/homelearn"

# 认证密钥 (生成随机字符串)
NEXTAUTH_SECRET="your-secret-key"

# AI API (至少配置一个)
DEEPSEEK_API_KEY="your-deepseek-api-key"
DASHSCOPE_API_KEY="your-dashscope-api-key"
ZHIPU_API_KEY="your-zhipu-api-key"

# Azure 语音 (可选)
AZURE_SPEECH_KEY="your-azure-speech-key"
```

### 4. 初始化数据库

```bash
# 生成 Prisma Client
npm run db:generate

# 推送数据库结构
npm run db:push
```

### 5. 启动开发服务器

```bash
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000) 查看效果。

## 📁 项目结构

```
HomeLearn/
├── prisma/
│   └── schema.prisma       # 数据库模型
├── src/
│   ├── app/                # Next.js App Router
│   │   ├── api/            # API 路由
│   │   ├── dashboard/     # 家长控制台
│   │   ├── learn/          # 孩子学习端
│   │   ├── login/          # 登录页
│   │   └── register/       # 注册页
│   ├── components/          # React 组件
│   │   └── ui/             # UI 组件库
│   └── lib/                # 工具库
│       ├── ai/             # AI 网关
│       ├── auth.ts         # 认证配置
│       ├── db.ts           # Prisma 客户端
│       └── utils.ts        # 工具函数
└── types/                  # TypeScript 类型
```

## 🛠️ 技术栈

| 类别 | 技术 |
|------|------|
| 前端框架 | Next.js 14 (App Router) |
| UI 组件 | Tailwind CSS + shadcn/ui |
| 数据库 | PostgreSQL + Prisma ORM |
| 认证 | NextAuth.js v5 |
| AI 能力 | DeepSeek / 通义千问 / 智谱GLM |
| 语音评测 | 微软 Azure |
| 文件存储 | MinIO (S3 兼容) |

## 📖 开发指南

### 添加新题目类型

在 `prisma/schema.prisma` 中的 `QuestionType` 枚举添加新类型：

```prisma
enum QuestionType {
  SINGLE_CHOICE
  MULTIPLE_CHOICE
  // 添加新类型...
}
```

### 添加新的 AI 适配器

在 `src/lib/ai/gateway.ts` 中添加新的适配器：

```typescript
// 例如：添加 Claude 支持
if (process.env.ANTHROPIC_API_KEY) {
  this.adapters.set('anthropic', {
    name: 'Claude',
    enabled: true,
    weight: 4,
    client: new OpenAI({
      apiKey: process.env.ANTHROPIC_API_KEY,
      baseURL: 'https://api.anthropic.com',
    }),
  });
}
```

### 数据库操作

```bash
# 生成 Prisma Client
npm run db:generate

# 推送更改到数据库
npm run db:push

# 打开 Prisma Studio
npm run db:studio

# 创建迁移
npm run db:migrate
```

## 🔧 可用 API

项目提供以下 API 端点：

### 认证
- `POST /api/auth/register` - 用户注册
- `POST /api/auth/[...nextauth]` - NextAuth 路由

### 孩子管理
- `GET /api/children` - 获取孩子列表
- `POST /api/children` - 创建孩子账户
- `PUT /api/children/[id]` - 更新孩子信息
- `DELETE /api/children/[id]` - 删除孩子账户

### 题目管理
- `GET /api/questions` - 获取题目列表
- `POST /api/questions` - 创建题目
- `GET /api/questions/subjects` - 获取学科列表

### AI 功能
- `POST /api/ai/chat` - AI 对话

## 🎯 开发计划

- [x] MVP - 用户系统 + 题目录入
- [x] V1.0 - AI 能力 + 语音评测
- [ ] V2.0 - 智能组卷 + 激励系统

## 📄 License

MIT License - 详见 [LICENSE](LICENSE) 文件

## 🙏 致谢

- [Next.js](https://nextjs.org/) - React 框架
- [Tailwind CSS](https://tailwindcss.com/) - CSS 框架
- [shadcn/ui](https://ui.shadcn.com/) - UI 组件库
- [Prisma](https://prisma.io/) - 数据库 ORM
- [NextAuth.js](https://next-auth.js.org/) - 认证方案

---

**Made with ❤️ for families**
