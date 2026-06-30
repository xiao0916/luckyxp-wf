# dwf-coding 使用说明

`dwf-coding` 单独执行 DWF 工作流的编码阶段，把目标 spec 目录下 `05-实现清单/实现清单.md` 中已确认的任务落实到目标代码目录。完整规范见 `SKILL.md`。

## 典型触发

- "开始编码"
- "执行实现清单"
- "继续编码阶段"
- "根据实现清单写代码"
- "实施本次迭代变更"
- "恢复编码阶段"

## 运行模式与目标目录

- **工作流模式**：`.dwf/state.json` 中存在 `status: "active"` 且 `current_step: "code"` 的 spec。目标 spec 目录为 `.dwf/specs/{spec.name}/`，目标代码目录为**工作区根目录**（DWF 约定：代码放根目录、不放 spec 目录内）。若 `shared_ref` 非空，可读取其 `01-需求/`、`02-设计稿/` 作为只读上下文。所有任务完成后把该 spec 从 `specs` 移入 `completed_specs`、递增 `iteration_count`、同步其 `_meta.json` 为 `status: "done"`。
- **独立模式**：用 `question` 询问用户目标 spec 目录（默认 `.dwf/specs/{今日日期}-feat-{描述}`）和目标代码目录（默认工作区当前目录），由用户确认或修改。完成后停止，不创建 `.dwf/state.json`，不推进工作流状态。

## 必要输入

- `{目标 spec 目录}/05-实现清单/实现清单.md`
- `{目标 spec 目录}/04-技术方案/技术方案.md`（推荐，有 `selected_plan` 则以其为主）
- 目标代码目录中现有代码或可初始化的新项目
- `.dwf/state.json`（工作流模式需要）
- 编码规范：本技能目录下 `references/coding_standards.md`
- React 模板（可选）：若新项目且方案基于 React，可参考本技能目录下 `assets/react-pc|react-mobile|shared/`

## 输出

- 目标代码目录中的代码改动
- `{目标 spec 目录}/05-实现清单/实现清单.md` 中已完成任务的 `[x]` 标记
- 工作流模式下更新 `.dwf/state.json` 与该 spec 的 `_meta.json`
- 中文总结：完成内容、修改文件、验证命令与结果、剩余事项

## 注意事项

- 不生成需求、设计、需求分析、技术方案或实现清单正文。
- 不在实现清单未确认、`current_step` 不是 `code` 或需求/方案/清单互相冲突时强行编码。
- 逐项执行逐项标记，不一次性把未验证任务全勾。
- 不扩大任务范围，不顺手重构无关模块。
- 所有交互和说明默认使用中文；代码、路径、命令、API 名和技术术语可保留英文。