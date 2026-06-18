"use client";

import { useMemo, useState, useTransition } from "react";

import { formatDateTime, formatTimeAgo } from "@/lib/format";
import type { HubSyncHistory, HubSyncStatus } from "@/lib/hub";

type SyncConsoleProps = {
  initialStatuses: HubSyncStatus[];
};

type Notice = {
  tone: "success" | "error" | "info";
  text: string;
};

export function SyncConsole({ initialStatuses }: SyncConsoleProps) {
  const [statuses, setStatuses] = useState(initialStatuses);
  const [selectedMachineId, setSelectedMachineId] = useState("");
  const [history, setHistory] = useState<HubSyncHistory[]>([]);
  const [historyLoadedFor, setHistoryLoadedFor] = useState("");
  const [notice, setNotice] = useState<Notice | null>(null);
  const [busyKey, setBusyKey] = useState("");
  const [pending, startTransition] = useTransition();

  const stats = useMemo(() => {
    const success = statuses.filter((item) => item.last_sync_status === "success").length;
    const failed = statuses.filter((item) => item.last_sync_status === "failed").length;
    const inProgress = statuses.filter((item) => item.last_sync_status === "in_progress").length;
    return {
      total: statuses.length,
      success,
      failed,
      inProgress
    };
  }, [statuses]);

  async function refreshStatuses() {
    setBusyKey("refresh-sync");
    setNotice({ tone: "info", text: "正在刷新同步状态..." });
    try {
      const response = await fetch("/api/hub/sync/status", { cache: "no-store" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || "刷新同步状态失败");
      }
      setStatuses(payload.statuses || []);
      setNotice({ tone: "success", text: "同步状态已刷新" });
    } catch (error) {
      setNotice({ tone: "error", text: error instanceof Error ? error.message : "刷新同步状态失败" });
    } finally {
      setBusyKey("");
    }
  }

  async function triggerSync(machineId?: string) {
    const response = await fetch("/api/hub/sync/trigger", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(machineId ? { machine_id: machineId } : { sync_all: true })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.error || payload.message || "触发同步失败");
    }
    return payload;
  }

  async function loadHistory(machineId: string) {
    const response = await fetch(`/api/hub/sync/history/${encodeURIComponent(machineId)}`, { cache: "no-store" });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.error || "读取同步历史失败");
    }
    return payload.history as HubSyncHistory[];
  }

  function handleSelectStatus(machineId: string) {
    startTransition(async () => {
      setBusyKey(`history:${machineId}`);
      setSelectedMachineId(machineId);
      setNotice({ tone: "info", text: `正在读取设备 ${machineId} 的同步历史...` });
      try {
        const nextHistory = await loadHistory(machineId);
        setHistory(nextHistory || []);
        setHistoryLoadedFor(machineId);
        setNotice({ tone: "success", text: `设备 ${machineId} 的同步历史已载入` });
      } catch (error) {
        setHistory([]);
        setHistoryLoadedFor("");
        setNotice({ tone: "error", text: error instanceof Error ? error.message : "读取同步历史失败" });
      } finally {
        setBusyKey("");
      }
    });
  }

  function handleTriggerOne(machineId: string) {
    startTransition(async () => {
      setBusyKey(`trigger:${machineId}`);
      setNotice({ tone: "info", text: `正在触发设备 ${machineId} 的同步检查...` });
      try {
        const payload = await triggerSync(machineId);
        setNotice({ tone: "success", text: payload.message || `已触发设备 ${machineId} 的同步检查` });
        await refreshStatuses();
      } catch (error) {
        setNotice({ tone: "error", text: error instanceof Error ? error.message : "触发同步失败" });
      } finally {
        setBusyKey("");
      }
    });
  }

  function handleTriggerAll() {
    startTransition(async () => {
      setBusyKey("trigger-all");
      setNotice({ tone: "info", text: "正在触发全部设备的同步检查..." });
      try {
        const payload = await triggerSync();
        setNotice({ tone: "success", text: payload.message || "已触发全部设备同步检查" });
        await refreshStatuses();
      } catch (error) {
        setNotice({ tone: "error", text: error instanceof Error ? error.message : "触发全部同步失败" });
      } finally {
        setBusyKey("");
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-4">
        <MetricCard label="设备状态" value={String(stats.total)} detail="已记录同步状态的设备数" />
        <MetricCard label="最近成功" value={String(stats.success)} detail="last_sync_status = success" />
        <MetricCard label="最近失败" value={String(stats.failed)} detail="last_sync_status = failed" />
        <MetricCard label="进行中" value={String(stats.inProgress)} detail="last_sync_status = in_progress" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <section className="rounded-[28px] border border-[var(--border)] bg-[var(--surface-soft)] p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="m-0 text-xl font-semibold">同步状态</h2>
              <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
                这里展示每台设备最近一次浏览/下载同步情况，并支持手动触发检查。
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <ToolbarButton
                label={busyKey === "refresh-sync" ? "刷新中..." : "刷新状态"}
                onClick={refreshStatuses}
                disabled={pending || busyKey === "refresh-sync"}
              />
              <ToolbarButton
                label={busyKey === "trigger-all" ? "触发中..." : "检查全部"}
                onClick={handleTriggerAll}
                disabled={pending || busyKey === "trigger-all"}
                primary
              />
            </div>
          </div>

          {notice ? <NoticeBar notice={notice} /> : null}

          <div className="mt-5 space-y-4">
            {statuses.map((status) => {
              const selected = selectedMachineId === status.machine_id;
              const triggerBusy = busyKey === `trigger:${status.machine_id}`;
              const historyBusy = busyKey === `history:${status.machine_id}`;
              return (
                <article
                  key={status.machine_id}
                  className={`rounded-[24px] border p-4 ${selected ? "border-[var(--primary)] bg-white" : "border-[var(--border)] bg-white"}`}
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <button
                      type="button"
                      onClick={() => handleSelectStatus(status.machine_id)}
                      disabled={pending}
                      className="min-w-0 flex-1 text-left disabled:opacity-70"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="m-0 text-lg font-semibold">{status.device_name || status.machine_id}</h3>
                        <StatusPill label={status.last_sync_status || "unknown"} tone={getSyncTone(status.last_sync_status)} />
                      </div>
                      <div className="mt-2 font-mono text-xs text-[var(--muted)]">{status.machine_id}</div>
                      <div className="mt-4 grid gap-3 text-sm text-[var(--muted)] md:grid-cols-2">
                        <div>浏览记录：{status.browse_record_count ?? 0}</div>
                        <div>下载记录：{status.download_record_count ?? 0}</div>
                        <div>浏览同步：{formatTimeAgo(status.last_browse_sync_time)}</div>
                        <div>下载同步：{formatTimeAgo(status.last_download_sync_time)}</div>
                      </div>
                      {status.last_sync_error ? (
                        <div className="mt-3 rounded-2xl bg-rose-50 px-3 py-2 text-sm text-rose-700">
                          最近错误：{status.last_sync_error}
                        </div>
                      ) : null}
                    </button>

                    <div className="flex flex-col gap-3 lg:w-[220px] lg:items-end">
                      <div className="text-right text-sm text-[var(--muted)]">
                        <div>{historyBusy ? "载入历史中..." : formatTimeAgo(status.updated_at)}</div>
                        <div className="mt-1 text-xs">{formatDateTime(status.updated_at)}</div>
                      </div>
                      <ToolbarButton
                        label={triggerBusy ? "检查中..." : "检查此设备"}
                        onClick={() => handleTriggerOne(status.machine_id)}
                        disabled={pending || triggerBusy}
                        primary
                      />
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          {statuses.length === 0 ? (
            <div className="mt-5 rounded-[24px] border border-dashed border-[var(--border)] px-5 py-10 text-sm text-[var(--muted)]">
              当前还没有同步状态记录。
            </div>
          ) : null}
        </section>

        <section className="rounded-[28px] border border-[var(--border)] bg-[var(--surface-soft)] p-5">
          <div>
            <h2 className="m-0 text-xl font-semibold">同步历史</h2>
            <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
              先展示单设备最近 100 条同步历史，帮助判断是浏览同步还是下载同步在持续失败。
            </p>
          </div>

          {historyLoadedFor ? (
            <div className="mt-5 space-y-3">
              <div className="rounded-[24px] border border-[var(--border)] bg-white px-4 py-3 text-sm text-[var(--muted)]">
                当前设备：<span className="font-mono text-[var(--text)]">{historyLoadedFor}</span>
              </div>
              {history.map((item) => (
                <div key={item.id} className="rounded-[24px] border border-[var(--border)] bg-white p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="text-sm font-medium">{item.sync_type || "unknown"}</div>
                    <StatusPill label={item.status || "unknown"} tone={getSyncTone(item.status)} />
                  </div>
                  <div className="mt-3 grid gap-3 text-sm text-[var(--muted)] md:grid-cols-2">
                    <div>同步记录：{item.records_synced ?? 0}</div>
                    <div>同步时间：{formatTimeAgo(item.sync_time)}</div>
                  </div>
                  <div className="mt-3 text-xs text-[var(--muted)]">{formatDateTime(item.sync_time)}</div>
                  {item.error_message ? (
                    <div className="mt-3 rounded-2xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{item.error_message}</div>
                  ) : null}
                </div>
              ))}
              {history.length === 0 ? (
                <div className="rounded-[24px] border border-dashed border-[var(--border)] px-5 py-10 text-sm text-[var(--muted)]">
                  这台设备暂时没有同步历史。
                </div>
              ) : null}
            </div>
          ) : (
            <div className="mt-5 rounded-[24px] border border-dashed border-[var(--border)] px-5 py-10 text-sm text-[var(--muted)]">
              从左侧选择设备后，这里会展示同步历史。
            </div>
          )}
        </section>
      </div>
    </div>
  );
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

function NoticeBar({ notice }: { notice: Notice }) {
  const toneClass =
    notice.tone === "success"
      ? "border-[var(--primary)]/25 bg-[var(--primary)]/8 text-[var(--primary)]"
      : notice.tone === "error"
        ? "border-[var(--danger)]/25 bg-[var(--danger)]/8 text-[var(--danger)]"
        : "border-[var(--accent)]/30 bg-[var(--accent)]/12 text-[var(--text)]";

  return <div className={`mt-5 rounded-2xl border px-4 py-3 text-sm ${toneClass}`}>{notice.text}</div>;
}

function ToolbarButton({
  label,
  onClick,
  disabled,
  primary = false
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-full px-4 py-2 text-sm transition disabled:opacity-60 ${
        primary
          ? "bg-[var(--primary)] text-white hover:bg-[var(--primary-strong)]"
          : "border border-[var(--border)] bg-white text-[var(--text)] hover:border-[var(--primary)] hover:text-[var(--primary)]"
      }`}
    >
      {label}
    </button>
  );
}

function StatusPill({
  label,
  tone
}: {
  label: string;
  tone: "good" | "warn" | "danger" | "muted";
}) {
  const className =
    tone === "good"
      ? "bg-[var(--primary)]/10 text-[var(--primary)]"
      : tone === "warn"
        ? "bg-amber-100 text-amber-700"
        : tone === "danger"
          ? "bg-rose-100 text-rose-700"
          : "bg-[var(--surface-soft)] text-[var(--muted)]";

  return <span className={`rounded-full px-3 py-1 text-xs font-medium ${className}`}>{label}</span>;
}

function getSyncTone(status?: string): "good" | "warn" | "danger" | "muted" {
  switch (status) {
    case "success":
      return "good";
    case "failed":
      return "danger";
    case "in_progress":
      return "warn";
    default:
      return "muted";
  }
}
