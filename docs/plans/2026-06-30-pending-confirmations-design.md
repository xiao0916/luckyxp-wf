# 待确认事项流程设计

> 日期：2026-06-30
> 主题：在 dwf-orchestrator 工作流的阶段文档确认后，逐项处理"待确认项/待解决问题"，登记入项目级台账，并在下次 spec 激活前提醒用户。
> 影响范围：仅 `skills/dwf-orchestrator/`；不修改任何 sub-skill 与 references 模板。

## 背景与问题

DWF 工作流的各阶段模板中已有"待解决问题/待确认项"段，供 sub-skill 在生成文档时标出未定事项。当前问题：

1. 阶段文档的"文档审阅"question 只有"确认/需要修改"两个选项，用户可直接选"确认"忽略所有待确认项。
2. 无任何机制记录哪些事项被递延，下次迭代前也无提醒。
3. sub-skill 完全不处理该段，下游阶段读到占位文本时无法区分"未决"和"已决后保留的文案"。

本设计补齐这段缺口，让 AI 在文档确认后逐项追问用户，把答案台账化，并在下次 spec 即将激活前提醒用户处理递延项。

## 设计目标

- 不修改 4 个 sub-skill、5 个 references 模板、`_meta.json`、state.json、现有 question_templates.md。
- 仅由 dwf-orchestrator 担任解析、登记、逐项追问、提醒的主角。
- 待确认事项按需触发：阶段文档无待确认段则现有行为不变；有非空段才走逐项循环。
- 跨 spec 累积递延项，任意 spec 即将转 active 前提醒。
- 已解决项保留于台账作为项目决策历史，不删除。

## 澄清记录（brainstorming）

| 维度 | 选择 |
|---|---|
| 覆盖阶段 | 按需触发：当前阶段文档有"待确认项/待解决问题"且非空才走该流程 |
| 递延项存储 | 项目级单文件 `.dwf/pending_confirmations.json` |
| 逐项确认交互 | 每项一个 `question`，逐项循环 |
| 提醒触发时机 | 任何 spec 即将转 active 时提醒 |
| 已解决项处理 | 保留于台账，status 改为 answered |
| 实现方案 | 方案 A：Orchestrator 驱动，台账为唯一答案出处；不回填 spec 文档 |

## 第 1 节：台账数据结构

文件位置：`.dwf/pending_confirmations.json`

```json
{
  "items": [
    {
      "id": "2026-06-30-001",
      "source_spec": "2026-01-01-feat-项目初始化",
      "source_stage": "design",
      "source_section": "待确认项",
      "content": "主色调是否采用品牌色 #1A73E8？",
      "status": "deferred",
      "user_answer": null,
      "raised_at": "2026-06-30T10:20:00",
      "answered_at": null
    },
    {
      "id": "2026-06-30-002",
      "source_spec": "2026-01-01-feat-项目初始化",
      "source_stage": "requirements",
      "source_section": "待解决问题",
      "content": "移动端原生 H5 还是小程序？",
      "status": "answered",
      "user_answer": "H5，首期不做小程序",
      "raised_at": "2026-06-30T10:00:00",
      "answered_at": "2026-07-01T14:30:00",
      "resolved_by_spec": "2026-01-05-feat-首页"
    }
  ],
  "updated_at": "2026-07-01T14:30:00",
  "created_at": "2026-06-30T10:00:00"
}
```

字段说明：

- `id`：`{YYYY-MM-DD}-{3位序号}`，由 orchestrator 在首次登记时分配
- `source_spec`：该待确认项来自哪个 spec 目录名
- `source_stage`：来自哪个阶段（`requirements`/`design`/`breakdown`/`plans`/`todos`）
- `source_section`：文档中的段名（兼容现有 `待解决问题`、`待确认项` 两种）
- `content`：从文档该段提取出的待确认事项文本
- `status`：`deferred`（递延未决）/ `answered`（用户已解答）
- `user_answer`：用户在 `question` 自定义输入中给的答案；跳过项保持 null
- `raised_at`：登记入台账的时间
- `answered_at`：用户给出答案的时间
- `resolved_by_spec`：仅 `answered` 项才有——由哪个 spec 触发的提醒解决，便于追溯
- `updated_at`/`created_at`：顶层时间戳

兼容两种段名的原因：现有模板里需求文档用 `## 待解决问题`，设计稿与需求分析用 `## 待确认项`。为不破坏现有模板，orchestrator 在解析时同时认这两种段名。

`user_answer` 对跳过项仍是 null 的原因：跳过是显式行为（用户在 `question` 选了"跳过"），状态仍为 `deferred`；下一轮是 answered 状态。本轮 YAGNI 先归 deferred，未来若需细化到 `deferred|skipped|answered` 可扩展。

## 第 2 节：登记与确认时序

整体时序：

```
sub-skill 完成 spec 阶段文档
  ↓
sub-skill 用 question 请求"文档审阅"（沿用现有 question_templates → 阶段文档确认）
  ↓
用户选择"确认，进入下一阶段"
  ↓
orchestrator 解析该 spec 刚生成的阶段文档中的"待确认项/待解决问题"段
  ↓
段为空或不存在 → 直接推进 current_step（现有行为不变）
段非空 → 触发"逐项确认循环"
  ↓
逐项 question 循环
  ↓
所有项处理完 → 更新台账 → 推进 current_step
```

逐项 question 循环规则：

对段里每一行非空条目（按 `- ` 列表项解析），orchestrator 逐项发起 `question`：

```json
{
  "questions": [
    {
      "question": "待确认事项（来自 {spec}/{stage} 的「{section}」）：\n\n{content}\n\n请逐一项处理。本项你打算如何处置？",
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

分支处理：

- **已解决**：用户在 custom 里写答案 → 台账写 `status: answered`、`user_answer: <答案>`、`answered_at: <当前>`
- **跳过**：台账写 `status: deferred`、`user_answer: null`
- **已在文档中直接修改**：orchestrator 不再解析该行的占位文本（都已自改），台账写 `status: answered`、`user_answer: "已在文档中修改"`、`answered_at: <当前>`

把"已在文档中直接修改"做成显式选项的原因：用户在"文档审阅"确认后理论上文档已定稿，但实际可能选了"确认"后又发现某项可以直接填——给这条路径一个显式身份，避免用户为了改一项又退回"需要修改"循环。

保留的现有行为：

- 用户在"文档审阅"选"需要修改" → 维持现有循环（修改后再审阅），不触发逐项确认；只在最后一次"确认"后才进入逐项循环。
- `design_skipped=true` 直接跳过 design 阶段 → 不解析不登记。
- 阶段文档无待确认段 → orchestrator 不发任何额外 question，直接推进。

解析容错：

- 段名匹配 `^##\s*(待确认项|待解决问题)\s*$`
- 条目匹配 `^-\s+`（无序列表项）；空行、`[占位]` 仅含占位符的行（如 `- [需要与设计确认的问题]`）仍登记——占位符本身就是要让用户决定的内容
- 解析失败（段存在但内容不合规） → 不阻塞推进，orchestrator 用 `question` 一次性告知"检出待确认段但无法解析条目，是否仍推进？"选项"跳过解析推进"/"需要修改文档重整该段"

触发位置：仅在 orchestrator「阶段推进」前插入；不动 sub-skill 的 question 流程。

## 第 3 节：提醒触发与处理

### 触发时机

按"任何 spec 即将转 active 时提醒"。orchestrator 在「阶段 0：自检」中，找到即将成为 active 的 spec 后、分派 sub-skill 之前，插入一次"台账扫检 + 提醒"步骤。具体覆盖以下场景：

| 场景 | 触发点 |
|---|---|
| 首次激活首个 pending | 「首次初始化」末或「迭代完成」末准备激活下一 pending 时 |
| paused 恢复为 active | 「暂停与优先插入」中紧急 spec 完成后、即将恢复原 paused spec 前 |
| 拆分兄弟入队后首个变 active | 「拆分迭代」推进初始化 spec 完成后激活首个兄弟 spec 前 |
| 新增迭代直接激活 | 「新增迭代」把新 spec 追加并立即激活前 |
| state.json 缺失重建后即将激活 | 「state.json 缺失时重建」末尾用户确认激活前 |

### 提醒流程

```
orchestrator 在准备把 spec X 置为 active 前：
  ↓
读 .dwf/pending_confirmations.json
  ↓
筛 status=deferred 项（无 resolved_by_spec 限制，全部未决项都提醒）
  ↓
无 deferred 项 → 直接置 active 并分派（现有行为不变）
有 deferred 项 → 发起"递延项提醒" question
  ↓
用户选择 → 见下文分支
  ↓
处理完 → 写回台账（如解决则 answered + user_answer + resolved_by_spec=X）→ 置 active 分派
```

"递延项提醒"的 question：

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

分支处理：

- **逐项处理**：进入与第 2 节相同的逐项 question 循环（共用同一循环函数，但这里只遍历 deferred 项）；解决项写 `answered` + `user_answer` + `answered_at` + `resolved_by_spec: X`
- **全部继续递延**：不动台账，立即激活 spec X
- **只处理来自本 spec 的项**：进入逐项循环，但仅枚举 `source_spec == X` 的 deferred 项；其它项保留

提供"只处理来自本 spec 的项"的原因：拆分出来的兄弟 spec 与初始化 spec 的待确认事项关联度差异大。用户处理首页 spec 时可能不想被无关样式项打扰。提供聚焦选项，避免提醒疲劳。

台账读写位置：

- 读：orchestrator「阶段 0 自检」准备激活前
- 写："已解决"分支：`status=answered`、`user_answer`、`answered_at`、`resolved_by_spec=<本次 active 的 spec>`
- 写："跳过/全部继续递延"分支：台账不变（status 已是 deferred）
- 写回后同步顶层 `updated_at`

特殊约定：

- 同一 deferred 项可能跨多个 spec 提醒多次。每次提醒的"全部继续递延"都不改 `raised_at`，不增加新条目，只在最终用户给答案时写 `answered_at` 与 `resolved_by_spec`。
- 不设"忽略不再提醒"开关。如果将来反馈烦，可加 `dismiss_until_answered: true` 类的特性，本轮 YAGNI 先不加。

## 第 4 节：orchestrator SKILL.md 流程改动

### 新增内容（不替换现有段落，只追加）

**1. HARD-GATE 新增第 9 条**

> 9. **待确认事项处理由本技能统一发起。** 阶段文档中"待确认项/待解决问题"段的逐项确认、登记入 `.dwf/pending_confirmations.json`、激活 spec 前的递延提醒，全部由本技能用 `question` 进行；sub-skill 不解析该段、不写台账、不发起逐项 question。

**2. 状态机新增"台账"小节**

在「spec 目录的 `_meta.json`」之后追加：

```
### 待确认事项台账 `.dwf/pending_confirmations.json`

仅 orchestrator 读写。结构见 docs/plans/2026-06-30-pending-confirmations-design.md。
字段汇总：items[] 含 id/source_spec/source_stage/source_section/content/status/
        user_answer/raised_at/answered_at/resolved_by_spec；updated_at；created_at。
段名匹配 `^##\s*(待确认项|待解决问题)\s*$`；条目匹配 `^-\s+`。
```

### 现有段落改动（精确插入点）

**A.「阶段推进」末尾追加**

原文末句"推进后再按路由表分派到下一阶段的子技能。"改为：

```
推进前若该 spec 刚生成的阶段文档含非空"待确认项/待解决问题"段，
按「待确认事项逐项确认循环」处理完毕后才更新 current_step 推进。
段为空或不存在则现有行为不变。
```

并在该段后追加新的子节「待确认事项逐项确认循环」，包含：

- 台账读/写顺序
- 逐项 question 模板（复用第 2 节）
- 三种用户选择的分支处理
- 解析容错规则

**B.「首次初始化」第 4 步后追加第 5 步**

```
5. 在该 spec 目录骨架创建后、分派 dwf-requirement 前，
   创建空台账 `.dwf/pending_confirmations.json`（{"items": [], created_at, updated_at}）。
```

**C.「迭代完成」第 1 步与第 5 步间插入**

原"把 active spec 移入 completed_specs...用 question 询问下一个"流程里，在"用 question 询问下一个 spec 是否继续？"之前追加：

```
准备激活下一个 pending/恢复 paused 前，按「递延项提醒」处理 .dwf/pending_confirmations.json
中的 deferred 项；处理完毕后再用 question 询问激活。
```

**D.「暂停与优先插入」末尾追加**

```
紧急 spec 完成移除后、即将恢复原 paused spec 前，按「递延项提醒」处理 deferred 项。
```

**E.「拆分迭代」第 8 步后追加新第 9 步**

```
此后激活首个兄弟 spec 前，按「递延项提醒」处理 deferred 项。
```

**F.「新增迭代」第 7 步前插入**

```
若 active spec 即将切换为本新 spec，按「递延项提醒」处理 deferred 项。
```

**G.「恢复」子节开头加一条**

```
若即将激活某个 spec，先按「递延项提醒」处理 deferred 项，之后再按其 current_step 分派。
```

**H.「重新开始」第 3 步后追加**

```
删除时同时清除 `.dwf/pending_confirmations.json`。
```

**I.「state.json 缺失时重建」第 4 步后追加第 5 步**

```
若扫描发现 .dwf/pending_confirmations.json 仍存在且含 deferred 项，重建后即将激活 spec 前按
「递延项提醒」处理。
```

### 两个公用子节写入位置

把第 2 节的"逐项确认循环"与第 3 节的"递延项提醒"作为独立小节追加到 SKILL.md「触发后流程」段末（在「恢复」之前），被 A–I 各点引用。

### 不动的部分

- 4 个 sub-skill SKILL.md：不动
- 5 个 references 模板：不动
- `_meta.json` 结构：不动
- state.json 结构：不动
- question_templates.md：不动（现有"阶段文档确认"模板沿用，新加的两个 question 模板写进 SKILL.md 而非 question_templates.md，避免污染已对齐 dev-workflow 旧模板）
- USAGE.md：补一句"如有阶段文档含待确认项，确认后会被逐项追问，答案存 `.dwf/pending_confirmations.json`"供人快速理解，其余不动

## 第 5 节：验收清单与边界

### 验收清单

1. **台账结构**：`.dwf/pending_confirmations.json` 创建时为 `{"items": [], "created_at": <now>, "updated_at": <now>}`；登记后项含第 1 节所有字段；answered 项含 `user_answer`/`answered_at`/`resolved_by_spec`
2. **段名解析**：`^##\s*(待确认项|待解决问题)\s*$` 两种段名都识别；任一种存在且其下有 `^-\s+` 列表项才触发逐项循环
3. **触发按需**：阶段文档无待确认段 → 不发任何额外 question，现有行为不变；有非空段 → 在"文档审阅"用户选"确认"后触发逐项循环
4. **逐项循环**：每项一个 `question`，含三个选项（已解决/跳过/已在文档中修改）；循环仅遍历该段非空列表项
5. **激活前提醒**：任一 spec 即将转 active 前，扫台账 deferred 项；无则跳过；有则发"递延项提醒" question，三选项（逐项处理/全部继续递延/只处理来自本 spec 的项）
6. **跳过与继续递延区别**：逐项循环中选"跳过" → status 仍 deferred、user_answer=null；激活前选"全部继续递延" → 台账不变；都不新建条目
7. **提醒不增条目**：同一 deferred 项跨多次提醒均不新增 items，只在最终用户给答案时更新 answered_at 与 resolved_by_spec
8. **clear-on-restart**：重新开始二次确认后，`.dwf/pending_confirmations.json` 与 `.dwf/`、项目代码一起被删
9. **state.json 重建兼容**：state.json 缺失重建时，若台账仍在且含 deferred 项，重建后即将激活 spec 前按激活前提醒流程处理
10. **现有文档/模板不改**：5 个 references 模板、4 个 sub-skill SKILL.md、`_meta.json`、state.json 结构、现有 question_templates.md 全部不动；新加的两个 question 模板写进 orchestrator SKILL.md
11. **中文交互**：所有台账读写用 ASCII key，所有与用户的 `question` 文字、问答选项文字均为中文
12. **不动 sub-skill**：sub-skill 在此流程中不解析阶段文档的待确认段、不发起逐项 question、不写台账

### 范围边界（不在本设计内）

- **答案不回填 spec 文档正文**：spec 文档中的占位（如 `[需要与设计确认的问题]`）保留原样；下游 sub-skill 若读到这些占位需自行判断"这是未填的占位"还是"已决的文案"，决策上下文以 `.dwf/pending_confirmations.json` 为准
- **待确认项 ID 不写入 spec 文档**：orchestrator 靠解析段下列表项顺序登记 content，不在 spec 文档里写 `<!-- PC-001 -->` 之类锚标。若用户大幅重排待确认段又在同阶段重新确认，会出现两项独立条目（旧的 deferred + 新的 deferred），属可接受成本
- **不跨项目提醒**：台账在 `.dwf/` 下，仅本工作区的 spec 可见
- **不做"已读但未决"的中间态**：只有 `deferred` 与 `answered` 两状态
- **不主动修复解析失败**：解析失败给用户报错并给"跳过解析推进"选项，不自动尝试整理文档
- **不嵌入 question_templates.md**：新 question 模板写进 orchestrator SKILL.md，避免与新近对齐 dev-workflow 的 question_templates.md 产生再次同步成本。后续若 question_templates.md 整体迁移到 orchestrator，再合并