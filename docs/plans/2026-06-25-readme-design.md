# README 设计文档

- **日期**: 2026-06-25
- **主题**: 为技能包仓库编写根目录 README，说明如何在主流 AI agent 中下载安装技能包
- **状态**: 已确认

## 目标

在仓库根目录提供一份 README，让使用者快速了解技能包内容，并能在 5 个主流 AI agent（Claude Code / opencode / Cursor / Cline / Codex）中完成安装。

## 决策

| 决策项 | 选择 |
|--------|------|
| 位置 | 仓库根目录 `README.md` |
| 覆盖 agent | Claude Code、opencode、Cursor、Cline、Codex |
| GitHub 地址 | 占位 `<GITHUB_URL>`，用户后续替换 |
| 语言 | 中文 |
| 结构方案 | 方案 A：按 agent 分节，给路径 + 命令 + 验证 |

## 准确性处理

- Claude Code、opencode：已验证使用 SKILL.md frontmatter 约定，给完整步骤，标"已验证"。
- Cursor、Cline、Codex：原生 skills 支持无法 100% 核实，给约定路径并标注"以官方文档为准"，不编造细节。

## 交付物

`README.md`，结构：简介 → 技能列表 → 安装（通用说明 + 5 个 agent 分节 + 仅装单个技能 + 更新）→ 备注。

## 不做

- 不深入介绍单个技能内部机制（指向各自 USAGE.md）。
- 不编造未验证 agent 的确切启用命令。
