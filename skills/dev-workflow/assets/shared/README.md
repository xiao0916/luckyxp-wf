# 共享配置层

此目录包含 PC 和 MO 模板共用的文件。新建项目时不要单独复制此目录——复制 `pc/` 或 `mobile/` 即可，它们已包含这些共享文件。

## 共享内容

| 文件 | 用途 |
|------|------|
| `eslint.config.js` | ESLint flat config（禁止 any、React hooks 规则） |
| `.prettierrc` | Prettier 配置 |
| `.prettierignore` | Prettier 忽略列表 |
| `.lintstagedrc.cjs` | lint-staged 配置（提交前自动 eslint + prettier） |
| `.commitlintrc.ts` | commitlint 配置（conventional commits 强制） |
| `.husky/pre-commit` | Git pre-commit hook |
| `.husky/commit-msg` | Git commit-msg hook |
| `.gitignore` | Git 忽略列表 |
| `tsconfig.base.json` | TypeScript 共享严格配置 |
| `src/utils/cn.ts` | clsx + tailwind-merge 封装 |
| `src/lib/axios.ts` | Axios 实例 + 拦截器 |
| `src/lib/query-client.ts` | TanStack Query 配置 |
| `src/types/api.d.ts` | API 响应泛型类型 |
| `src/hooks/useVirtualList.ts` | 虚拟列表 hook |