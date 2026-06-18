import { NextResponse } from "next/server";

import { HubUnauthorizedError, hubFetch } from "@/lib/hub";
import { getOptionalHubToken } from "@/lib/session";

export async function GET() {
  const token = await getOptionalHubToken();
  if (!token) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  try {
    const payload = await hubFetch<{ code?: number; data?: unknown }>("/api/ws/stats", undefined, token);
    return NextResponse.json({ stats: payload.data || null });
  } catch (error) {
    if (error instanceof HubUnauthorizedError) {
      return NextResponse.json({ error: "登录已失效" }, { status: 401 });
    }
    return NextResponse.json({ error: "读取 WebSocket 统计失败" }, { status: 500 });
  }
}
