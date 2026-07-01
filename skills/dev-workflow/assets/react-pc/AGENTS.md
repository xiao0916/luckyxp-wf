# AI 辅助开发指引

## 项目概览

React SPA 项目模板（PC 端），使用 Vite 构建。

**技术栈**：React 19 · TypeScript · Vite · Tailwind CSS 4 · Zustand · TanStack Query · React Hook Form + Zod · Axios

**依赖安装**：项目已配置 `.npmrc` 文件，设置 `legacy-peer-deps=true`，可解决 npm 依赖版本冲突问题。直接运行 `npm install` 即可。

**目录约定**：
- `src/app/` — 应用入口、路由、全局 providers
- `src/components/ui/` — 基础 UI 组件
- `src/components/layouts/` — 布局组件
- `src/hooks/` — 自定义 hooks
- `src/lib/` — 第三方库封装
- `src/stores/` — Zustand stores
- `src/types/` — 全局类型定义
- `src/utils/` — 工具函数
- `src/styles/` — 全局样式

## 开发规范

### 强制规则（工具拦截）

- `npm run typecheck` 必须通过 — 禁止 `any` 类型
- `npm run lint` 必须通过 — ESLint 规则不可绕过
- commit message 必须符合 conventional commits 格式
- 提交前 lint-staged 自动运行 eslint --fix 和 prettier

### 编码约定

- 组件单一职责，超过 300 行考虑拆分
- Props 优先，全局状态（Zustand）仅在跨组件共享时使用
- 异步数据用 TanStack Query，不手动管理 loading/error 状态
- 表单用 React Hook Form + Zod 验证
- 列表超过 100 条使用 `useVirtualList` hook
- 路由级组件使用 `lazy()` 懒加载
- 样式使用 Tailwind，颜色值直接用任意值语法写 hex（如 `bg-[#4584FA]`、`text-[#395DA1]`），避免内联 style
- 类名合并使用 `cn()` 工具函数

### 提交约定

格式：`type(scope): subject`

type 取值：feat / fix / refactor / style / docs / test / chore / perf / ci

### 自测命令

```bash
npm run check  # typecheck + lint + build 一键检查
```

## px→rem 适配

项目使用 postcss-pxtorem 自动将 CSS 中的 px 转为 rem，配合 `src/lib/flexible.ts` 动态设置根字号。

- **设计稿基准**：1920px → rootValue = 192
- **转换规则**：除 border 外所有 px 值自动转为 rem
- **不转换**：1px 边框、`.no-rem` 类下的样式、`/* px-to-rem-ignore */` 注释标记的值
- **缩放逻辑**：`flexible.ts` 根据视口宽度动态设置根字号，最大缩放 2 倍

编码时直接按照设计稿的 px 值写样式，PostCSS 会自动处理转换。

## 性能检查项

- 列表渲染超过 100 条使用 `useVirtualList`
- 大组件懒加载
- 图片使用懒加载 + WebP
- 不盲目使用 memo/useMemo/useCallback

## 相关技能

此项目使用 `dev-workflow` 技能管理开发流程。详见 `.opencode/skills/dev-workflow/SKILL.md`。