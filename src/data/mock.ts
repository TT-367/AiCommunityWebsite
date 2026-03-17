export interface Author {
  id: string;
  name: string;
  handle: string;
  avatar: string;
}

export interface Comment {
  id: string;
  author: Author;
  content: string;
  createdAt: string;
  likes: number;
  replies?: Comment[];
}

export interface Post {
  id: string;
  author: Author;
  title: string;
  description: string;
  content: string;
  tags: string[];
  likes: number;
  commentsCount: number;
  comments: Comment[];
  createdAt: string;
  isAiAssisted?: boolean;
  gameIds?: string[];
}

export const mockPosts: Post[] = [
  {
    id: '1',
    author: {
      id: 'u1',
      name: 'Alex Chen',
      handle: '@alexc',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex',
    },
    title: '使用 vLLM 将 RAG 推理吞吐量提升 3 倍的实践总结',
    description: '在生产环境中部署 RAG 系统时，我们遇到了严重的延迟问题。通过引入 vLLM 并优化 PagedAttention 参数，我们在保持准确率的同时显著提升了并发处理能力。本文详细记录了参数调优的过程和最终的压测数据。',
    content: `
## 背景
在生产环境中部署 RAG 系统时，我们遇到了严重的延迟问题。特别是在高并发场景下，首字延迟（TTFT）和总生成时间都无法满足 SLA 要求。

## 解决方案：vLLM
我们决定引入 [vLLM](https://github.com/vllm-project/vllm) 作为推理引擎。vLLM 的核心优势在于 PagedAttention 机制，它能高效管理显存，从而极大提升吞吐量。

### 核心配置
\`\`\`python
from vllm import LLM, SamplingParams

llm = LLM(
    model="meta-llama/Llama-2-13b-hf",
    tensor_parallel_size=1,
    gpu_memory_utilization=0.90,
    max_num_batched_tokens=4096
)
\`\`\`

## 压测结果
我们在 4x A100 环境下进行了压测，对比了 HuggingFace Transformers 和 vLLM。

| 指标 | Transformers | vLLM | 提升 |
|Data | 12.5 req/s | 38.2 req/s | **3.05x** |
| TTFT (P95) | 180ms | 45ms | **4x** |

## 结论
引入 vLLM 后，我们的系统吞吐量提升了 3 倍，且延迟显著降低。强烈推荐在生产环境中使用。
    `,
    tags: ['RAG', 'vLLM', 'Performance', 'Inference'],
    likes: 142,
    commentsCount: 28,
    gameIds: ['g1'],
    comments: [
      {
        id: 'c1',
        author: {
          id: 'u2',
          name: 'Sarah Jones',
          handle: '@sarahj',
          avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah',
        },
        content: '非常有价值的分享！请问你们在使用 vLLM 时有没有遇到显存碎片化的问题？',
        createdAt: '2024-03-15T10:30:00Z',
        likes: 5,
        replies: [
          {
            id: 'c1-r1',
            author: {
              id: 'u1',
              name: 'Alex Chen',
              handle: '@alexc',
              avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex',
            },
            content: 'vLLM 的 PagedAttention 机制本身就是为了解决显存碎片化问题的。它将 KV cache 分块存储，有点像操作系统的虚拟内存分页。',
            createdAt: '2024-03-15T10:45:00Z',
            likes: 3,
          },
          {
            id: 'c1-r2',
            author: {
              id: 'u4',
              name: 'Emily Wang',
              handle: '@emilyw',
              avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Emily',
            },
            content: '确实，PagedAttention 是 vLLM 的核心创新点。',
            createdAt: '2024-03-15T11:00:00Z',
            likes: 1,
          }
        ]
      },
      {
        id: 'c2',
        author: {
          id: 'u3',
          name: 'David Kim',
          handle: '@davidk',
          avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=David',
        },
        content: '我们也正在调研 vLLM，感谢提供具体的配置参数。',
        createdAt: '2024-03-15T11:15:00Z',
        likes: 3,
        replies: []
      }
    ],
    createdAt: '2024-03-15T10:00:00Z',
    isAiAssisted: false,
  },
  {
    id: '2',
    author: {
      id: 'u2',
      name: 'Sarah Jones',
      handle: '@sarahj',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah',
    },
    title: '基于 LangChain 的多 Agent 协作模式：从理论到代码',
    description: '探讨了 Hierarchical 与 Joint 两种多 Agent 协作模式的区别。通过构建一个简单的软件开发团队模拟（产品经理 + 程序员 + 测试），展示了如何利用 LangGraph 实现状态流转与任务分发。附完整代码仓库。',
    content: `
## 多 Agent 架构
在构建复杂的 AI 应用时，单 Agent 往往难以胜任。我们需要多 Agent 协作。

### Hierarchical vs Joint
- **Hierarchical**: 类似公司层级，有一个总控 Agent 分发任务。
- **Joint**: Agent 之间平等协作，类似即时通讯群组。

## LangGraph 实现
LangGraph 是 LangChain 推出的用于构建有状态、多 Actor 应用的库。

\`\`\`typescript
import { StateGraph, END } from "@langchain/langgraph";

const workflow = new StateGraph({
  channels: stateChannels,
});

workflow.addNode("supervisor", supervisorNode);
workflow.addNode("coder", coderNode);
workflow.addNode("tester", testerNode);

workflow.addEdge("supervisor", "coder");
workflow.addEdge("coder", "tester");
workflow.addEdge("tester", "supervisor");
\`\`\`
    `,
    tags: ['LangChain', 'Agents', 'LangGraph', 'Tutorial'],
    likes: 89,
    commentsCount: 15,
    comments: [],
    createdAt: '2024-03-14T14:30:00Z',
    isAiAssisted: true,
  },
  {
    id: '3',
    author: {
      id: 'u3',
      name: 'David Kim',
      handle: '@davidk',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=David',
    },
    title: '本地运行 Llama-3-70B 的硬件要求与量化方案对比',
    description: '分别在 2x3090 和 4x4090 上测试了 Llama-3-70B 的运行情况。对比了 GPTQ、AWQ 和 GGUF (4-bit/8-bit) 的显存占用与生成速度。对于预算有限的实验室，推荐使用 ExLlamaV2 后端配合 4-bit 量化。',
    content: '内容待补充...',
    tags: ['Llama3', 'Hardware', 'Quantization', 'LocalLLM'],
    likes: 215,
    commentsCount: 56,
    comments: [],
    createdAt: '2024-03-13T09:15:00Z',
    isAiAssisted: false,
  },
  {
    id: '4',
    author: {
      id: 'u4',
      name: 'Emily Wang',
      handle: '@emilyw',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Emily',
    },
    title: 'OpenAI 助手 API (Assistants API) vs 自建 RAG：成本与控制力的权衡',
    description: '深度对比了使用 OpenAI 官方 Assistants API 与基于向量数据库自建 RAG 的优劣。虽然 Assistants API 上手极快，但在检索质量的微调和数据隐私控制上存在局限。建议在原型阶段使用 API，生产阶段逐步迁移到自建方案。',
    content: '内容待补充...',
    tags: ['OpenAI', 'RAG', 'Comparison', 'Architecture'],
    likes: 67,
    commentsCount: 12,
    comments: [],
    createdAt: '2024-03-12T16:45:00Z',
    isAiAssisted: true,
  },
  {
    id: '5',
    author: {
      id: 'u5',
      name: 'Michael Brown',
      handle: '@mikeb',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Michael',
    },
    title: 'Prompt Engineering 指南：让你的 LLM 输出更结构化的 JSON',
    description: '很多时候 LLM 输出的 JSON 格式不稳定，导致解析失败。本文总结了 5 个实用的 Prompt 技巧，结合 TypeScript 类型定义注入，让 GPT-3.5 也能稳定输出复杂的嵌套 JSON 数据。',
    content: '内容待补充...',
    tags: ['PromptEngineering', 'JSON', 'Tips'],
    likes: 120,
    commentsCount: 34,
    comments: [],
    createdAt: '2024-03-11T11:20:00Z',
    isAiAssisted: false,
  },
];

export interface Game {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  author: Author;
  playCount: number;
  likes: number;
  tags: string[];
  createdAt: string;
}

export const mockGames: Game[] = [
  {
    id: 'g1',
    title: 'Neon Racer 2077',
    description: 'A cyberpunk racing game with procedural tracks generated by AI.',
    thumbnail: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&q=80',
    author: {
      id: 'u1',
      name: 'Alex Chen',
      handle: '@alexc',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex',
    },
    playCount: 12500,
    likes: 890,
    tags: ['Racing', 'Cyberpunk', '3D'],
    createdAt: '2024-03-10T14:00:00Z',
  },
  {
    id: 'g2',
    title: 'Echoes of Magic',
    description: 'An RPG where NPCs use LLMs for dynamic conversations and quests.',
    thumbnail: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800&q=80',
    author: {
      id: 'u2',
      name: 'Sarah Jones',
      handle: '@sarahj',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah',
    },
    playCount: 8400,
    likes: 560,
    tags: ['RPG', 'Fantasy', 'AI NPC'],
    createdAt: '2024-03-12T09:30:00Z',
  },
  {
    id: 'g3',
    title: 'Space Tycoon AI',
    description: 'Manage a space station where the economy is simulated by AI agents.',
    thumbnail: 'https://images.unsplash.com/photo-1614728853913-1e2203d9d73e?w=800&q=80',
    author: {
      id: 'u3',
      name: 'David Kim',
      handle: '@davidk',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=David',
    },
    playCount: 5600,
    likes: 320,
    tags: ['Strategy', 'Sci-Fi', 'Simulation'],
    createdAt: '2024-03-14T16:15:00Z',
  },
  {
    id: 'g4',
    title: 'Puzzle Quest VR',
    description: 'Solve physics puzzles in VR with hand tracking support.',
    thumbnail: 'https://images.unsplash.com/photo-1592478411213-61535fdd861d?w=800&q=80',
    author: {
      id: 'u4',
      name: 'Emily Wang',
      handle: '@emilyw',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Emily',
    },
    playCount: 3200,
    likes: 150,
    tags: ['Puzzle', 'VR', 'Physics'],
    createdAt: '2024-03-15T11:00:00Z',
  },
];
