import type { Author, Post } from './mock';

const STORAGE_KEY = 'local_posts_v1';

function load(): Post[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed as Post[];
  } catch {
    return [];
  }
}

function save(posts: Post[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(posts.slice(0, 50)));
}

export function getLocalPosts(): Post[] {
  return load();
}

export function getLocalPostById(id: string): Post | null {
  const posts = load();
  return posts.find((p) => p.id === id) ?? null;
}

export function addLocalPost(input: {
  title: string;
  content: string;
  tags: string[];
  author: Author;
}): Post {
  const now = new Date().toISOString();
  const id = `lp-${Date.now()}`;
  const post: Post = {
    id,
    author: input.author,
    title: input.title,
    description: input.content.replace(/\s+/g, ' ').trim().slice(0, 160),
    content: input.content,
    tags: input.tags,
    likes: 0,
    commentsCount: 0,
    comments: [],
    createdAt: now,
    isAiAssisted: false,
  };
  const posts = load();
  save([post, ...posts.filter((p) => p.id !== id)]);
  return post;
}

