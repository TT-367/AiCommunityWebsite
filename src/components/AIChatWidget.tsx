import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { Send, Sparkles } from "lucide-react";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";

export type ChatRole = "user" | "assistant" | "system";

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: number;
};

export type ChatSendContext = {
  threadId: string;
};

export type ChatSendResult = {
  assistant: string;
};

export type ChatAdapter = {
  send: (input: string, ctx: ChatSendContext) => Promise<ChatSendResult>;
};

export type AIChatWidgetHandle = {
  focusInput: () => void;
  setInput: (value: string, options?: { focus?: boolean }) => void;
  sendText: (value: string) => Promise<void>;
};

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export const AIChatWidget = forwardRef<AIChatWidgetHandle, {
  title?: string;
  hint?: string;
  placeholder?: string;
  listHeightClassName?: string;
  showEmptyHint?: boolean;
  fill?: boolean;
  initialMessages?: ChatMessage[];
  adapter?: ChatAdapter;
  threadId: string;
  className?: string;
}>(
  (
    {
      title = "AI 对话",
      hint = "为后续接入工具 API 做准备",
      placeholder = "输入你的需求，回车发送…",
      listHeightClassName = "h-[168px]",
      showEmptyHint = true,
      fill = false,
      initialMessages,
      adapter,
      threadId,
      className,
    },
    ref
  ) => {
  const resolvedAdapter = useMemo<ChatAdapter>(() => {
    if (adapter) return adapter;
    return {
      send: async (input) => {
        return {
          assistant: `收到：${input}\n\n后续会在这里接入各类工具 API（检索/总结/生成/执行等）。`,
        };
      },
    };
  }, [adapter]);

  const [messages, setMessages] = useState<ChatMessage[]>(() => initialMessages ?? []);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const sendingRef = useRef(false);
  const listRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    sendingRef.current = sending;
  }, [sending]);

  const send = useCallback(async (textRaw: string) => {
    const text = textRaw.trim();
    if (!text) return;
    if (sendingRef.current) return;
    setInput("");
    const userMsg: ChatMessage = { id: uid(), role: "user", content: text, createdAt: Date.now() };
    setMessages((prev) => [...prev, userMsg]);
    setSending(true);
    try {
      const res = await resolvedAdapter.send(text, { threadId });
      const assistantMsg: ChatMessage = {
        id: uid(),
        role: "assistant",
        content: res.assistant,
        createdAt: Date.now(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } finally {
      setSending(false);
    }
  }, [resolvedAdapter, threadId]);

  useImperativeHandle(
    ref,
    () => ({
      focusInput: () => {
        inputRef.current?.focus();
      },
      setInput: (value, options) => {
        setInput(value);
        if (options?.focus) {
          window.setTimeout(() => inputRef.current?.focus(), 0);
        }
      },
      sendText: async (value) => {
        await send(value);
      },
    }),
    [send]
  );

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages.length, sending]);

  return (
    <div className={className}>
      {(title.trim().length > 0 || hint.trim().length > 0) && (
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl border border-border bg-surface-2 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-primary" />
              </div>
              <div className="min-w-0">
                {title.trim().length > 0 && (
                  <div className="text-sm font-extrabold text-foreground tracking-tight">{title}</div>
                )}
                {hint.trim().length > 0 && (
                  <div className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{hint}</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div
        className={`${
          title.trim().length > 0 || hint.trim().length > 0 ? "mt-3" : ""
        } rounded-xl border border-border bg-surface/55 overflow-hidden flex flex-col min-h-0`}
      >
        <div
          ref={listRef}
          className={`${
            fill ? "flex-1 min-h-0" : listHeightClassName
          } overflow-y-auto no-scrollbar px-3 py-3 space-y-2`}
        >
          {showEmptyHint && messages.length === 0 && !sending && (
            <div className="rounded-xl border border-border bg-surface-2/40 px-3 py-3">
              <div className="text-xs text-muted-foreground font-bold">开始对话</div>
              <div className="mt-1 text-sm text-muted-foreground">输入你的需求，回车发送。</div>
            </div>
          )}
          {messages.map((m) => (
            <div
              key={m.id}
              className={
                m.role === "user"
                  ? "ml-auto ui-bubble-user rounded-xl border border-primary/20 bg-primary/10 px-3 py-2"
                  : "mr-auto ui-bubble-ai rounded-xl border border-border bg-surface-2/55 px-3 py-2"
              }
            >
              <div className="text-xs font-extrabold text-muted-foreground">
                {m.role === "user" ? "你" : "AI"}
              </div>
              <div className="mt-1 text-sm text-foreground whitespace-pre-wrap leading-relaxed">{m.content}</div>
            </div>
          ))}
          {sending && (
            <div className="mr-auto ui-bubble-ai rounded-xl border border-border bg-surface-2/55 px-3 py-2">
              <div className="text-xs font-extrabold text-muted-foreground">AI</div>
              <div className="mt-1 text-sm text-muted-foreground">正在思考…</div>
            </div>
          )}
        </div>

        <div className="border-t border-border bg-surface-2/40 p-3">
          <form
            className="flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void send(input);
            }}
          >
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={placeholder}
              className="bg-surface border-border"
              disabled={sending}
            />
            <Button type="submit" variant="primary" size="icon" disabled={sending || input.trim().length === 0} aria-label="发送">
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
  }
);

AIChatWidget.displayName = "AIChatWidget";
