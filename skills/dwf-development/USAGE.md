# dwf-development 使用说明

`dwf-development` 单独执行 DWF 的需求分析、技术方案、实现清单三个阶段之一。每次调用只处理一个阶段，阶段由工作流模式下 active spec 的 `current_step` 或独立模式下用户确认的目标阶段决定。完整规范见 `SKILL.md`。

## 何时使用

- 单独执行需求分析、技术方案或实现清单阶段
- 生成技术方案对比文档
- 创建实现清单
- 把某个开发阶段抽离出来独立运行

触发关键词：`需求拆解` / `需求分析` / `技术方案` / `实现清单` / `生成技术方案` / `创建实现清单`。

## 运行模式与目标目录

- **工作流模式**：`.dwf/state.json` 中存在 `status: "active"` 且 `current_step` 为 `breakdown`/`plans`/`todos` 之一的 spec。目标 spec 目录为 `.dwf/specs/{spec.name}/`。若 `shared_ref` 非空，优先读取 `.dwf/specs/{shared_ref}/01-需求/`、`/02-设计稿/` 作为只读上下文。只处理当前 `current_step` 对应的阶段；确认后更新该 spec 的 `current_step` 与 `confirmed_stages`，同步 `_meta.json` 与 `updated_at`，然后停止。
- **独立模式**：先用 `question` 确认目标阶段，再询问目标 spec 目录，默认提议 `.dwf/specs/{今日日期}-{seq}-feat-{描述}`（`seq` 扫描 `.dwf/specs/` 现有最大序号 +1，无则 001），由用户确认或修改。当前阶段确认后停止，不创建 `.dwf/state.json`，不推进后续阶段。

## 阶段映射

- `current_step=breakdown`：只生成或更新 `03-需求分析/需求分析文档.md`，确认后推进到 `plans` 并停止。
- `current_step=plans`：只生成或更新 `04-技术方案/技术方案.md`，用户选择方案后推进到 `todos` 并停止。
- `current_step=todos`：只生成或更新 `05-实现清单/实现清单.md`，确认后推进到 `code` 并停止。

## 输入要求

- **必需**：需求文档（目标 spec 或共享上下文 spec 下 `01-需求/需求文档.md`）
- **可选**：设计稿（`02-设计稿/设计稿.md`）

## 输出文件

```text
breakdown -> {目标 spec 目录}/03-需求分析/需求分析文档.md
plans     -> {目标 spec 目录}/04-技术方案/技术方案.md
todos     -> {目标 spec 目录}/05-实现清单/实现清单.md
```

技术方案必须提供至少 2 个对比方案，由用户选定后写入 `selected_plan`。

## 注意事项

- 每次调用只处理一个阶段，每阶段都需要用户确认后才继续，用 `question` 不跳过。
- 实现清单尽可能拆分任务（页面拆为骨架、组件、状态接入、接口联调、样式等），每条含"编码规范检查"和"验证标准"。
- 工作流模式完成 `breakdown` 推进时，若该 spec 为初始化 spec（`is_shared_context: true`）且需求覆盖多个页面/复杂模块，本技能提醒 dwf-orchestrator 由它用 `question` 询问是否拆分迭代。本技能不直接拆分。
- 所有交互和文档默认使用中文；代码、路径、命令、API 名和技术术语可保留英文。
