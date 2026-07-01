# dwf-requirement 设计记录

## 背景

用户希望将 `dev-workflow` 中的“阶段 1：初始化 & 捕获需求”抽离为独立技能。经确认，新技能只负责生成需求文档，不创建 `.dwf/state.json`，不创建完整 `dev-workflow` 目录结构，也不推进设计稿、需求拆解、技术方案、实现清单或编码阶段。

## 目标

- 创建技能 `dwf-requirement`。
- 复用 `dev-workflow` 的需求文档模板结构。
- 默认生成 `01-需求文档/需求文档.md`。
- 在需求不完整时，以“一次一个问题”的方式澄清。
- 生成后要求用户确认，确认前不推进任何后续开发阶段。
- 全程中文输出，生成文档中的标题、标签、说明、表格内容默认使用中文。

## 文件

- `skills/dwf-requirement/SKILL.md`
- `skills/dwf-requirement/USAGE.md`
- `skills/dwf-requirement/references/requirements_template.md`
- `skills/dwf-requirement/evals/evals.json`

