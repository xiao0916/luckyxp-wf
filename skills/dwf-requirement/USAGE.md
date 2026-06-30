# dwf-requirement 使用说明

`dwf-requirement` 用于把想法、产品需求、项目背景或已有说明整理成 DWF 工作流的需求文档。完整规范见 `SKILL.md`。

## 适用场景

- 先写一份需求文档
- 把零散想法整理成 PRD
- 把 Markdown、纯文本或本地文档规范化为需求文档
- 单独执行 DWF 工作流中的"需求"阶段

## 运行模式与目标目录

- **工作流模式**：`.dwf/state.json` 中存在 `status: "active"` 且 `current_step: "requirements"` 的 spec。目标 spec 目录为 `.dwf/specs/{spec.name}/`，在其下 `01-需求/需求文档.md` 生成文档；用户确认后把该 spec 推进到 `design`。
- **独立模式**：不存在满足条件的 active spec。用 `question` 询问用户目标 spec 目录，默认提议 `.dwf/specs/{今日日期}-feat-{描述}`，由用户确认或修改。生成后停止，不创建 `.dwf/state.json`，不推进后续阶段。

## 默认产物

```text
{目标 spec 目录}/01-需求/需求文档.md
```

不创建其它阶段目录、`.dwf/state.json`，也不推进到 design/breakdown 等阶段。

## 工作方式

1. 信息完整则直接整理；信息不足则一次只问一个澄清问题。
2. 读取 `references/requirements_template.md` 作为模板。
3. 在目标 spec 目录下 `01-需求/需求文档.md` 生成中文需求文档（含 frontmatter、业务流程 Mermaid、FR/NFR 编号、MoSCoW 优先级、验收标准）。
4. 用 `question` 请求确认或修改；如已存在旧文档先读取并让用户选择保留/修改/替换。
5. 确认后停止；工作流模式下才更新该 spec 的 `current_step` 为 `design`。

## 中文约束

中文约束属于 `SKILL.md` 中的 `<HARD-GATE>` 硬门禁。除非用户明确要求使用其他语言，所有交互、需求澄清、生成文档、标题、表格、说明文字和产物说明都使用中文。代码、路径、命令、API 名和技术术语可以保留英文。