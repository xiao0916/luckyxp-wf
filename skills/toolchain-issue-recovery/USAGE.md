# toolchain-issue-recovery 使用说明

当开发、测试、编辑文件、创建技能、运行脚本、生成文档或操作工具时遇到工具链问题，先使用 `toolchain-issue-recovery`。

## 适用场景

- `apply_patch`、shell、PowerShell、Python、Node、测试脚本或校验脚本失败。
- 沙箱、权限、路径、编码、依赖缺失、参数不兼容。
- 初始化脚本部分成功、部分失败。
- Windows PowerShell 中文乱码或 mojibake。
- 需要记录刚才遇到的问题和解决方式。
- 遇到新工具链问题，并希望解决后沉淀为可复用经验。

## 基本流程

1. 记录失败命令、关键错误、目标文件和已产生的部分产物。
2. 判断这是工具链问题、环境问题，还是业务/代码逻辑问题。
3. 查找 `SKILL.md` 中的已知恢复方案。
4. 用最小恢复动作处理问题。
5. 如果原校验工具不可用，用替代验证补齐证据。
6. 说明原始失败、替代动作、验证证据和残余风险。
7. 如果是新问题，解决后把通用经验写回本技能。

## PowerShell 中文乱码速查

读取中文文件：

```powershell
Get-Content -Raw -Encoding UTF8 path\to\file.md
```

写入中文文件：

```powershell
Set-Content -Path path\to\file.md -Value $content -Encoding UTF8
Add-Content -Path path\to\file.md -Value $content -Encoding UTF8
```

终端输出仍乱码时：

```powershell
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
```

如果显式 UTF-8 读取正常，通常是默认读取编码导致的显示乱码，不要直接判定文件损坏。

## 常用替代验证

- 检查目标文件是否存在。
- 检查 `SKILL.md` frontmatter 是否包含 `name` 和 `description`。
- 用本地 JSON/YAML 解析器检查格式。
- 用 `rg` 搜索 待办占位标记 等模板残留。
- 检查关键约束文本是否存在。
- 检查是否只修改了预期目录。

替代验证通过时，只说“替代验证通过”，不要说“官方校验通过”。


