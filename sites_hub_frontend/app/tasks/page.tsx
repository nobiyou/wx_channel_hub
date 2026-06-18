import { AppShell } from "@/components/shell";
import { TaskConsole } from "@/components/task-console";
import { HubUnauthorizedError, getTasks } from "@/lib/hub";
import { requireHubToken } from "@/lib/session";
import { redirect } from "next/navigation";

export default async function TasksPage() {
  const token = await requireHubToken();
  const tasks = await getTasks(token).catch((error) => {
    if (error instanceof HubUnauthorizedError) {
      redirect("/login");
    }
    return [];
  });

  return (
    <AppShell
      title="任务中心"
      subtitle="任务列表和详情现在都直接接 Hub 后端，先把执行结果、错误原因和原始 payload/result 看清。"
    >
      <TaskConsole initialTasks={tasks} />
    </AppShell>
  );
}
