# 手风琴 (Accordion)

- **关键词**: accordion, 手风琴, 折叠面板, 悬停展开, hover expand, 横向展开, 图片展开, 类别展示, interactive panels
- **分类**: 交互展示
- **描述**: 多个面板横向排列，悬停时展开显示详细内容，类似手风琴展开效果。适合类别展示、功能介绍、团队展示等场景。纯 CSS + 原生 JS 实现，无额外依赖。
- **依赖**: 无

## 数据结构

组件接收一个列表，每项字段如下：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| image | string | 是 | 面板背景图片 URL |
| title | string | 是 | 面板标题 |
| description | string | 否 | 面板展开后的描述文字 |

## 可调参数

| 参数 | 类型 | 默认 | 说明 |
|------|------|------|------|
| height | number | 500 | 容器高度 (px) |
| className | string | "" | 容器自定义类名 |

## 示例数据

```json
[
  { "image": "https://picsum.photos/400/500?random=10", "title": "生物发酵饲料", "description": "守护畜禽健康生长，提供高品质的生物发酵饲料产品" },
  { "image": "https://picsum.photos/400/500?random=11", "title": "功能肽", "description": "为畜禽肠道健康高效赋能，提升免疫力和生长性能" },
  { "image": "https://picsum.photos/400/500?random=12", "title": "生物活性物", "description": "天然活性成分，促进动物健康生长" },
  { "image": "https://picsum.photos/400/500?random=13", "title": "功能性营养剂", "description": "科学配方，全面补充营养需求" }
]
```

## 转换提示

- 效果实现见 `effect.html`（原生 JS + CSS，浏览器可预览）
- 转换成目标框架组件时，遵循 `component-spec.md` 的规范约束
