import { NextRequest, NextResponse } from "next/server";

import { HubUnauthorizedError, getTaskDetail } from "@/lib/hub";
import { getOptionalHubToken } from "@/lib/session";

export async function GET(request: NextRequest) {
  const token = await getOptionalHubToken();
  if (!token) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const idValue = request.nextUrl.searchParams.get("id");
  const id = Number(idValue);
  if (!idValue || Number.isNaN(id) || id <= 0) {
    return NextResponse.json({ error: "缺少有效任务 ID" }, { status: 400 });
  }

  try {
    const task = await getTaskDetail(id, token);
    return NextResponse.json({ task });
  } catch (error) {
    if (error instanceof HubUnauthorizedError) {
      return NextResponse.json({ error: "登录已失效" }, { status: 401 });
    }
    if (error instanceof Error && error.message.includes("404")) {
      return NextResponse.json({ error: "任务不存在或无权限访问" }, { status: 404 });
    }
    return NextResponse.json({ error: "读取任务详情失败" }, { status: 500 });
  }
}
