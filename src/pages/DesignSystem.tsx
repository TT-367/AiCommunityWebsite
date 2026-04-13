import { useEffect, useMemo, useState } from "react";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../components/ui/Card";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/Dialog";
import { Input } from "../components/ui/Input";
import { Label } from "../components/ui/Label";
import { Separator } from "../components/ui/Separator";
import { Skeleton } from "../components/ui/Skeleton";
import { Textarea } from "../components/ui/Textarea";
import { toast } from "../components/ui/useToast";
import { useTheme } from "../hooks/useTheme";
import { captureError, getTelemetry, track } from "../lib/telemetry";
import { ErrorBoundary } from "../components/ErrorBoundary";

type ColorToken =
  | "background"
  | "foreground"
  | "surface"
  | "surface-2"
  | "muted"
  | "muted-foreground"
  | "border"
  | "border-strong"
  | "input"
  | "primary"
  | "primary-foreground"
  | "accent"
  | "accent-foreground"
  | "destructive"
  | "destructive-foreground"
  | "success"
  | "warning"
  | "info"
  | "ring";

const colorTokens: Array<{ key: ColorToken; label: string }> = [
  { key: "background", label: "Background" },
  { key: "foreground", label: "Foreground" },
  { key: "surface", label: "Surface" },
  { key: "surface-2", label: "Surface 2" },
  { key: "muted", label: "Muted" },
  { key: "muted-foreground", label: "Muted Foreground" },
  { key: "border", label: "Border" },
  { key: "border-strong", label: "Border Strong" },
  { key: "input", label: "Input" },
  { key: "primary", label: "Primary" },
  { key: "primary-foreground", label: "Primary Foreground" },
  { key: "accent", label: "Accent" },
  { key: "accent-foreground", label: "Accent Foreground" },
  { key: "destructive", label: "Destructive" },
  { key: "destructive-foreground", label: "Destructive Foreground" },
  { key: "success", label: "Success" },
  { key: "warning", label: "Warning" },
  { key: "info", label: "Info" },
  { key: "ring", label: "Ring" },
];

const radiusTokens = [
  { key: "--radius-sm", label: "sm" },
  { key: "--radius-md", label: "md" },
  { key: "--radius-lg", label: "lg" },
  { key: "--radius-xl", label: "xl" },
];

const shadowTokens = [
  { key: "--shadow-1", label: "e1", className: "shadow-e1" },
  { key: "--shadow-2", label: "e2", className: "shadow-e2" },
  { key: "--shadow-3", label: "e3", className: "shadow-e3" },
];

const typeScale = [
  { label: "ui-xs", className: "text-ui-xs" },
  { label: "ui-sm", className: "text-ui-sm" },
  { label: "ui-md", className: "text-ui-md" },
  { label: "ui-lg", className: "text-ui-lg" },
  { label: "ui-xl", className: "text-ui-xl" },
];

export function DesignSystem() {
  const { theme, toggleTheme, isDark } = useTheme();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [computed, setComputed] = useState<Record<string, string>>({});
  const [telemetryTestStatus, setTelemetryTestStatus] = useState<
    { state: "idle" } | { state: "running" } | { state: "success"; testId: string } | { state: "error"; message: string }
  >({ state: "idle" });
  const [renderBoom, setRenderBoom] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    const css = getComputedStyle(root);
    const next: Record<string, string> = {};
    for (const t of colorTokens) next[`--${t.key}`] = css.getPropertyValue(`--${t.key}`).trim();
    for (const t of radiusTokens) next[t.key] = css.getPropertyValue(t.key).trim();
    for (const t of shadowTokens) next[t.key] = css.getPropertyValue(t.key).trim();
    setComputed(next);
  }, [theme]);

  const tokenRows = useMemo(() => {
    return colorTokens.map((t) => {
      const cssVar = `--${t.key}`;
      const value = computed[cssVar] ?? "";
      return { ...t, cssVar, value };
    });
  }, [computed]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-2xl font-bold tracking-tight">Design System</div>
            <div className="mt-1 text-sm text-muted-foreground">
              Tokens + components preview. 当前主题：{isDark ? "dark" : "light"}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => toggleTheme()}>
              切换主题
            </Button>
            <Button
              onClick={() =>
                toast({
                  title: "Toast 示例",
                  description: "这条消息来自设计系统页面",
                  variant: "info",
                })
              }
            >
              触发 Toast
            </Button>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Color Tokens</CardTitle>
                <CardDescription>这些 token 映射到 Tailwind 语义类（bg-*, text-*, border-*）。</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {tokenRows.map((t) => (
                    <div key={t.key} className="rounded-lg border border-border bg-surface p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold">{t.label}</div>
                          <div className="mt-0.5 text-xs text-muted-foreground truncate">
                            {t.cssVar} = {t.value || "—"}
                          </div>
                        </div>
                        <div
                          className="h-10 w-10 rounded-md border border-border-strong"
                          style={{ backgroundColor: `rgb(var(${t.cssVar}))` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Radii</CardTitle>
                <CardDescription>圆角 token，组件会默认使用 Tailwind 的 rounded-*。</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {radiusTokens.map((r) => (
                  <div key={r.key} className="rounded-lg border border-border bg-surface p-3">
                    <div className="text-sm font-semibold">{r.label}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{r.key} = {computed[r.key] || "—"}</div>
                    <div
                      className="mt-3 h-12 w-full border border-border-strong bg-surface-2"
                      style={{ borderRadius: `var(${r.key})` }}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Elevation</CardTitle>
                <CardDescription>阴影/elevation token（shadow-e1/e2/e3）。</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {shadowTokens.map((s) => (
                  <div key={s.key} className="rounded-lg border border-border bg-surface p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold">{s.label}</div>
                        <div className="mt-0.5 text-xs text-muted-foreground truncate">
                          {s.key} = {computed[s.key] || "—"}
                        </div>
                      </div>
                      <div className={`h-10 w-10 rounded-md border border-border bg-surface ${s.className}`} />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-5 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Buttons</CardTitle>
                <CardDescription>统一 focus ring 与语义色。</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                <Button>Primary</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="destructive">Destructive</Button>
                <Button disabled>Disabled</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Typography</CardTitle>
                <CardDescription>字体档位 token（text-ui-*）。</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {typeScale.map((t) => (
                  <div key={t.label} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface p-3">
                    <div className="text-xs font-semibold text-muted-foreground">{t.label}</div>
                    <div className={`${t.className} font-medium text-foreground`}>The quick brown fox jumps</div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Badges</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                <Badge>Default</Badge>
                <Badge variant="secondary">Secondary</Badge>
                <Badge variant="outline">Outline</Badge>
                <Badge variant="destructive">Destructive</Badge>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Form</CardTitle>
                <CardDescription>Input / Textarea / Label。</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1">
                  <Label>标题</Label>
                  <Input placeholder="输入标题..." />
                </div>
                <div className="space-y-1">
                  <Label>正文</Label>
                  <Textarea placeholder="输入正文..." />
                </div>
              </CardContent>
              <CardFooter className="justify-end gap-2">
                <Button variant="outline" onClick={() => toast({ title: "已保存草稿", variant: "success" })}>
                  保存
                </Button>
                <Button onClick={() => toast({ title: "已发布", description: "帖子已提交", variant: "success" })}>
                  发布
                </Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Dialog</CardTitle>
                <CardDescription>用于替代自写弹层。</CardDescription>
              </CardHeader>
              <CardContent className="flex items-center gap-2">
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline">打开 Dialog</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>示例弹窗</DialogTitle>
                      <DialogDescription>这里可以放表单、确认操作等内容。</DialogDescription>
                    </DialogHeader>
                    <DialogBody>
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <Label>名称</Label>
                          <Input placeholder="例如：OpenClaw Agent" />
                        </div>
                        <Separator />
                        <div className="space-y-1">
                          <Label>描述</Label>
                          <Textarea placeholder="请输入描述..." />
                        </div>
                      </div>
                    </DialogBody>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setDialogOpen(false)}>
                        取消
                      </Button>
                      <Button
                        onClick={() => {
                          setDialogOpen(false);
                          toast({ title: "已提交", variant: "success" });
                        }}
                      >
                        确认
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                <Button
                  variant="ghost"
                  onClick={() => toast({ title: "你点击了 Ghost", description: "用于轻量操作", variant: "default" })}
                >
                  辅助操作
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Telemetry Test</CardTitle>
                <CardDescription>验证前端日志是否能写入 Supabase 的 client_events 表。</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm text-muted-foreground">
                  点击后会主动上报一条测试事件与一条测试错误，并尝试 flush。然后到 Supabase Table Editor 查看 public.client_events。
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    disabled={telemetryTestStatus.state === "running"}
                    onClick={async () => {
                      const testId = `${Date.now().toString(16)}_${Math.random().toString(16).slice(2, 8)}`;
                      setTelemetryTestStatus({ state: "running" });
                      try {
                        track("telemetry_test", `telemetry_test:${testId}`, { testId });
                        captureError(new Error(`telemetry_test_error:${testId}`), { testId });
                        const ok = await getTelemetry().flush();
                        if (!ok) throw new Error("telemetry_flush_failed");
                        setTelemetryTestStatus({ state: "success", testId });
                        toast({
                          title: "已触发 Telemetry 测试",
                          description: `请在 Supabase 的 client_events 表里搜索 testId=${testId}`,
                          variant: "success",
                        });
                      } catch (e) {
                        const msg = e instanceof Error ? e.message : "unknown error";
                        setTelemetryTestStatus({ state: "error", message: msg });
                        toast({ title: "Telemetry 测试失败", description: msg, variant: "destructive" });
                      }
                    }}
                  >
                    发送测试日志
                  </Button>
                  {telemetryTestStatus.state === "success" && (
                    <Badge variant="secondary">testId: {telemetryTestStatus.testId}</Badge>
                  )}
                  {telemetryTestStatus.state === "error" && (
                    <Badge variant="destructive">失败</Badge>
                  )}
                </div>
                {telemetryTestStatus.state === "error" && (
                  <div className="text-sm text-destructive">错误：{telemetryTestStatus.message}</div>
                )}
              </CardContent>
              <CardFooter className="justify-between">
                <div className="text-xs text-muted-foreground">
                  前提：已在 Supabase 执行 client_events.sql 创建表与 insert policy。
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setTelemetryTestStatus({ state: "idle" });
                  }}
                >
                  重置
                </Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Telemetry 场景测试</CardTitle>
                <CardDescription>分别制造 404、网络错误、未捕获异常、渲染错误。</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    onClick={async () => {
                      const testId = `${Date.now().toString(16)}_${Math.random().toString(16).slice(2, 8)}`;
                      try {
                        const tfetch = getTelemetry().wrapFetch(fetch);
                        await tfetch("http://127.0.0.1:9/", { method: "GET" });
                      } catch (e) {
                        captureError(e, { scenario: "network_error", testId });
                      } finally {
                        const ok = await getTelemetry().flush();
                        toast({
                          title: "网络错误已触发",
                          description: `kind=error；testId=${testId}`,
                          variant: ok ? "success" : "warning",
                        });
                      }
                    }}
                  >
                    制造网络错误
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => {
                      const testId = `${Date.now().toString(16)}_${Math.random().toString(16).slice(2, 8)}`;
                      setTimeout(() => {
                        // 未捕获的 Promise 拒绝（由 window.unhandledrejection 捕获）
                        Promise.reject(new Error(`telemetry_unhandled:${testId}`));
                      }, 0);
                      toast({
                        title: "未捕获异常已触发",
                        description: `kind=error；testId=${testId}`,
                        variant: "success",
                      });
                    }}
                  >
                    制造未捕获异常
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => setRenderBoom(true)}
                  >
                    制造渲染错误
                  </Button>
                </div>

                <ErrorBoundary>
                  <div className="mt-2">
                    {renderBoom && <ThrowOnRender />}
                  </div>
                </ErrorBoundary>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Skeleton</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-24 w-full" />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

function ThrowOnRender(): JSX.Element {
  throw new Error("telemetry_render_error:design_system");
}
