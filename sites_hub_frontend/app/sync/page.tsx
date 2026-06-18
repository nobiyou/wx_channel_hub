import { AppShell } from "@/components/shell";
import { SyncConsole } from "@/components/sync-console";
import { HubUnauthorizedError, getSyncStatuses } from "@/lib/hub";
import { requireHubToken } from "@/lib/session";
import { redirect } from "next/navigation";

export default async function SyncPage() {
  const token = await requireHubToken();
  const statuses = await getSyncStatuses(token).catch((error) => {
    if (error instanceof HubUnauthorizedError) {
      redirect("/login");
    }
    return [];
  });

  return (
    <AppShell
      title="同步中心"
      subtitle="这里直接接入 Hub 的同步状态与历史接口，先把设备同步可见性和手动检查入口补上。"
    >
      <SyncConsole initialStatuses={statuses} />
    </AppShell>
  );
}
