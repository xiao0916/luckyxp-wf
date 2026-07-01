# DWF Orchestrator Stepwise Repair Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Prevent `dwf-orchestrator` and `dwf-development` from being interpreted as a batch workflow that generates or advances multiple DWF stages without explicit user confirmation.

**Architecture:** Keep the current split between `SKILL.md` and `references/`, but move the most important step-by-step confirmation boundary back into the main skill entry points. Then remove ambiguous wording from `dwf-development` so it handles only the current `current_step` per invocation.

**Tech Stack:** Markdown skill files, JSON eval files, PowerShell, Node.js JSON validation, `rg` static checks.

---

### Task 1: Add Regression Expectations First

**Files:**
- Modify: `skills/dwf-development/evals/evals.json`
- Modify: `skills/dwf-orchestrator/evals/evals.json`

**Step 1: Add failing eval expectations**

Update `skills/dwf-development/evals/evals.json` with two regression cases:

```json
{
  "id": 5,
  "prompt": ".dwf/state.json 里有 active spec 且 current_step=breakdown，请继续需求分析阶段。",
  "expected_output": "工作流模式只处理 breakdown：读取 state.json 找 active+breakdown 的 spec，只生成或更新 .dwf/specs/{spec.name}/03-需求分析/需求分析文档.md，用 question 请求确认。确认后只把 current_step 推进到 plans、confirmed_stages 追加 breakdown，并停止；不得在同一次调用中生成 04-技术方案/技术方案.md、05-实现清单/实现清单.md，也不得自动进入 plans。"
}
```

```json
{
  "id": 6,
  "prompt": ".dwf/state.json 里有 active spec 且 current_step=plans，请继续技术方案阶段。",
  "expected_output": "工作流模式只处理 plans：读取 state.json 找 active+plans 的 spec，只生成或更新 .dwf/specs/{spec.name}/04-技术方案/技术方案.md，提供至少两个方案并用 question 请求用户选择。选择后只记录 selected_plan、把 current_step 推进到 todos、confirmed_stages 追加 plans，并停止；不得在同一次调用中生成 05-实现清单/实现清单.md，也不得自动进入 todos。"
}
```

Update `skills/dwf-orchestrator/evals/evals.json` case 2 or add a new case requiring that after dispatching `dwf-development` for `todos`, orchestrator does not also trigger coding in the same turn.

**Step 2: Validate JSON**

Run:

```powershell
node -e "const fs=require('fs'); for (const f of ['skills/dwf-development/evals/evals.json','skills/dwf-orchestrator/evals/evals.json']) { JSON.parse(fs.readFileSync(f,'utf8')); console.log('ok '+f); }"
```

Expected: both files print `ok ...`.

**Step 3: Commit**

```powershell
git add -- skills/dwf-development/evals/evals.json skills/dwf-orchestrator/evals/evals.json
git commit -m "test: add dwf stepwise workflow evals"
```

### Task 2: Strengthen `dwf-orchestrator` Entry Rules

**Files:**
- Modify: `skills/dwf-orchestrator/SKILL.md`

**Step 1: Add single-action hard rule**

In `## 硬性规则`, add rules with this meaning:

```markdown
10. **一次触发只执行一个编排动作。** 每次触发最多完成以下一种动作：初始化并分派当前阶段、分派当前 active spec 的当前阶段、处理一次阶段推进、处理一次队列变更、处理一次恢复或重建。不得在同一次响应中连续执行多个阶段。
11. **阶段推进后必须停下。** 子技能完成并经用户确认后，本技能只能把 `current_step` 推进到 `affected_stages` 中的下一个阶段并同步状态，然后向用户说明下一阶段等待继续；不得自动调用下一阶段子技能。
12. **禁止批量生成阶段产物。** 本技能和被分派的子技能在工作流模式下不得一次性生成或确认 `requirements`、`design`、`breakdown`、`plans`、`todos`、`code` 中的多个阶段产物。
```

**Step 2: Update trigger flow**

In `## 每次触发流程`, add a final sentence saying that after a child skill is dispatched, the current turn belongs to that child skill and no later phase is started until a later user confirmation or trigger.

**Step 3: Update stage advancement**

In `## 阶段推进`, add a fifth step:

```markdown
5. 停止本次编排，向用户说明下一阶段已就绪；等待用户下一次继续或确认后再分派下一阶段。
```

**Step 4: Static check**

Run:

```powershell
rg -n "一次触发只执行一个编排动作|阶段推进后必须停下|禁止批量生成阶段产物|等待用户下一次继续" skills/dwf-orchestrator/SKILL.md
```

Expected: all four phrases are present.

**Step 5: Commit**

```powershell
git add -- skills/dwf-orchestrator/SKILL.md
git commit -m "fix: enforce stepwise dwf orchestration"
```

### Task 3: Align Orchestration Reference Flow

**Files:**
- Modify: `skills/dwf-orchestrator/references/orchestration-flows.md`

**Step 1: Add general write constraint**

Under `## 通用写入约束`, add:

```markdown
- 一次触发只执行一个编排动作；分派子技能后不得继续执行后续阶段。
- 阶段推进只把 `current_step` 更新到下一阶段并停止；下一阶段必须等待用户再次继续或确认后才分派。
```

**Step 2: Clarify dispatch**

In `## 分派`, add:

```markdown
分派是本次 orchestrator 动作的终点。子技能完成本阶段确认前，orchestrator 不得提前推进；推进后也不得在同一次调用中继续分派下一阶段。
```

**Step 3: Clarify advancement**

In `## 阶段推进`, add:

```markdown
完成第 5 步后停止。不要自动进入下一阶段的分派；用户下一次说“继续”或明确确认下一阶段时，再按新的 `current_step` 重新走阶段 0 自检。
```

**Step 4: Static check**

Run:

```powershell
rg -n "一次触发只执行一个编排动作|分派是本次 orchestrator 动作的终点|完成第 5 步后停止" skills/dwf-orchestrator/references/orchestration-flows.md
```

Expected: all three phrases are present.

**Step 5: Commit**

```powershell
git add -- skills/dwf-orchestrator/references/orchestration-flows.md
git commit -m "docs: clarify dwf orchestration stop points"
```

### Task 4: Make `dwf-development` Explicitly Single-Stage

**Files:**
- Modify: `skills/dwf-development/SKILL.md`

**Step 1: Rewrite frontmatter description**

Replace the frontmatter description so it says the skill handles one of the three development stages per invocation, selected by `current_step`, rather than generating all three documents.

**Step 2: Rewrite overview and hard gate**

Change the overview and hard gate from “只处理这三个阶段 / 默认创建三个文档” to this meaning:

```markdown
本技能用于执行 DWF 的需求分析、技术方案或实现清单阶段，但每次调用只处理一个阶段。
```

```markdown
1. **每次只处理当前阶段。**
   工作流模式下，以 active spec 的 `current_step` 为唯一入口：`breakdown` 只写 `03-需求分析/需求分析文档.md`，`plans` 只写 `04-技术方案/技术方案.md`，`todos` 只写 `05-实现清单/实现清单.md`。不得在一次调用中连续生成多个阶段文档。
```

**Step 3: Fix independent mode wording**

Change independent mode text so it asks for the target stage first. Default to the stage implied by the user prompt; if unclear, ask with `question`. It should create only that stage directory and `_meta.json` with matching `current_step`.

**Step 4: Add stop point after each stage**

In sections 3, 4, and 5, after the working-mode state update, add that the skill stops and returns control to orchestrator. It must not immediately continue into the next stage.

**Step 5: Remove ambiguous phrases**

Run:

```powershell
rg -n "生成目标 spec 目录下三个文档|只负责生成这三个阶段的文档|只写目标 spec 目录下的三个阶段文档|不要在一次调用中连续生成多个阶段文档" skills/dwf-development/SKILL.md
```

Expected:
- The first three phrases should not appear.
- The last phrase should appear.

**Step 6: Commit**

```powershell
git add -- skills/dwf-development/SKILL.md
git commit -m "fix: make dwf development single-stage"
```

### Task 5: Update Usage Documentation

**Files:**
- Modify: `skills/dwf-development/USAGE.md`

**Step 1: Clarify usage contract**

Update the opening and mode descriptions:

```markdown
`dwf-development` 单独执行 DWF 的需求分析、技术方案、实现清单三个阶段之一。每次调用只处理一个阶段，阶段由工作流模式下 active spec 的 `current_step` 或独立模式下用户确认的目标阶段决定。
```

**Step 2: Add explicit examples**

Add short examples:

- `current_step=breakdown` -> only `03-需求分析/需求分析文档.md`.
- `current_step=plans` -> only `04-技术方案/技术方案.md`.
- `current_step=todos` -> only `05-实现清单/实现清单.md`.

**Step 3: Static check**

Run:

```powershell
rg -n "每次调用只处理一个阶段|current_step=breakdown|current_step=plans|current_step=todos" skills/dwf-development/USAGE.md
```

Expected: all phrases appear.

**Step 4: Commit**

```powershell
git add -- skills/dwf-development/USAGE.md
git commit -m "docs: document dwf development stage boundary"
```

### Task 6: Final Verification

**Files:**
- Verify: `skills/dwf-orchestrator/SKILL.md`
- Verify: `skills/dwf-orchestrator/references/orchestration-flows.md`
- Verify: `skills/dwf-development/SKILL.md`
- Verify: `skills/dwf-development/USAGE.md`
- Verify: `skills/dwf-development/evals/evals.json`
- Verify: `skills/dwf-orchestrator/evals/evals.json`

**Step 1: Validate JSON**

Run:

```powershell
node -e "const fs=require('fs'); for (const f of ['skills/dwf-development/evals/evals.json','skills/dwf-orchestrator/evals/evals.json']) { JSON.parse(fs.readFileSync(f,'utf8')); console.log('ok '+f); }"
```

Expected: both files print `ok ...`.

**Step 2: Check required stop phrases**

Run:

```powershell
rg -n "阶段推进后必须停下|一次触发只执行一个编排动作|不得在一次调用中连续生成多个阶段文档|每次调用只处理一个阶段" skills/dwf-orchestrator/SKILL.md skills/dwf-orchestrator/references/orchestration-flows.md skills/dwf-development/SKILL.md skills/dwf-development/USAGE.md
```

Expected: each concept appears in the relevant files.

**Step 3: Check ambiguous phrases are gone**

Run:

```powershell
rg -n "生成目标 spec 目录下三个文档|只负责生成这三个阶段的文档|只写目标 spec 目录下的三个阶段文档" skills/dwf-development/SKILL.md skills/dwf-development/USAGE.md
```

Expected: no matches.

**Step 4: Verify UTF-8 reads**

Run:

```powershell
Get-Content -Raw -Encoding UTF8 skills/dwf-development/SKILL.md | Select-Object -First 1
Get-Content -Raw -Encoding UTF8 skills/dwf-orchestrator/SKILL.md | Select-Object -First 1
```

Expected: Chinese text renders correctly; no mojibake.

**Step 5: Inspect final diff**

Run:

```powershell
git diff -- skills/dwf-orchestrator/SKILL.md skills/dwf-orchestrator/references/orchestration-flows.md skills/dwf-development/SKILL.md skills/dwf-development/USAGE.md skills/dwf-development/evals/evals.json skills/dwf-orchestrator/evals/evals.json
```

Expected: diff is limited to the stepwise confirmation repair.

**Step 6: Final commit**

If earlier task commits were skipped, commit the remaining implementation changes:

```powershell
git add -- skills/dwf-orchestrator/SKILL.md skills/dwf-orchestrator/references/orchestration-flows.md skills/dwf-development/SKILL.md skills/dwf-development/USAGE.md skills/dwf-development/evals/evals.json skills/dwf-orchestrator/evals/evals.json
git commit -m "fix: enforce dwf stepwise confirmation flow"
```
