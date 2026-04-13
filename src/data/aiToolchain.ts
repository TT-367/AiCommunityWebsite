import { toolLogoUrl } from '../lib/toolLogos';

export type AITool = {
  id: string;
  name: string;
  logo: string;
  url: string;
  description: string;
  engine?: string[]; // 例如 ['Unity', 'UE']，留空表示通用
  isTop?: boolean;   // 是否在折叠状态下展示（头部工具）
  relatedPromptIds?: string[]; // 关联的推荐 Prompt ID
  relatedSkillIds?: string[];  // 关联的推荐 Skill ID
};


export type AIToolchainCategory = {
  id: string;
  title: string;
  summary: string;
  tools: AITool[];
};

export const aiToolchainData: AIToolchainCategory[] = [
  {
    id: 'concept',
    title: '原型',
    summary: '围绕玩法、背景与角色原型，快速产出可验证的游戏设计与原型方案。',
    tools: [
      { id: 'chatgpt', name: 'ChatGPT', logo: toolLogoUrl('chatgpt'), url: 'https://chat.openai.com', description: '全能文本与逻辑分析', isTop: true },
      { id: 'claude', name: 'Claude', logo: toolLogoUrl('claude'), url: 'https://claude.ai', description: '长文本与代码分析', isTop: true, relatedSkillIds: ['2'] },
      { id: 'gemini', name: 'Gemini', logo: toolLogoUrl('gemini'), url: 'https://gemini.google.com', description: '多模态概念分析', isTop: true },
      { id: 'perplexity', name: 'Perplexity', logo: toolLogoUrl('perplexity'), url: 'https://www.perplexity.ai', description: '市场趋势与竞品检索', isTop: true },
      { id: 'miro', name: 'Miro AI', logo: toolLogoUrl('miro'), url: 'https://miro.com', description: '游戏思维导图与原型白板' },
      { id: 'notion', name: 'Notion AI', logo: toolLogoUrl('notion'), url: 'https://www.notion.so', description: 'GDD 游戏设计文档编写' },
      { id: 'deepseek', name: 'DeepSeek', logo: toolLogoUrl('deepseek'), url: '#', description: '中文推理与工程能力' },
      { id: 'qwen', name: 'Qwen', logo: toolLogoUrl('qwen'), url: '#', description: '通义大模型家族' },
      { id: 'glm', name: 'GLM', logo: toolLogoUrl('glm'), url: '#', description: '智谱 GLM 模型' },
      { id: 'hunyuan', name: 'Hunyuan', logo: toolLogoUrl('hunyuan'), url: '#', description: '混元大模型' },
      { id: 'kimi', name: 'Kimi', logo: toolLogoUrl('kimi'), url: '#', description: '长上下文助手' },
      { id: 'llama', name: 'Llama', logo: toolLogoUrl('llama'), url: '#', description: '开源基座模型' },
      { id: 'minimax', name: 'MiniMax', logo: toolLogoUrl('minimax'), url: '#', description: '多模态与对话' },
      { id: 'grok', name: 'Grok', logo: toolLogoUrl('grok'), url: '#', description: '实时信息与推理' },
      { id: 'wenxin', name: '文心一言', logo: toolLogoUrl('wenxin'), url: '#', description: '百度文心大模型' },
    ],
  },
  {
    id: 'art',
    title: '美术',
    summary: '聚焦角色形象与场景搭建，快速生成可用的美术资产与风格参考。',
    tools: [
      { id: 'midjourney', name: 'Midjourney', logo: toolLogoUrl('midjourney'), url: 'https://www.midjourney.com', description: '高品质 2D 概念原画', isTop: true, relatedSkillIds: ['3'] },
      { id: 'stable-diffusion', name: 'Stable Diffusion', logo: toolLogoUrl('stable-diffusion'), url: 'https://stability.ai', description: '可控图生图与精灵序列', isTop: true, relatedSkillIds: ['3'] },
      { id: 'meshy', name: 'Meshy', logo: toolLogoUrl('meshy'), url: 'https://www.meshy.ai', description: '图生 3D 与 PBR 材质', isTop: true },
      { id: 'luma', name: 'Luma 3D', logo: toolLogoUrl('luma'), url: 'https://lumalabs.ai', description: 'NeRF 与照片转 3D', isTop: true },
      { id: 'runway', name: 'Runway Gen-2', logo: toolLogoUrl('runway'), url: 'https://runwayml.com', description: '视频生成与特效' },
      { id: 'pika', name: 'Pika', logo: toolLogoUrl('pika'), url: 'https://pika.art', description: '文生动画与动效' },
      { id: 'adobe-substance', name: 'Substance 3D', logo: toolLogoUrl('adobe-substance'), url: 'https://www.adobe.com/products/substance3d.html', description: '智能纹理与材质混合' },
      { id: 'kaedim', name: 'Kaedim', logo: toolLogoUrl('kaedim'), url: 'https://www.kaedim3d.com', description: '图生 3D 模型/重建' },
      { id: 'polycam', name: 'Polycam', logo: toolLogoUrl('polycam'), url: 'https://poly.cam', description: '移动端扫描与重建' },
      { id: 'leonardo', name: 'Leonardo AI', logo: toolLogoUrl('leonardo'), url: 'https://leonardo.ai', description: 'AI 素材/贴图生成' },
      { id: 'embergen', name: 'EmberGen', logo: toolLogoUrl('embergen'), url: 'https://jangafx.com/software/embergen', description: '体积烟火仿真' },
      { id: 'tripo', name: 'Tripo', logo: toolLogoUrl('tripo'), url: 'https://www.tripo3d.ai', description: '图/文生 3D 模型' },
      { id: 'tooncrafter', name: 'ToonCrafter', logo: toolLogoUrl('tooncrafter'), url: '#', description: '卡通风格动画生成' },
      { id: 'seaart', name: 'SeaArt', logo: toolLogoUrl('seaart'), url: 'https://www.seaart.ai', description: '在线图像生成平台' },
      { id: 'texture-lab', name: 'Texture Lab', logo: toolLogoUrl('texture-lab'), url: '#', description: '纹理生成' },
      { id: 'genie3', name: 'Genie 3', logo: toolLogoUrl('genie3'), url: 'https://deepmind.google/technologies/genie', description: '视频到交互内容' },
      { id: 'layerai', name: 'Layer AI', logo: toolLogoUrl('layerai'), url: '#', description: '素材生成平台' },
      { id: 'golopix', name: 'GoloPix', logo: toolLogoUrl('golopix'), url: '#', description: '图像生成' },
      { id: 'banana', name: 'Banana', logo: toolLogoUrl('banana'), url: '#', description: '图像/素材生成' },
    ],
  },
  {
    id: 'audio',
    title: '音效',
    summary: '生成游戏音效与场景音乐，快速补齐反馈与氛围。',
    tools: [
      { id: 'elevenlabs', name: 'ElevenLabs', logo: toolLogoUrl('elevenlabs'), url: 'https://elevenlabs.io', description: '高质量角色配音与音效', isTop: true },
      { id: 'suno', name: 'Suno', logo: toolLogoUrl('suno'), url: 'https://suno.com', description: '游戏 BGM 与氛围音乐', isTop: true },
      { id: 'playht', name: 'PlayHT', logo: toolLogoUrl('playht'), url: 'https://play.ht', description: '多语言游戏角色 TTS', isTop: true },
      { id: 'soundraw', name: 'Soundraw', logo: toolLogoUrl('soundraw'), url: 'https://soundraw.io', description: '免版税定制背景音乐' },
    ],
  },
];
