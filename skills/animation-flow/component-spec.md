# 组件转换规范

将 effect.html 转换成目标框架组件时，必须遵守以下规则。

## 1. 框架探测

按以下顺序决定目标框架：
1. 检查 package.json 的 dependencies / devDependencies
2. 匹配特征：next/react → React, nuxt/vue → Vue, svelte → Svelte, @vue/runtime → Vue
3. 同根目录有多个框架特征或无法判断 → 显式询问用户

样式处理按目标项目：
- 有 tailwind 配置（tailwind.config.*）→ 优先转 Tailwind 类
- 无 Tailwind → 用目标框架的局部样式方案（React: CSS Module, Vue: <style scoped>, Svelte: <style>）

## 2. 必须遵守的规范

### 2.1 Props 驱动，不硬编码
- README 的「数据结构」表 → 转为组件的 Props/defineProps/export let
- README 的「可调参数」表 → 转为可选 Props，带默认值
- 示例数据不进组件，只出现在调用方

### 2.2 完整 TypeScript 类型（目标框架支持 TS 时）
- React: interface XProps { ... }
- Vue 3: defineProps<{ ... }>()
- Svelte 5+: let { ... }: Props = $props()（runes 语法）
- 注：defineProps 类型语法 / $props() runes 仅 Vue 3 / Svelte 5+ 适用；Vue 2 用 Options API props，Svelte 4 用 `export let`
- 不支持 TS 的环境则写 JSDoc

### 2.3 自包含，样式随组件走
- 不输出独立的 .css 文件让用户手动引入
- React 用 CSS Module（X.module.css 同文件目录）；Tailwind 项目则全部转 Tailwind 类
- Vue 用 <style scoped>，Svelte 用 <style>
- 组件目录结构自包含，拷过去就能用

### 2.4 最小依赖 + 安装提示
- 只在 README 注明依赖时才引入第三方库
- 输出末尾给出目标包管理器的安装命令（检测 lockfile 选 npm/pnpm/yarn/bun）
- 例：检测到 pnpm-lock.yaml → `pnpm add gsap`；bun.lockb → `bun add gsap`

### 2.5 遵循框架惯用写法
- React: 函数组件 + hooks（useEffect/useRef/useState）；需要 Next.js 客户端能力时文件首行 "use client"
- Vue 3: <script setup> + ref/onMounted/onUnmounted
- Svelte 5+: $state/$derived/$effect + onMount（runes 语法；Svelte 4 用 let + `$:` + onMount）
- 生命周期对齐：IntersectionObserver 在 onMounted/onMount/useEffect 注册；注销在 onUnmounted/useEffect cleanup/Svelte `$effect` 返回 cleanup 或 `onDestroy`

### 2.6 命名遵循框架惯例
- React/Svelte: 组件 PascalCase，Props 类型 XProps
- Vue: 组件文件 PascalCase，模板用 kebab-case，Props 用 camelCase
- 事件回调 Props：React onXxx，Vue 用 defineEmits 父组件 @xxx 监听，Svelte onXxx

### 2.7 响应式 + 可访问性
- 关键断点用框架的响应式方案（Tailwind 响应式类；React 非 Tailwind 用 CSS Module 内 @media；Vue/Svelte 媒体查询或容器查询）
- 交互元素带 aria-label / role；可折叠面板支持键盘 Enter/Space
- 动画尊重 prefers-reduced-motion，能在该媒体查询下禁用或降级

## 3. 转换输出清单

每次转换必须给出：
1. 完整组件文件代码（可直接写入项目）
2. 使用示例（含 README 示例数据转成的调用代码）
3. 安装命令（若有依赖）
4. 落地提示：文件放哪、样式方案选了什么、是否需要 Tailwind 配置调整
