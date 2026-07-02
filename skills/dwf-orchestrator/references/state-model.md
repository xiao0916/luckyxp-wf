# DWF 状态模型参考

本文件保存 `dwf-orchestrator` 的状态结构、目录结构和台账 schema。执行任何状态写入、修复或解释前先读取本文件。

## 目录

- [权威来源](#权威来源)
- [队列状态模型](#队列状态模型)
- [`state.json` 顶层结构](#statejson-顶层结构)
- [spec 命名与序号分配](#spec-命名与序号分配)
- [spec `_meta.json`](#spec-_metajson)
- [兄弟 spec `_context.md`](#兄弟-spec-_contextmd)
- [待确认事项状态目录](#待确认事项状态目录)
- [目录结构](#目录结构)
- [阶段目录与文档映射](#阶段目录与文档映射)

## 权威来源

`.dwf/state.json` 是工作流权威来源。`_meta.json` 是每个 spec 的本地镜像；发生分歧时以 `state.json` 为准并修正 `_meta.json`。

`state.json.specs` 中的 `shared_ref` 与兄弟 spec `_context.md` 的“共享上下文 spec”必须保持一致；发生漂移时以 `state.json` 为准修正 `_context.md`。

状态、暂停信息、完成时间只写入 `state.json` 与 `_meta.json`。不要重命名 spec 目录。

## 队列状态模型

`specs` 数组按自上而下顺序记录待执行或进行中的迭代。同一时刻最多一个 `active`，可以有多个 `pending` 或 `paused`。

| spec 状态 | 含义 |
|---|---|
| `pending` | 在队列中排队等待执行 |
| `active` | 当前正在执行 |
| `paused` | 被更高优先级迭代中断，记录进度待恢复 |
| `done` | 已完成，从 `specs` 数组移除并写入 `completed_specs` |

每个 spec 的阶段与子技能分派：

| `current_step` | 含义 | 分派目标 |
|---|---|---|
| `requirements` | 需求文档待确认 | `dwf-requirement` |
| `design` | 设计稿待确认 | `dwf-design` |
| `breakdown` | 需求分析文档待确认 | `dwf-development` |
| `plans` | 技术方案待选择 | `dwf-development` |
| `todos` | 实现清单待确认 | `dwf-development` |
| `code` | 编码执行中或待收尾 | `dwf-coding` |

## `state.json` 顶层结构

```json
{
  "project_name": "项目名称",
  "specs": [
    {
      "name": "2026-01-01-001-feat-项目初始化",
      "status": "active",
      "current_step": "todos",
      "design_skipped": false,
      "selected_plan": "方案A",
      "affected_stages": ["requirements", "design", "breakdown", "plans", "todos", "code"],
      "confirmed_stages": ["requirements", "design", "breakdown", "plans"],
      "is_shared_context": true,
      "shared_ref": null,
      "paused_at": null,
      "pause_reason": null,
      "started_at": "2026-01-01T10:00:00",
      "completed_at": null
    },
    {
      "name": "2026-01-05-002-feat-首页",
      "status": "pending",
      "current_step": "breakdown",
      "design_skipped": true,
      "selected_plan": null,
      "affected_stages": ["breakdown", "plans", "todos", "code"],
      "confirmed_stages": [],
      "is_shared_context": false,
      "shared_ref": "2026-01-01-001-feat-项目初始化",
      "paused_at": null,
      "pause_reason": null,
      "started_at": null,
      "completed_at": null
    }
  ],
  "completed_specs": [
    { "name": "2026-01-01-001-feat-项目初始化", "completed_at": "2026-01-12T18:00:00" }
  ],
  "spec_seq": 2,
  "iteration_count": 0,
  "created_at": "2026-01-01T10:00:00",
  "updated_at": "2026-01-12T18:00:00"
}
```

字段语义：

- `project_name`：项目名称，从用户输入提取或询问。
- `specs`：迭代队列，自上而下有序。命中 `active` 的项就是当前要执行的迭代。
- `completed_specs`：历史记录，按完成顺序追加，仅含 `name` 与 `completed_at`。
- `spec_seq`：已分配的全局 spec 序号（整数），每次新建 spec 时自增并作为目录名中的三位序号。`state.json` 缺失重建时取所有现存 spec 目录名中的最大序号。详见 [spec 命名与序号分配](#spec-命名与序号分配)。
- `iteration_count`：已完成迭代计数，通常等于完成次数。
- `created_at`、`updated_at`：工作流创建和最后更新时间。

每个 spec 项字段：

- `name`：spec 完整目录名，格式为 `{date}-{seq}-{type}-{描述}`，位于 `.dwf/specs/` 下。
- `status`：`pending`、`active`、`paused`、`done`。完成时从 `specs` 数组移除。
- `current_step`：该 spec 当前阶段。
- `design_skipped`：是否跳过设计稿。
- `selected_plan`：`plans` 阶段选定的方案。
- `affected_stages`：该 spec 需要执行的阶段，按默认阶段顺序排列。
- `confirmed_stages`：已通过 `question` 确认的阶段。
- `is_shared_context`：`true` 表示这是其它 spec 共享的初始化 spec。
- `shared_ref`：本 spec 依赖的共享上下文 spec 目录名，无则 `null`。
- `paused_at`、`pause_reason`：被优先插入打断时记录暂停时刻与原因。
- `started_at`、`completed_at`：开始和完成时间戳。

队列为空（`specs: []`）时项目处于稳定态，等待用户新变更。

## spec 命名与序号分配

spec 目录名格式：`{date}-{seq}-{type}-{描述}`，例如 `2026-01-01-001-feat-项目初始化`。

- `date`：spec 开始日期，格式 `YYYY-MM-DD`。
- `seq`：三位零填充的全局序号，从 `001` 起，跨整个项目单调递增（不按日期重置）。
- `type`：conventional-commit 前缀（`feat`、`bugfix`、`refactor`、`perf`、`style`、`docs`、`chore` 等）。
- `描述`：中文简短描述，由用户确认或从需求中提取。

序号来源与分配：

- `state.json` 顶层维护 `spec_seq`（整数），表示已分配的最大序号；初始为 `0`。
- 新建任意 spec（首次初始化、拆分兄弟 spec、新增迭代、优先插入）时，orchestrator 先把 `spec_seq` 自增 `1`，再用其三位零填充值作为目录名中的 `seq`。多个 spec 在同一次动作中创建时（如拆分），按创建顺序逐个自增。
- 目录名一经确定保持稳定，不随状态变化重命名、不回退序号、不回收已用序号。
- `state.json` 缺失重建时：扫描 `.dwf/specs/` 下所有 spec 目录名，提取其中的 `seq`，把 `spec_seq` 设为最大值；无任何 spec 时设为 `0`。该规则见 `references/orchestration-flows.md` 的 `state.json` 缺失时重建。

子技能独立模式（无 `state.json`）下提议默认目录时：扫描 `.dwf/specs/` 现有 spec 目录名中的最大序号 `+1`（无则 `001`）作为默认 `seq`，仍由用户经 `question` 确认或修改。

## spec `_meta.json`

每个 spec 目录下写 `_meta.json`，与 `state.json.specs` 中对应项镜像。完成后的 spec 也保留 `_meta.json`，并把 `status` 设为 `done`。

```json
{
  "name": "2026-01-01-001-feat-项目初始化",
  "status": "done",
  "current_step": "code",
  "design_skipped": false,
  "selected_plan": "方案A",
  "affected_stages": ["requirements", "design", "breakdown", "plans", "todos", "code"],
  "confirmed_stages": ["requirements", "design", "breakdown", "plans", "todos", "code"],
  "is_shared_context": true,
  "shared_ref": null,
  "paused_at": null,
  "pause_reason": null,
  "started_at": "2026-01-01T10:00:00",
  "completed_at": "2026-01-12T18:00:00"
}
```

`_meta.json` 的身份字段：

- `is_shared_context: true`：这是其它 spec 共享的初始化 spec，其 `01-需求/`、`02-设计稿/` 被只读引用。
- `shared_ref` 非空：这是从初始化 spec 拆分出来的兄弟 spec，`shared_ref` 指向初始化 spec。
- 二者皆 false 或 null：这是独立迭代，不依赖共享上下文。

## 兄弟 spec `_context.md`

仅拆分出来的兄弟 spec 目录下写 `_context.md`，记录它依赖的共享上下文。

```markdown
# 共享上下文

- 共享上下文 spec：`2026-01-01-001-feat-项目初始化`
- 依赖文档（相对本 spec 目录的路径）：
  - `../2026-01-01-001-feat-项目初始化/01-需求/需求文档.md`
  - `../2026-01-01-001-feat-项目初始化/02-设计稿/设计稿.md`
- 引用时间戳：`2026-01-05T14:00:00`
- 说明：本 spec 不重新生成项目级需求与设计稿，以上述文档为只读依据。
```

`_context.md` 既给出原 spec 目录名，也显式列出依赖文件的相对路径与快照时间戳。即使原 spec 目录将来被改或删，兄弟 spec 仍能推断曾依赖哪些文档，并据此决定如何重生成或修复。

## 待确认事项状态目录

未确认事项按 spec 拆分记录在 `.dwf/pending/<迭代目录名>/state.json`。仅 orchestrator 读写该目录。

不要再创建项目级单文件待确认台账。已确认事项不写入 `pending`，而是把用户决策直接回写到对应阶段文档的“待确认项/待确认事项/待解决问题”段；只有用户跳过或暂未确认的事项才写入 `pending`。

目录结构：

```text
.dwf/
└── pending/
    └── 2026-01-01-001-feat-项目初始化/
        └── state.json
```

`state.json` 结构：

```json
{
  "requirements": [],
  "design": [],
  "breakdown": [
    {
      "id": "2026-01-05-001",
      "source_section": "待确认项",
      "content": "是否需要支持多语言？",
      "raised_at": "2026-01-05T14:00:00",
      "last_reminded_at": null
    }
  ],
  "plans": [],
  "todos": []
}
```

字段语义：

- 顶层五个数组字段固定为 `requirements`、`design`、`breakdown`、`plans`、`todos`，分别记录该 spec 对应阶段的未确认事项。
- `id`：`{YYYY-MM-DD}-{3位序号}`，orchestrator 在该 spec 的待确认状态文件内分配；同日序号递增。
- `source_section`：文档中的段名，兼容 `待确认事项`、`待确认项` 和 `待解决问题`。
- `content`：从文档段提取出的待确认事项文本。
- `raised_at`：首次登记时间戳。
- `last_reminded_at`：最近一次激活前提醒时间；从未提醒则为 `null`。

按需创建与清理：

- 首次出现未确认事项时，创建 `.dwf/pending/<迭代目录名>/state.json`，并补齐五个阶段数组字段。
- 用户后续确认某项时，把决策回写到对应阶段文档的待确认段，并从对应数组移除该项。
- 若某个 spec 的五个数组都为空，删除该 spec 的 `pending/<迭代目录名>/state.json`；若目录为空，也可删除该 spec 的 `pending` 子目录。
- 不创建空的项目级待确认文件，也不为没有未确认事项的 spec 创建空状态文件。

解析规则：

- 段名匹配 `^##\s*(待确认项|待确认事项|待解决问题)\s*$`。
- 条目匹配 `^-\s+`。
- 占位行（如 `- [需要与设计确认的问题]`）仍视为待用户决定的内容。
- 段为空或文档中不存在该段，不触发额外 `question`。

登记规则：

- 段内每个非空列表项对应一个候选待确认事项。
- 用户明确给出答案或说明已在文档中修改时，不登记到 `pending`；直接回写阶段文档。
- 用户跳过或暂不确认时，写入该 spec 状态文件中当前阶段数组。
- 同一 spec、同一阶段、同一 `source_section`、同一 `content` 已存在时，不重复新增。
- 文档重排不自动清理旧未确认项；只有用户明确解决、文档已修改并确认，或用户要求删除时才移除。

## 目录结构

编排层不创建阶段文档正文，首次初始化时仅为首个 spec 创建目录骨架。项目代码位于工作区根目录，不在 spec 目录内。

```text
工作区根目录/
├── .dwf/
│   ├── state.json
│   ├── coding-specs/              （项目级编程规范，所有 spec/迭代共享，由 dwf-coding 编码前与用户协商确认）
│   │   ├── 前端编程规范.md
│   │   └── 后端编程规范.md
│   ├── pending/
│   │   └── 2026-01-01-001-feat-项目初始化/
│   │       └── state.json
│   └── specs/
│       ├── 2026-01-01-001-feat-项目初始化/
│       │   ├── _meta.json
│       │   ├── 01-需求/
│       │   ├── 02-设计稿/
│       │   │   └── images/
│       │   ├── 03-需求分析/
│       │   ├── 04-技术方案/
│       │   └── 05-实现清单/
│       ├── 2026-01-05-002-feat-首页/
│       │   ├── _meta.json
│       │   ├── _context.md
│       │   ├── 03-需求分析/
│       │   ├── 04-技术方案/
│       │   └── 05-实现清单/
│       └── 2026-01-10-003-bugfix-修复问题/
│           ├── _meta.json
│           └── 01-需求/
├── <项目代码文件>
└── ...
```

每个 spec 子目录命名为 `{date}-{seq}-{type}-{描述}`。`date` 为 spec 开始日期（`YYYY-MM-DD`）；`seq` 为三位零填充的全局序号（如 `001`）；`type` 采用 conventional-commit 前缀，如 `feat`、`bugfix`、`refactor`、`perf`、`style`、`docs`、`chore`。序号由 `state.json` 的 `spec_seq` 维护，详见 [spec 命名与序号分配](#spec-命名与序号分配)。

`.dwf/coding-specs/` 是项目级编程规范目录，与所有 spec/迭代共享，不随迭代重复协商。由 `dwf-coding` 在编码前从 `04-技术方案` 探测涉及的端并与用户协商生成（如 `前端编程规范.md`、`后端编程规范.md`），逐份经 `question` 确认；已存在覆盖当前技术栈的规范则用 `question` 确认是否沿用。它补充 `dwf-coding` 自带的 `references/coding_standards.md` 基线，冲突时以项目级为准。该目录不由 orchestrator 创建或维护，orchestrator 只在目录结构文档中登记其位置。

## 阶段目录与文档映射

| 阶段 | spec 内子目录 |
|---|---|
| `requirements` | `01-需求/` |
| `design` | `02-设计稿/`，含 `images/` |
| `breakdown` | `03-需求分析/` |
| `plans` | `04-技术方案/` |
| `todos` | `05-实现清单/` |

极简迭代可只含受影响阶段对应的子目录。

待确认事项回写时按以下文件名定位来源文档：

| 阶段 | 默认文档文件 |
|---|---|
| `requirements` | `01-需求/需求文档.md` |
| `design` | `02-设计稿/设计稿.md` |
| `breakdown` | `03-需求分析/需求分析文档.md` |
| `plans` | `04-技术方案/技术方案.md` |
| `todos` | `05-实现清单/实现清单.md` |

`code` 阶段没有阶段文档；编码完成后通过迭代完成流程把 spec 标为 `done`，项目稳定态由 `specs: []` 表示。
