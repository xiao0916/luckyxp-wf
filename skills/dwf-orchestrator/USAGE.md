# dwf-orchestrator 使用说明

面向人的快速上手。完整行为规范见 `SKILL.md`。

## 它是什么

`dwf-orchestrator` 是 DWF 开发工作流的统一调度入口。它替代旧的 `dev-workflow` 一体化技能，改用"编排 + 子技能"分层：

- **编排层（本技能）**：读 `.dwf/state.json`、判断阶段、分派子技能、推进状态机、处理迭代和重启。
- **实现层（子技能）**：各自负责一个阶段的文档或代码生成。

编排层不写任何阶段内容，只路由。

## 目录结构

所有文档统一收纳进 `.dwf/specs/{date}-{seq}-{type}-{描述}/` 下，代码放在工作区根目录：

```
工作区根目录/
├── .dwf/
│   ├── state.json
│   ├── pending/
│   │   └── 2026-01-01-001-feat-项目初始化/
│   │       └── state.json    （仅有未确认事项时创建）
│   └── specs/
│       ├── 2026-01-01-001-feat-项目初始化/
│       │   ├── 01-需求/
│       │   ├── 02-设计稿/
│       │   ├── 03-需求分析/
│       │   ├── 04-技术方案/
│       │   └── 05-实现清单/
│       ├── 2026-01-10-002-bugfix-修复问题/    （迭代只含受影响阶段子目录）
│       └── 2026-01-20-003-style-极简迭代/     （极简迭代可只含 01-需求/）
└── <项目代码文件直接在根目录>
```

首个 `feat` spec 承载项目初始化；后续每个迭代新建一个 spec。目录名中的 `{seq}` 是三位全局序号（`001` 起，跨项目单调递增，由 `state.json.spec_seq` 维护）。极简迭代可只含 `01-需求/`。

## 何时触发本技能

- 启动新项目、新功能、系统化开发
- 继续、恢复或重启工作流
- 在已有项目上提任何变更（bug、优化、重构、文案）→ 新增迭代
- 初始化需求较大时，由本技能主动询问是否拆分为多个迭代
- 迭代期间出现紧急需求，希望插队优先执行
- 用户表达了"按步骤推进开发"的意图

不要用它单独执行某个阶段——那种场景直接用对应 `dwf-xxx` 子技能。

## 待确认事项

各阶段模板中可能含"待确认项/待确认事项/待解决问题"段。当前阶段文档必须先整体确认通过；如果你只说"继续"但没有明确确认文档，orchestrator 应先用 `question` 补问。文档整体确认后，orchestrator 必须扫描待确认段；若该段非空，会逐项 `question` 询问你对该事项的处置：给答案、跳过留待后续、或已在文档中修改。未完成这些步骤前，不应推进 `current_step`。

已确认的事项会直接回写到对应阶段文档的待确认段，不再额外记录。只有跳过或暂未确认的事项会记录到 `.dwf/pending/<迭代目录名>/state.json`，该文件按阶段拆成 `requirements`、`design`、`breakdown`、`plans`、`todos` 五个数组。

下次任意 spec 即将开始前，orchestrator 会扫描 `.dwf/pending/*/state.json`，把此前递延的事项再次提醒，并提供"逐项处理/全部继续递延/只处理来自本 spec 的项"三种选项。递延项被解决后，会回写来源阶段文档，并从 `pending` 状态文件中移除。

## 阶段流转

每个 spec 内的阶段流转：

```
requirements → design → breakdown → plans → todos → code
```

完成 `code` 后该 spec 从队列移除。多个 spec 在 `specs` 数组中按队列顺序执行。

`code` 表示编码执行中或待收尾。编码完成后该 spec 的 `_meta.json` 标记为 `done`，并从 `specs` 移入 `completed_specs`；项目稳定态由 `specs: []` 表示。

## 状态文件

`.dwf/state.json`：
- `specs`：迭代队列（数组）。每个 spec 含 `name`/`status`/`current_step`/`design_skipped`/`selected_plan`/`affected_stages`/`confirmed_stages`/`is_shared_context`/`shared_ref`/`paused_at`/`pause_reason`/`started_at`/`completed_at`。同一时刻最多 1 个 `active`，其余是 `pending` 或 `paused`。完成则从数组移除。
- `completed_specs`：已完成 spec 历史，仅含 `name` 与 `completed_at`。
- `spec_seq`：已分配的全局 spec 序号，新建 spec 时自增并作为目录名中的三位序号。
- `iteration_count`：已完成的迭代次数。
- `project_name`/`created_at`/`updated_at`：项目级元数据。

每个 spec 目录下还有同名镜像 `_meta.json`，记录该 spec 自身状态，便于不读 state.json 也能查到。

### spec 状态

| 状态 | 含义 |
|---|---|
| `pending` | 在队列中排队 |
| `active` | 当前正在执行 |
| `paused` | 被优先插入打断，记录进度待恢复 |
| `done` | 已完成（同时从 `specs` 移除，写入 `completed_specs`） |

spec 目录**不重命名**——状态只在 `_meta.json` 与 `state.json` 表达。

### spec 的身份识别

每个 spec 的"出身"通过两种文件确定：

- `_meta.json` 中的 `is_shared_context` 与 `shared_ref`
  - `is_shared_context: true` → 这是共享初始化 spec，`01-需求/`/`02-设计稿/` 被只读引用
  - `shared_ref` 非空 → 这是从初始化 spec 拆分出来的兄弟 spec，指向其目录名
  - 两者皆 false/null → 独立迭代（bugfix/style 等），不依赖共享上下文
- 兄弟 spec 目录下另有 `_context.md`，列出：
  - 共享上下文 spec 的目录名
  - 依赖文档的相对路径（指向初始化 spec 的 01/02 文档）
  - 引用时间戳（"以此版为准"的快照）

即便 state.json 丢失，扫 `.dwf/specs/*/_meta.json` 与 `_context.md` 即可重建队列、识别谁是初始化 spec、谁是兄弟 spec、各自依赖哪个上下文。

## 拆分迭代

当初始化 spec 完成 `03-需求分析` 阶段、用户确认需求分析文档后，本技能判断需求是否较大，若是则用 `question` 询问是否拆分为多个迭代并发执行：

- 不拆分：初始化 spec 继续走 `plans → todos → code`，产出完整项目
- 拆分：在 `.dwf/specs/` 下新建兄弟 spec（如 `2026-01-01-002-feat-首页`、`2026-01-01-003-feat-新闻页`），追加为 `pending`
- 兄弟 spec 写 `_meta.json`（`shared_ref` 指向初始化 spec）和 `_context.md`（列出依赖的初始化 spec 文档相对路径与引用时间戳）
- 兄弟 spec 以初始化 spec 作为**共享上下文**——只读它已确认的 `01-需求/`、`02-设计稿/`，不重复生成项目级需求与设计稿
- 兄弟 spec 通常从 `breakdown`/`plans` 起步（跳过 `requirements`/`design`）
- 初始化 spec 仍走完自己的 `code`（产出脚手架/共享代码），也可直接收尾作为纯共享上下文

## 队列执行与优先插入

队列 `specs` 自上而下顺序执行。当前 `active` 完成则移除并激活下一个 `pending`。迭代期间出现紧急需求：

1. 用 `question` 确认用户要中断当前 spec
2. 把当前 `active` spec 的 `status` 改为 `paused`，记录 `paused_at`/`pause_reason`
3. 在 `specs` 头部插入新 spec 并置为 `active`
4. 紧急 spec 完成并被移除后，用 `question` 询问是否恢复原 `paused` spec；恢复则回 `active`，从原 `current_step` 继续

会话中断后再次调用本技能：读 `state.json.specs`，自动按 `active`/`paused`/`pending` 状态恢复，无需重新初始化。

## 新增迭代

项目稳定（`specs: []`）时用户提新变更：在 `.dwf/specs/` 新建 spec 目录（仅含受影响阶段子目录；极简迭代只含 `01-需求/`），追加到 `specs` 末尾并立即激活，走阶段确认后由 `dwf-coding` 在根目录实施代码。

## 重新开始

用户请求重新开始时本技能会二次风险确认。默认只删除 `.dwf/`（含全部 specs 与历史归档）；如果你要求同时清理根目录项目代码，orchestrator 必须先列出逐项待删清单，并排除 `skills/`、`.git/`、agent 配置、仓库维护文档、脚本等非项目代码文件。只有逐项确认后才删除对应路径。

## 子技能关系图

```
dwf-orchestrator（编排：队列调度 + 状态机）
├── dwf-requirement   → 阶段 requirements：需求文档
├── dwf-design         → 阶段 design：设计稿
├── dwf-development    → 阶段 breakdown/plans/todos：需求分析 / 技术方案 / 实现清单
└── dwf-coding         → 阶段 code：编码执行（代码写入工作区根目录）
```

## 迁移说明

旧 `dev-workflow` 项目的目录结构（`01-需求文档/`~`07-需求迭代/` + `06-code/`）与本技能的新结构（`.dwf/specs/` + 根目录代码）不兼容。迁移需要把旧目录的内容归并到 `.dwf/specs/{date}-{seq}-feat-项目名/` 下的对应子目录，把 `06-code/` 内容移到根目录，并按新结构重建 `state.json`。建议在新项目上直接使用本技能，旧项目迁移前先备份。
