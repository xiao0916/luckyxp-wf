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

### 通用说明

- 技能采用 `SKILL.md` frontmatter 约定，兼容所有支持该约定的 AI agent。
- **两种作用域：**
  - **全局**：装一次，所有项目都能用（放在用户主目录下的技能目录）。
  - **项目级**：只在当前项目可用（放在项目根目录的隐藏配置目录里），适合团队共享。
- **通用做法：** `git clone` 本仓库，再把 `skills/<技能名>` 目录复制（或建符号链接）到目标 agent 的技能目录。

### Claude Code（已验证）

技能目录：

- 全局：`~/.claude/skills/`
- 项目级：`<项目根>/.claude/skills/`

安装全部技能（全局）：

```bash
git clone https://github.com/xiao0916/luckyxp-wf.git ~/.claude/skills/achievement
```

或只装单个技能：

```bash
git clone https://github.com/xiao0916/luckyxp-wf.git /tmp/achievement
cp -r /tmp/achievement/skills/animation-flow ~/.claude/skills/
cp -r /tmp/achievement/skills/dev-workflow ~/.claude/skills/
```

项目级同理，把目标路径换成 `<项目根>/.claude/skills/`。

**验证：** 启动 Claude Code 后，技能会自动出现在可用技能列表中，按描述关键词触发。

### opencode（已验证）

技能目录：

- 全局：`~/.config/opencode/skills/`
- 项目级：`<项目根>/.opencode/skills/`

安装全部技能（全局）：

```bash
git clone https://github.com/xiao0916/luckyxp-wf.git ~/.config/opencode/skills/achievement
```

只装单个技能：同 Claude Code 的 `cp -r` 方式，目标路径改为 `~/.config/opencode/skills/`。

**验证：** 启动 opencode 后，技能按 `description` 中的关键词自动触发。

### Cursor（约定路径，以官方文档为准）

> Cursor 对 `SKILL.md` 技能约定的原生支持请以其最新官方文档为准。下述为社区常用约定路径。

技能目录（约定）：

- 全局：`~/.cursor/skills/`
- 项目级：`<项目根>/.cursor/skills/`

安装（全局）：

```bash
git clone https://github.com/xiao0916/luckyxp-wf.git ~/.cursor/skills/achievement
```

若 Cursor 使用的是 rules 而非 skills，可把 `SKILL.md` 内容作为规则引入，或查阅其最新技能/扩展机制文档。

### Cline（约定路径，以官方文档为准）

> Cline 对 `SKILL.md` 技能约定的原生支持请以其最新官方文档为准。

技能目录（约定）：

- 全局：`~/.cline/skills/`
- 项目级：`<项目根>/.cline/skills/`

安装（全局）：

```bash
git clone https://github.com/xiao0916/luckyxp-wf.git ~/.cline/skills/achievement
```

### Codex（约定路径，以官方文档为准）

> OpenAI Codex CLI 对 `SKILL.md` 技能约定的原生支持请以其最新官方文档为准。

若 Codex 支持自定义技能/插件目录，按其文档指定的路径执行类似的 `git clone` + 复制流程；否则可将 `SKILL.md` 内容作为系统提示/配置引入。

---

## 仅安装单个技能

不想装全部时，只需把对应技能目录单独复制到目标 agent 的技能目录：

```bash
git clone https://github.com/xiao0916/luckyxp-wf.git /tmp/achievement
cp -r /tmp/achievement/skills/<技能名> <目标 agent 技能目录>/
```

`<技能名>` 取 `animation-flow` 或 `dev-workflow`。

## 更新

已通过复制方式安装的，更新源仓库后重新复制即可：

```bash
cd <克隆目录> && git pull
cp -r skills/* <目标 agent 技能目录>/
```

通过符号链接安装的，`git pull` 后即时生效，无需额外操作。

## 备注

- 仓库地址：https://github.com/xiao0916/luckyxp-wf.git
- 各 agent 的技能目录路径基于 2026-06 时的约定；Cursor / Cline / Codex 的原生支持以各自官方文档为准。
- Windows 用户把 `~` 理解为用户主目录（如 `C:\Users\<用户名>`），`cp -r` 换成 `Copy-Item -Recurse`。
