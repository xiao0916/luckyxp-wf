# skill-creation-workflow 设计记录

## 背景

本仓库用于维护可复用的 AI agent 技能包。用户希望新增一个流程规范技能，用来约束创建、修改和审计技能时的工作方式。

## 目标

- 创建一个名为 `skill-creation-workflow` 的技能。
- 该技能不替代 `skill-creator`，而是作为流程门禁，强制在创建、修改或审计技能时使用 `skill-creator`。
- 在生成或修改技能文件之前，必须先使用 `brainstorming` 与用户确认目标、触发场景、输出格式和测试策略。
- 所创建或修改的技能必须包含中文强约束，确保技能说明、交互说明、生成文档、测试记录和产物说明默认使用中文。

## 方案

采用“流程守门技能”方案：

1. 当用户提出创建、修改或审计技能时，先触发本技能。
2. 本技能要求 agent 读取目标技能上下文，并使用 `brainstorming` 与用户确认细节。
3. 用户确认后，必须使用 `skill-creator` 来创建、修改、测试或审计技能。
4. 技能源码只能写入 `skills/<技能名>/`，不在 agent 专属目录维护第二份源码。
5. 可测试的技能应同步添加 `evals/evals.json`。

## 文件

- `skills/skill-creation-workflow/SKILL.md`
- `skills/skill-creation-workflow/USAGE.md`
- `skills/skill-creation-workflow/evals/evals.json`

