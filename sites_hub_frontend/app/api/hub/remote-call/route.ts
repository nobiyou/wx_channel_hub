import { NextRequest, NextResponse } from "next/server";

import { HubUnauthorizedError, hubFetch } from "@/lib/hub";
import { getOptionalHubToken } from "@/lib/session";

export async function POST(request: NextRequest) {
  const token = await getOptionalHubToken();
  if (!token) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  let bodyText = "";
  try {
    bodyText = await request.text();
  } catch {
    return NextResponse.json({ error: "读取请求体失败" }, { status: 400 });
  }

  try {
    const payload = await hubFetch("/api/remoteCall", {
      method: "POST",
      body: bodyText
    }, token);
    return NextResponse.json(payload);
  } catch (error) {
    if (error instanceof HubUnauthorizedError) {
      return NextResponse.json({ error: "登录已失效" }, { status: 401 });
    }

    if (error instanceof Error && error.message.startsWith("Hub API")) {
      const matched = error.message.match(/^Hub API (\d+):\s*(.*)$/);
      if (matched) {
        const status = Number(matched[1]) || 500;
        const raw = matched[2] || "";
        try {
          return NextResponse.json(JSON.parse(raw), { status });
        } catch {
          return NextResponse.json({ error: raw || "远程调用失败" }, { status });
        }
      }
    }

    return NextResponse.json({ error: error instanceof Error ? error.message : "远程调用失败" }, { status: 500 });
  }
}
