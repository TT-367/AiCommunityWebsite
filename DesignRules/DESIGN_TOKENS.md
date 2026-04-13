# Design Tokens 说明

Last Updated: 2026-04-08

这份文档描述当前项目已落地的 Design Tokens（颜色/圆角/阴影/排版/布局尺寸）与“语义封装类（ui-\*）”的使用方式，目标是：

- 让 UI 风格在快速迭代中保持一致
- 让全局调整（主题、阴影层级、栏宽、字号）可集中修改
- 让页面代码更少“手写组合”，更多“语义引用”

***

## 1. Token 分层（从底到顶）

### 1.1 CSS Variables（源头）

- 位置：[index.css](file:///c:/Users/yiteng.zhao/Documents/trae_projects/TT/OpenClaw-Community/src/index.css)
- 形式：`--token-name: ...;`（暗色在 `:root/.dark`，亮色在 `.light`）
- 作用：主题切换时只需要替换变量值，组件与页面无需改 class

### 1.2 Tailwind 语义类（映射层）

- 位置：[tailwind.config.js](file:///c:/Users/yiteng.zhao/Documents/trae_projects/TT/OpenClaw-Community/tailwind.config.js)
- 形式：`bg-surface`、`text-foreground`、`shadow-e2`、`text-ui-md`、`max-w-card-md` 等
- 作用：把 token 暴露成可组合的语义类，供组件/页面使用

### 1.3 ui-\* 语义封装类（组件级“组合 token”）

- 位置：[index.css](file:///c:/Users/yiteng.zhao/Documents/trae_projects/TT/OpenClaw-Community/src/index.css) 中 `@layer components`
- 形式：`.ui-panel { @apply ... }`
- 作用：把高频组合（面板/抽屉/CTA/Popover/气泡/Toast）收口成少量入口，减少页面手写复杂组合与表达式类（`calc/vw`）

***

## 2. Color Tokens（颜色）

### 2.1 Token 列表（CSS 变量）

> 所有颜色均以 `rgb(var(--xxx) / <alpha>)` 的方式映射到 Tailwind，可直接用 `/xx` 透明度写法（例如 `bg-primary/10`）。

| Token                      | Tailwind 用法示例                           | 语义说明                   |
| -------------------------- | --------------------------------------- | ---------------------- |
| `--background`             | `bg-background`                         | 页面底色                   |
| `--foreground`             | `text-foreground`                       | 主文本色                   |
| `--surface`                | `bg-surface`                            | 卡片/面板主容器底色             |
| `--surface-2`              | `bg-surface-2`                          | 次级区域（列表项/输入区域）底色       |
| `--muted`                  | `bg-muted`                              | 低对比背景                  |
| `--muted-foreground`       | `text-muted-foreground`                 | 次要文字                   |
| `--border`                 | `border-border`                         | 常规边框                   |
| `--border-strong`          | `border-border-strong`                  | 强调边框（hover/active/强调卡） |
| `--input`                  | `border-input`                          | 输入框边框色                 |
| `--primary`                | `bg-primary` / `text-primary`           | 品牌主色（关键按钮/高亮状态）        |
| `--primary-foreground`     | `text-primary-foreground`               | 主色上的文字                 |
| `--accent`                 | `bg-accent`                             | 轻量 hover/选中底色          |
| `--accent-foreground`      | `text-accent-foreground`                | accent 上的文字            |
| `--destructive`            | `bg-destructive`                        | 危险操作                   |
| `--destructive-foreground` | `text-destructive-foreground`           | 危险色上的文字                |
| `--success`                | `text-success`                          | 成功态                    |
| `--warning`                | `text-warning`                          | 警告态                    |
| `--info`                   | `text-info`                             | 信息态                    |
| `--ring`                   | `ring-ring` / `focus-visible:ring-ring` | focus ring 颜色          |

### 2.2 使用建议

- 页面背景优先 `bg-background`，卡片/面板优先 `bg-surface`
- 大面积次级区用 `bg-surface-2`，避免到处用透明叠加造成“脏”
- hover/选中尽量用 `bg-accent` 或 `bg-primary/10`，而不是引入新的颜色

***

## 3. Radius Tokens（圆角）

- 变量：`--radius-sm/md/lg/xl`
- Tailwind：`rounded-sm/md/lg/xl`
- 组件默认：多数容器统一 `rounded-xl`（见 `ui-panel` 与 `Card`）

建议：

- **面板/卡片**：`rounded-xl`
- **按钮/输入**：`rounded-md` 或 `rounded-full`（只在输入与 pill 上使用）

***

## 4. Elevation Tokens（阴影层级）

### 4.1 Token 列表

- 变量：`--shadow-1/2/3`
- Tailwind：`shadow-e1/2/3`

| Token        | Tailwind    | 语义说明    | 常用场景               |
| ------------ | ----------- | ------- | ------------------ |
| `--shadow-1` | `shadow-e1` | 基础浮起（轻） | 卡片/面板默认            |
| `--shadow-2` | `shadow-e2` | 强调浮起（中） | hover 强调、popover   |
| `--shadow-3` | `shadow-e3` | 浮层（重）   | modal、drawer、toast |

### 4.2 使用建议

- 默认容器只用 `shadow-e1`
- hover 提升到 `shadow-e2`（避免从无阴影直接到很重）
- 只有“覆盖在内容之上”的浮层才用 `shadow-e3`

***

## 5. Typography Tokens（字号档位）

Tailwind 字号档位（用于 UI 文本的固定节奏）：

| Tailwind     | 说明            |
| ------------ | ------------- |
| `text-ui-xs` | 小辅助信息（徽标/提示）  |
| `text-ui-sm` | 次要信息（按钮小号/标签） |
| `text-ui-md` | 默认正文          |
| `text-ui-lg` | 小标题/弹窗标题      |
| `text-ui-xl` | 大标题（谨慎使用）     |

建议：

- 页面正文与列表描述优先 `text-ui-md`
- 过多的 `font-extrabold` 会显得“吵”，标题用 `font-semibold` 足够

***

## 6. Layout Tokens（布局尺寸）

### 6.1 栏宽 / 宽度

| Tailwind          |        值 | 语义说明       |
| ----------------- | -------: | ---------- |
| `w-rail-left`     |    20rem | 左侧“管线”栏    |
| `w-rail-right`    |  17.5rem | 右侧“资源/卡片”栏 |
| `max-w-drawer`    | 23.75rem | 抽屉最大宽      |
| `max-w-card-md`   | 26.25rem | 中等卡片最大宽    |
| `max-w-card-lg`   |  32.5rem | 大卡片最大宽     |
| `max-w-dialog-md` |    35rem | 中等对话框最大宽   |
| `max-w-dialog-lg` | 51.25rem | 大对话框最大宽    |
| `max-w-layout`    |  87.5rem | 布局内容最大宽    |

### 6.2 文本截断宽度（用于长文本行）

| Tailwind        |       值 | 场景         |
| --------------- | ------: | ---------- |
| `max-w-text-xl` |   28rem | URL/长标题截断  |
| `max-w-text-md` |   12rem | 标签名/中等文本截断 |
| `max-w-text-sm` | 3.75rem | 用户名等短字段截断  |

***

## 7. ui-\* 语义封装类（推荐使用入口）

这些类属于“组件级组合 token”，用于减少页面/组件里重复的 `rounded/border/bg/shadow/sticky/calc/vw` 组合。

| 类名                | 语义             | 内含主要 token                                            |
| ----------------- | -------------- | ----------------------------------------------------- |
| `ui-panel`        | 标准面板容器         | `rounded-xl + border-border + bg-surface + shadow-e1` |
| `ui-panel-muted`  | 次级面板容器         | `bg-surface-2/55 + shadow-e1`                         |
| `ui-panel-header` | 面板头部           | `border-b + bg-surface`                               |
| `ui-panel-body`   | 面板内容区          | `flex-1 min-h-0`                                      |
| `ui-panel-sticky` | sticky 面板布局    | `sticky top-24 + calc 高度 + min-h`                     |
| `ui-panel-tall`   | sticky 面板最大高度  | `max-h calc`                                          |
| `ui-drawer`       | 抽屉宽度/elevation | `92vw + max-w-drawer + shadow-e3`                     |
| `ui-cta-card`     | 大 CTA 卡（新建项目）  | `vw + max-w-card-lg + shadow-e1/e2`                   |
| `ui-cta-card-sm`  | 小 CTA 卡（快速开始）  | `92% + max-w-card-md + shadow-e2/e3`                  |
| `ui-popover`      | popover 容器     | `shadow-e2`                                           |
| `ui-toast-stack`  | toast 栈宽度      | `calc(100vw-2rem) + max-w-card-md`                    |
| `ui-float-dialog` | 浮动对话框约束        | `max-h/max-w calc`（响应式）                               |
| `ui-bubble-user`  | 用户气泡宽度         | `92% + max-w-card-md`                                 |
| `ui-bubble-ai`    | AI 气泡宽度        | `92% + max-w-card-lg`                                 |

使用原则：

- **页面优先用 ui-\*（语义封装类）**，减少复制粘贴
- 如果某个场景出现了第三次相同组合，优先新增一个 `ui-*`，而不是继续散落
- `ui-*` 里允许包含少量 `vw/calc`（因为它们是布局表达式，不建议无限扩展 token）

***

## 8. 如何新增/调整 Token（维护流程）

### 8.1 新增一个 token（推荐顺序）

1. 在 [index.css](file:///c:/Users/yiteng.zhao/Documents/trae_projects/TT/OpenClaw-Community/src/index.css) 中添加 CSS 变量（并补齐 `.light/.dark`）
2. 在 [tailwind.config.js](file:///c:/Users/yiteng.zhao/Documents/trae_projects/TT/OpenClaw-Community/tailwind.config.js) 映射为 Tailwind 语义类
3. 如属于高频组合，补一个 `ui-*` 入口
4. 在 [DesignSystem.tsx](file:///c:/Users/yiteng.zhao/Documents/trae_projects/TT/OpenClaw-Community/src/pages/DesignSystem.tsx) 增加预览（可选但推荐）

### 8.2 调整全局风格（典型改法）

- 想“更高级/更克制”：优先调 `--shadow-*` 与 `--border-strong`、减少透明叠加
- 想“更活泼”：适当提高 `--accent` 与 `--primary` 的对比（仍保持语义不变）
- 想“更宽/更窄”：改 `w-rail-* / max-w-*`，不用逐页改

***

## 9. 推荐的开发约束（团队规范）

- 禁止在业务页面随意新增 `shadow-*`（sm/md/lg/xl）与 `rounded-[..]` 这类非语义写法
- 容器优先选：`ui-panel` →（需要 sticky 时）`ui-panel ui-panel-sticky`
- 弹层/浮层优先选：`Dialog`（内部已统一 shadow/字号），popover 用 `ui-popover`
- 新需求先选“语义角色”（panel/popover/modal/cta）再写 class，避免先写视觉再找理由

