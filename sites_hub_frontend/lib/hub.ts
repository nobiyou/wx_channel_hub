export const HUB_TOKEN_COOKIE = "hub_token";

export class HubConfigError extends Error {
  constructor(message = "HUB_API_BASE is not configured") {
    super(message);
    this.name = "HubConfigError";
  }
}

export class HubUnauthorizedError extends Error {
  constructor(message = "Hub authentication required") {
    super(message);
    this.name = "HubUnauthorizedError";
  }
}

export type HubUser = {
  id?: number;
  email?: string;
  username?: string;
  role?: string;
};

export type HubClient = {
  id: string;
  hostname?: string;
  display_name?: string;
  status?: string;
  version?: string;
  ip?: string;
  port?: number;
  page_path?: string;
  href?: string;
  api_ready?: boolean;
  supports_search?: boolean;
  supports_feed?: boolean;
  supports_profile?: boolean;
  user_id?: number;
  bind_status?: boolean;
  is_locked?: boolean;
  device_group?: string;
  last_seen?: string;
  created_at?: string;
  updated_at?: string;
};

export type HubTask = {
  id: number;
  type?: string;
  node_id?: string;
  status?: string;
  payload?: string;
  result?: string;
  error?: string;
  user_id?: number;
  created_at?: string;
  updated_at?: string;
};

export type HubTaskDetail = HubTask;

export type HubSyncStatus = {
  id?: number;
  machine_id: string;
  device_name?: string;
  last_browse_sync_time?: string;
  last_download_sync_time?: string;
  browse_record_count?: number;
  download_record_count?: number;
  last_sync_status?: string;
  last_sync_error?: string;
  created_at?: string;
  updated_at?: string;
};

export type HubSyncHistory = {
  id: number;
  machine_id: string;
  sync_time?: string;
  sync_type?: string;
  records_synced?: number;
  status?: string;
  error_message?: string;
  created_at?: string;
};

export type HubMetricsSummary = {
  connections?: number;
  connectionsTrend?: number;
  apiCalls?: number;
  apiCallsTrend?: number;
  successRate?: number;
  avgResponseTime?: number;
  responseTimeTrend?: number;
  heartbeatsSent?: number;
  heartbeatsFailed?: number;
  compressionRate?: number;
  bytesSaved?: number;
  detailedMetrics?: Array<{
    name?: string;
    value?: string;
    description?: string;
  }>;
};

export type HubMetricsTimeseries = {
  connections?: {
    labels?: string[];
    values?: number[];
  };
  apiCalls?: {
    labels?: string[];
    success?: number[];
    failed?: number[];
  };
  responseTime?: {
    labels?: string[];
    p50?: number[];
    p95?: number[];
    p99?: number[];
  };
  endpoints?: {
    labels?: string[];
    values?: number[];
  };
};

export type HubWSStats = {
  total_connections?: number;
  total_pings?: number;
  total_pongs?: number;
  total_messages?: number;
  clients?: Array<{
    id?: string;
    hostname?: string;
    version?: string;
    ip?: string;
    connected_at?: string;
    uptime?: string;
    ping_count?: number;
    pong_count?: number;
    avg_latency?: string;
    last_ping_time?: string;
    failure_count?: number;
    messages_sent?: number;
    messages_recv?: number;
  }>;
};

export type HubRemoteCallResponse = {
  request_id?: string;
  success?: boolean;
  data?: unknown;
  error?: string;
};

export type HubBrowseRecord = {
  id: string;
  machine_id?: string;
  title?: string;
  author?: string;
  author_id?: string;
  duration?: number;
  size?: number;
  resolution?: string;
  file_format?: string;
  cover_url?: string;
  video_url?: string;
  decrypt_key?: string;
  browse_time?: string;
  like_count?: number;
  comment_count?: number;
  fav_count?: number;
  forward_count?: number;
  page_url?: string;
  source_created_at?: string;
  source_updated_at?: string;
  synced_at?: string;
  created_at?: string;
  updated_at?: string;
};

export type HubDownloadRecord = {
  id: string;
  machine_id?: string;
  video_id?: string;
  title?: string;
  author?: string;
  cover_url?: string;
  duration?: number;
  file_size?: number;
  file_path?: string;
  format?: string;
  resolution?: string;
  status?: string;
  download_time?: string;
  error_message?: string;
  like_count?: number;
  comment_count?: number;
  forward_count?: number;
  fav_count?: number;
  source_created_at?: string;
  source_updated_at?: string;
  synced_at?: string;
  created_at?: string;
  updated_at?: string;
};

export type HubPagedRecords<T> = {
  records: T[];
  total: number;
  page: number;
  size: number;
};

export type HubSubscription = {
  id: number;
  wx_username?: string;
  wx_nickname?: string;
  wx_signature?: string;
  wx_head_url?: string;
  status?: string;
  video_count?: number;
  last_fetched_at?: string;
  created_at?: string;
  updated_at?: string;
};

export type HubSharedFeedProfile = {
  wx_username?: string;
  wx_nickname?: string;
  wx_head_url?: string;
  wx_signature?: string;
  description?: string;
  object_id?: string;
  video_url?: string;
  origin_video_url?: string;
  cover_url?: string;
};

export type HubDeviceListResponse = {
  code?: number;
  devices?: HubClient[];
  message?: string;
};

export type HubVideo = {
  id: number;
  subscription_id: number;
  object_id?: string;
  object_nonce_id?: string;
  title?: string;
  cover_url?: string;
  description?: string;
  duration?: number;
  width?: number;
  height?: number;
  like_count?: number;
  comment_count?: number;
  video_url?: string;
  decrypt_key?: string;
  published_at?: string;
  created_at?: string;
};

export type HubSubscriptionVideosResponse = {
  code?: number;
  data?: {
    videos?: HubVideo[];
    total?: number;
    page?: number;
  };
  message?: string;
};

export type HubActionResult = {
  code?: number;
  success?: boolean;
  message?: string;
  token?: string;
  data?: Record<string, unknown>;
};

export type HubSharedFeedCompatResponse = {
  code?: number;
  message?: string;
  errCode?: number;
  errMsg?: string;
  data?: {
    errCode?: number;
    errMsg?: string;
    data?: {
      object?: {
        id?: string;
        username?: string;
        nickname?: string;
        headUrl?: string;
        signature?: string;
        objectDesc?: {
          description?: string;
          media?: Array<{
            url?: string;
            coverUrl?: string;
            thumbUrl?: string;
            decodeKey?: string;
          }>;
        };
        contact?: {
          username?: string;
          nickname?: string;
          headUrl?: string;
          signature?: string;
        };
      };
      feedInfo?: {
        videoUrl?: string;
        originVideoUrl?: string;
        description?: string;
        coverUrl?: string;
      };
      authorInfo?: {
        nickname?: string;
        headImgUrl?: string;
      };
    };
    object?: {
      id?: string;
      username?: string;
      nickname?: string;
      headUrl?: string;
      signature?: string;
      objectDesc?: {
        description?: string;
        media?: Array<{
          url?: string;
          coverUrl?: string;
          thumbUrl?: string;
          decodeKey?: string;
        }>;
      };
      contact?: {
        username?: string;
        nickname?: string;
        headUrl?: string;
        signature?: string;
      };
    };
    feedInfo?: {
      videoUrl?: string;
      originVideoUrl?: string;
      description?: string;
      coverUrl?: string;
    };
    authorInfo?: {
      nickname?: string;
      headImgUrl?: string;
    };
  };
};

export type HubDashboardData = {
  clients: HubClient[];
  tasks: HubTask[];
  subscriptions: HubSubscription[];
  metricsSummary: HubMetricsSummary | null;
  metricsTimeseries: HubMetricsTimeseries | null;
  wsStats: HubWSStats | null;
};

function trimSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

export function getHubApiBase(): string {
  const envValue =
    process.env.HUB_API_BASE?.trim() ||
    process.env.NEXT_PUBLIC_HUB_API_BASE?.trim();
  if (envValue) {
    return trimSlash(envValue);
  }
  throw new HubConfigError();
}

export function getBearerTokenFallback(): string | null {
  return process.env.HUB_DEMO_TOKEN?.trim() || process.env.NEXT_PUBLIC_HUB_DEMO_TOKEN?.trim() || null;
}

export async function hubFetch<T>(path: string, init?: RequestInit, token?: string | null): Promise<T> {
  const headers = new Headers(init?.headers || {});
  headers.set("Content-Type", "application/json");

  const bearerToken = token || getBearerTokenFallback();
  if (!bearerToken) {
    throw new HubUnauthorizedError();
  }
  headers.set("Authorization", `Bearer ${bearerToken}`);

  const response = await fetch(`${getHubApiBase()}${path}`, {
    ...init,
    headers,
    cache: "no-store"
  });

  if (response.status === 401) {
    throw new HubUnauthorizedError();
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Hub API ${response.status}: ${text || response.statusText}`);
  }

  return response.json() as Promise<T>;
}

export async function getProfile(token?: string | null): Promise<HubUser> {
  return hubFetch<HubUser>("/api/auth/profile", undefined, token);
}

export async function getDashboardData(token?: string | null): Promise<HubDashboardData> {
  const [clients, tasks, subscriptions, metricsSummary, metricsTimeseries, wsStats] = await Promise.all([
    hubFetch<HubClient[]>("/api/clients", undefined, token),
    hubFetch<{ list?: HubTask[] }>("/api/tasks?offset=0&limit=8", undefined, token),
    hubFetch<{ code?: number; data?: HubSubscription[] }>("/api/subscriptions", undefined, token),
    hubFetch<HubMetricsSummary>("/api/metrics/summary", undefined, token).catch(() => null),
    hubFetch<HubMetricsTimeseries>("/api/metrics/timeseries?range=15m", undefined, token).catch(() => null),
    hubFetch<{ code?: number; data?: HubWSStats }>("/api/ws/stats", undefined, token)
      .then((result) => result.data || null)
      .catch(() => null)
  ]);

  return {
    clients,
    tasks: tasks.list || [],
    subscriptions: subscriptions.data || [],
    metricsSummary,
    metricsTimeseries,
    wsStats
  };
}

export async function getClients(token?: string | null): Promise<HubClient[]> {
  return hubFetch<HubClient[]>("/api/clients", undefined, token);
}

export async function getUserDevices(token?: string | null): Promise<HubClient[]> {
  const result = await hubFetch<HubDeviceListResponse>("/api/device/list", undefined, token);
  return result.devices || [];
}

export async function getTasks(token?: string | null): Promise<HubTask[]> {
  const result = await hubFetch<{ list?: HubTask[] }>("/api/tasks?offset=0&limit=30", undefined, token);
  return result.list || [];
}

export async function getTaskDetail(id: number, token?: string | null): Promise<HubTaskDetail> {
  return hubFetch<HubTaskDetail>(`/api/tasks/detail?id=${id}`, undefined, token);
}

export async function getSyncStatuses(token?: string | null): Promise<HubSyncStatus[]> {
  const result = await hubFetch<{ code?: number; data?: HubSyncStatus[] }>("/api/sync/status", undefined, token);
  return result.data || [];
}

export async function getSyncHistory(machineId: string, token?: string | null): Promise<HubSyncHistory[]> {
  const result = await hubFetch<{ code?: number; data?: HubSyncHistory[] }>(
    `/api/sync/history/${encodeURIComponent(machineId)}`,
    undefined,
    token
  );
  return result.data || [];
}

export async function getBrowseRecords(
  params: { machineId?: string; page?: number; pageSize?: number },
  token?: string | null
): Promise<HubPagedRecords<HubBrowseRecord>> {
  const search = new URLSearchParams();
  if (params.machineId) search.set("machine_id", params.machineId);
  if (params.page) search.set("page", String(params.page));
  if (params.pageSize) search.set("page_size", String(params.pageSize));
  const result = await hubFetch<{ code?: number; data?: HubPagedRecords<HubBrowseRecord> }>(
    `/api/sync/browse?${search.toString()}`,
    undefined,
    token
  );
  return result.data || { records: [], total: 0, page: params.page || 1, size: params.pageSize || 20 };
}

export async function getDownloadRecords(
  params: { machineId?: string; page?: number; pageSize?: number },
  token?: string | null
): Promise<HubPagedRecords<HubDownloadRecord>> {
  const search = new URLSearchParams();
  if (params.machineId) search.set("machine_id", params.machineId);
  if (params.page) search.set("page", String(params.page));
  if (params.pageSize) search.set("page_size", String(params.pageSize));
  const result = await hubFetch<{ code?: number; data?: HubPagedRecords<HubDownloadRecord> }>(
    `/api/sync/download?${search.toString()}`,
    undefined,
    token
  );
  return result.data || { records: [], total: 0, page: params.page || 1, size: params.pageSize || 20 };
}

export async function getSubscriptions(token?: string | null): Promise<HubSubscription[]> {
  const result = await hubFetch<{ code?: number; data?: HubSubscription[] }>("/api/subscriptions", undefined, token);
  return result.data || [];
}

export async function getSubscriptionVideos(
  id: number,
  page = 1,
  token?: string | null
): Promise<HubSubscriptionVideosResponse["data"]> {
  const result = await hubFetch<HubSubscriptionVideosResponse>(
    `/api/subscriptions/${id}/videos?page=${page}`,
    undefined,
    token
  );
  return result.data;
}
