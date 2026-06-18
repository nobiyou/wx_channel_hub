import { formatTimeAgo } from "@/lib/format";
import type { HubDashboardData } from "@/lib/hub";

type DashboardConsoleProps = {
  data: HubDashboardData;
};

export function DashboardConsole({ data }: DashboardConsoleProps) {
  const onlineClients = data.clients.filter((item) => item.status === "online");
  const searchReady = onlineClients.filter((item) => item.supports_search).length;
  const doneTasks = data.tasks.filter((item) => item.status === "success" || item.status === "done").length;
  const metrics = data.metricsSummary;
  const wsStats = data.wsStats;
  const timeseries = data.metricsTimeseries;
  const endpointLabels = timeseries?.endpoints?.labels || [];
  const endpointValues = timeseries?.endpoints?.values || [];
  const apiLabels = timeseries?.apiCalls?.labels || [];
  const apiSuccess = timeseries?.apiCalls?.success || [];
  const apiFailed = timeseries?.apiCalls?.failed || [];

  return (
    <div className="space-y-8">
      <div className="grid gap-4 lg:grid-cols-4">
        <MetricCard label="在线终端" value={String(onlineClients.length)} detail="来自 /api/clients" />
        <MetricCard label="搜索就绪" value={String(searchReady)} detail="supports_search" />
        <MetricCard label="近期任务" value={String(data.tasks.length)} detail={`${doneTasks} 条已完成`} />
        <MetricCard label="订阅数" value={String(data.subscriptions.length)} detail="来自 /api/subscriptions" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-[28px] border border-[var(--border)] bg-[var(--surface-soft)] p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="m-0 text-xl font-semibold">实时监控摘要</h2>
            <span className="text-sm text-[var(--muted)]">/api/metrics/summary</span>
          </div>

          {metrics ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <MiniMetric title="WebSocket 连接" value={String(metrics.connections ?? 0)} hint="Prometheus 缓存" />
              <MiniMetric title="API 调用" value={String(metrics.apiCalls ?? 0)} hint="MetricsStore 累计" />
              <MiniMetric
                title="成功率"
                value={`${Number(metrics.successRate ?? 0).toFixed(2)}%`}
                hint="2xx-3xx 占比"
              />
              <MiniMetric
                title="平均响应"
                value={`${Number(metrics.avgResponseTime ?? 0).toFixed(2)} ms`}
                hint="API 平均响应时间"
              />
              <MiniMetric title="心跳发送" value={String(metrics.heartbeatsSent ?? 0)} hint="客户端累计心跳" />
              <MiniMetric
                title="压缩率"
                value={`${Number(metrics.compressionRate ?? 0).toFixed(2)}%`}
                hint={`节省 ${formatBytes(metrics.bytesSaved ?? 0)}`}
              />
            </div>
          ) : (
            <EmptyHint text="当前没有读到监控摘要，可能是 Hub 端尚未准备好指标缓存。" />
          )}
        </section>

        <section className="rounded-[28px] border border-[var(--border)] bg-[var(--surface-soft)] p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="m-0 text-xl font-semibold">WebSocket 统计</h2>
            <span className="text-sm text-[var(--muted)]">/api/ws/stats</span>
          </div>

          {wsStats ? (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <MiniMetric title="连接数" value={String(wsStats.total_connections ?? 0)} hint="当前客户端连接" />
                <MiniMetric title="Ping/Pong" value={`${wsStats.total_pings ?? 0}/${wsStats.total_pongs ?? 0}`} hint="累计心跳" />
                <MiniMetric title="消息量" value={String(wsStats.total_messages ?? 0)} hint="收发总和" />
              </div>
              <div className="space-y-3">
                {(wsStats.clients || []).slice(0, 4).map((client) => (
                  <div key={`${client.id}-${client.connected_at}`} className="rounded-2xl border border-[var(--border)] bg-white px-4 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-medium">{client.hostname || client.id || "unknown"}</div>
                        <div className="mt-1 text-xs text-[var(--muted)]">{client.id || client.ip || "未识别"}</div>
                      </div>
                      <div className="text-right text-xs text-[var(--muted)]">
                        <div>{client.uptime || "-"}</div>
                        <div className="mt-1">{client.avg_latency || "-"}</div>
                      </div>
                    </div>
                  </div>
                ))}
                {(wsStats.clients || []).length === 0 ? <EmptyHint text="当前没有活动的 WebSocket 客户端。" /> : null}
              </div>
            </div>
          ) : (
            <EmptyHint text="当前没有读到 WebSocket 统计信息。" />
          )}
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="rounded-[28px] border border-[var(--border)] bg-[var(--surface-soft)] p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="m-0 text-xl font-semibold">在线终端</h2>
            <span className="text-sm text-[var(--muted)]">前 6 台</span>
          </div>
          <div className="space-y-3">
            {data.clients.slice(0, 6).map((client) => (
              <div
                key={client.id}
                className="flex items-start justify-between rounded-2xl border border-[var(--border)] bg-white px-4 py-4"
              >
                <div>
                  <div className="font-medium">{client.display_name || client.hostname || client.id}</div>
                  <div className="mt-1 text-xs text-[var(--muted)]">{client.id}</div>
                  <div className="mt-2 text-sm text-[var(--muted)]">
                    {client.page_path || client.href || "未上报页面"}
                  </div>
                </div>
                <div className="text-right">
                  <div className="rounded-full bg-[var(--surface-soft)] px-3 py-1 text-xs text-[var(--primary)]">
                    {client.status || "unknown"}
                  </div>
                  <div className="mt-3 text-xs text-[var(--muted)]">{formatTimeAgo(client.last_seen)}</div>
                </div>
              </div>
            ))}
            {data.clients.length === 0 ? <EmptyHint text="当前没有读到 Hub 终端数据。" /> : null}
          </div>
        </section>

        <section className="rounded-[28px] border border-[var(--border)] bg-[var(--surface-soft)] p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="m-0 text-xl font-semibold">最近任务</h2>
            <span className="text-sm text-[var(--muted)]">前 8 条</span>
          </div>
          <div className="space-y-3">
            {data.tasks.slice(0, 8).map((task) => (
              <div key={task.id} className="rounded-2xl border border-[var(--border)] bg-white px-4 py-4">
                <div className="flex items-center justify-between">
                  <div className="font-medium">
                    #{task.id} {task.type || "unknown"}
                  </div>
                  <div className="text-xs text-[var(--muted)]">{task.status || "unknown"}</div>
                </div>
                <div className="mt-2 text-xs text-[var(--muted)]">{task.node_id || "未关联终端"}</div>
                <div className="mt-3 text-sm text-[var(--muted)]">{formatTimeAgo(task.created_at)}</div>
              </div>
            ))}
            {data.tasks.length === 0 ? <EmptyHint text="当前没有读到任务数据。" /> : null}
          </div>
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <section className="rounded-[28px] border border-[var(--border)] bg-[var(--surface-soft)] p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="m-0 text-xl font-semibold">API 热点端点</h2>
            <span className="text-sm text-[var(--muted)]">/api/metrics/timeseries</span>
          </div>
          {endpointLabels.length > 0 ? (
            <div className="space-y-3">
              {endpointLabels.map((label, index) => {
                const value = endpointValues[index] ?? 0;
                const max = Math.max(...endpointValues, 1);
                const width = `${Math.max((value / max) * 100, 8)}%`;
                return (
                  <div key={`${label}-${index}`}>
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span className="font-mono text-[var(--text)]">{label}</span>
                      <span className="text-[var(--muted)]">{value.toFixed(0)}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-white">
                      <div className="h-full rounded-full bg-[var(--primary)]" style={{ width }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyHint text="当前没有可用的端点热点数据。" />
          )}
        </section>

        <section className="rounded-[28px] border border-[var(--border)] bg-[var(--surface-soft)] p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="m-0 text-xl font-semibold">最近 15 分钟 API 节奏</h2>
            <span className="text-sm text-[var(--muted)]">成功 / 失败</span>
          </div>
          {apiLabels.length > 0 ? (
            <div className="space-y-3">
              {apiLabels.slice(-8).map((label, index, arr) => {
                const sourceIndex = apiLabels.length - arr.length + index;
                const success = apiSuccess[sourceIndex] ?? 0;
                const failed = apiFailed[sourceIndex] ?? 0;
                return (
                  <div key={`${label}-${sourceIndex}`} className="rounded-2xl border border-[var(--border)] bg-white px-4 py-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{label}</span>
                      <span className="text-[var(--muted)]">
                        成功 {success.toFixed(0)} / 失败 {failed.toFixed(0)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyHint text="当前没有 API 时序数据。" />
          )}
        </section>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  detail
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-[26px] border border-[var(--border)] bg-[var(--surface-soft)] p-5">
      <div className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">{label}</div>
      <div className="mt-4 text-4xl font-semibold">{value}</div>
      <div className="mt-3 text-sm text-[var(--muted)]">{detail}</div>
    </div>
  );
}

function MiniMetric({ title, value, hint }: { title: string; value: string; hint: string }) {
  return (
    <div className="rounded-[22px] border border-[var(--border)] bg-white p-4">
      <div className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">{title}</div>
      <div className="mt-3 text-2xl font-semibold">{value}</div>
      <div className="mt-2 text-sm text-[var(--muted)]">{hint}</div>
    </div>
  );
}

function EmptyHint({ text }: { text: string }) {
  return <div className="rounded-2xl border border-dashed border-[var(--border)] px-4 py-6 text-sm text-[var(--muted)]">{text}</div>;
}

function formatBytes(value: number): string {
  if (value <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let size = value;
  let index = 0;
  while (size >= 1024 && index < units.length - 1) {
    size /= 1024;
    index += 1;
  }
  return `${size.toFixed(size >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
}
