# luckyxp-wf

一组面向 AI agent 的可复用技能（skills），采用 `SKILL.md` frontmatter 约定（`name` / `description`）。每个技能是一个自包含目录，包含触发描述、工作流说明与辅助资源。

## 技能列表

| 技能 | 一句话用途 | 适用场景 |
|------|-----------|----------|
| [animation-flow](skills/animation-flow/) | 把预置网页动画效果落地成项目组件 | 数字滚动、Hover 光效、手风琴、定屏滚动、文字打字等 |
| [dev-workflow](skills/dev-workflow/) | 把需求按 6 个阶段逐步变成可交付代码 | 新功能/新项目的系统化开发，含迭代机制 |

每个技能目录下有 `USAGE.md`，是面向使用者的快速上手指南。

---

## 安装

本技能包遵循 [Agent Skills](https://agentskills.io) 开放标准，每个技能是一个含 `SKILL.md` 的目录，Claude Code、opencode、Cursor、Cline、Codex 等主流 AI agent 均原生支持。

### 推荐方式：`npx skills add`（统一安装）

使用官方 [skills CLI](https://github.com/vercel-labs/skills) 一条命令装到任意主流 agent，无需手动 clone 或复制目录。CLI 会自动探测本机已安装的 agent 并写入对应技能目录。

**安装全部技能（项目级，随项目共享给团队）：**

```bash
npx skills add https://github.com/xiao0916/luckyxp-wf.git
```

**安装全部技能（全局，所有项目可用）：**

```bash
npx skills add https://github.com/xiao0916/luckyxp-wf.git --global
```

**指定装到某个 agent：**

```bash
npx skills add https://github.com/xiao0916/luckyxp-wf.git --agent claude-code
```

`--agent` 取值如 `claude-code` / `opencode` / `cursor` / `cline` / `codex`；用 `--agent '*'` 装到所有已探测到的 agent。

**只装单个技能：**

```bash
npx skills add https://github.com/xiao0916/luckyxp-wf.git --skill animation-flow
npx skills add https://github.com/xiao0916/luckyxp-wf.git --skill dev-workflow
```

**一键装全部技能到全部 agent：**

```bash
npx skills add https://github.com/xiao0916/luckyxp-wf.git --all
```

**其它常用命令：**

```bash
npx skills list              # 查看已安装技能
npx skills update            # 更新到最新版本
npx skills remove            # 卸载技能
npx skills add <仓库> -l      # 只列出仓库内可用技能，不安装
```

### 备选方式：git clone 手动安装

若无法使用 npx，可手动克隆并把 `skills/<技能名>` 目录复制（或建符号链接）到目标 agent 的技能目录：

```bash
git clone https://github.com/xiao0916/luckyxp-wf.git /tmp/achievement
cp -r /tmp/achievement/skills/animation-flow <目标 agent 技能目录>/
cp -r /tmp/achievement/skills/dev-workflow  <目标 agent 技能目录>/
```

各 agent 约定技能目录（全局 / 项目级）：

| Agent | 全局目录 | 项目级目录 |
|-------|---------|-----------|
| Claude Code | `~/.claude/skills/` | `.claude/skills/` |
| opencode | `~/.config/opencode/skills/` | `.opencode/skills/` |
| Cursor | `~/.cursor/skills/` | `.cursor/skills/` |
| Cline | `~/.cline/skills/` | `.cline/skills/` |
| Codex | `~/.agents/skills/` | `.agents/skills/` |

> 多数 agent 还会额外读取 `.agents/skills/` 或 `.claude/skills/`，跨 agent 复用同一目录即可。

## 更新

- `npx skills` 安装的：执行 `npx skills update`。
- git clone 安装的：`cd <克隆目录> && git pull`，再重新复制（或符号链接方式 `git pull` 后即时生效）。

## 备注

- 仓库地址：https://github.com/xiao0916/luckyxp-wf.git
- `npx skills add` 由 [vercel-labs/skills](https://github.com/vercel-labs/skills) 提供，支持 60+ 主流 AI agent，详见其 README。
- 手动安装的目录路径基于各 agent 官方文档（2026-06），个别 agent 可能还会额外读取 `.agents/skills/` 或 `.claude/skills/`。
- Windows 用户把 `~` 理解为用户主目录（如 `C:\Users\<用户名>`），`cp -r` 换成 `Copy-Item -Recurse`。
