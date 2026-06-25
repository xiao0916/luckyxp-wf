# 数字滚动 (NumberScroll)

- **关键词**: number-scroll, 数字滚动, counter, counting, 数字递增, 数字动画, 数字计数, 统计动画, 数据滚动
- **分类**: 数据展示
- **描述**: 数字从0递增到目标值的动画效果，进入视口时触发。常用于展示公司数据、统计信息、成就数字等。纯 CSS + 原生 JS 实现，无额外依赖。
- **依赖**: 无

## 数据结构

组件接收一个列表，每项字段如下：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| value | number | 是 | 目标数字 |
| suffix | string | 否 | 数字后缀，如 "+" "%" |
| label | string | 是 | 数字下方说明文字 |

## 可调参数

| 参数 | 类型 | 默认 | 说明 |
|------|------|------|------|
| duration | number | 2000 | 动画时长 (ms) |
| className | string | "" | 容器自定义类名 |

## 示例数据

```json
[
  { "value": 20, "suffix": "+", "label": "自主研发产品" },
  { "value": 3000, "suffix": "+", "label": "3D扫描成功案例" },
  { "value": 30, "suffix": "+", "label": "国际与国家级权威奖项" },
  { "value": 20, "suffix": "%", "label": "销售收入投入研发" },
  { "value": 200, "suffix": "+", "label": "专利/软著" },
  { "value": 68, "suffix": "%", "label": "发明专利占比" }
]
```

## 转换提示

- 效果实现见 `effect.html`（原生 JS + CSS，浏览器可预览）
- 转换成目标框架组件时，遵循 `component-spec.md` 的规范约束
