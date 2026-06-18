import { AppShell } from "@/components/shell";
import { DashboardConsole } from "@/components/dashboard-console";
import { HubUnauthorizedError, getDashboardData } from "@/lib/hub";
import { requireHubToken } from "@/lib/session";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const token = await requireHubToken();
  const data = await getDashboardData(token).catch((error) => {
    if (error instanceof HubUnauthorizedError) {
      redirect("/login");
    }
    return {
      clients: [],
      tasks: [],
      subscriptions: [],
      metricsSummary: null,
      metricsTimeseries: null,
      wsStats: null
    };
  });

  return (
    <AppShell
      title="Hub 仪表盘"
      subtitle="这里已经开始接入 Hub 的实时监控能力，不再只是设备和任务壳子，而是能直接看到 API、WebSocket 和热点端点状态。"
    >
      <DashboardConsole data={data} />
    </AppShell>
  );
}
