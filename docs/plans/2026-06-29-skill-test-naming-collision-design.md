# skill-test-workflow 测试记录命名去重设计

## 背景

`skill-test-workflow` 生成的测试记录和测试样例文件名当前格式为 `YYYY-MM-DD-<短描述>.md`(例如 `2026-06-29-basic.md`)。短描述(如 `basic`)在同一天多次测试时是固定的,导致后续测试覆盖前一次结果,无法复盘同一天的多次运行。

## 目标

让同一天多次测试的文件名不冲突,且:

- 规则可被 AI agent 可靠执行(只依赖扫目录,不依赖精确时分)。
- 命名可预测、按时间排序清晰、永不覆盖。
- 保持 `test-results` 的 `.md` 与 `outputs` 同名目录配对、共享序号。

## 设计

### 命名规则

```
test-results/<技能名>/<YYYY-MM-DD>-<短描述>-<NNN>.md
outputs/<技能名>/<YYYY-MM-DD>-<短描述>-<NNN>/
```

- 序号固定 3 位零填充,从 `001` 起,每次都带(包括首次)。
- 短描述沿用小写英文/数字/连字符,如 `basic`、`ab-comparison`、`output-paths`。
- 序号针对「同一天 + 同一短描述」独立递增:`2026-06-29-basic-001`、`2026-06-29-basic-002`、`2026-06-29-ab-comparison-001` 互不干扰。
- `test-results` 的 `.md` 与 `outputs` 的同名目录共享同一序号,保持配对。

### 序号生成规则(给 agent 执行)

1. 创建前,列出目标目录中匹配 `<当天日期>-<本次短描述>-NNN` 的文件/目录。
2. 取最大序号 +1,零填充到 3 位;无匹配则用 `001`。

示例:已有 `2026-06-29-basic-001.md`,本次短描述也是 `basic` → 新建 `2026-06-29-basic-002.md` 及配对 `outputs/.../2026-06-29-basic-002/`。

### 迭代测试命名调整

现有「多轮迭代测试」示例把轮次写进短描述(`iteration-1`、`iteration-2`)。新规则下短描述改为 `iteration`,由序号承担区分,变成 `2026-06-29-iteration-001`、`2026-06-29-iteration-002`,避免 `2026-06-29-iteration-1-001` 这种重复编号。

## 改动范围

### 修改的文件

1. `skills/skill-test-workflow/SKILL.md`
   - 「触发后先做」第 4 步的命名模板 → 改为带 `-NNN`。
   - 「推荐目录结构」三个示例(单轮 / A/B / 多轮迭代)→ 同步更新文件名,迭代示例短描述改为 `iteration` + 序号。
   - 「### 3. 记录结果」中记录路径 → 加 `-NNN`。
   - 新增一小节说明序号生成规则(列目录 → 取最大序号+1 → 零填充 3 位)。
2. `skills/skill-test-workflow/USAGE.md`
   - 「推荐命名」示例更新为 `2026-06-29-basic-001.md`。
3. `evals/evals.json`
   - 不改动。`expected_output` 只约束目录,不约束文件名,不涉及具体序号。

### 历史文件迁移

- `test-results/` 下三份 `2026-06-29-basic.md` → 重命名为 `2026-06-29-basic-001.md`:
  - `test-results/dwf-requirement/2026-06-29-basic.md`
  - `test-results/skill-test-workflow/2026-06-29-basic.md`
  - `test-results/dev-workflow/2026-06-29-basic.md`
- 对应的 `outputs/<技能名>/2026-06-29-basic/` 目录已确认不存在,无需迁移目录。
- 不动 `evals/`,不动被测技能自身的源码。

### 不改动

- 不加时间戳方案、不加碰撞检测的分支逻辑(YAGNI,序号总是带已覆盖)。
- 不改「写回技能」「输出位置决策」等与命名无关的章节。

## 验证方式

- 改完后用 `git status` / `git diff` 确认只动了 SKILL.md、USAGE.md 和三份历史测试记录。
- 通读 SKILL.md,确认命名模板、目录结构示例、记录路径、序号生成规则四处一致,无残留旧格式。
- 检查重命名后 `test-results/` 下三份文件均为 `*-basic-001.md`,无遗留 `2026-06-29-basic.md`。

无脚本化测试(本技能是行为规范,无独立测试运行器)。
