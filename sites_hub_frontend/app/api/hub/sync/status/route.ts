import { NextResponse } from "next/server";

import { HubUnauthorizedError, getSyncStatuses } from "@/lib/hub";
import { getOptionalHubToken } from "@/lib/session";

export async function GET() {
  const token = await getOptionalHubToken();
  if (!token) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  try {
    const statuses = await getSyncStatuses(token);
    return NextResponse.json({ statuses });
  } catch (error) {
    if (error instanceof HubUnauthorizedError) {
      return NextResponse.json({ error: "登录已失效" }, { status: 401 });
    }
    return NextResponse.json({ error: "读取同步状态失败" }, { status: 500 });
  }
}
