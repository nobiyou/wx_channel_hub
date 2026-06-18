"use client";

import { useMemo, useState, useTransition } from "react";

import { formatDateTime, formatTimeAgo } from "@/lib/format";
import type { HubTask, HubTaskDetail } from "@/lib/hub";

type TaskConsoleProps = {
  initialTasks: HubTask[];
};

type Notice = {
  tone: "success" | "error" | "info";
  text: string;
};

export function TaskConsole({ initialTasks }: TaskConsoleProps) {
  const [tasks, setTasks] = useState(initialTasks);
  const [selectedTask, setSelectedTask] = useState<HubTaskDetail | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [busyKey, setBusyKey] = useState("");
  const [pending, startTransition] = useTransition();

  const stats = useMemo(() => {
    const success = tasks.filter((item) => item.status === "success" || item.status === "done").length;
    const failed = tasks.filter((item) => item.status === "failed" || item.status === "timeout").length;
    return {
      total: tasks.length,
      success,
      failed,
      pending: Math.max(tasks.length - success - failed, 0)
    };
  }, [tasks]);

  async function refreshTasks() {
    setBusyKey("refresh");
    setNotice({ tone: "info", text: "正在刷新任务列表..." });
    try {
      const response = await fetch("/api/hub/tasks", { cache: "no-store" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || "刷新任务列表失败");
      }
      setTasks(payload.tasks || []);
      setNotice({ tone: "success", text: "任务列表已刷新" });
    } catch (error) {
      setNotice({ tone: "error", text: error instanceof Error ? error.message : "刷新任务列表失败" });
    } finally {
      setBusyKey("");
    }
  }

  async function loadTaskDetail(taskId: number) {
    const response = await fetch(`/api/hub/tasks/detail?id=${taskId}`, { cache: "no-store" });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.error || "读取任务详情失败");
    }
    return payload.task as HubTaskDetail;
  }

  function handleInspect(task: HubTask) {
    startTransition(async () => {
      setBusyKey(`inspect:${task.id}`);
      setNotice({ tone: "info", text: `正在读取任务 #${task.id} 详情...` });
      try {
        const detail = await loadTaskDetail(task.id);
        setSelectedTask(detail);
        setNotice({ tone: "success", text: `任务 #${task.id} 详情已载入` });
      } catch (error) {
        setNotice({ tone: "error", text: error instanceof Error ? error.message : "读取任务详情失败" });
      } finally {
        setBusyKey("");
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-4">
        <TaskMetric title="全部任务" value={String(stats.total)} detail="当前账号可见任务" />
        <TaskMetric title="成功 / 完成" value={String(stats.success)} detail="status = success 或 done" />
        <TaskMetric title="失败 / 超时" value={String(stats.failed)} detail="status = failed 或 timeout" />
        <TaskMetric title="进行中 / 其他" value={String(stats.pending)} detail="pending / running / unknown" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <section className="rounded-[28px] border border-[var(--border)] bg-[var(--surface-soft)] p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="m-0 text-xl font-semibold">任务列表</h2>
              <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
                先把 Hub 已记录的任务流转、状态和终端归属接到站点里；点击卡片可查看原始 payload/result。
              </p>
            </div>
            <button
              type="button"
              onClick={refreshTasks}
              disabled={pending || busyKey === "refresh"}
              className="rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm text-[var(--text)] transition hover:border-[var(--primary)] hover:text-[var(--primary)] disabled:opacity-60"
            >
              {busyKey === "refresh" ? "刷新中..." : "刷新列表"}
            </button>
          </div>

          {notice ? <NoticeBar notice={notice} /> : null}

          <div className="mt-5 space-y-4">
            {tasks.map((task) => {
              const isSelected = selectedTask?.id === task.id;
              const isInspecting = busyKey === `inspect:${task.id}`;

              return (
                <button
                  key={task.id}
                  type="button"
                  onClick={() => handleInspect(task)}
                  disabled={pending}
                  className={`block w-full rounded-[24px] border p-4 text-left transition ${
                    isSelected
                      ? "border-[var(--primary)] bg-white shadow-[0_10px_30px_rgba(31,106,59,0.08)]"
                      : "border-[var(--border)] bg-white hover:border-[var(--primary)]/40"
                  } disabled:opacity-70`}
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="m-0 text-lg font-semibold">#{task.id} · {task.type || "unknown"}</h3>
                        <StatusPill label={task.status || "unknown"} tone={getTaskTone(task.status)} />
                      </div>
                      <div className="mt-2 font-mono text-xs text-[var(--muted)]">{task.node_id || "未关联终端"}</div>
                      <div className="mt-4 grid gap-3 text-sm text-[var(--muted)] md:grid-cols-2">
                        <div>创建：{formatTimeAgo(task.created_at)}</div>
                        <div>更新：{formatTimeAgo(task.updated_at)}</div>
                      </div>
                    </div>

                    <div className="text-right text-sm text-[var(--muted)]">
                      <div>{isInspecting ? "读取详情中..." : "查看详情"}</div>
                      <div className="mt-2 text-xs">{formatDateTime(task.created_at)}</div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {tasks.length === 0 ? (
            <div className="mt-5 rounded-[24px] border border-dashed border-[var(--border)] px-5 py-10 text-sm text-[var(--muted)]">
              当前没有读到任务记录。
            </div>
          ) : null}
        </section>

        <section className="rounded-[28px] border border-[var(--border)] bg-[var(--surface-soft)] p-5">
          <div>
            <h2 className="m-0 text-xl font-semibold">任务详情</h2>
            <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
              这里展示 Hub 后端记录的原始任务数据，便于判断是远程调用失败、结果为空，还是客户端执行后返回了错误。
            </p>
          </div>

          {selectedTask ? (
            <div className="mt-5 space-y-4">
              <div className="rounded-[24px] border border-[var(--border)] bg-white p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="m-0 text-lg font-semibold">#{selectedTask.id} · {selectedTask.type || "unknown"}</h3>
                  <StatusPill label={selectedTask.status || "unknown"} tone={getTaskTone(selectedTask.status)} />
                </div>
                <div className="mt-4 grid gap-3 text-sm text-[var(--muted)] md:grid-cols-2">
                  <div>终端：{selectedTask.node_id || "未关联终端"}</div>
                  <div>用户：{selectedTask.user_id ?? "-"}</div>
                  <div>创建时间：{formatDateTime(selectedTask.created_at)}</div>
                  <div>更新时间：{formatDateTime(selectedTask.updated_at)}</div>
                </div>
              </div>

              <JsonBlock title="Payload" value={selectedTask.payload} emptyText="没有记录 payload。" />
              <JsonBlock title="Result" value={selectedTask.result} emptyText="没有记录 result。" />
              <JsonBlock title="Error" value={selectedTask.error} emptyText="没有记录 error。" tone="danger" />
            </div>
          ) : (
            <div className="mt-5 rounded-[24px] border border-dashed border-[var(--border)] px-5 py-10 text-sm text-[var(--muted)]">
              从左侧选择一条任务后，这里会展示详情。
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function TaskMetric({ title, value, detail }: { title: string; value: string; detail: string }) {
  return (
    <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface-soft)] p-5">
      <div className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">{title}</div>
      <div className="mt-3 text-3xl font-semibold">{value}</div>
      <div className="mt-3 text-sm text-[var(--muted)]">{detail}</div>
    </div>
  );
}

function JsonBlock({
  title,
  value,
  emptyText,
  tone = "default"
}: {
  title: string;
  value?: string;
  emptyText: string;
  tone?: "default" | "danger";
}) {
  return (
    <section className="rounded-[24px] border border-[var(--border)] bg-white p-4">
      <div className={`text-sm font-medium ${tone === "danger" ? "text-[var(--danger)]" : "text-[var(--text)]"}`}>
        {title}
      </div>
      <pre className="mt-3 overflow-x-auto rounded-2xl bg-[var(--surface-soft)] p-4 text-xs leading-6 text-[var(--text)]">
        {value && value.trim().length > 0 ? formatJSONLike(value) : emptyText}
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

function getTaskTone(status?: string): "good" | "warn" | "danger" | "muted" {
  switch (status) {
    case "success":
    case "done":
      return "good";
    case "failed":
    case "timeout":
      return "danger";
    case "pending":
    case "running":
      return "warn";
    default:
      return "muted";
  }
}

function formatJSONLike(value: string): string {
  try {
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch {
    return value;
  }
}
