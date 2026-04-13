# AiGo Web · 架构文档（现状 + 演进建议）

> 范围：本文件描述 `openclaw-community` 这个 Web 项目当前的真实实现（前端 + API + Supabase 数据库/存储），并给出面向 1w+ 用户并发、云端大文件存储、以及多 AI 工具调用的演进建议。

## 1. 技术栈

### 1.1 前端
- 构建与运行：Vite 6 + TypeScript 5（见 [package.json](file:///c:/Users/yiteng.zhao/Documents/trae_projects/TT/openclaw-community/package.json)、[vite.config.ts](file:///c:/Users/yiteng.zhao/Documents/trae_projects/TT/openclaw-community/vite.config.ts)）
- 框架：React 18
- 路由：react-router-dom 7（SPA）
- 状态管理：zustand
- UI：TailwindCSS 3 + 语义化 Design Tokens（CSS 变量，见 [index.css](file:///c:/Users/yiteng.zhao/Documents/trae_projects/TT/openclaw-community/src/index.css)、[tailwind.config.js](file:///c:/Users/yiteng.zhao/Documents/trae_projects/TT/openclaw-community/tailwind.config.js)）
- 图标：lucide-react

### 1.2 后端 / BFF
当前存在两条数据访问路径：
- 方案 A：前端直接调用 Supabase（`@supabase/supabase-js`）
  - 初始化与 Auth： [supabaseClient.ts](file:///c:/Users/yiteng.zhao/Documents/trae_projects/TT/openclaw-community/src/lib/supabaseClient.ts)、[authStore.ts](file:///c:/Users/yiteng.zhao/Documents/trae_projects/TT/openclaw-community/src/stores/authStore.ts)
  - Storage 上传： [storage.ts](file:///c:/Users/yiteng.zhao/Documents/trae_projects/TT/openclaw-community/src/lib/storage.ts)
- 方案 B：Serverless API（BFF）转发到 Supabase REST/Auth/RPC
  - 云函数入口： [api/scf/index.cjs](file:///c:/Users/yiteng.zhao/Documents/trae_projects/TT/openclaw-community/api/scf/index.cjs)
  - 前端 API 客户端： [apiClient.ts](file:///c:/Users/yiteng.zhao/Documents/trae_projects/TT/openclaw-community/src/lib/apiClient.ts)（支持超时、GET 重试、并将 fetch 纳入 telemetry）

### 1.3 数据库 / 存储
- 数据库：Supabase Postgres（迁移文件在 [supabase/migrations](file:///c:/Users/yiteng.zhao/Documents/trae_projects/TT/openclaw-community/supabase/migrations)）
- 文件存储：Supabase Storage（bucket：`public-images`，见 [storage_public_images.sql](file:///c:/Users/yiteng.zhao/Documents/trae_projects/TT/openclaw-community/supabase/migrations/storage_public_images.sql)）
- 实时：对 `game_chat_messages` 开启 realtime publication（见 [enable_realtime_game_chat_messages.sql](file:///c:/Users/yiteng.zhao/Documents/trae_projects/TT/openclaw-community/supabase/migrations/enable_realtime_game_chat_messages.sql)）

### 1.4 观测与埋点
- 客户端 telemetry：封装在 [src/lib/telemetry](file:///c:/Users/yiteng.zhao/Documents/trae_projects/TT/openclaw-community/src/lib/telemetry)，可直接写入 Supabase REST 表 `client_events`（见 [client_events.sql](file:///c:/Users/yiteng.zhao/Documents/trae_projects/TT/openclaw-community/supabase/migrations/client_events.sql)）

### 1.5 部署形态（当前仓库支持）
- 静态 SPA：`vercel.json` 将所有路由重写到 `index.html`（见 [vercel.json](file:///c:/Users/yiteng.zhao/Documents/trae_projects/TT/openclaw-community/vercel.json)）
- COS+CDN 静态托管流程：见 [DEPLOY_COS_CDN.md](file:///c:/Users/yiteng.zhao/Documents/trae_projects/TT/openclaw-community/DEPLOY_COS_CDN.md)

## 2. 运行时架构（现状）

### 2.1 总览（逻辑图）
```
Browser (React SPA)
  |-- (A) supabase-js ------------------> Supabase (Postgres + Auth + Storage + Realtime)
  |
  |-- (B) fetch VITE_API_BASE_URL ------> Serverless BFF (api/scf/index.cjs)
                                         |-- calls Supabase REST (/rest/v1/*)
                                         |-- calls Supabase Auth (/auth/v1/user)
                                         |-- calls Supabase RPC (/rest/v1/rpc/*)
```

### 2.2 前端分层
- `src/pages/*`：页面层（Home / Assets / Games / Events / MyAssets 等）
- `src/components/*`：复用组件（Feed、Header、Toolchain 等）
- `src/components/ui/*`：轻量 UI primitives（Button/Dialog/Input/Toast…）
- `src/lib/*`：基础设施（apiClient、supabaseClient、storage、telemetry）
- `src/data/*`：本地 mock、tag 注册表、以及本地项目资产库（`projectAssetsStore.ts`）

### 2.3 “我的资产库”现状（本地版）
- 页面： [MyAssetsPage.tsx](file:///c:/Users/yiteng.zhao/Documents/trae_projects/TT/openclaw-community/src/pages/MyAssetsPage.tsx)
- 存储：localStorage
  - 项目列表：`oc:projects_v1`
  - 项目资产：`oc:project_assets_v1`（`projectId -> items[]`）
- 说明：当前适合小文件/截图/文本；不适合大文件与多端同步（后续演进见第 6 节）。

## 3. API 设计（现状）

> 说明：以下为 serverless BFF（`api/scf/index.cjs`）已实现的路由集合。前端 `apiClient.ts` 与这些路由基本一一对应。  
> 认证：需要登录态的接口通过 `Authorization: Bearer <access_token>`，函数端会用 `GET /auth/v1/user` 校验并得到 `uid`。

### 3.1 Health
- `GET /health`

### 3.2 标签
- `GET /tags?limit=&group=`
- `GET /tags/suggest?q=&limit=`

### 3.3 帖子与互动
- `GET /posts?limit=&offset=&order=&tags=`
- `GET /post/:id`
- `POST /post`
- `DELETE /post/:id`（限制：author_id == 当前用户）
- `POST /post/:id/like`（toggle）
- `GET /likes/posts?ids=...`
- `POST /post/:id/report`

### 3.4 评论与点赞
- `GET /comments?postId=`
- `POST /comment`
- `POST /comment/:id/like`（toggle）
- `GET /likes/comments?ids=...`

### 3.5 游戏与分享
- `GET /games?limit=&offset=`
- `GET /game/:id`
- `POST /game`
- `GET /game/:id/post`
- `POST /game/:id/post`（额外校验：game.owner_id == 当前用户；并 upsert 到 `game_posts`）
- `GET /game/:id/comments`
- `POST /game/:id/comment`
- `POST /game-comment/:id/like`（toggle）
- `GET /likes/game-comments?ids=...`

### 3.6 用户与排行榜
- `GET /me`
- `GET /user/:id/profile`
- `GET /user/:id/posts`
- `GET /leaderboard/developers?limit=`（调用 RPC `get_developer_leaderboard`）

## 4. 数据库结构（现状）

> 说明：以下字段来自 Supabase migrations（SQL）。字段可能有细节差异（例如默认值/索引/触发器），以迁移文件为准。

### 4.1 用户体系
- `profiles`
  - `id uuid`（通常关联 `auth.users.id`）
  - `display_name text`
  - `avatar_url text`
  - `created_at timestamptz`

### 4.2 内容与社交
- `posts`
  - `id uuid`
  - `author_id uuid`
  - `title text`
  - `description text`（如有）
  - `content text`
  - `tags text[]`（并有同步到 `post_tags` 的机制）
  - `is_ai_assisted boolean`
  - `linked_skill_id text?` / `linked_game_id text?`（见 `posts_linked_content.sql`）
  - `created_at / updated_at`
- `comments`
  - `id uuid`
  - `post_id uuid`
  - `author_id uuid`
  - `content text`
  - `parent_id uuid?`（支持楼中楼）
  - `created_at`
- `post_likes(post_id uuid, user_id uuid, created_at)`
- `comment_likes(comment_id uuid, user_id uuid, created_at)`
- `post_reports(post_id uuid, reporter_id uuid, reason text, created_at)`

### 4.3 标签系统
来自 [tag_system.sql](file:///c:/Users/yiteng.zhao/Documents/trae_projects/TT/openclaw-community/supabase/migrations/tag_system.sql)：
- `tags(slug pk, display_name, group_key, description, icon_key, weight, created_at)`
- `tag_aliases(alias pk, tag_slug fk)`
- `post_tags(post_id, tag_slug)`
- `game_tags(game_id, tag_slug)`
- 相关函数/触发器：`canonical_tag_slug`、`sync_post_tags`、`sync_game_tags`

### 4.4 游戏与互动
- `games`
  - `id text`（业务 id）
  - `owner_id uuid`
  - `title text`
  - `description text`
  - `thumbnail_url text`
  - `tags text[]`（并同步到 `game_tags`）
  - `play_count int`、`likes int`
  - `created_at / updated_at`
- `game_posts`
  - `game_id text`（PK）
  - `author_id uuid`
  - `author_note text`
  - `video_url text`、`repo_url text`
  - `created_at / updated_at`
- `game_comments(id uuid, game_id text, author_id uuid, parent_id uuid?, content text, created_at)`
- `game_comment_likes(comment_id uuid, user_id uuid, created_at)`
- `game_chat_messages(id uuid, game_id text, sender_id uuid, parent_id uuid?, content text, created_at)`
- `game_owners(game_id text, owner_id uuid, created_at)`

### 4.5 统计与排行榜
- `client_events(...)`：前端 telemetry 写入
- RPC：`get_developer_leaderboard(limit_count)`（见 `developer_leaderboard.sql`）

## 5. 安全与权限（现状）

- Auth：前端使用 Supabase Auth；BFF 通过 `Bearer access_token` 校验用户身份。
- 数据权限：主要依赖 Supabase RLS/Policy（迁移文件中包含部分 policy，如 `public-images` bucket 的写权限、game_posts owner policy 等）。
- 风险点（现状需要关注）：
  - 同时存在“前端直连 DB/Storage”与“经 BFF 访问 DB”的双通道，未来很容易出现权限策略不一致、审计分散、以及滥用/刷接口风险。

## 6. 面向 1w+ 用户并发与 AI/文件云化的演进建议

下面按「并发 & 性能」「文件云存储」「AI 工具调用」「数据与架构治理」四个方向拆解。

### 6.1 并发（1w+ DAU/高峰并发）要做什么
- **统一 API 入口（推荐）**：逐步将写操作与复杂读操作收敛到 BFF（或 API Gateway + 多服务），前端直连仅保留少量安全可控的只读或 realtime 场景。
- **限流与风控**：
  - 按 IP / user / token 做 rate limit（点赞、评论、发帖、AI 调用尤其需要）。
  - 关键接口加 WAF/机器人识别（避免刷赞/刷评论/撞库）。
- **缓存策略**：
  - 列表类接口（posts、tags、leaderboard）加入 CDN/边缘缓存（短 TTL）或服务端缓存（Redis）。
  - 热点帖子详情做二级缓存；避免每次都 join 多表/计数。
- **数据库侧优化**：
  - 为常用过滤/排序字段补齐索引（例如 created_at、author_id、post_id、game_id，以及 tag 关联表）。
  - 计数（likes/comments）从“实时 count(*)”逐步演进为“写时聚合”（counter cache）+ 异步校准。
- **异步化**：
  - 举报、内容审核、AI 生成、文件转码/缩略图生成等进入队列（Worker）。

### 6.2 大量文件的云端存储要做什么
现状 Supabase Storage 可作为起点，但规模上来后建议引入更完善的对象存储体系：
- **对象存储（S3/COS）+ CDN**：
  - 上传：改为 **签名直传**（pre-signed URL），避免文件流穿过业务服务。
  - 访问：统一走 CDN（缓存、带宽成本、回源保护）。
- **元数据与权限模型**：
  - 数据库新增 `project_assets`、`asset_objects` 等表，记录：projectId、ownerId、bucket/key、mime、size、hash、版本、标签、创建时间、权限级别。
  - 用 RLS/ACL 或服务端鉴权控制“项目成员可见/可写”。
- **处理链路（建议必做）**：
  - 图片/视频：缩略图、转码、裁剪、WebP/AVIF，减少首屏与列表压力。
  - 安全：上传后病毒扫描/内容安全审核（异步任务）。
- **配额与计费**：
  - 项目级配额（存储、带宽、AI 调用次数），为商业化与成本控制做准备。

### 6.3 多 AI 工具 API 调用要做什么
核心原则：**AI 调用不要从前端直连第三方**，需要统一在服务端托管密钥、做治理。
- **AI Gateway（推荐新增服务）**
  - 统一入口：`POST /ai/jobs`、`GET /ai/jobs/:id`、`WS/SSE /ai/stream/:id`
  - 统一能力：重试、超时、并发控制、熔断、fallback（模型切换）、配额、日志审计与成本统计。
- **异步任务化**
  - 生成图/生成视频/大模型长输出：job 入队（队列）→ worker 执行 → 结果落库/落存储 → 前端订阅状态。
- **数据模型建议**
  - `ai_providers`（渠道配置）
  - `ai_models`（模型与价格）
  - `ai_jobs`（请求、状态、输入输出摘要、token/时长、费用）
  - `ai_job_artifacts`（生成文件对象引用）
- **安全与合规**
  - 秘钥只在服务端保存（KMS/Secrets Manager）。
  - 产出内容做合规过滤与水印策略（按业务需要）。

### 6.4 架构治理与工程化（从 Demo 到可运营产品）
- **分环境与配置治理**
  - dev/staging/prod 各自 Supabase、Storage、AI provider 配置隔离。
  - 引入配置中心或最少引入「环境变量规范 + 校验」。
- **可观测性**
  - API：结构化日志 + 请求链路 requestId（当前已有 x-request-id 结构，可扩展为 tracing）。
  - 前端：错误监控（Sentry/自建）、性能指标（LCP/CLS）、关键漏斗埋点（已具备 telemetry 基础）。
- **权限与协作**
  - “按项目存储文件和资产”走云端后需要：
    - 项目成员（owner/admin/member/viewer）
    - 成员邀请与审计
    - 资源权限（项目私有/团队共享/公开）

## 7. 推荐的下一步落地顺序（可执行路线）
- 第 1 阶段：统一写操作到 BFF；为帖子/评论/点赞加 rate limit；把列表 API 做缓存；补齐数据库索引。
- 第 2 阶段：把“我的资产库”从 localStorage 升级到云端：`projects + project_assets + object storage + signed upload`。
- 第 3 阶段：AI Gateway + 队列 worker（异步任务）、成本计量与配额。
- 第 4 阶段：多区域 CDN、读写分离/缓存体系强化、完善运维与告警。

