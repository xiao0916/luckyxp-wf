---
name: dwf-orchestrator
description: "DWF 开发工作流的统一调度入口。当用户想要启动新项目、构建功能、实现需求、继续工作流、恢复停滞的开发流程，或需要按步骤系统化推进开发时，必须使用本技能。它读取 `.dwf/state.json` 判断当前所处阶段，然后把控制权分派给对应的 dwf-xxx 子技能（dwf-requirement / dwf-design / dwf-development / dwf-coding），自己不生成任何阶段文档或代码。触发短语包括'开始项目'、'实现这个功能'、'帮我构建'、'我需要一个工作流'、'开发这个'、'继续 dev-workflow'、'恢复工作流'、'需求拆解'、'给几个技术方案选'、'开始编码'、'执行实现清单'。用户表达从零开始或继续系统化开发意图时应触发。本技能替代旧的 dev-workflow 一体化技能，改为只编排、不实现。"
---

# dwf-orchestrator

本技能是 DWF（Dev Workflow）开发工作流的统一调度入口。它**只负责读取状态、判断阶段、分派子技能、维护状态机骨架**，自己不编写需求文档、设计稿、需求拆解、技术方案、实现清单，也不写代码。所有阶段内容生成由对应的 `dwf-xxx` 子技能负责。

与旧的 `dev-workflow` 一体化技能相比，本技能把"流程编排"和"阶段实现"解耦：编排层只持有状态机和路由表，实现层各自独立、可单独触发。

<HARD-GATE>
以下规则不可违反：

1. **只编排，不实现。**
   本技能不得生成任何 spec 目录下的 `01-需求/`、`02-设计稿/`、`03-需求分析/`、`04-技术方案/`、`05-实现清单/` 的正文内容，也不得修改工作区根目录下的项目代码。遇到任何阶段实现需求，必须分派给对应子技能。

2. **每次调用必须先读 state.json。**
   在分派、初始化或任何动作之前，首先读取 `.dwf/state.json`（如存在），读出 `specs` 队列与每项 `current_step`。找到 `active` spec（或决定恢复某个 `paused`/激活首个 `pending`），然后按其 `current_step` 分派。不得凭记忆或假设分派。`_meta.json` 与 `state.json.specs` 之间以 `state.json` 为权威；发生分歧以 `state.json` 为准并修正 `_meta.json`。

3. **禁止未经确认的自动推进。**
   阶段内的确认由子技能负责；阶段间的推进（更新 `current_step` 与 `confirmed_stages`）由本技能在子技能完成并经用户确认后执行，必须使用 `question` 工具获取用户明确确认。没有确认不得推进。每次推进必须同步更新对应 spec 的 `_meta.json` 与顶层 `updated_at`。

4. **禁止跳过阶段。**
   用户说"直接写代码""只是个小 bug"不是跳过流程的理由。正确做法是分派到对应阶段，或走「新增迭代/暂停与优先插入」流程。

5. **队列变更由本技能统一控制。**
   spec 的入队、出队、`active`/`pending`/`paused`/`done` 切换、拆分兄弟 spec、优先插入，全部由本技能通过 `question` 与用户确认后写入 `state.json`，并同步对应 `_meta.json`。子技能不得自行修改 `state.json.specs` 队列结构。

6. **状态只写入 `_meta.json`，不重命名 spec 目录。**
   spec 状态、被暂停信息、完成时间全部落在 spec 目录下的 `_meta.json` 与 `state.json` 中。任何情况下都不要把 `done`/`paused` 等状态前缀加到 spec 目录名上，否则路径引用会断裂。

7. **重新开始必须二次确认。**
   当用户选择"启动新项目"或请求重新开始时，必须先用 `question` 工具进行风险告知，列出将被永久删除的目录并说明不可撤销。用户二次确认后才能删除。二次确认前不得删除任何文件。

8. **全程使用中文。**
   除非用户明确要求使用其他语言，所有与用户的交互（含 `question` 工具的选项和标题）、技能说明、编排说明、状态摘要都使用中文。代码、文件路径、技术术语（如 React、Vue、API）等无法翻译的内容可保留英文。

9. **待确认事项处理由本技能统一发起。**
   阶段文档中“待确认项/待解决问题”段的逐项确认、登记入 `.dwf/pending_confirmations.json`、激活 spec 前的递延提醒，全部由本技能用 `question` 进行；sub-skill 不解析该段、不写台账、不发起逐项 question。

违反以上任何一条都是对工作流的破坏。
</HARD-GATE>

## 状态机

本技能通过 `.dwf/state.json` 追踪迭代队列。每个 spec（迭代）独立维护自己的 `current_step`；编排层从队列中找出当前活跃的 spec 并按其 `current_step` 分派子技能。顶层不再有单一 `current_step`。

### 队列状态模型

`specs` 数组按自上而下顺序记录待执行/进行中的迭代。同一时刻最多 1 个 `active`，0+ 个 `pending`，0+ 个 `paused`。

| spec 状态 | 含义 |
|---|---|
| `pending` | 在队列中排队等待执行 |
| `active` | 当前正在执行 |
| `paused` | 被更高优先级迭代中断，记录进度待恢复 |
| `done` | 已完成，从 `specs` 数组移除并写入 `completed_specs`（也在 spec 目录的 `_meta.json` 标记） |

每个 spec 的阶段（`current_step`）与子技能分派：

| spec.current_step | 含义 | 分派目标 |
|---|---|---|
| `requirements` | 需求文档待确认 | `dwf-requirement`（工作流模式） |
| `design` | 设计稿待确认 | `dwf-design`（工作流模式） |
| `breakdown` | 需求分析文档待确认 | `dwf-development`（工作流模式，处理 breakdown） |
| `plans` | 技术方案待选择 | `dwf-development`（工作流模式，处理 plans） |
| `todos` | 实现清单待确认 | `dwf-development`（工作流模式，处理 todos） |
| `code` | 编码执行中或该 spec 已稳定 | `dwf-coding`（工作流模式） |

### state.json 顶层结构

```json
{
  "project_name": "项目名称",
  "specs": [
    {
      "name": "2026-01-01-feat-项目初始化",
      "status": "active",
      "current_step": "todos",
      "design_skipped": false,
      "selected_plan": "方案A",
      "affected_stages": ["requirements","design","breakdown","plans","todos","code"],
      "confirmed_stages": ["requirements","design","breakdown","plans"],
      "is_shared_context": true,
      "shared_ref": null,
      "paused_at": null,
      "pause_reason": null,
      "started_at": "2026-01-01T10:00:00",
      "completed_at": null
    },
    {
      "name": "2026-01-05-feat-首页",
      "status": "pending",
      "current_step": "breakdown",
      "design_skipped": true,
      "selected_plan": null,
      "affected_stages": ["breakdown","plans","todos","code"],
      "confirmed_stages": [],
      "is_shared_context": false,
      "shared_ref": "2026-01-01-feat-项目初始化",
      "paused_at": null,
      "pause_reason": null,
      "started_at": null,
      "completed_at": null
    }
  ],
  "completed_specs": [
    { "name": "2026-01-01-feat-项目初始化", "completed_at": "2026-01-12T18:00:00" }
  ],
  "iteration_count": 0,
  "created_at": "2026-01-01T10:00:00",
  "updated_at": "2026-01-12T18:00:00"
}
```

字段语义：

- `specs`：迭代队列，自上而下有序。命中 `active` 的项就是当前要执行的迭代。`pending` 排在其后按顺序进入。
- 每个 spec 项的子字段：
  - `name`：spec 完整目录名（`{date}-{type}-{描述}`），位于 `.dwf/specs/` 下。
  - `status`：`pending` / `active` / `paused` / `done`。完成时从数组移除。
  - `current_step`：该 spec 当前所处阶段。
  - `design_skipped`：该 spec 是否跳过设计稿。
  - `selected_plan`：该 spec 在 plans 阶段选定的方案。
  - `affected_stages`：该 spec 需要走的阶段（拆分出来的兄弟 spec 可跳过 requirements/design；首初始化含全部阶段）。
  - `confirmed_stages`：已通过 `question` 确认的阶段，用于断点恢复。
  - `is_shared_context`：true 表示这是其它 spec 共享的"初始化 spec"，其 `01-需求/`、`02-设计稿/` 被兄弟 spec 当作只读参考上下文。
  - `shared_ref`：本 spec 依赖的共享上下文 spec 目录名（拆分出来的兄弟 spec 指向初始化 spec）。无则 null。
  - `paused_at` / `pause_reason`：被优先插入打断时记录暂停时刻与原因。
  - `started_at` / `completed_at`：开始/完成时间戳。
- `completed_specs`：历史记录，按完成顺序追加。仅含 `name` 与 `completed_at`，便于查阅归档。
- 队列为空（`specs: []`）时项目处于稳定态，等待用户新变更。

### spec 目录的 `_meta.json`

每个 spec 目录下写一个 `_meta.json`，与 state.json 中对应项镜像，便于不读 state.json 也能直接看 spec 自身状态：

```json
{
  "name": "2026-01-01-feat-项目初始化",
  "status": "done",
  "current_step": "code",
  "design_skipped": false,
  "selected_plan": "方案A",
  "affected_stages": ["requirements","design","breakdown","plans","todos","code"],
  "confirmed_stages": ["requirements","design","breakdown","plans","todos","code"],
  "is_shared_context": true,
  "shared_ref": null,
  "paused_at": null,
  "pause_reason": null,
  "started_at": "2026-01-01T10:00:00",
  "completed_at": "2026-01-12T18:00:00"
}
```

不重命名 spec 目录；状态只通过 `_meta.json` 与 state.json 的 `specs`/`completed_specs` 表达。`paused` 也只写入 `_meta.json`，不污染目录名。

`_meta.json` 的 `is_shared_context` 与 `shared_ref` 是 spec 身份的权威标记：
- `is_shared_context: true` → 这是其它 spec 共享的初始化 spec，其 `01-需求/`、`02-设计稿/` 被只读引用。
- `shared_ref` 非空 → 这是从初始化 spec 拆分出来的兄弟 spec，`shared_ref` 指向初始化 spec 的目录名。
- 二者皆 false/null → 这是一次独立迭代（bugfix/style 等），不依赖共享上下文。

### 兄弟 spec 目录的 `_context.md`

仅拆分出来的兄弟 spec 目录下写一个 `_context.md`，记录它依赖的共享上下文，避免原 spec 目录被删除或重命名后变成悬空引用：

```markdown
# 共享上下文

- 共享上下文 spec：`2026-01-01-feat-项目初始化`
- 依赖文档（相对本 spec 目录的路径）：
  - `../2026-01-01-feat-项目初始化/01-需求/需求文档.md`
  - `../2026-01-01-feat-项目初始化/02-设计稿/设计稿.md`
- 引用时间戳：`2026-01-05T14:00:00`
- 说明：本 spec 不重新生成项目级需求与设计稿，以上述文档为只读依据。
```

`state.json.specs` 中的 `shared_ref` 字段与 `_context.md` 的"共享上下文 spec"行必须保持一致；以 `state.json` 为权威，发现漂移以 `state.json` 修正 `_context.md`。

`_context.md` 既给出原 spec 目录名，也显式列出依赖文件的相对路径与快照时间戳。即使原 spec 目录将来被改/删，兄弟 spec 仍能通过 `_context.md` 推断曾依赖哪些文档，并据此决定如何重生成或修复。

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

## 目录结构

编排层不创建阶段文档正文，首次初始化时仅为首个 spec 创建目录骨架。项目代码位于工作区根目录，不在 spec 目录内。每个 spec 目录下写 `_meta.json` 记录状态：

```
工作区根目录/
├── .dwf/
│   ├── state.json
│   └── specs/
│       ├── 2026-01-01-feat-项目初始化/
│       │   ├── _meta.json
│       │   ├── 01-需求/
│       │   ├── 02-设计稿/
│       │   │   └── images/
│       │   ├── 03-需求分析/
│       │   ├── 04-技术方案/
│       │   └── 05-实现清单/
│       ├── 2026-01-05-feat-首页/        # 拆分出来的兄弟 spec（共享上下文：初始化 spec）
│       │   ├── _meta.json
│       │   ├── 03-需求分析/
│       │   ├── 04-技术方案/
│       │   └── 05-实现清单/
│       ├── 2026-01-10-bugfix-修复问题/   # 普通 bug 迭代
│       │   ├── _meta.json
│       │   └── 01-需求/
│       │   └── 05-实现清单/
│       └── 2026-01-15-style-极简迭代/    # 极简迭代只含 01-需求/
│           ├── _meta.json
│           └── 01-需求/
├── <项目代码文件>                        # 代码直接放在根目录
└── ...
```

每个 spec 子目录命名：`{date}-{type}-{描述}`。`date` 为该 spec 开始日期，`type` 采用 conventional-commit 前缀（首个 spec 用 `feat`，迭代用 `bugfix`/`refactor`/`perf`/`style`/`docs`/`chore`/`feat` 等）。极简迭代可只含 `01-需求/` 等部分阶段子目录。

阶段与子目录映射：

| 阶段 | spec 内子目录 |
|---|---|
| `requirements` | `01-需求/` |
| `design` | `02-设计稿/`（含 `images/`） |
| `breakdown` | `03-需求分析/` |
| `plans` | `04-技术方案/` |
| `todos` | `05-实现清单/` |

## 触发后流程

### 阶段 0：自检（每次调用必执行）

1. 读取 `.dwf/state.json`（如存在）。
2. 如不存在，进入「首次初始化」。
3. 如存在，且 `specs` 数组为空：项目稳定，等待用户新变更。若用户提出变更，进入「新增迭代」。
4. 如存在，且 `specs` 数组非空：
   - 找出其中的 `active` spec。若无 `active` 而只有 `paused`/`pending`：通过 `question` 请用户选择是恢复首个 `paused` 还是激活首个 `pending`，再继续。
   - 若有 `active` spec：按其 `current_step` 查「分派表」分派子技能。子技能使用 `question` 完成本阶段确认后由本技能推进。
   - 若 `active.current_step` 为 `code` 且其 `code 完成`（实现清单全勾），按「迭代完成」收尾。
   - 期间用户提出新的紧急变更，可走「暂停与优先插入」。

### 首次初始化

**进入条件：** `.dwf/state.json` 不存在，或用户明确请求开始全新项目并已通过二次确认。

1. 创建 `.dwf/`、`.dwf/specs/` 目录，以及首个 spec 的目录骨架：spec 名取 `{今日日期}-feat-项目初始化`（或用户指定描述），在其下创建 `01-需求/`、`02-设计稿/`、`02-设计稿/images/`、`03-需求分析/`、`04-技术方案/`、`05-实现清单/`。
2. 写入 `.dwf/state.json`：`project_name`（从用户输入提取或询问）、`specs: [首个 spec 项]`（`status: "active"`、`current_step: "requirements"`、`design_skipped: false`、`selected_plan: null`、`affected_stages` 含全部阶段、`confirmed_stages: []`、`is_shared_context: true`、`shared_ref: null`、当前时间戳）、`completed_specs: []`、`iteration_count: 0`、`created_at`、`updated_at`。
3. 在该 spec 目录下写入初始化态 `_meta.json`（与 `specs` 数组中该项镜像）。
4. 不创建项目代码目录——项目代码直接位于工作区根目录。
5. 分派给 `dwf-requirement`（工作流模式），让它接管需求捕获与文档生成。子技能写入文档到 `.dwf/specs/{spec 目录名}/{阶段子目录}/`。

### 分派表

按 `active.current_step` 选择子技能：

| active.current_step | 分派子技能 | 子技能工作流模式触发条件 |
|---|---|---|
| `requirements` | `dwf-requirement` | 该 spec `current_step == "requirements"` |
| `design` | `dwf-design` | 该 spec `current_step == "design"` |
| `breakdown` | `dwf-development` | 该 spec `current_step == "breakdown"` |
| `plans` | `dwf-development` | 该 spec `current_step == "plans"` |
| `todos` | `dwf-development` | 该 spec `current_step == "todos"` |
| `code` | `dwf-coding` | 该 spec `current_step == "code"` |

分派时把子技能视为工作流模式执行者：它读取 `state.json` 与当前 `active` spec 目录，完成本阶段内容生成与用户确认，确认后由本技能负责更新该 spec 的 `current_step` 与 `_meta.json`。子技能写入文档时使用相对路径 `.dwf/specs/{spec 目录名}/{阶段子目录}/`。

若 `active` spec 是拆分出来的兄弟 spec（`shared_ref` 非空），子技能在生成 `breakdown`/`plans`/`todos` 时，应以 `shared_ref` 指向的初始化 spec 中的 `01-需求/`、`02-设计稿/` 作为只读参考上下文，不要重新整体生成项目级需求与设计稿。

### 阶段推进

当子技能完成当前阶段并经用户使用 `question` 确认后，本技能按顺序推进该 spec 的 `current_step`：

`requirements → design → breakdown → plans → todos → code`

- 推进到 `design` 前，若用户在需求阶段已选择跳过设计稿，由 `dwf-design` 把该 spec 的 `design_skipped` 设为 `true`，并把 `affected_stages` 与已生成阶段中移除 `design`，直接推进到 `breakdown`。
- 推进到 `plans` 时，`dwf-development` 会通过 `question` 让用户从 ≥2 个方案中选定，写入该 spec 的 `selected_plan`。
- 每次推进同步更新：spec 项的 `current_step`、`confirmed_stages`、`_meta.json`，以及顶层 `updated_at`。

**推进到 `breakdown` 完成时（用户确认需求分析文档后）**，若该 spec 是初始化 spec（`is_shared_context: true`）且其需求覆盖多个页面/复杂模块，本技能必须通过 `question` 询问用户是否拆分为多个迭代并发执行。若用户选择拆分，进入「拆分迭代」。

**推进到 `code` 完成后**（实现清单全部完成并验证），进入「迭代完成」收尾。

### 拆分迭代

**进入条件：** 初始化 spec 的 `breakdown` 阶段已确认，且用户在询问中同意拆分。

1. 基于已确认的 `03-需求分析/需求分析文档.md` 列出可独立拆分的功能模块/页面，用 `question` 与用户协商：要拆分为哪些兄弟 spec，每个的描述与起始阶段。
2. 为每个兄弟 spec 在 `.dwf/specs/` 下创建目录，命名 `{今日日期}-feat-{描述}`。仅创建其 `affected_stages` 对应的子目录（兄弟 spec 通常跳过 requirements/design，从 `breakdown` 或直接从 `plans` 起步；若某个兄弟仍需补充自己的页面级设计稿，可单独保留 `02-设计稿/`）。
3. 在 `state.json.specs` 数组中按执行顺序追加各兄弟 spec 项，`status: "pending"`、`current_step` 设为该兄弟的起始阶段、`design_skipped` 默认 true（无页面级设计稿）、`selected_plan: null`、`affected_stages` 仅含起始阶段之后含 `code`、`confirmed_stages: []`、`is_shared_context: false`、`shared_ref` 指向当前初始化 spec 目录名、`started_at: null`、`completed_at: null`。
4. 为每个兄弟 spec 目录写初始 `_meta.json`（与第 3 步写入的 spec 项镜像，含 `shared_ref`）。
5. 为每个兄弟 spec 目录写 `_context.md`，记录：
   - 共享上下文 spec 的目录名（即 `shared_ref`）
   - 依赖文档相对路径（指向初始化 spec 目录的 `01-需求/需求文档.md`、`02-设计稿/设计稿.md`）
   - 引用时间戳（当前时间，作为"以此版为准"的快照）
   - 一行说明"本 spec 不重新生成项目级需求与设计稿，以上述文档为只读依据"
6. 用 `question` 让用户确认拆分结果与执行顺序（可调整顺序或数量）。
7. 用户确认后，**继续推进初始化 spec** 走完其自身 `plans → todos → code`（初始化 spec 通常产出项目脚手架与共享代码）；之后再按队列顺序依次激活兄弟 spec。
   - 如果用户希望初始化 spec 也立即停止、仅作为共享上下文不再写代码，让初始化 spec 直接进入「迭代完成」（其 `code` 视为已完成），随后激活第一个兄弟 spec。
8. 拆分产生的身份与依赖信息权威来源是：`_meta.json` 的 `is_shared_context`/`shared_ref` + 兄弟 spec 目录的 `_context.md`。`state.json.specs` 中的 `shared_ref` 必须与上述保持一致。

### 迭代完成

当 `active` spec 的 `code` 阶段完成（实现清单全部任务已勾选且验证通过）：

1. 把该 spec 项的 `status` 设为 `done`、`completed_at` 设为当前时间，并同步到该 spec 目录的 `_meta.json`。
2. 从 `specs` 数组中移除该项，向 `completed_specs` 追加 `{ "name", "completed_at" }`。
3. 递增 `iteration_count`。
4. 更新 `updated_at`。
5. 若 `specs` 数组中还有 `pending` 或 `paused` 项：用 `question` 向用户报告"已完成 X，下一个是 Y，是否继续？"用户确认后把队列中下一个 `pending` 置为 `active`、`started_at` 置当前时间，按其 `current_step` 分派子技能。
6. 若 `specs` 数组变空：项目处于稳定态，等待用户新变更。

### 新增迭代

当队列已空（项目稳定）或 `active` spec 处于 `code` 阶段且用户提出新的变更需求：

1. 根据用户描述提议迭代 spec 名 `{今日日期}-{type}-{描述}`，`type` 采用 conventional-commit 前缀。用 `question` 请用户确认名称。
2. 创建新 spec 目录 `.dwf/specs/{date}-{type}-{描述}/`，仅创建受影响阶段的子目录（极简情况下只创建 `01-需求/`）。
3. 分析变更影响了哪些阶段，提出 `affected_stages` 列表，按 `requirements → design → breakdown → plans → todos → code` 顺序排列（用户跳过设计稿则排除 `design`）。用 `question` 请用户确认或调整。
4. 在 `state.json.specs` 数组**末尾**追加新 spec 项：`status: "pending"`、`current_step` 为第一个受影响阶段、`design_skipped` 默认 false、`selected_plan: null`、`affected_stages`、`confirmed_stages: []`、`is_shared_context: false`、`shared_ref` 若指向某完成初始化 spec 则填其名、否则 null、`started_at: null`、`completed_at: null`。
5. 在该 spec 目录下写初始 `_meta.json`。
6. 如果新需求被标识为高优先级、希望插队执行，走「暂停与优先插入」而非追加到末尾。
7. 若当前无 `active` spec（队列空或仅有 `pending`），立即把新 spec 标为 `active`、`started_at` 置当前时间，按其 `current_step` 分派子技能。
8. 用户在本 spec 内通过子技能逐阶段确认，由本技能推进 `current_step`。完成代码后走「迭代完成」。

### 暂停与优先插入

当 `specs` 队列已有 `active` spec，且用户提出标记为"紧急/优先"的新需求：

1. 用 `question` 确认用户确需中断当前 spec 改做新需求。给出选项：暂停当前 spec、稍后再插、拒绝插入继续做当前 spec。
2. 用户确认暂停后，把当前 `active` spec 的 `status` 改为 `paused`、`paused_at` 置当前时间、`pause_reason` 写入"被优先插入 X 替换"，并同步到其 `_meta.json`。
3. 创建新优先 spec（命名、目录、`affected_stages` 等同「新增迭代」流程），但**在 `state.json.specs` 数组头部插入**该新 spec 项，`status: "active"`、`started_at` 置当前时间。
4. 按其 `current_step` 分派对应子技能，正常走阶段推进与确认；完成后走「迭代完成」从队列移除。
5. 优先 spec 完成并被移除后，本技能用 `question` 询问"是否恢复 X（之前暂停的 spec）？"。用户确认后，把该 `paused` spec 的 `status` 改回 `active`、清除 `paused_at`/`pause_reason`，按其原 `current_step` 恢复分派。
6. 恢复时从该 spec 上次确认到的阶段继续；若需重新确认已生成但尚未确认的文档，让对应子技能用 `question` 重做确认。

### 重新开始

用户选择"启动新项目"或请求重新开始时：

1. 使用 `question` 进行二次风险确认，明确告知将永久删除 `.dwf/` 目录（含 `state.json` 与全部 `specs/` 文档，包括已完成/暂停/进行中所有 spec），以及工作区根目录下的项目代码文件，不可撤销。
2. **等待用户二次确认。** 用户选择"取消"则停止；输入取消意向则不删除。
3. 只有用户明确选择"确认删除并重启"后，才删除 `.dwf/` 与根目录下项目代码文件，然后回到「首次初始化」。

二次确认前不得删除任何文件。

## 恢复

会话被中断后再次触发本技能时，先执行阶段 0 自检，读取 `state.json`，按 `specs` 队列与每项的 `current_step` 分派。不要重新初始化或丢弃已有进程。

恢复逻辑：

1. 读 `specs` 数组：
   - 若有 `active` spec：按其 `current_step` 分派对应子技能，让子技能展示当前阶段的产出并使用 `question` 请求继续确认。
   - 若无 `active` 而有 `paused`：用 `question` 让用户选择是否恢复某个 `paused` spec（若有多个，让用户选择）。
   - 若只有 `pending`：把第一个 `pending` 置为 `active`、`started_at` 置当前时间，按其 `current_step` 分派。
   - 若为空：项目稳定，等待新变更。
2. 每个 spec 的 `confirmed_stages` 与 `current_step` 是断点恢复的权威依据。子技能不会自己决定从哪继续——由本技能基于 `current_step` 指定。
3. 每次恢复后，在写回 `state.json` 前，把对应 spec 的 `_meta.json` 与 `specs` 数组中该项重新对齐，避免漂移。

### state.json 缺失时重建

如果 `.dwf/state.json` 不存在但 `.dwf/specs/` 目录仍在（可能是误删或同步丢失），按以下步骤重建队列：

1. 扫描 `.dwf/specs/*/_meta.json` 与 `.dwf/specs/*/_context.md`。
2. 对每个 spec：
   - 读 `_meta.json` 获取 `name`/`current_step`/`confirmed_stages`/`design_skipped`/`selected_plan`/`is_shared_context`/`shared_ref`/`status`/`started_at`/`completed_at` 等字段。
   - 若 `_context.md` 存在，确认其"共享上下文 spec"行与 `_meta.json.shared_ref` 一致；不一致以 `_meta.json` 为准，修正 `_context.md`。
3. 按 `_meta.json.status` 重新归类：
   - `done` 的 spec → 写入 `completed_specs`（按 `completed_at` 排序），不进入 `specs` 队列。
   - `paused` 的 spec → 写入 `specs` 队列，保持 `paused` 状态。
   - `active`/`pending` 的 spec → 写入 `specs` 队列保持原状态；若存在多个 `active`，把第一个保留为 `active`，其余降级为 `pending`（并用 `question` 与用户确认）。
4. 用 `question` 向用户展示重建结果：队列顺序、各 spec 状态、谁是共享上下文、谁是兄弟 spec、`_context.md` 中记录的引用时间戳。请用户确认是否正确。
5. 用户确认后写出新的 `state.json`，重置 `created_at`/`updated_at` 为当前时间，`iteration_count` 取 `completed_specs` 长度。然后按队列恢复执行（遵循阶段 0 的 `active`/`paused`/`pending` 选择逻辑）。
6. 若扫描发现某个兄弟 spec 的 `_context.md` 指向的初始化 spec 目录已被删除：用 `question` 告知用户该 spec 的共享上下文缺失，请用户决定是放弃该 spec、还是以当前可得的最新需求/设计稿作为新共享上下文重新指定 `shared_ref` 并重写 `_context.md`。**不要静默修复，必须让用户决定。**

## 子技能清单

| 子技能 | 负责阶段 | 工作流模式触发条件 |
|---|---|---|
| `dwf-requirement` | `requirements` | 该 spec `current_step == "requirements"` |
| `dwf-design` | `design` | 该 spec `current_step == "design"` |
| `dwf-development` | `breakdown` / `plans` / `todos` | 该 spec `current_step` 为其中之一 |
| `dwf-coding` | `code` | 该 spec `current_step == "code"` 且 `confirmed_stages` 含所有受影响文档阶段 |

各子技能均支持独立模式（不在工作流内单独执行某一阶段）。本技能只在工作流模式下调用它们，传入"当前 `active` spec"作为目标 spec，子技能据此读写 `.dwf/specs/{spec 目录名}/`。

## 完成前检查

结束前确认：

- 没有自己生成任何阶段文档正文或项目代码。
- 每次调用都先读了 `.dwf/state.json` 并识别了 `active` spec。
- spec 的 `current_step` 推进前都通过 `question` 获得了用户确认。
- 每次推进或队列变更都已同步更新对应 spec 的 `_meta.json` 与顶层 `updated_at`。
- spec 目录未被重命名为带状态前缀。
- 新增迭代、拆分、暂停与优先插入、重新开始均通过 `question` 与用户确认。
- 重新开始请求遵守了二次风险确认要求。
- 与用户的交互、`question` 选项和说明全部使用中文。