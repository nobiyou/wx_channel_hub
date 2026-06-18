"use client";

import { useMemo, useState, useTransition } from "react";

import { formatTimeAgo } from "@/lib/format";
import type { HubClient, HubRemoteCallResponse } from "@/lib/hub";

type RemoteConsoleProps = {
  initialDevices: HubClient[];
  initialAction?: string;
  initialClientId?: string;
  initialPayloadText?: string;
};

type Notice = {
  tone: "success" | "error" | "info";
  text: string;
};

type RemoteHistoryItem = {
  id: string;
  action: string;
  clientId: string;
  createdAt: string;
  success: boolean;
  response?: HubRemoteCallResponse | null;
  errorMessage?: string;
  payloadText: string;
};

const PRESET_ACTIONS = [
  { label: "API 调用", value: "api_call", payload: '{\n  "key": "key:channels:feed_profile"\n}' },
  { label: "搜索作者", value: "search_channels", payload: '{\n  "keyword": "示例关键词",\n  "page": 1\n}' },
  { label: "搜索视频", value: "search_videos", payload: '{\n  "keyword": "示例关键词",\n  "page": 1\n}' },
  {
    label: "下载视频",
    value: "download_video",
    payload: '{\n  "videoUrl": "https://example.com/video.mp4",\n  "title": "示例视频",\n  "author": "示例作者"\n}'
  }
] as const;

export function RemoteConsole({
  initialDevices,
  initialAction = "api_call",
  initialClientId = "",
  initialPayloadText = ""
}: RemoteConsoleProps) {
  const [devices, setDevices] = useState(initialDevices);
  const [selectedClientId, setSelectedClientId] = useState(initialClientId);
  const [action, setAction] = useState(initialAction);
  const [payloadText, setPayloadText] = useState(resolveInitialPayload(initialAction, initialPayloadText));
  const [notice, setNotice] = useState<Notice | null>(null);
  const [busyKey, setBusyKey] = useState("");
  const [result, setResult] = useState<HubRemoteCallResponse | null>(null);
  const [resultError, setResultError] = useState("");
  const [history, setHistory] = useState<RemoteHistoryItem[]>([]);
  const [pending, startTransition] = useTransition();

  const onlineDevices = useMemo(
    () => devices.filter((item) => item.status === "online"),
    [devices]
  );

  async function refreshDevices() {
    setBusyKey("refresh-remote-devices");
    setNotice({ tone: "info", text: "正在刷新设备列表..." });
    try {
      const response = await fetch("/api/hub/devices", { cache: "no-store" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || "刷新设备失败");
      }
      setDevices(payload.devices || []);
      setNotice({ tone: "success", text: "设备列表已刷新" });
    } catch (error) {
      setNotice({ tone: "error", text: error instanceof Error ? error.message : "刷新设备失败" });
    } finally {
      setBusyKey("");
    }
  }

  function applyPreset(value: string) {
    const preset = PRESET_ACTIONS.find((item) => item.value === value);
    setAction(value);
    if (preset) {
      setPayloadText(preset.payload);
    }
  }

  async function submitRemoteCall() {
    let parsedPayload: unknown = {};
    const trimmedPayload = payloadText.trim();
    if (trimmedPayload) {
      try {
        parsedPayload = JSON.parse(trimmedPayload);
      } catch {
        throw new Error("请求负载不是合法 JSON");
      }
    }

    const body = {
      client_id: selectedClientId.trim() || undefined,
      action: action.trim(),
      data: parsedPayload
    };

    const response = await fetch("/api/hub/remote-call", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    const text = await response.text();
    let payload: Record<string, unknown> = {};
    try {
      payload = text ? JSON.parse(text) : {};
    } catch {
      payload = { message: text };
    }

    if (!response.ok) {
      throw new Error(String(payload.error || payload.message || "远程调用失败"));
    }

    const remoteResponse = payload as HubRemoteCallResponse;
    return remoteResponse;
  }

  function handleSubmit() {
    if (!action.trim()) {
      setNotice({ tone: "error", text: "Action 不能为空" });
      return;
    }

    startTransition(async () => {
      setBusyKey("submit-remote-call");
      setResult(null);
      setResultError("");
      setNotice({ tone: "info", text: `正在执行 ${action} ...` });

      try {
        const remoteResponse = await submitRemoteCall();
        setResult(remoteResponse);
        setNotice({
          tone: remoteResponse.success === false ? "info" : "success",
          text: remoteResponse.success === false ? (remoteResponse.error || "远程调用返回失败") : "远程调用执行完成"
        });
        appendHistory({
          success: remoteResponse.success !== false,
          response: remoteResponse,
          payloadText
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "远程调用失败";
        setResultError(message);
        setNotice({ tone: "error", text: message });
        appendHistory({
          success: false,
          errorMessage: message,
          payloadText
        });
      } finally {
        setBusyKey("");
      }
    });
  }

  function appendHistory(item: Pick<RemoteHistoryItem, "success" | "response" | "errorMessage" | "payloadText">) {
    const clientId = selectedClientId.trim() || autoDeviceLabel(devices);
    setHistory((current) => [
      {
        id: `${Date.now()}-${current.length}`,
        action,
        clientId,
        createdAt: new Date().toISOString(),
        ...item
      },
      ...current
    ].slice(0, 8));
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-4">
        <MetricCard label="在线设备" value={String(onlineDevices.length)} detail="可直接执行远程调用" />
        <MetricCard label="全部设备" value={String(devices.length)} detail="已绑定到当前账号" />
        <MetricCard label="默认选择" value={selectedClientId || "自动"} detail="为空时由 Hub 自动选择" />
        <MetricCard label="最近调用" value={history[0] ? formatTimeAgo(history[0].createdAt) : "暂无"} detail="本页会话内记录" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_0.95fr]">
        <section className="rounded-[28px] border border-[var(--border)] bg-[var(--surface-soft)] p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="m-0 text-xl font-semibold">发起远程调用</h2>
              <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
                这里直接调用 Hub 的 `/api/remoteCall`。支持指定设备，也支持留空让 Hub 自动挑选在线且能力匹配的终端。
              </p>
            </div>
            <button
              type="button"
              onClick={refreshDevices}
              disabled={pending || busyKey === "refresh-remote-devices"}
              className="rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm text-[var(--text)] transition hover:border-[var(--primary)] hover:text-[var(--primary)] disabled:opacity-60"
            >
              {busyKey === "refresh-remote-devices" ? "刷新中..." : "刷新设备"}
            </button>
          </div>

          {notice ? <NoticeBar notice={notice} /> : null}

          <div className="mt-5 grid gap-4">
            <Field>
              <label className="text-sm font-medium text-[var(--text)]">目标设备</label>
              <select
                value={selectedClientId}
                onChange={(event) => setSelectedClientId(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm text-[var(--text)] outline-none transition focus:border-[var(--primary)]"
              >
                <option value="">自动选择在线设备</option>
                {onlineDevices.map((device) => (
                  <option key={device.id} value={device.id}>
                    {(device.display_name || device.hostname || device.id)} · {device.id}
                  </option>
                ))}
              </select>
            </Field>

            <Field>
              <label className="text-sm font-medium text-[var(--text)]">动作</label>
              <div className="mt-2 flex flex-wrap gap-2">
                {PRESET_ACTIONS.map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => applyPreset(preset.value)}
                    className={`rounded-full px-4 py-2 text-sm transition ${
                      action === preset.value
                        ? "bg-[var(--primary)] text-white"
                        : "border border-[var(--border)] bg-white text-[var(--text)] hover:border-[var(--primary)] hover:text-[var(--primary)]"
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
              <input
                value={action}
                onChange={(event) => setAction(event.target.value)}
                placeholder="例如 api_call / search_channels / download_video"
                className="mt-3 w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm text-[var(--text)] outline-none transition focus:border-[var(--primary)]"
              />
            </Field>

            <Field>
              <label className="text-sm font-medium text-[var(--text)]">请求负载 JSON</label>
              <textarea
                value={payloadText}
                onChange={(event) => setPayloadText(event.target.value)}
                rows={12}
                spellCheck={false}
                className="mt-2 w-full rounded-[24px] border border-[var(--border)] bg-white px-4 py-4 font-mono text-sm leading-6 text-[var(--text)] outline-none transition focus:border-[var(--primary)]"
              />
            </Field>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={pending || busyKey === "submit-remote-call"}
                className="rounded-full bg-[var(--primary)] px-5 py-3 text-sm text-white transition hover:bg-[var(--primary-strong)] disabled:opacity-60"
              >
                {busyKey === "submit-remote-call" ? "执行中..." : "执行调用"}
              </button>
            </div>
          </div>
        </section>

        <section className="rounded-[28px] border border-[var(--border)] bg-[var(--surface-soft)] p-5">
          <div>
            <h2 className="m-0 text-xl font-semibold">调用结果</h2>
            <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
              这里展示远程调用直接返回的结果。成功时保留 `request_id / success / data`，失败时展示 Hub 返回的错误信息。
            </p>
          </div>

          <div className="mt-5 space-y-4">
            {result ? <ResultBlock title="Response" value={result} /> : null}
            {resultError ? <ResultBlock title="Error" value={{ error: resultError }} tone="danger" /> : null}
            {!result && !resultError ? (
              <EmptyHint text="执行一次远程调用后，结果会显示在这里。" />
            ) : null}
          </div>
        </section>
      </div>

      <section className="rounded-[28px] border border-[var(--border)] bg-[var(--surface-soft)] p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="m-0 text-xl font-semibold">最近调用记录</h2>
          <span className="text-sm text-[var(--muted)]">仅保留本页会话内最近 8 条</span>
        </div>
        <div className="space-y-3">
          {history.map((item) => (
            <article key={item.id} className="rounded-[24px] border border-[var(--border)] bg-white p-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="m-0 text-lg font-semibold">{item.action}</h3>
                    <StatusPill label={item.success ? "success" : "failed"} tone={item.success ? "good" : "danger"} />
                  </div>
                  <div className="mt-2 font-mono text-xs text-[var(--muted)]">{item.clientId}</div>
                  <pre className="mt-4 overflow-x-auto rounded-2xl bg-[var(--surface-soft)] p-3 text-xs leading-6 text-[var(--text)]">
                    {formatJSONLike(item.payloadText)}
                  </pre>
                </div>
                <div className="lg:w-[360px]">
                  <div className="mb-3 text-right text-xs text-[var(--muted)]">{formatTimeAgo(item.createdAt)}</div>
                  <pre className="overflow-x-auto rounded-2xl bg-[var(--surface-soft)] p-3 text-xs leading-6 text-[var(--text)]">
                    {formatJSONLike(item.errorMessage ? JSON.stringify({ error: item.errorMessage }) : JSON.stringify(item.response ?? {}, null, 2))}
                  </pre>
                </div>
              </div>
            </article>
          ))}
          {history.length === 0 ? <EmptyHint text="当前还没有远程调用记录。" /> : null}
        </div>
      </section>
    </div>
  );
}

function Field({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>;
}

function MetricCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface-soft)] p-5">
      <div className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">{label}</div>
      <div className="mt-3 text-3xl font-semibold">{value}</div>
      <div className="mt-3 text-sm text-[var(--muted)]">{detail}</div>
    </div>
  );
}

function ResultBlock({
  title,
  value,
  tone = "default"
}: {
  title: string;
  value: unknown;
  tone?: "default" | "danger";
}) {
  return (
    <section className="rounded-[24px] border border-[var(--border)] bg-white p-4">
      <div className={`text-sm font-medium ${tone === "danger" ? "text-[var(--danger)]" : "text-[var(--text)]"}`}>{title}</div>
      <pre className="mt-3 overflow-x-auto rounded-2xl bg-[var(--surface-soft)] p-4 text-xs leading-6 text-[var(--text)]">
        {formatJSONLike(JSON.stringify(value, null, 2))}
      </pre>
    </section>
  );
}

function NoticeBar({ notice }: { notice: Notice }) {
  const toneClass =
    notice.tone === "success"
      ? "border-[var(--primary)]/25 bg-[var(--primary)]/8 text-[var(--primary)]"
      : notice.tone === "error"
        ? "border-[var(--danger)]/25 bg-[var(--danger)]/8 text-[var(--danger)]"
        : "border-[var(--accent)]/30 bg-[var(--accent)]/12 text-[var(--text)]";

  return <div className={`mt-5 rounded-2xl border px-4 py-3 text-sm ${toneClass}`}>{notice.text}</div>;
}

function StatusPill({
  label,
  tone
}: {
  label: string;
  tone: "good" | "danger";
}) {
  const className =
    tone === "good"
      ? "bg-[var(--primary)]/10 text-[var(--primary)]"
      : "bg-rose-100 text-rose-700";

  return <span className={`rounded-full px-3 py-1 text-xs font-medium ${className}`}>{label}</span>;
}

function EmptyHint({ text }: { text: string }) {
  return <div className="rounded-2xl border border-dashed border-[var(--border)] px-4 py-6 text-sm text-[var(--muted)]">{text}</div>;
}

function formatJSONLike(value: string): string {
  try {
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch {
    return value;
  }
}

function autoDeviceLabel(devices: HubClient[]): string {
  const online = devices.find((item) => item.status === "online");
  return online?.id || "auto-select";
}

function resolveInitialPayload(initialAction: string, initialPayloadText: string): string {
  if (initialPayloadText.trim()) {
    return initialPayloadText;
  }
  const preset = PRESET_ACTIONS.find((item) => item.value === initialAction);
  return preset?.payload || PRESET_ACTIONS[0].payload;
}
