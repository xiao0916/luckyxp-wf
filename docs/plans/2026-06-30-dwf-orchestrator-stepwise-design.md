# dwf-orchestrator 逐阶段确认修复设计

## 背景

当前 `dwf-orchestrator` 在新版本中把大量流程细节拆到 `references/`，主 `SKILL.md` 相比提交 `39d611a017ff3c0c94dc5043854cb6ee08cdcb66` 明显变短。旧版把硬门槛、阶段 0、首次初始化、分派、阶段推进等关键规则直接写在主文件中，模型更容易遵守“step-by-step、每阶段用户确认后再推进”的流程。

当前版还存在一个执行层歧义：`dwf-development` 的描述和总规则说它生成 `03-需求分析`、`04-技术方案`、`05-实现清单` 三个文档，虽然后续章节按 `current_step` 分阶段执行，但入口措辞容易被解释为一次性生成三个阶段。这会削弱 orchestrator 的阶段边界。

## 目标

- 保留当前 `references/` 拆分结构，不整体回退旧版长文件。
- 在 `dwf-orchestrator` 主入口恢复足够强的硬门槛，让模型无法合理解释成连续推进多个阶段。
- 修正 `dwf-development` 的单阶段语义：一次调用只处理当前 `current_step` 对应的一个阶段。
- 用 usage 和 eval 固化回归约束。

## 方案

采用“入口硬门槛 + 子技能单阶段加固”：

1. 加固 `skills/dwf-orchestrator/SKILL.md`
   - 明确每次触发只做一次编排动作：读取状态、判断当前阶段、分派一个子技能或处理一个队列动作。
   - 明确禁止在一次响应中连续生成需求、设计、需求分析、技术方案、实现清单或代码。
   - 明确阶段推进只更新 `current_step` 到下一阶段并停止，不自动调用下一阶段子技能。
   - 保留 `references/` 作为详细流程来源，但把确认边界放回主文件硬规则。

2. 加固 `skills/dwf-orchestrator/references/orchestration-flows.md`
   - 在“分派”和“阶段推进”章节同步补充：推进后必须停下，等待下一次用户触发或确认。
   - 避免引用文件与主文件产生不同解释。

3. 修正 `skills/dwf-development/SKILL.md`
   - 将“默认生成三个阶段文档”的描述改为“按当前 `current_step` 只处理一个阶段”。
   - `breakdown` 只生成 `03-需求分析/需求分析文档.md`，确认后推进到 `plans` 并停止。
   - `plans` 只生成 `04-技术方案/技术方案.md`，用户选择方案后推进到 `todos` 并停止。
   - `todos` 只生成 `05-实现清单/实现清单.md`，确认后推进到 `code` 并停止。
   - 独立模式默认也只执行用户指定阶段，不串联三个阶段。

4. 同步说明与 eval
   - 更新 `skills/dwf-development/USAGE.md` 中的运行说明。
   - 更新 `skills/dwf-development/evals/evals.json`，新增或强化回归期望：`current_step=breakdown` 时不得生成 `04`/`05`，`current_step=plans` 时不得生成 `05`。
   - 必要时更新 `skills/dwf-orchestrator/evals/evals.json`，固化“推进后停下，不自动分派下一阶段”的期望。

## 验证

- 静态检查关键规则是否出现在主入口和子技能入口中。
- 搜索残留歧义措辞，例如“默认生成三个阶段文档”“生成目标 spec 目录下三个文档”。
- 检查 eval JSON 语法有效。
- 查看 git diff，确认只改动相关技能和设计/计划文档，不触碰无关工作区改动。

## 非目标

- 不回滚整个 `dwf-orchestrator` 到旧版。
- 不改变 `.dwf/state.json` schema。
- 不改变待确认事项的 `.dwf/pending/<spec>/state.json` 机制。
- 不修改 agent 专属技能入口链接目录。
