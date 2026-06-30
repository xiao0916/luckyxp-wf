# 待确认事项流程实现计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 让 dwf-orchestrator 在阶段文档确认后逐项追问用户的待确认事项，登记入 `.dwf/pending_confirmations.json`，并在任意 spec 即将转 active 前提醒处理递延项。

**Architecture:** 仅修改 `skills/dwf-orchestrator/SKILL.md` 与 `skills/dwf-orchestrator/USAGE.md` 两个文件；不动 4 个 sub-skill、5 个 references 模板、`_meta.json`、state.json、question_templates.md。

**Tech Stack:** Markdown（SKILL.md）/ JSON（台账 schema 描述于文档中）

**参考设计文档:** `docs/plans/2026-06-30-pending-confirmations-design.md`

---

### Task 1: 在 HARD-GATE 新增第 9 条待确认事项硬约束

**Files:**
- Modify: `skills/dwf-orchestrator/SKILL.md`（HARD-GATE 列表末尾，第 8 条之后）

**Step 1: 写入第 9 条硬约束**

在第 8 条（"全程使用中文"）之后、"违反以上任何一条都是对工作流的破坏。"之前插入：

```markdown
9. **待确认事项处理由本技能统一发起。**
   阶段文档中"待确认项/待解决问题"段的逐项确认、登记入 `.dwf/pending_confirmations.json`、激活 spec 前的递延提醒，全部由本技能用 `question` 进行；sub-skill 不解析该段、不写台账、不发起逐项 question。
```

**Step 2: 人工核对**

- 打开 `skills/dwf-orchestrator/SKILL.md`
- 确认 HARD-GATE 列表含 1-9 共 9 条
- 确认第 9 条位置在第 8 条之后、"违反..."一句之前
- 确认未改动其它 8 条

**Step 3: Commit**

```bash
git add skills/dwf-orchestrator/SKILL.md
git commit -m "feat(dwf-orchestrator): HARD-GATE 新增第 9 条待确认事项硬约束"
```

---

### Task 2: 在状态机后新增「待确认事项台账」小节

**Files:**
- Modify: `skills/dwf-orchestrator/SKILL.md`（「spec 目录的 `_meta.json`」小节之后、「## 目录结构」之前）

**Step 1: 写入台账小节**

在 `不重命名 spec 目录...不污染目录名。` 段（`_meta.json` 与 `_context.md` 说明结束）之后、`## 目录结构` 之前插入：

```markdown
### 待确认事项台账 `.dwf/pending_confirmations.json`

仅 orchestrator 读写。完整结构与字段语义见 `docs/plans/2026-06-30-pending-confirmations-design.md` 第 1 节。

字段汇总：

- `items[]`：每项含
  - `id`：`{YYYY-MM-DD}-{3位序号}`，orchestrator 首次登记时分配
  - `source_spec`/`source_stage`/`source_section`：来源 spec 目录名/阶段/段名
  - `content`：从文档段提取的待确认事项文本
  - `status`：`deferred`（递延未决）/ `answered`（已解答）
  - `user_answer`：用户给的答案；跳过项为 null
  - `raised_at`/`answered_at`：登记/解答时间戳
  - `resolved_by_spec`：仅 answered 项有，记录由哪个 spec 触发的提醒解决
- `updated_at`/`created_at`：顶层时间戳

解析规则：

- 段名匹配 `^##\s*(待确认项|待解决问题)\s*$`（兼容现有两种段名）
- 条目匹配 `^-\s+`（无序列表项）
- 占位行（如 `- [需要与设计确认的问题]`）仍登记，因为它本身就是待用户决定的内容
- 段为空或文档中不存在该段 → 不触发任何额外 question
```

**Step 2: 人工核对**

- 确认新小节位于 `_meta.json`/`_context.md` 全部说明之后
- 确认未改动「## 目录结构」及其后续内容
- 确认段名匹配正则含两种段名

**Step 3: Commit**

```bash
git add skills/dwf-orchestrator/SKILL.md
git commit -m "feat(dwf-orchestrator): 状态机后新增待确认事项台账小节"
```

---

### Task 3: 在「触发后流程」末尾新增两个公用子节

**Files:**
- Modify: `skills/dwf-orchestrator/SKILL.md`（`## 恢复` 之前，作为「触发后流程」的最后两个子节）

**Step 1: 在 `## 恢复` 之前插入两个子节**

插入内容：

```markdown
### 待确认事项逐项确认循环

在阶段推进前，若该 spec 刚生成的阶段文档含非空"待确认项/待解决问题"段，按本循环处理；段为空或不存在则现有行为不变。

流程：

1. 读目标 spec 目录下刚确认的阶段文档，按台账小节的解析规则提取段与条目。
2. 段不存在或无 `^-\s+` 列表项 → 跳过本循环，直接推进 `current_step`。
3. 解析失败（段存在但内容不合规） → 用 `question` 一次性告知"检出待确认段但无法解析条目，是否仍推进？"，选项"跳过解析推进"/"需要修改文档重整该段"。选后者等同回到 sub-skill 修改文档重审阅。
4. 对每个非空列表项，逐项发起 `question`（custom: true）：

```json
{
  "questions": [
    {
      "question": "待确认事项（来自 {spec 目录名}/{阶段} 的「{段名}」）：\n\n{content}\n\n请逐一项处理。本项你打算如何处置？",
      "header": "待确认事项 {当前序号}/{总数}",
      "options": [
        {"label": "已解决，给出答案", "description": "在自定义输入中写出对该事项的决定/答案，记录到台账"},
        {"label": "跳过，留待后续迭代", "description": "标为递延，台账保留 status=deferred，下次 spec 激活前再提醒"},
        {"label": "已在文档中直接修改", "description": "本事项已在阶段文档里直接改掉，从待确认段移除并记入台账为 answered"}
      ]
    }
  ]
}
```

5. 分支处理：
   - **已解决**：用户在 custom 输入答案 → 台账写 `status: "answered"`、`user_answer: <答案>`、`answered_at: <当前时间>`、`resolved_by_spec: <当前 active spec 目录名>`。
   - **跳过**：台账写 `status: "deferred"`、`user_answer: null`。`raised_at` 在首次登记时置当前时间，已存在的 deferred 项不重置。
   - **已在文档中直接修改**：orchestrator 不再解析该行占位文本，台账写 `status: "answered"`、`user_answer: "已在文档中修改"`、`answered_at: <当前时间>`、`resolved_by_spec: <当前 active spec 目录名>`。
6. 所有项处理完后，更新台账顶层 `updated_at`，再推进 `current_step`。

登记规则：

- 段内每个非空 `^-\s+` 列表项对应一条台账 item。
- `id` 由 orchestrator 按 `{当日日期}-{3位序号}` 顺序分配；同日已有序号从其后续接。
- 同一阶段同一段在多次"需要修改→确认"循环中，若用户重排或重写条目，按解析顺序重新登记；旧 deferred 项不自动失效（见范围边界），仅在新一轮登记时若 content 完全相同可视为同一项不新增（按 content + source_spec + source_stage 简单去重）。

### 递延项提醒

在任意 spec 即将转 `active` 前，orchestrator 插入一次"台账扫检 + 提醒"步骤。

触发点（覆盖以下场景）：

- 首次激活首个 pending（首次初始化后、上一个 spec 完成后）
- `paused` 恢复为 `active`（紧急 spec 完成后即将恢复原 paused spec 前）
- 拆分兄弟入队后首个变 `active`
- 新增迭代直接激活
- `state.json` 缺失重建后即将激活

流程：

1. 读 `.dwf/pending_confirmations.json`；筛 `status: "deferred"` 项。
2. 无 deferred 项 → 直接置 active 并分派（现有行为不变）。
3. 有 deferred 项 → 发起 `question`（custom: true）：

```json
{
  "questions": [
    {
      "question": "在开始 spec「{X}」前，有 {N} 项此前递延的待确认事项。是否现在处理？\n\n{列出每项：序号. content（来自 spec/stage）}",
      "header": "递延待确认事项提醒",
      "options": [
        {"label": "逐项处理", "description": "进入逐项 question 循环，对每项给答案/跳过/已改文档"},
        {"label": "全部继续递延，直接开始本 spec", "description": "不处理，立即激活 spec X；这些项保留 deferred，下次再有 spec 转 active 仍有提醒"},
        {"label": "只处理来自本 spec 的项", "description": "只处理 source_spec==X 的 deferred 项，其它项继续递延"}
      ]
    }
  ]
}
```

4. 分支处理：
   - **逐项处理**：进入与上述「待确认事项逐项确认循环」相同的循环，但枚举全集为筛选出的 deferred 项。解决项写 `status: "answered"`、`user_answer`、`answered_at`、`resolved_by_spec: <本次即将 active 的 spec X 目录名>`。
   - **全部继续递延**：不动台账，立即激活 spec X。
   - **只处理来自本 spec 的项**：仅枚举 `source_spec == X` 的 deferred 项进入逐项循环；其它项保留 deferred。
5. 处理完后同步台账 `updated_at`，再置 active 并分派。

约定：

- 同一 deferred 项跨多次提醒不新增 item；只在最终用户给答案时更新 `answered_at` 与 `resolved_by_spec`。
- 不设"忽略不再提醒"开关；坚持每次激活前都问。
```

**Step 2: 人工核对**

- 确认两个子节位于 `## 恢复` 之前、且作为「## 触发后流程」段的尾部
- 确认两段 JSON 模板中的字段结构与设计文档一致
- 确认未改动 `## 恢复` 及其后内容

**Step 3: Commit**

```bash
git add skills/dwf-orchestrator/SKILL.md
git commit -m "feat(dwf-orchestrator): 新增待确认事项逐项循环与递延项提醒两个子节"
```

---

### Task 4: 在 9 个现有流程段插入对两个公用子节的引用

**Files:**
- Modify: `skills/dwf-orchestrator/SKILL.md`（9 处精确插入，按 A–I 编号）

**Step 1: A 点 - 「阶段推进」末尾**

定位句：`推进后再按路由表分派到下一阶段的子技能。`

在其后追加：

```markdown
推进前若该 spec 刚生成的阶段文档含非空"待确认项/待解决问题"段，按「待确认事项逐项确认循环」处理完毕后才更新 `current_step` 推进。段为空或不存在则现有行为不变。
```

**Step 2: B 点 - 「首次初始化」第 4 步后**

定位句：`4. 分派给 `dwf-requirement`（工作流模式），让它接管需求捕获与文档生成。子技能写入文档到 `.dwf/specs/{spec 目录名}/{阶段子目录}/`。`

在其后追加第 5 步：

```markdown
5. 在该 spec 目录骨架创建后、分派 `dwf-requirement` 前，创建空台账 `.dwf/pending_confirmations.json`：`{"items": [], "created_at": <当前时间>, "updated_at": <当前时间>}`。
```

**Step 3: C 点 - 「迭代完成」第 5 步**

定位句：`5. 若 `specs` 数组中还有 `pending` 或 `paused` 项：用 `question` 向用户报告"已完成 X，下一个是 Y，是否继续？"用户确认后把队列中下一个 `pending` 置为 `active`、`started_at` 置当前时间，按其 `current_step` 分派子技能。`

在该句之前插入：

```markdown
   准备激活下一个 `pending`/恢复 `paused` 前，按「递延项提醒」处理 `.dwf/pending_confirmations.json` 中的 deferred 项；处理完毕后再用 `question` 询问激活。
```

注意保持原句不变，把新句放在原句之前作为第 5 步的前置条件。

**Step 4: D 点 - 「暂停与优先插入」末尾**

定位句：`6. 恢复时从该 spec 上次确认到的阶段继续；若需重新确认已生成但尚未确认的文档，让对应子技能用 `question` 重做确认。`

在其后追加：

```markdown
7. 紧急 spec 完成移除后、即将恢复原 `paused` spec 前，按「递延项提醒」处理 `.dwf/pending_confirmations.json` 中的 deferred 项。
```

**Step 5: E 点 - 「拆分迭代」第 8 步后**

定位句：`8. 拆分产生的身份与依赖信息权威来源是：`_meta.json` 的 `is_shared_context`/`shared_ref` + 兄弟 spec 目录的 `_context.md`。`state.json.specs` 中的 `shared_ref` 必须与上述保持一致。`

在其后追加第 9 步：

```markdown
9. 此后激活首个兄弟 spec 前，按「递延项提醒」处理 `.dwf/pending_confirmations.json` 中的 deferred 项。
```

**Step 6: F 点 - 「新增迭代」第 7 步前**

定位句：`7. 若当前无 `active` spec（队列空或仅有 `pending`），立即把新 spec 标为 `active`、`started_at` 置当前时间，按其 `current_step` 分派子技能。`

在该句之前插入第 6.5 步（行号 6 后拒不直接在编号插入新号，用前置条件形式）：

```markdown
6.5. 若 `active` spec 即将切换为本新 spec，按「递延项提醒」处理 `.dwf/pending_confirmations.json` 中的 deferred 项。
```

**Step 7: G 点 - 「恢复」子节开头**

定位句：`会话被中断后再次触发本技能时，先执行阶段 0 自检，读取 `state.json`，按 `specs` 队列与每项的 `current_step` 分派。不要重新初始化或丢弃已有进程。`

在"不要重新初始化或丢弃已有进程。"之后追加新段：

```markdown
若即将激活某个 spec，先按「递延项提醒」处理 `.dwf/pending_confirmations.json` 中的 deferred 项，之后再按其 `current_step` 分派。
```

**Step 8: H 点 - 「重新开始」第 3 步后**

定位句：`3. 只有用户明确选择"确认删除并重启"后，才删除 `.dwf/` 与根目录下项目代码文件，然后回到「首次初始化」。`

在其后追加第 4 步：

```markdown
4. 删除时同时清除 `.dwf/pending_confirmations.json`（已包含在 `.dwf/` 内）。
```

**Step 9: I 点 - 「state.json 缺失时重建」第 4 步后**

定位句：`4. 用 `question` 向用户展示重建结果：队列顺序、各 spec 状态、谁是共享上下文、谁是兄弟 spec、`_context.md` 中记录的引用时间戳。请用户确认是否正确。`

注意：实际文档中"state.json 缺失时重建"流程含 6 步，第 4 步上述定位句只是其中一部分。先读该段确认精确位置。

读该段，定位编号为 4 的步骤（用户确认重建结果）。在编号为 5（用户确认后写新 state.json）之后插入新第 6 步：

```markdown
6. 若扫描发现 `.dwf/pending_confirmations.json` 仍存在且含 `status: "deferred"` 项，重建后即将激活 spec 前按「递延项提醒」处理。
```

**Step 10: 人工核对**

- 打开 `skills/dwf-orchestrator/SKILL.md`
- 逐一定位 A–I 共 9 个插入点
- 确认每个引用都指向「待确认事项逐项确认循环」或「递延项提醒」子节（即上一任务新增的两个公用子节）
- 确认未删除或改写原有正文（只追加）
- 确认 B、H 两点涉及删除/创建 `.dwf/pending_confirmations.json`

**Step 11: Commit**

```bash
git add skills/dwf-orchestrator/SKILL.md
git commit -m "feat(dwf-orchestrator): 9 处流程段插入待确认事项与递延提醒引用"
```

---

### Task 5: 在 USAGE.md 补一句面向用户的说明

**Files:**
- Modify: `skills/dwf-orchestrator/USAGE.md`

**Step 1: 在「何时触发本技能」之后合适位置插入一句**

在「## 何时触发本技能」段末或紧接其后的段落追加：

```markdown
## 待确认事项

各阶段模板中可能含"待确认项/待解决问题"段。文档经"文档审阅"确认后，若该段非空，orchestrator 会逐项 `question` 询问你对该事项的处置：给答案、跳过留待后续、或已在文档中修改。答案登记到项目级台账 `.dwf/pending_confirmations.json`，跨 spec 累积。

下次任意 spec 即将开始前，orchestrator 会扫台账把此前递延的事项再次提醒，并提供"逐项处理/全部继续递延/只处理来自本 spec 的项"三种选项。
```

**Step 2: 人工核对**

- 确认新段位于「## 何时触发本技能」之后
- 确认未改动其它段
- 确认表述与 SKILL.md 流程一致

**Step 3: Commit**

```bash
git add skills/dwf-orchestrator/USAGE.md
git commit -m "docs(dwf-orchestrator): USAGE 补待确认事项与递延提醒说明"
```

---

### Task 6: 终检对照设计文档验收清单

**Files:**
- Read: `skills/dwf-orchestrator/SKILL.md`、`skills/dwf-orchestrator/USAGE.md`
- Read: `docs/plans/2026-06-30-pending-confirmations-design.md` 第 5 节验收清单

**Step 1: 逐项对照设计文档 12 条验收清单**

打开设计文档第 5 节，对每一条验证 SKILL.md 与 USAGE.md：

1. 台账结构：检查「待确认事项台账」小节字段汇总是否含所有字段
2. 段名解析：检查解析规则段含两种段名
3. 触发按需：检查「阶段推进」A 点插入句含"段为空或不存在则现有行为不变"
4. 逐项循环：检查「待确认事项逐项确认循环」子节含三个选项
5. 激活前提醒：检查「递延项提醒」子节含三选项
6. 跳过与继续递延：检查循环分支处理"跳过"与"全部继续递延"语义分别清楚
7. 提醒不增条目：检查「递延项提醒」约定段含"同一 deferred 项跨多次提醒不新增 item"
8. clear-on-restart：检查「重新开始」H 点含清除台账句
9. state.json 重建兼容：检查 I 点含该场景
10. 现有文档/模板不改：用 `git diff` 确认本次提交仅触及 orchestrator 两文件
11. 中文交互：检查所有 question 文字与选项文字为中文
12. 不动 sub-skill：同上 git diff 确认

**Step 2: git diff 终检**

```bash
git log --oneline a7ea906..HEAD
git diff --stat a7ea906..HEAD
```

预期：仅 2 个文件被改，新 5-6 个 commit（Task 1-5 各一个）。

**Step 3: 用 grep 全局复核不动 sub-skill**

```powershell
$pats = @("pending_confirmations", "待确认事项逐项", "递延项提醒")
$dirs = @("dwf-orchestrator","dwf-requirement","dwf-design","dwf-development","dwf-coding")
foreach ($d in $dirs) {
  $files = Get-ChildItem -Path (Join-Path "skills\dwf-orchestrator\.." $d) -Recurse -File
  foreach ($f in $files) {
    $c = Get-Content -LiteralPath $f.FullName -Raw -Encoding UTF8 -ErrorAction SilentlyContinue
    if ($c) { foreach ($p in $pats) { if ($c.Contains($p)) { "{0}|{1}|{2}" -f $d,$f.Name,$p } } }
  }
}
```

预期：仅 `dwf-orchestrator` 下 SKILL.md 与 USAGE.md 命中；sub-skill 目录零命中。

**Step 4: 最终 commit（如有微调）**

如终检发现某条不达标，修正后：

```bash
git add skills/dwf-orchestrator/SKILL.md skills/dwf-orchestrator/USAGE.md
git commit -m "fix(dwf-orchestrator): 终检修正待确认事项流程对照验收清单"
```

如终检全部通过，无需新 commit，本任务结束。

---

## 执行约定

- **本计划不涉及代码 / 模板 / sub-skill 修改**；任何"顺手优化"留到本计划完成后的独立任务。
- **每次 commit 仅含该 Task 描述的改动**，不跨 Task 合并。
- **不修改 frontmatter description**——本轮新增的是行为流程，不改触发场景。
- **不新建测试文件**——本技能为文档型技能，验收依赖人工对照与 evals；现有 evals 的更新留作后续独立任务（见下文）。

---

## 后续（不在本计划内）

- 把待确认事项流程相关的 2-3 条 eval prompt 追加到 `skills/dwf-orchestrator/evals/evals.json`，覆盖"段非空触发逐项循环""激活前提醒""跳过后下次仍提醒"三个关键行为。
- 视实际使用反馈决定是否升级到设计文档方案 B（答案回填 spec 文档）。
- 视反馈决定是否给 question_templates.md 整体迁移到 orchestrator 后再合并新模板。