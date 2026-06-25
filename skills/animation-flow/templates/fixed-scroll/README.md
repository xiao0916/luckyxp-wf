# 定屏滚动 (FixedScroll)

- **关键词**: fixed-scroll, 定屏滚动, sticky scroll, 固定滚动, 左固右滚, parallax scroll, 企业文化页面, 关于我们页面, sticky sidebar scroll
- **分类**: 布局
- **描述**: 左侧内容固定，右侧随页面滚动，形成视差滚动效果。适合企业文化、关于我们、产品特性等分步内容展示。依赖 gsap ScrollTrigger（库本身与框架无关，转换时按目标框架的包管理器安装）。
- **依赖**: gsap（含 ScrollTrigger 插件）

## 数据结构

组件接收一个标题配置 + 一个卡片列表。

标题配置字段：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| title | string | 是 | 左侧固定区主标题 |
| subtitle | string | 否 | 左侧固定区副标题 |

卡片列表每项字段：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| image | string | 是 | 卡片图片 URL |
| title | string | 是 | 卡片标题（图片左下角覆盖） |

## 可调参数

| 参数 | 类型 | 默认 | 说明 |
|------|------|------|------|
| scrollOffset | number | -200 | 右侧滚动位移 (px) |
| className | string | "" | 容器自定义类名 |

## 示例数据

标题配置：
```json
{ "title": "企业文化", "subtitle": "以德兴企、以科创赋能" }
```

卡片列表：
```json
[
  { "image": "https://picsum.photos/seed/recycle/500/625", "title": "发展使命" },
  { "image": "https://picsum.photos/seed/paperplane/500/625", "title": "发展愿景" },
  { "image": "https://picsum.photos/seed/sunflower/500/625", "title": "管理理念" },
  { "image": "https://picsum.photos/seed/teamwork/500/625", "title": "经营理念" }
]
```

## 转换提示

- 效果实现见 `effect.html`（原生 JS + CDN gsap，浏览器可预览）
- 转换时把 gsap CDN 改为目标项目的 npm 依赖（如 `pnpm add gsap`）
- 转换成目标框架组件时，遵循 `component-spec.md` 的规范约束
