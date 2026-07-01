# DWF 编排流程参考

本文件保存 `dwf-orchestrator` 的详细流程。执行任何会写入队列、推进阶段、恢复状态或处理待确认事项的动作前先读取本文件。

## 目录

- [通用写入约束](#通用写入约束)
- [阶段 0：自检](#阶段-0自检)
- [首次初始化](#首次初始化)
- [分派](#分派)
- [阶段推进](#阶段推进)
- [拆分迭代](#拆分迭代)
- [迭代完成](#迭代完成)
- [新增迭代](#新增迭代)
- [暂停与优先插入](#暂停与优先插入)
- [重新开始](#重新开始)
- [待确认事项逐项确认循环](#待确认事项逐项确认循环)
- [递延项提醒](#递延项提醒)
- [恢复](#恢复)
- [`state.json` 缺失时重建](#statejson-缺失时重建)

## 通用写入约束

- 每次动作先读取 `.dwf/state.json`，再决定下一步。
- 阶段文档整体确认、阶段间推进、队列变更、拆分、插队、重新开始都必须获取用户明确确认；用户没有明确确认阶段文档整体通过时，必须用 `question` 补问。
- 每次写 `state.json` 后，同步当前 spec 的 `_meta.json`；若涉及兄弟 spec，同步 `_context.md`。
- 每次写入状态后更新顶层 `updated_at`。
- 子技能不得修改 `state.json.specs` 队列结构。
- spec 目录名保持稳定，不添加状态前缀。
- 一次触发只执行一个编排动作；分派子技能后不得继续执行后续阶段。
- 阶段推进只把 `current_step` 更新到下一阶段并停止；下一阶段必须等待用户再次继续或确认后才分派。
- 允许的复合动作仅限：首次初始化后分派 `requirements`；新增或插队 spec 经用户确认后激活并分派第一个阶段；恢复或重建经用户确认后激活并分派当前阶段。

## 阶段 0：自检

1. 读取 `.dwf/state.json`（如存在）。
2. 如不存在：
   - `.dwf/specs/` 不存在：进入首次初始化。
   - `.dwf/specs/` 存在：进入 `state.json` 缺失时重建。
3. 如存在且 `specs` 数组为空：项目稳定，等待用户新变更；若用户提出变更，进入新增迭代。
4. 如存在且 `specs` 数组非空：
   - 找出 `active` spec。
   - 若无 `active` 而只有 `paused` 或 `pending`，先做递延项提醒，再用 `question` 请用户选择恢复首个 `paused` 或激活首个 `pending`。
   - 若有 `active` 且 `active.current_step == "code"` 且代码阶段完成，进入迭代完成。
   - 若有 `active` 但不满足迭代完成条件，按其 `current_step` 分派子技能。
   - 期间用户提出紧急变更，可进入暂停与优先插入。

## 首次初始化

进入条件：`.dwf/state.json` 不存在且 `.dwf/specs/` 不存在，或用户明确请求开始全新项目并已通过二次确认。

1. 创建 `.dwf/`、`.dwf/specs/`。
2. 创建首个 spec 目录，命名 `{今日日期}-feat-项目初始化`，或使用用户确认的描述。
3. 在首个 spec 下创建 `01-需求/`、`02-设计稿/`、`02-设计稿/images/`、`03-需求分析/`、`04-技术方案/`、`05-实现清单/`。
4. 写入 `.dwf/state.json`：
   - `project_name`：从用户输入提取或询问。
   - `specs`：仅包含首个 spec，`status: "active"`、`current_step: "requirements"`、`design_skipped: false`、`selected_plan: null`、`affected_stages` 含全部阶段、`confirmed_stages: []`、`is_shared_context: true`、`shared_ref: null`、`started_at` 为当前时间。
   - `completed_specs: []`、`iteration_count: 0`、`created_at`、`updated_at`。
5. 在首个 spec 目录写 `_meta.json`，内容与 `state.json.specs[0]` 镜像。
6. 不创建空待确认状态文件；只有出现未确认事项时才创建 `.dwf/pending/<迭代目录名>/state.json`。
7. 不创建单独项目代码目录，项目代码直接位于工作区根目录。
8. 分派 `dwf-requirement`，让它接管需求捕获与文档生成。

## 分派

按 `active.current_step` 选择子技能：

| `active.current_step` | 子技能 |
|---|---|
| `requirements` | `dwf-requirement` |
| `design` | `dwf-design` |
| `breakdown` | `dwf-development` |
| `plans` | `dwf-development` |
| `todos` | `dwf-development` |
| `code` | `dwf-coding` |

分派时提供当前 `active` spec 的目录、阶段、`affected_stages`、`confirmed_stages`、`shared_ref`。子技能写入 `.dwf/specs/{spec 目录名}/{阶段子目录}/`，并负责阶段内产出和确认。

分派是本次 orchestrator 动作的终点。子技能完成本阶段确认前，orchestrator 不得提前推进；推进后也不得在同一次调用中继续分派下一阶段。

若 `active` spec 是兄弟 spec（`shared_ref` 非空），子技能在生成 `breakdown`、`plans`、`todos` 时，以 `shared_ref` 指向的初始化 spec 中 `01-需求/`、`02-设计稿/` 作为只读参考上下文。

## 阶段推进

当前阶段由子技能完成后，先执行推进前置门禁。只有门禁全部通过，才能写 `confirmed_stages` 或推进 `current_step`。

1. 判断本轮用户输入是否已明确确认当前阶段文档整体通过。可接受表达包括“确认”“通过”“没问题”“采用”“按这个继续”“继续推进该阶段”等等价表达；单独的“继续做下去”“下一步”不等于已确认文档。
2. 若没有整体确认，用 `question` 询问“是否确认当前阶段文档整体通过并进入阶段推进？”选项至少包含“确认通过，继续推进”和“需要修改，返回当前阶段”。用户选择修改时，分派回当前阶段子技能或停下等待修改，不写 `confirmed_stages`。
3. 读取刚确认的阶段文档，按待确认事项规则检查“待确认项/待确认事项/待解决问题”。无论用户是否主动提到待确认事项，这一步都不可跳过。
4. 若存在可解析条目，先进入待确认事项逐项确认循环；若段存在但无法解析条目，按该循环的不可解析分支处理。
5. 将当前阶段加入该 spec 的 `confirmed_stages`。
6. 计算下一阶段：在 `affected_stages` 中找到当前阶段后的下一个值；若无下一个且当前为 `code`，进入迭代完成。
7. 更新该 spec 的 `current_step`、`confirmed_stages`、相关阶段字段、`_meta.json` 与顶层 `updated_at`。

完成第 7 步后停止。不要自动进入下一阶段的分派；用户下一次说“继续”或明确确认下一阶段时，再按新的 `current_step` 重新走阶段 0 自检。

特殊情况：

- 跳过设计稿：若用户在需求阶段选择跳过设计稿，设 `design_skipped: true`，从 `affected_stages` 移除 `design`，下一阶段改为 `breakdown` 或下一个受影响阶段。
- 技术方案选择：`plans` 阶段由 `dwf-development` 给出不少于两个方案，并通过 `question` 让用户选择；选定方案写入 `selected_plan`。
- 初始化 spec 的 `breakdown` 完成：若需求覆盖多个页面或复杂模块，必须用 `question` 询问是否拆分为多个迭代。
- `code` 完成：实现清单全部勾选且验证通过后，进入迭代完成。

## 拆分迭代

进入条件：初始化 spec 的 `breakdown` 阶段已确认，且用户同意拆分。

1. 基于已确认的 `03-需求分析/需求分析文档.md` 列出可独立拆分的功能模块或页面。
2. 用 `question` 与用户确认拆分为哪些兄弟 spec、每个描述、起始阶段和执行顺序。
3. 为每个兄弟 spec 创建 `.dwf/specs/{今日日期}-feat-{描述}/`。
4. 仅创建其 `affected_stages` 对应的子目录。兄弟 spec 通常跳过 `requirements` 和 `design`，从 `breakdown` 或 `plans` 起步；若仍需页面级设计，可保留 `02-设计稿/`。
5. 在 `state.json.specs` 数组按执行顺序追加兄弟 spec：
   - `status: "pending"`
   - `current_step` 为该兄弟的起始阶段
   - `design_skipped` 默认 `true`
   - `selected_plan: null`
   - `affected_stages` 仅含起始阶段之后直到 `code`
   - `confirmed_stages: []`
   - `is_shared_context: false`
   - `shared_ref` 指向初始化 spec 目录名
   - `started_at: null`
   - `completed_at: null`
6. 为每个兄弟 spec 写 `_meta.json`。
7. 为每个兄弟 spec 写 `_context.md`，记录共享上下文 spec、依赖文档相对路径、引用时间戳和只读说明。
8. 用户确认拆分结果后，继续推进初始化 spec 走 `plans → todos → code`。
9. 若用户希望初始化 spec 仅作为共享上下文不再写代码，让初始化 spec 直接进入迭代完成，其 `code` 视为已完成，然后激活第一个兄弟 spec。
10. 激活首个兄弟 spec 前，执行递延项提醒。

## 迭代完成

当 `active` spec 的 `code` 阶段完成：

1. 把该 spec 的 `status` 设为 `done`，`completed_at` 设为当前时间。
2. 同步该 spec 目录的 `_meta.json`。
3. 从 `specs` 数组中移除该项。
4. 向 `completed_specs` 追加 `{ "name": <spec name>, "completed_at": <当前时间> }`。
5. 递增 `iteration_count`，更新 `updated_at`。
6. 准备激活下一个 `pending` 或恢复 `paused` 前，先执行递延项提醒。
7. 若队列中还有 `pending` 或 `paused`：用 `question` 报告“已完成 X，下一个是 Y，是否继续？”用户确认后激活下一个 spec。
8. 若队列为空：项目处于稳定态，等待用户新变更。

## 新增迭代

进入条件：队列为空，或 `active` spec 处于 `code` 阶段且用户提出新的变更需求。

1. 根据用户描述提议 spec 名 `{今日日期}-{type}-{描述}`，`type` 采用 conventional-commit 前缀。
2. 用 `question` 请用户确认名称。
3. 分析变更影响哪些阶段，提出 `affected_stages`，按默认阶段顺序排列。用户跳过设计稿则排除 `design`。
4. 用 `question` 请用户确认或调整 `affected_stages`。
5. 创建新 spec 目录，仅创建受影响阶段的子目录。极简迭代可只含 `01-需求/`。
6. 在 `state.json.specs` 数组末尾追加新 spec：
   - `status: "pending"`
   - `current_step` 为第一个受影响阶段
   - `design_skipped` 默认 `false`
   - `selected_plan: null`
   - `affected_stages` 为确认后的列表
   - `confirmed_stages: []`
   - `is_shared_context: false`
   - `shared_ref` 若指向某完成初始化 spec 则填其名，否则 `null`
   - `started_at: null`
   - `completed_at: null`
7. 写初始 `_meta.json`。
8. 如果新需求是高优先级，走暂停与优先插入，不追加到末尾。
9. 若当前无 `active` spec，激活新 spec 前先执行递延项提醒；处理后把新 spec 设为 `active`、`started_at` 置当前时间，并分派对应子技能。

## 暂停与优先插入

进入条件：已有 `active` spec，且用户提出紧急或优先需求。

1. 用 `question` 确认是否中断当前 spec。选项应包含暂停当前 spec、稍后再插、拒绝插入继续当前 spec。
2. 用户确认暂停后，把当前 `active` spec 的 `status` 改为 `paused`，写入 `paused_at` 与 `pause_reason`，并同步 `_meta.json`。
3. 创建新优先 spec，命名、目录和 `affected_stages` 同新增迭代。
4. 在 `state.json.specs` 数组头部插入新 spec，`status: "active"`、`started_at` 为当前时间。
5. 按其 `current_step` 分派对应子技能。
6. 优先 spec 完成并被移除后，激活或恢复下一个 spec 前先执行递延项提醒。
7. 用 `question` 询问是否恢复之前暂停的 spec。用户确认后，把该 spec 的 `status` 改回 `active`，清除 `paused_at`、`pause_reason`，按原 `current_step` 分派。

## 重新开始

用户选择“启动新项目”或请求重新开始时：

1. 使用 `question` 进行二次风险确认。
2. 默认待删范围只包含 `.dwf/` 目录，明确告知其中包含 `state.json`、`pending/`、全部 `specs/` 文档，并说明删除不可撤销。
3. 如用户明确要求同时清理根目录项目代码，先生成逐项待删清单；清单必须排除 `skills/`、`.git/`、agent 配置目录、仓库维护文档、脚本、测试结果、输出目录和其它明显不属于本次项目代码的文件。
4. 用 `question` 分别确认：是否删除 `.dwf/`，以及根目录项目代码清单中的每一项是否删除。不得用“删除全部根目录文件”这类泛化选项替代逐项确认。
5. 用户选择取消或表达取消意向时停止，不删除任何文件。
6. 只有用户明确选择确认后，才删除 `.dwf/` 和被逐项确认的项目代码路径。
7. 删除后回到首次初始化。

二次确认前不得删除任何文件。

## 待确认事项逐项确认循环

在阶段推进前，必须读取刚确认的阶段文档并扫描“待确认项/待确认事项/待解决问题”段。若该段非空，按本循环处理。

1. 读取目标 spec 目录下刚确认的阶段文档。
2. 按 `references/state-model.md` 的解析规则提取段与列表项。
3. 段不存在或无列表项：跳过循环，直接推进。
4. 段存在但无法解析条目：用 `question` 一次性告知“检出待确认段但无法解析条目，是否仍推进？”选项为“跳过解析推进”和“需要修改文档重整该段”。选后者时分派回子技能修改文档并重新确认。
5. 对每个非空列表项逐项发起 `question`，选项为：
   - `已解决，给出答案`：用户在自定义输入中写答案；orchestrator 将该答案回写到当前阶段文档的对应待确认项，不写入 `.dwf/pending/`。
   - `跳过，留待后续迭代`：确保 `.dwf/pending/<当前 spec 目录名>/state.json` 存在，并把该项写入当前阶段数组。
   - `已在文档中直接修改`：确认文档中该项已被用户处理；不写入 `.dwf/pending/`，若此前已有同项未确认状态则从对应数组移除。
6. 所有项处理完后，清理空的 `pending/<spec>` 状态文件或空目录，再推进 `current_step`。

回写约定：

- 只修改来源阶段文档的“待确认项/待确认事项/待解决问题”段，不改其它正文段落。
- 保留原待确认项文本，并在同一列表项后追加用户决策，例如 `- 是否需要支持多语言？决策：暂不支持，后续通过配置扩展。`
- 若用户选择“已在文档中直接修改”，不再自动改写该项；只确认 `pending` 中同项已清理。
- 递延项后来被解决时，按其来源 spec 与阶段定位原文档并执行同样回写。

建议的 `question` 文案：

```json
{
  "questions": [
    {
      "question": "待确认事项（来自 {spec 目录名}/{阶段} 的「{段名}」）：\n\n{content}\n\n请逐一项处理。本项你打算如何处置？",
      "header": "待确认事项 {当前序号}/{总数}",
      "options": [
        {"label": "已解决，给出答案", "description": "在自定义输入中写出决定/答案，并回写到对应阶段文档"},
        {"label": "跳过，留待后续迭代", "description": "记录到 .dwf/pending/<迭代目录名>/state.json 的当前阶段数组，下次 spec 激活前再提醒"},
        {"label": "已在文档中直接修改", "description": "本事项已在阶段文档里直接改掉，不写入待确认状态"}
      ]
    }
  ]
}
```

## 递延项提醒

任意 spec 即将转 `active` 前插入一次未确认状态扫检和提醒。触发点包括：

- 首次激活首个 `pending`。
- 上一个 spec 完成后激活下一个。
- `paused` 恢复为 `active`。
- 拆分兄弟入队后首个变 `active`。
- 新增迭代直接激活。
- `state.json` 缺失重建后即将激活。

流程：

1. 扫描 `.dwf/pending/*/state.json`，汇总五个阶段数组中的未确认项。目录名就是来源 spec，数组名就是来源阶段。
2. 若没有未确认项：直接置 active 并分派。
3. 若有未确认项：发起 `question`，列出每项 content 及来源 spec/stage。
4. 选项为：
   - `逐项处理`：进入与待确认事项逐项确认循环相同的处理。
   - `全部继续递延，直接开始本 spec`：不动 `.dwf/pending/`，立即激活。
   - `只处理来自本 spec 的项`：仅处理目录名等于即将激活 spec 的未确认项，其它保留。
5. 用户解决某项时，把答案回写到该项来源阶段文档的待确认段，并从对应 `pending/<spec>/state.json` 阶段数组移除。
6. 用户继续递延某项时，保留该项，并更新 `last_reminded_at`。
7. 处理完后清理空状态文件或空目录，再置 active 并分派。

约定：

- 同一未确认项跨多次提醒不新增 item。
- 最终用户给答案时只回写阶段文档，并从 `pending` 状态移除。
- 不设“忽略不再提醒”开关，每次激活前都问。

## 恢复

会话中断后再次触发本技能时，先执行阶段 0 自检。

1. 读取 `state.json.specs`。
2. 若有 `active` spec：按其 `current_step` 分派对应子技能，让子技能展示当前阶段产出并请求继续确认。
3. 若无 `active` 而有 `paused`：用 `question` 让用户选择恢复哪个 `paused` spec。
4. 若只有 `pending`：激活首个 `pending` 前先执行递延项提醒，再把它设为 `active`、`started_at` 置当前时间，并按其 `current_step` 分派。
5. 若队列为空：项目稳定，等待新变更。
6. 每个 spec 的 `confirmed_stages` 与 `current_step` 是断点恢复的权威依据。
7. 每次恢复后，写回 `state.json` 前，把对应 `_meta.json` 与 `state.json.specs` 对齐。

## `state.json` 缺失时重建

如果 `.dwf/state.json` 不存在但 `.dwf/specs/` 目录仍在：

1. 扫描 `.dwf/specs/*/_meta.json` 与 `.dwf/specs/*/_context.md`。
2. 对每个 spec 读取 `_meta.json` 的 `name`、`current_step`、`confirmed_stages`、`design_skipped`、`selected_plan`、`is_shared_context`、`shared_ref`、`status`、`started_at`、`completed_at` 等字段。
3. 若 `_context.md` 存在，确认其“共享上下文 spec”与 `_meta.json.shared_ref` 一致；不一致时先记录为待修复项，不要立即写入。
4. 按 `_meta.json.status` 重新归类：
   - `done` 写入 `completed_specs`，按 `completed_at` 排序，不进入 `specs` 队列。
   - `paused` 写入 `specs` 队列并保持 `paused`。
   - `active` 或 `pending` 写入 `specs` 队列并保持原状态。
5. 若存在多个 `active`，保留第一个为 `active`，其余降级为 `pending`，并用 `question` 与用户确认。
6. 用 `question` 向用户展示重建结果：队列顺序、各 spec 状态、谁是共享上下文、谁是兄弟 spec、`_context.md` 中记录的引用时间戳，以及所有待修复的 `_context.md` 漂移项。
7. 用户确认后写新的 `state.json`，`created_at`、`updated_at` 使用当前时间，`iteration_count` 取 `completed_specs` 长度；随后再按已确认方案修正 `_context.md` 漂移项。
8. 若 `.dwf/pending/*/state.json` 仍存在且含未确认项，重建后即将激活 spec 前执行递延项提醒。
9. 若兄弟 spec 的 `_context.md` 指向的初始化 spec 目录已被删除，用 `question` 告知共享上下文缺失，请用户决定放弃该 spec，或以当前可得的最新需求/设计稿作为新共享上下文重新指定 `shared_ref` 并重写 `_context.md`。不要静默修复。
