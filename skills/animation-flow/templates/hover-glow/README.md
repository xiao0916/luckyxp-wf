# Hover光效 (HoverGlow)

- **关键词**: hover-glow, hover光效, 光效, 扫光, 卡片光效, 鼠标跟随光效, card glow, 产品卡片, 产品展示卡片, 鼠标悬停效果
- **分类**: 交互展示
- **描述**: 鼠标悬停时产生光效跟随效果，包含扫光和径向光效。适合产品卡片、作品集展示等场景。纯 CSS + 原生 JS 实现，无额外依赖。
- **依赖**: 无

## 数据结构

组件接收一个列表，每项字段如下：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| image | string | 是 | 卡片图片 URL |
| title | string | 是 | 卡片标题 |
| description | string | 否 | 卡片描述文字 |
| link | string | 否 | 点击跳转 URL |

## 可调参数

| 参数 | 类型 | 默认 | 说明 |
|------|------|------|------|
| columns | 2 \| 3 \| 4 | 2 | 网格列数 |
| className | string | "" | 容器自定义类名 |

## 示例数据

```json
[
  { "image": "https://picsum.photos/600/450?grayscale&blur=1", "title": "工业级手持扫描系统", "description": "集大成之作 测无止境", "link": "#" },
  { "image": "https://picsum.photos/600/450?grayscale&blur=2", "title": "全域无线光学追踪系统", "description": "致新无界 致速无限", "link": "#" },
  { "image": "https://picsum.photos/600/450?grayscale&blur=1", "title": "智能反向定位系统", "description": "全球首创不跟踪不贴点手持激光扫描模式", "link": "#" },
  { "image": "https://picsum.photos/600/450?grayscale&blur=2", "title": "自动化在线检测系统", "description": "高精度机器人自动化测量系统", "link": "#" }
]
```

## 转换提示

- 效果实现见 `effect.html`（原生 JS + CSS，浏览器可预览）
- 转换成目标框架组件时，遵循 `component-spec.md` 的规范约束
