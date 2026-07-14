# 从政之路（政途人生）

写实向仕途模拟手游。玩家从基层公职起步，通过四条职业线（行政线/党务线/纪检线/群团线）逐级晋升至最高领导层。

## 技术栈

- **框架**: Expo SDK 55, React Native 0.83.2, React 19.2.0
- **路由**: expo-router（文件路由，根目录 `src/`）
- **UI**: NativeWind v4 (Tailwind CSS), `@rn-primitives/*` (shadcn/ui), lucide-react-native
- **动画**: react-native-reanimated 4, react-native-gesture-handler
- **后端**: Supabase (Auth + Postgres), Sentry 错误追踪
- **包管理**: pnpm（workspace catalog 版本管理）
- **代码检查**: Biome + oxlint + TypeScript (`devkit-lint`)
- **自定义工具**: `miaoda-expo-devkit`（extends biome/tsconfig/babel/metro）

## 环境要求

- Node.js ≥ 18
- pnpm
- Expo Go 或原生开发环境（Xcode / Android Studio）

## 快速开始

```sh
pnpm install
# 编辑 .env，填入 Supabase 凭证
pnpm start        # Expo 开发服务器
pnpm android      # Android
pnpm ios          # iOS
pnpm web          # Web
```

## 开发命令

| 命令 | 说明 |
|------|------|
| `pnpm start` | 启动 Expo 开发服务器 |
| `pnpm android` | Android 设备/模拟器 |
| `pnpm ios` | iOS 模拟器 |
| `pnpm web` | Web 浏览器 |
| `pnpm lint` | 代码检查（`devkit-lint` — Biome + oxlint + tsc 串行） |

无测试套件。

## 项目结构

```
src/
  app/          expo-router 文件路由（108 个游戏页面）
    (app)/      登录后的游戏主页面
    (auth)/     登录/注册页面
    index.tsx   入口重定向（auth → 创角 → 主页）
  config/       游戏数据 JSON（职位、城市、部门、政策、商店等）
  ctx/          GameContext.tsx — 游戏状态管理与主循环
  ctx.tsx       Supabase 会话管理（autoRefreshToken: false）
  db/           gameApi.ts — 数据库操作层（Supabase RPC, 6955 行）
  lib/          游戏逻辑模块（KPI 引擎、职业线、深度行动、主题等）
  components/   UI 组件（模态框、导航卡片、状态条等）
  types/        game.ts — 核心类型定义（4626 行）
  client/       supabase.ts — Supabase 客户端单例
  hooks/        自定义 hooks

supabase/
  migrations/   91 个增量数据库迁移
  functions/    Edge Functions（wenxin-text-generation, redeem codes）
```

## 架构概览

### 路由

expo-router 文件路由，auth-gated groups 区分游客与登录状态：

- `src/app/(auth)/` — 未登录用户可见（登录/注册）
- `src/app/(app)/` — 登录用户可见（108 个游戏页面，扁平目录）

### 状态管理

- `SessionProvider`（`src/ctx.tsx`）— Supabase 会话，AppState 回前台时手动续期
- `GameProvider`（`src/ctx/GameContext.tsx`）— 游戏循环、时间推进、触发器（晋升、平调、退休、弹窗事件等）

### 数据库

Supabase Postgres，通过 `src/db/gameApi.ts` 封装所有 RPC 调用和行→类型转换。Auth 使用邮箱登录，确认邮件关闭。iOS/Android 回前台时自动刷新 token，Web 端使用自定义锁避免 `navigator.locks` 竞争。

### 配置数据分离

硬编码数据块逐步迁移到 `src/config/*.json`。JSON 导入时通过 `as unknown as TargetType` 绕过类型收窄。

## 环境变量

| 变量 | 说明 |
|------|------|
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase 项目 URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase 匿名密钥 |

## 数据库

- Supabase Postgres，91 个增量 SQL 迁移
- Auth：邮箱登录，`enable_confirmations = false`
- Edge Functions：`wenxin-text-generation`（文本生成），`generate-redeem-code` / `use-redeem-code`（兑换码）

## 许可证

AGPL-3.0 — 详见 [LICENSE](./LICENSE)。
