import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuthStore } from '../stores/authStore';
import { Button } from './ui/Button';

interface PostComposerProps {
  className?: string;
}

export function PostComposer({ className }: PostComposerProps) {
  const navigate = useNavigate();
  const user = useAuthStore(s => s.user);
  const openModal = useAuthStore(s => s.openModal);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className={className ?? 'bg-white rounded-xl border border-gray-100 p-5 shadow-sm'}>
      <div className="flex items-center justify-between mb-3">
        <div className="font-semibold text-gray-900">发表新帖子</div>
        {!user && (
          <Button variant="secondary" size="sm" onClick={() => openModal('signIn')}>
            登录后发布
          </Button>
        )}
      </div>

      <div className="space-y-3">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
          placeholder="标题"
          disabled={!user || submitting}
        />
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full min-h-[120px] rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
          placeholder="正文（支持 Markdown）"
          disabled={!user || submitting}
        />
        <input
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
          placeholder="标签（可选，逗号分隔，如：RAG,vLLM）"
          disabled={!user || submitting}
        />

        {error && <div className="text-sm text-red-600">{error}</div>}

        <div className="flex justify-end">
          <Button
            disabled={!user || submitting || title.trim().length === 0 || content.trim().length === 0}
            onClick={async () => {
              if (!user) {
                openModal('signIn');
                return;
              }

              setSubmitting(true);
              setError(null);
              try {
                const tagList = tags
                  .split(',')
                  .map(t => t.trim())
                  .filter(Boolean)
                  .slice(0, 8);

                const description = content.replace(/\s+/g, ' ').trim().slice(0, 160);
                const { data, error } = await supabase
                  .from('posts')
                  .insert({
                    author_id: user.id,
                    title: title.trim(),
                    content,
                    description,
                    tags: tagList,
                  })
                  .select('id')
                  .single();

                if (error) throw error;

                setTitle('');
                setContent('');
                setTags('');

                window.dispatchEvent(new Event('posts:refresh'));
                if (data?.id) navigate(`/post/${data.id}`);
              } catch (err) {
                const message = err instanceof Error ? err.message : '发布失败';
                setError(message);
              } finally {
                setSubmitting(false);
              }
            }}
          >
            发布
          </Button>
        </div>
      </div>
    </div>
  );
}
