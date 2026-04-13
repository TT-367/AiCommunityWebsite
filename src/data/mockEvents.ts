export type MockEventStatus = 'ongoing' | 'reviewing' | 'ended';

export type MockEvent = {
  id: string;
  title: string;
  subtitle: string;
  coverUrl: string;
  status: MockEventStatus;
  statusText: string;
  prize: string;
  timeRange: string;
  description: string;
};

export const mockEvents: MockEvent[] = [
  {
    id: 'e1',
    title: '团结引擎 · 2026 游戏创新挑战赛（UGC & 工具链）',
    subtitle: '面向团结/Unity开发者：提交可玩 Demo + 开发日志，挑战从 0 到 1 的可验证创新。',
    coverUrl: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=2400&auto=format&fit=crop',
    status: 'ongoing',
    statusText: '进行中，预计 23 天后结束',
    prize: '¥200,000 + 云构建额度 + 资源市场曝光',
    timeRange: '2026-04-12 00:00:00 - 2026-05-05 00:00:00',
    description:
      '目标：用团结引擎 / Unity 做出“可验证的创新”。\n\n参赛要求：\n- 作品：可玩 Demo（Web 或 PC）\n- 配套：开发日志（包含工具链/工作流截图）\n- 评分：可玩性、完成度、创新点、复现性\n\n推荐方向：\n- AI 辅助关卡生成 / NPC 行为\n- 资产管线自动化（导入、压缩、打包）\n- 跨平台发布与性能优化',
  },
  {
    id: 'e2',
    title: 'Unity 官方社区 · 48小时 Game Jam（原型冲刺）',
    subtitle: '48 小时完成可玩原型：玩法闭环 > 美术堆料。',
    coverUrl: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=2400&auto=format&fit=crop',
    status: 'ongoing',
    statusText: '进行中，预计 2 天后结束',
    prize: 'Unity 资源包 + 作品展示位 + 社区流量',
    timeRange: '2026-04-09 00:00:00 - 2026-04-11 00:00:00',
    description:
      '赛题：用最少的系统做出最强的反馈。\n\n提交物：\n- 可玩 Demo\n- 30 秒演示视频\n- 关键脚本/资源说明\n\n评审侧重：玩法节奏、交互反馈、可复玩性。',
  },
  {
    id: 'e3',
    title: '腾讯游戏创作营 · SDK 接入挑战（登录/支付/云存档）',
    subtitle: '围绕腾讯生态能力：最短路径完成从接入到上线的闭环验证。',
    coverUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=2400&auto=format&fit=crop',
    status: 'ongoing',
    statusText: '进行中，预计 9 天后结束',
    prize: '¥100,000 + 上线资源扶持 + 技术专家评审',
    timeRange: '2026-04-08 00:00:00 - 2026-04-18 00:00:00',
    description:
      '挑战目标：把“接入”变成“可用”。\n\n硬性项（至少完成两项）：\n- 登录/账号体系\n- 支付/道具发放\n- 云存档/排行榜\n\n加分项：异常处理、灰度开关、埋点与漏斗数据。',
  },
  {
    id: 'e4',
    title: 'TapTap 开发者共创 · 新游试玩节（Demo & 反馈闭环）',
    subtitle: '把试玩数据变成迭代：曝光、转化与留存的第一轮验证。',
    coverUrl: 'https://images.unsplash.com/photo-1527689368864-3a821dbccc34?q=80&w=2400&auto=format&fit=crop',
    status: 'reviewing',
    statusText: '评审中',
    prize: 'TapTap 首页推荐 + 试玩榜单 + 评测合作',
    timeRange: '2026-03-12 00:00:00 - 2026-03-26 00:00:00',
    description:
      '面向独立/小团队：提交可玩 Demo，收集真实玩家反馈。\n\n提交物：\n- 可玩 Demo\n- 关键卖点与玩法说明\n- 反馈收集表（Bug/建议/数据）\n\n评审侧重：完成度、核心体验、可传播性。',
  },
  {
    id: 'e5',
    title: 'B站游戏区 · 开发日志征集（从 0 到 Demo）',
    subtitle: '用系列视频记录你的制作过程：技术、踩坑、复盘与成长。',
    coverUrl: 'https://images.unsplash.com/photo-1526498460520-4c246339dccb?q=80&w=2400&auto=format&fit=crop',
    status: 'reviewing',
    statusText: '评审中',
    prize: 'B站流量扶持 + 专栏推荐 + 合作邀约',
    timeRange: '2026-02-20 00:00:00 - 2026-03-05 00:00:00',
    description:
      '建议内容结构：\n- 选题与目标\n- 玩法原型与迭代\n- 工程结构与性能\n- 资产管线与工具\n- 结尾复盘\n\n额外加分：开源一段可复用工具脚本或模版工程。',
  },
  {
    id: 'e6',
    title: '游戏资产市场 · 创作者挑战（模板/插件/美术包）',
    subtitle: '面向 Unity/团结：把你的可复用能力做成可售卖资产。',
    coverUrl: 'https://images.unsplash.com/photo-1520975916090-3105956dac38?q=80&w=2400&auto=format&fit=crop',
    status: 'ended',
    statusText: '已颁奖',
    prize: '平台分成提升 + 首页曝光 + 认证创作者标识',
    timeRange: '2026-01-10 00:00:00 - 2026-02-15 00:00:00',
    description:
      '方向示例：\n- UI 组件库 / Design Tokens\n- 场景模板 / Demo 工程\n- 性能优化工具\n- Shader / 特效包\n\n提交物：资源包、文档、示例工程与演示视频。',
  },
];
