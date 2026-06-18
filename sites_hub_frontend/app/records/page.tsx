import { AppShell } from "@/components/shell";
import { RecordsConsole } from "@/components/records-console";
import { HubUnauthorizedError, getBrowseRecords, getDownloadRecords, getUserDevices } from "@/lib/hub";
import { requireHubToken } from "@/lib/session";
import { redirect } from "next/navigation";

export default async function RecordsPage() {
  const token = await requireHubToken();
  const [devices, browse, download] = await Promise.all([
    getUserDevices(token).catch((error) => {
      if (error instanceof HubUnauthorizedError) {
        redirect("/login");
      }
      return [];
    }),
    getBrowseRecords({ page: 1, pageSize: 20 }, token).catch(() => ({
      records: [],
      total: 0,
      page: 1,
      size: 20
    })),
    getDownloadRecords({ page: 1, pageSize: 20 }, token).catch(() => ({
      records: [],
      total: 0,
      page: 1,
      size: 20
    }))
  ]);

  return (
    <AppShell
      title="记录中心"
      subtitle="这里聚合 Hub 已同步的浏览记录与下载记录，先支持按设备筛选和分页查看，方便把操作结果与沉淀记录串起来。"
    >
      <RecordsConsole initialDevices={devices} initialBrowse={browse} initialDownload={download} />
    </AppShell>
  );
}
