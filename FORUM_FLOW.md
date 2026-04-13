# AiGo 论坛/站点链路图（导航信息架构）

> 说明：这是“从首页到各个子页面”的用户链路与路由结构（含 query/state 分支）。可直接复制到支持 Mermaid 的工具中渲染为可视化图。

```mermaid
flowchart LR

  %% ===== Global =====
  subgraph Global[全站入口与全局导航]
    H[Header 导航\n- Logo\n- 开发者社区\n- 资产商店\n- 最新活动\n- 用户中心]:::nav
    FAB[浮动发帖按钮\n(仅 /, /games, /games/:id, /skills/:id)]:::nav
  end

  %% ===== Home =====
  subgraph Home[首页 /（三种模式）]
    HOME[/ /]:::route
    HUB[项目 Hub 视图\n无 project、无 tab]:::view
    TAB[社区 Tab 视图\n/?tab=hot|latest|skills|games\n可选：tags,q]:::view
    WF[工作流视图\n/?project=:projectId\n可选：stage=:stageId]:::view
    HOME --> HUB
    HOME --> TAB
    HOME --> WF
  end

  %% ===== Hub sections =====
  subgraph HubSections[首页 · 项目 Hub 主要入口]
    HUB_EVENTS[活动 Banner\n(点击进入活动页)]:::section
    HUB_QUICK[快速开始\n- 创建新项目\n- 我的资产库]:::section
    HUB_TPL[模板库\n(推荐 + 查看全部)]:::section
    HUB_GAMES[游戏空间\n(卡片 + 查看全部)]:::section
  end

  %% ===== Community =====
  subgraph Community[开发者社区（内容链路）]
    FEED[Feed 帖子流\n(tab=hot/latest)]:::page
    POST[/post/:id\n帖子详情]:::route
    USER[/user/:id\n用户主页]:::route
  end

  %% ===== Skills / Toolchain =====
  subgraph SkillsTools[技能 / 工具链]
    SKILL_MARKET[技能市场\n(tab=skills)]:::page
    SKILL[/skills/:id\n技能详情]:::route
    TOOLCHAIN[/toolchain\n工具链页]:::route
  end

  %% ===== Games =====
  subgraph Games[游戏相关]
    GALLERY[/games\n游戏广场]:::route
    GAME[/games/:id\n游戏详情]:::route
  end

  %% ===== Assets =====
  subgraph Assets[资产与模板]
    STORE[/assets\n资产商店/模板库]:::route
    MYASSETS[/my-assets\n我的资产库（按项目）]:::route
  end

  %% ===== Events =====
  subgraph Events[活动]
    EVENTS[/events\n活动列表]:::route
    EVENTSTATE[进入详情\n通过 route state: {eventId}\n或页面内选择]:::state
  end

  %% ===== Global nav links =====
  H --> HOME
  H --> TAB
  H --> STORE
  H --> EVENTS
  H --> USER

  %% ===== Hub links =====
  HUB --> HUB_EVENTS
  HUB --> HUB_QUICK
  HUB --> HUB_TPL
  HUB --> HUB_GAMES

  HUB_EVENTS -->|Link + state: eventId| EVENTS
  HUB_TPL -->|查看全部| STORE
  HUB_GAMES -->|查看全部| GALLERY
  HUB_GAMES -->|点击卡片| GAME
  HUB_QUICK -->|创建新项目\n生成 projectId| WF
  HUB_QUICK -->|进入我的资产库| MYASSETS

  %% ===== Tab view links =====
  TAB -->|tab=hot/latest| FEED
  FEED -->|点击帖子卡片| POST
  POST -->|作者头像/名称| USER

  TAB -->|tab=skills| SKILL_MARKET
  SKILL_MARKET -->|进入详情| SKILL
  SKILL -->|浮动发帖按钮| FAB

  TAB -->|tab=games| GALLERY
  GALLERY -->|点击卡片| GAME
  GAME -->|评论/资料等均在本页| GAME
  GAME -->|浮动发帖按钮| FAB

  %% ===== Assets links =====
  STORE -->|新建项目（用于工作流）| WF
  MYASSETS -->|进入工作流\n/?project=:projectId| WF

  %% ===== Events links =====
  EVENTS --> EVENTSTATE

  %% ===== FAB behavior =====
  FAB -->|打开 PostComposer 弹层\n(不切换路由)| POST

  classDef route fill:#121216,stroke:#3e3e48,stroke-width:1px,color:#dfe0e5;
  classDef page fill:#16161a,stroke:#3e3e48,stroke-width:1px,color:#dfe0e5;
  classDef view fill:#141418,stroke:#3e3e48,stroke-width:1px,color:#dfe0e5;
  classDef section fill:#141418,stroke:#3e3e48,stroke-width:1px,color:#dfe0e5;
  classDef nav fill:#101012,stroke:#3e3e48,stroke-width:1px,color:#dfe0e5;
  classDef state fill:#101012,stroke:#3e3e48,stroke-dasharray:3 3,stroke-width:1px,color:#dfe0e5;
```

## 图例
- `/path`：真实路由（react-router-dom）
- `/?query=...`：同一路由下的 query 分支（Home 里有多种视图）
- `route state`：通过 `Link state={{...}}` 传参（例如活动页）
- “弹层”：UI Modal/Drawer，不切换 URL（例如浮动发帖、模板预览、活动详情弹窗）

