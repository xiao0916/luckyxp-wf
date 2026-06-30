# dwf-design 使用说明

`dwf-design` 用于单独执行 DWF 工作流的"设计稿"阶段，把需求文档、设计链接、图片或设计想法整理成设计稿说明。完整规范见 `SKILL.md`。

## 适用场景

- 根据需求文档生成设计稿说明
- 记录 Figma、网页或其他在线设计稿链接
- 整理用户提供的设计图片
- 让 AI 生成页面布局、视觉风格、关键交互和响应式说明
- 单独执行 DWF 工作流中的"设计稿"阶段

## 运行模式与目标目录

- **工作流模式**：`.dwf/state.json` 中存在 `status: "active"` 且 `current_step: "design"` 的 spec。目标 spec 目录为 `.dwf/specs/{spec.name}/`。若该 spec 的 `shared_ref` 非空（兄弟 spec），优先读取 `.dwf/specs/{shared_ref}/01-需求/` 作为只读上下文。用户确认后把该 spec 推进到 `breakdown`。
- **独立模式**：用 `question` 询问用户目标 spec 目录，默认提议 `.dwf/specs/{今日日期}-feat-{描述}`，由用户确认或修改。生成后停止，不创建 `.dwf/state.json`，不推进后续阶段。

## 默认产物

```text
{目标 spec 目录}/02-设计稿/设计稿.md
{目标 spec 目录}/02-设计稿/images/   （若有图片）
```

不创建其它阶段目录、`.dwf/state.json`，也不推进到 breakdown/plans/todos/code。

## 工作方式

1. 读取需求文档（目标 spec 下 `01-需求/` 或 `shared_ref` 指向的初始化 spec 的 `01-需求/`）。
2. 判断设计稿来源：链接、图片、AI 生成或跳过。
3. 信息不足时一次只问一个澄清问题。
4. 读取本技能目录下 `references/design_template.md` 作为模板。
5. 在目标 spec 目录下 `02-设计稿/设计稿.md` 生成或更新文档。
6. 用 `question` 请求确认；如已存在旧文档先读取并让用户选择保留/修改/替换。
7. 确认后停止；工作流模式下才更新该 spec 的 `current_step` 为 `breakdown`。

## 中文约束

中文约束属于 `SKILL.md` 中的 `<HARD-GATE>` 硬门禁。除非用户明确要求使用其他语言，所有交互、设计澄清、生成文档、标题、表格、说明文字、测试记录、审计结论和产物说明都使用中文。代码、路径、命令、API 名、技术术语和设计工具名可以保留英文。