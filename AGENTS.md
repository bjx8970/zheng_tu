# AGENTS.md — 从政之路（政途人生）

## Project

Expo SDK 55 (React Native 0.83.2) career-simulation game. 108 screens in `src/app/(app)/`.

## Commands

```sh
pnpm start              # expo dev server
pnpm android/ios/web    # target-specific start
pnpm lint               # devkit-lint: Biome + oxlint + tsc (must pass)
```

No test suite exists.

## Architecture

- **Router root**: `src/` (app.json `router.root`). File-based expo-router with auth-gated groups.
- **Import alias**: `@/` → `./src/*` (tsconfig paths).
- **Config data**: `src/config/*.json` imported directly. Game types in `src/types/game.ts` (4626 lines). JSON values use `as unknown as T` casts.
- **State**: `src/ctx/GameContext.tsx` (2127 lines) — game loop, triggers. `src/ctx.tsx` — Supabase auth session (autoRefreshToken: false, custom lock for Web).
- **DB**: `src/db/gameApi.ts` (6955 lines) — Supabase RPC/query layer. 91 migrations in `supabase/migrations/`.
- **UI**: NativeWind v4 (Tailwind + RN), `@rn-primitives/*` (shadcn/ui ports), `clsx` + `tailwind-merge` via `cn()`.

## Devkit (`miaoda-expo-devkit`)

Extends biome, tsconfig, babel, metro configs. `babel.config.js` excludes `src/components/ui` from devkit preset. `metro.config.js` wraps with `withDevkit`.

## Supabase

- Auth: email with confirmations disabled. `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` in `.env`.
- Client: `src/client/supabase.ts` — `autoRefreshToken: false`, custom auth lock avoids Web navigator.locks race.
- Functions: `supabase/functions/` — `wenxin-text-generation`, redeem codes.

## Data-Logic Separation

Hardcoded data blocks are being extracted to `src/config/*.json`. When adding data, prefer JSON over TS constants. Types for JSON configs use `as unknown as TargetType` casts.

## Conventions

- `biome.json` only checks `src/**/*.{js,jsx,ts,tsx}`.
- No comments in code (follow existing style).
- ESLint: `eslint-config-expo/flat`. Ignores `dist/`.
- pnpm catalog versions pinned in `pnpm-workspace.yaml`.
