# Agent 使用说明

本仓库是一个用于开发、修改和测试 AI agent 技能包的本地工作区。

## 唯一来源

- `skills/` 是本仓库的唯一技能源码目录。
- 每个技能放在 `skills/<技能名>/` 下，并且必须包含 `SKILL.md`。
- `.opencode/skills/`、`.codex/skills/`、`.cursor/skills/`、`.trae/skills/` 等 agent 技能入口是指向 `skills/` 的目录链接。
- 不要在 `.agents/`、`.claude/` 或其他 agent 专属目录下创建第二份技能源码。

## Agent 约定

OpenCode、Codex、Cursor、Trae 等 agent 都统一遵守本仓库约定：

1. 当用户询问可用技能时，先查看 `skills/`。
2. 当用户要求创建、修改、测试或应用某个技能时，先读取对应的 `skills/<技能名>/SKILL.md`。
3. 当用户询问某个技能如何使用时，读取 `skills/<技能名>/USAGE.md`，如果该文件存在。
4. 当测试某个技能时，优先使用 `skills/<技能名>/evals/`，如果该目录存在。
5. 新的测试记录或观察笔记默认保存到 `test-results/<技能名>/`，除非用户指定其他位置。
6. 技能运行时生成的产物默认保存到 `outputs/<技能名>/`；`outputs/` 只用于本地运行产物，不上传到仓库。

## 修改技能

修改已有技能时：

1. 先读取当前 `SKILL.md`。
2. 保留技能目录名和 frontmatter 中的 `name` 字段，除非用户明确要求重命名。
3. `SKILL.md` 应聚焦可复用的 agent 行为，不记录一次性的项目经历。
4. 大型参考资料、模板、脚本或示例应放在辅助文件中，不要塞进 `SKILL.md`。
5. 如果改动会影响技能行为，应同步更新或新增 eval prompts。

## 新增技能

新增技能时：

1. 创建 `skills/<技能名>/SKILL.md`。
2. 技能目录名使用小写英文和连字符。
3. `SKILL.md` 至少包含 `name` 和 `description` 两个 YAML frontmatter 字段。
4. 推荐添加 `USAGE.md`，用于面向人的快速使用说明。
5. 如果技能行为可以通过 prompt 测试，添加 `evals/evals.json`。

## 测试技能

使用 AI agent 测试技能时：

1. 条件允许时，用同一个 prompt 分别测试“使用技能”和“不使用技能”的表现。
2. 记录使用的 agent、技能版本、测试 prompt 和观察到的输出。
3. 将结果与 eval 文件或测试笔记中的预期行为对比。
4. 只有当测试结论能改进通用行为时，才把它写回 `SKILL.md`。
5. 测试记录写入 `test-results/<技能名>/`，例如 `test-results/<技能名>/2026-06-26-basic.md`。
6. 技能生成的文件、截图、导出物或临时演示项目写入 `outputs/<技能名>/`，例如 `outputs/<技能名>/2026-06-26-basic/`。

## 仓库维护

- 保持 `skills/` 能被不同 agent 复用。
- agent 专属文件应尽量简短，只放适配说明。
- 正常开发只修改 `skills/`。各 agent 的 `skills` 入口只是链接入口，不要在这些路径下单独维护不同内容。
- 使用 `scripts/setup-agent-skill-links.ps1` 创建或修复 agent 技能入口链接；新增 agent 时把对应的 `<agent>/skills` 路径传给脚本或加入脚本默认列表。
- 如果某个 agent 不能自动发现技能，就让它读取本文件和对应的 `skills/<技能名>/SKILL.md`。


