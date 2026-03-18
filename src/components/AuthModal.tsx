import { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { Button } from './ui/Button';
import { useAuthStore } from '../stores/authStore';

export function AuthModal() {
  const { modalOpen, closeModal, mode, setMode, signInWithPassword, signUpWithPassword } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const title = useMemo(() => (mode === 'signIn' ? '登录' : '注册'), [mode]);

  if (!modalOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md bg-white rounded-xl border border-gray-100 shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="text-base font-bold text-gray-900">{title}</div>
          <button type="button" onClick={closeModal} className="text-gray-400 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form
          className="p-5 space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setSubmitting(true);
            setError(null);
            try {
              if (mode === 'signIn') {
                await signInWithPassword(email.trim(), password);
              } else {
                await signUpWithPassword(email.trim(), password, displayName.trim() || undefined);
              }
            } catch (err) {
              const message = err instanceof Error ? err.message : '操作失败';
              setError(message);
            } finally {
              setSubmitting(false);
            }
          }}
        >
          {mode === 'signUp' && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">昵称</label>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                placeholder="如：Alex"
                autoComplete="nickname"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">邮箱</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
              placeholder="至少 6 位"
              autoComplete={mode === 'signIn' ? 'current-password' : 'new-password'}
              required
              minLength={6}
            />
          </div>

          {error && <div className="text-sm text-red-600">{error}</div>}

          <Button className="w-full" disabled={submitting}>
            {submitting ? '处理中...' : title}
          </Button>

          <div className="text-xs text-gray-500 text-center">
            {mode === 'signIn' ? (
              <button type="button" className="text-purple-600 hover:text-purple-700" onClick={() => setMode('signUp')}>
                没有账号？去注册
              </button>
            ) : (
              <button type="button" className="text-purple-600 hover:text-purple-700" onClick={() => setMode('signIn')}>
                已有账号？去登录
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

