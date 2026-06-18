"use client";

import { useMemo, useState, useTransition } from "react";

import { formatDateTime, formatTimeAgo } from "@/lib/format";
import type { HubBrowseRecord, HubClient, HubDownloadRecord, HubPagedRecords } from "@/lib/hub";

type RecordsConsoleProps = {
  initialDevices: HubClient[];
  initialBrowse: HubPagedRecords<HubBrowseRecord>;
  initialDownload: HubPagedRecords<HubDownloadRecord>;
};

type Notice = {
  tone: "success" | "error" | "info";
  text: string;
};

export function RecordsConsole({ initialDevices, initialBrowse, initialDownload }: RecordsConsoleProps) {
  const [devices, setDevices] = useState(initialDevices);
  const [selectedMachineId, setSelectedMachineId] = useState("");
  const [browseData, setBrowseData] = useState(initialBrowse);
  const [downloadData, setDownloadData] = useState(initialDownload);
  const [activeTab, setActiveTab] = useState<"browse" | "download">("browse");
  const [notice, setNotice] = useState<Notice | null>(null);
  const [busyKey, setBusyKey] = useState("");
  const [pending, startTransition] = useTransition();

  const currentPage = activeTab === "browse" ? browseData.page : downloadData.page;
  const totalItems = activeTab === "browse" ? browseData.total : downloadData.total;
  const pageSize = activeTab === "browse" ? browseData.size : downloadData.size;

  const onlineDevices = useMemo(
    () => devices.filter((item) => item.status === "online"),
    [devices]
  );

  async function refreshDevices() {
    try {
      const response = await fetch("/api/hub/devices", { cache: "no-store" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || "刷新设备失败");
      }
      setDevices(payload.devices || []);
    } catch {
      // 页面核心能力不是设备刷新，失败时不覆盖主要记录流程。
    }
  }

  async function loadBrowse(page: number, machineId: string) {
    const search = new URLSearchParams({
      page: String(page),
      page_size: String(browseData.size || 20)
    });
    if (machineId) {
      search.set("machine_id", machineId);
    }
    const response = await fetch(`/api/hub/records/browse?${search.toString()}`, { cache: "no-store" });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.error || "读取浏览记录失败");
    }
    return payload.data as HubPagedRecords<HubBrowseRecord>;
  }

  async function loadDownload(page: number, machineId: string) {
    const search = new URLSearchParams({
      page: String(page),
      page_size: String(downloadData.size || 20)
    });
    if (machineId) {
      search.set("machine_id", machineId);
    }
    const response = await fetch(`/api/hub/records/download?${search.toString()}`, { cache: "no-store" });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.error || "读取下载记录失败");
    }
    return payload.data as HubPagedRecords<HubDownloadRecord>;
  }

  function refreshCurrentRecords(targetPage = 1, machineId = selectedMachineId) {
    startTransition(async () => {
      setBusyKey(`${activeTab}:${targetPage}`);
      setNotice({ tone: "info", text: `正在读取${activeTab === "browse" ? "浏览" : "下载"}记录...` });
      try {
        await refreshDevices();
        if (activeTab === "browse") {
          const data = await loadBrowse(targetPage, machineId);
          setBrowseData(data);
        } else {
          const data = await loadDownload(targetPage, machineId);
          setDownloadData(data);
        }
        setNotice({ tone: "success", text: `${activeTab === "browse" ? "浏览" : "下载"}记录已更新` });
      } catch (error) {
        setNotice({ tone: "error", text: error instanceof Error ? error.message : "读取记录失败" });
      } finally {
        setBusyKey("");
      }
    });
  }

  async function copyText(value: string, successText: string) {
    try {
      await navigator.clipboard.writeText(value);
      setNotice({ tone: "success", text: successText });
    } catch {
      setNotice({ tone: "error", text: "复制失败，请检查浏览器权限" });
    }
  }

  function openRemoteDownload(record: HubBrowseRecord) {
    const href = buildRemoteDownloadRoute(record, selectedMachineId);
    window.location.assign(href);
  }

  function handleFilter() {
    refreshCurrentRecords(1, selectedMachineId);
  }

  function handleSwitchTab(tab: "browse" | "download") {
    setActiveTab(tab);
    if (tab === "browse" && browseData.records.length === 0 && !busyKey) {
      refreshCurrentRecords(1, selectedMachineId);
    }
    if (tab === "download" && downloadData.records.length === 0 && !busyKey) {
      refreshCurrentRecords(1, selectedMachineId);
    }
  }

  const maxPage = Math.max(Math.ceil(totalItems / Math.max(pageSize, 1)), 1);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-4">
        <MetricCard label="浏览记录" value={String(browseData.total)} detail="当前筛选下总数" />
        <MetricCard label="下载记录" value={String(downloadData.total)} detail="当前筛选下总数" />
        <MetricCard label="在线设备" value={String(onlineDevices.length)} detail="可用于筛选设备" />
        <MetricCard label="当前筛选" value={selectedMachineId || "全部"} detail="machine_id 维度" />
      </div>

      <section className="rounded-[28px] border border-[var(--border)] bg-[var(--surface-soft)] p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="m-0 text-xl font-semibold">记录中心</h2>
            <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
              这里把 Hub 端已同步上来的浏览记录和下载记录接成可用页面，先支持按设备筛选和分页查看。
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <select
              value={selectedMachineId}
              onChange={(event) => setSelectedMachineId(event.target.value)}
              className="rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm text-[var(--text)] outline-none transition focus:border-[var(--primary)]"
            >
              <option value="">全部设备</option>
              {devices.map((device) => (
                <option key={device.id} value={device.id}>
                  {(device.display_name || device.hostname || device.id)} · {device.id}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleFilter}
              disabled={pending}
              className="rounded-full bg-[var(--primary)] px-5 py-3 text-sm text-white transition hover:bg-[var(--primary-strong)] disabled:opacity-60"
            >
              应用筛选
            </button>
          </div>
        </div>

        {notice ? <NoticeBar notice={notice} /> : null}

        <div className="mt-5 flex flex-wrap gap-2">
          <TabButton label="浏览记录" active={activeTab === "browse"} onClick={() => handleSwitchTab("browse")} />
          <TabButton label="下载记录" active={activeTab === "download"} onClick={() => handleSwitchTab("download")} />
        </div>

        <div className="mt-5 space-y-4">
          {activeTab === "browse"
            ? browseData.records.map((record) => (
                <BrowseRecordCard
                  key={record.id}
                  record={record}
                  onCopyPlayURL={(url) => void copyText(url, "播放链接已复制")}
                  onOpenRemoteDownload={() => openRemoteDownload(record)}
                />
              ))
            : downloadData.records.map((record) => (
                <DownloadRecordCard
                  key={record.id}
                  record={record}
                  onCopyFilePath={(path) => void copyText(path, "文件路径已复制")}
                />
              ))}

          {activeTab === "browse" && browseData.records.length === 0 ? (
            <EmptyHint text="当前筛选下没有浏览记录。" />
          ) : null}
          {activeTab === "download" && downloadData.records.length === 0 ? (
            <EmptyHint text="当前筛选下没有下载记录。" />
          ) : null}
        </div>

        <div className="mt-6 flex flex-col gap-3 border-t border-[var(--border)] pt-5 md:flex-row md:items-center md:justify-between">
          <div className="text-sm text-[var(--muted)]">
            第 {currentPage} / {maxPage} 页，当前共 {totalItems} 条
          </div>
          <div className="flex flex-wrap gap-2">
            <PagerButton
              label="上一页"
              onClick={() => refreshCurrentRecords(Math.max(currentPage - 1, 1))}
              disabled={pending || currentPage <= 1}
            />
            <PagerButton
              label="下一页"
              onClick={() => refreshCurrentRecords(Math.min(currentPage + 1, maxPage))}
              disabled={pending || currentPage >= maxPage}
            />
          </div>
        </div>
      </section>
    </div>
  );
}

function BrowseRecordCard({
  record,
  onCopyPlayURL,
  onOpenRemoteDownload
}: {
  record: HubBrowseRecord;
  onCopyPlayURL: (url: string) => void;
  onOpenRemoteDownload: () => void;
}) {
  const playURL = buildPlayableVideoURL(record.video_url, record.decrypt_key);
  return (
    <article className="rounded-[24px] border border-[var(--border)] bg-white p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="m-0 text-lg font-semibold">{record.title || "未命名视频"}</h3>
            {record.file_format ? <Tag>{record.file_format}</Tag> : null}
            {record.resolution ? <Tag>{record.resolution}</Tag> : null}
          </div>
          <div className="mt-2 text-sm text-[var(--muted)]">
            作者：{record.author || "未知"} {record.author_id ? `· ${record.author_id}` : ""}
          </div>
          <div className="mt-4 grid gap-3 text-sm text-[var(--muted)] md:grid-cols-2 xl:grid-cols-3">
            <div>浏览时间：{formatTimeAgo(record.browse_time)}</div>
            <div>时长：{formatDuration(record.duration)}</div>
            <div>大小：{formatBytes(record.size)}</div>
            <div>点赞 / 评论：{record.like_count ?? 0} / {record.comment_count ?? 0}</div>
            <div>收藏 / 转发：{record.fav_count ?? 0} / {record.forward_count ?? 0}</div>
            <div>同步时间：{formatTimeAgo(record.synced_at)}</div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {playURL ? (
              <>
                <ActionButton label="播放" onClick={() => window.open(playURL, "_blank", "noopener,noreferrer")} />
                <ActionButton label="复制播放链接" onClick={() => onCopyPlayURL(playURL)} />
              </>
            ) : null}
            {record.page_url ? (
              <ActionButton label="打开来源页" onClick={() => window.open(record.page_url, "_blank", "noopener,noreferrer")} />
            ) : null}
            {record.video_url ? (
              <ActionButton label="原始链接" onClick={() => window.open(record.video_url, "_blank", "noopener,noreferrer")} />
            ) : null}
            {record.video_url ? (
              <ActionButton label="前往远程下载" onClick={onOpenRemoteDownload} />
            ) : null}
          </div>
          {record.page_url ? (
            <div className="mt-3 break-all font-mono text-xs text-[var(--muted)]">{record.page_url}</div>
          ) : null}
        </div>
        <div className="text-right text-xs text-[var(--muted)]">
          <div>{record.machine_id || "unknown"}</div>
          <div className="mt-2">{formatDateTime(record.browse_time)}</div>
        </div>
      </div>
    </article>
  );
}

function DownloadRecordCard({
  record,
  onCopyFilePath
}: {
  record: HubDownloadRecord;
  onCopyFilePath: (path: string) => void;
}) {
  return (
    <article className="rounded-[24px] border border-[var(--border)] bg-white p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="m-0 text-lg font-semibold">{record.title || "未命名视频"}</h3>
            <StatusPill label={record.status || "unknown"} tone={getDownloadTone(record.status)} />
            {record.format ? <Tag>{record.format}</Tag> : null}
            {record.resolution ? <Tag>{record.resolution}</Tag> : null}
          </div>
          <div className="mt-2 text-sm text-[var(--muted)]">作者：{record.author || "未知"}</div>
          <div className="mt-4 grid gap-3 text-sm text-[var(--muted)] md:grid-cols-2 xl:grid-cols-3">
            <div>下载时间：{formatTimeAgo(record.download_time)}</div>
            <div>时长：{formatDuration(record.duration)}</div>
            <div>文件大小：{formatBytes(record.file_size)}</div>
            <div>点赞 / 评论：{record.like_count ?? 0} / {record.comment_count ?? 0}</div>
            <div>收藏 / 转发：{record.fav_count ?? 0} / {record.forward_count ?? 0}</div>
            <div>同步时间：{formatTimeAgo(record.synced_at)}</div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {record.file_path ? (
              <ActionButton label="复制文件路径" onClick={() => onCopyFilePath(record.file_path || "")} />
            ) : null}
          </div>
          {record.file_path ? (
            <div className="mt-3 break-all font-mono text-xs text-[var(--muted)]">{record.file_path}</div>
          ) : null}
          {record.error_message ? (
            <div className="mt-3 rounded-2xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{record.error_message}</div>
          ) : null}
        </div>
        <div className="text-right text-xs text-[var(--muted)]">
          <div>{record.machine_id || "unknown"}</div>
          <div className="mt-2">{formatDateTime(record.download_time)}</div>
        </div>
      </div>
    </article>
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

function TabButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-4 py-2 text-sm transition ${
        active
          ? "bg-[var(--primary)] text-white"
          : "border border-[var(--border)] bg-white text-[var(--text)] hover:border-[var(--primary)] hover:text-[var(--primary)]"
      }`}
    >
      {label}
    </button>
  );
}

function PagerButton({ label, onClick, disabled }: { label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm text-[var(--text)] transition hover:border-[var(--primary)] hover:text-[var(--primary)] disabled:opacity-60"
    >
      {label}
    </button>
  );
}

function ActionButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm text-[var(--text)] transition hover:border-[var(--primary)] hover:text-[var(--primary)]"
    >
      {label}
    </button>
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

function EmptyHint({ text }: { text: string }) {
  return <div className="rounded-2xl border border-dashed border-[var(--border)] px-4 py-6 text-sm text-[var(--muted)]">{text}</div>;
}

function Tag({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full bg-[var(--surface-soft)] px-3 py-1 text-xs text-[var(--muted)]">{children}</span>;
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

function getDownloadTone(status?: string): "good" | "warn" | "danger" | "muted" {
  switch (status) {
    case "completed":
    case "success":
      return "good";
    case "failed":
      return "danger";
    case "downloading":
    case "pending":
      return "warn";
    default:
      return "muted";
  }
}

function formatBytes(value?: number): string {
  if (!value || value <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let size = value;
  let index = 0;
  while (size >= 1024 && index < units.length - 1) {
    size /= 1024;
    index += 1;
  }
  return `${size.toFixed(size >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
}

function formatDuration(value?: number): string {
  if (!value || value <= 0) return "0s";
  const total = Math.floor(value);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

function buildPlayableVideoURL(videoURL?: string, decryptKey?: string): string | null {
  if (!videoURL) {
    return null;
  }
  const base = typeof window !== "undefined" ? window.location.origin : "";
  const url = new URL("/api/video/play", base || "http://localhost");
  url.searchParams.set("url", videoURL);
  if (decryptKey) {
    url.searchParams.set("key", decryptKey);
  }
  return url.toString();
}

function buildRemoteDownloadRoute(record: HubBrowseRecord, selectedMachineId: string): string {
  const params = new URLSearchParams();
  params.set("action", "download_video");

  const clientID = (record.machine_id || selectedMachineId || "").trim();
  if (clientID) {
    params.set("client_id", clientID);
  }

  params.set("payload", JSON.stringify(buildRemoteDownloadPayload(record)));
  return `/remote?${params.toString()}`;
}

function buildRemoteDownloadPayload(record: HubBrowseRecord): Record<string, unknown> {
  return {
    videoUrl: record.video_url || "",
    videoId: record.id || "",
    title: record.title || "",
    author: record.author || "未知作者",
    sourceUrl: record.page_url || "",
    key: record.decrypt_key || "",
    resolution: record.resolution || "",
    fileFormat: record.file_format || "",
    likeCount: record.like_count ?? 0,
    commentCount: record.comment_count ?? 0,
    forwardCount: record.forward_count ?? 0,
    favCount: record.fav_count ?? 0
  };
}
