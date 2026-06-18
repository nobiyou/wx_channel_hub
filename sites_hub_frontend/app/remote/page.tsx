import { AppShell } from "@/components/shell";
import { RemoteConsole } from "@/components/remote-console";
import { HubUnauthorizedError, getUserDevices } from "@/lib/hub";
import { requireHubToken } from "@/lib/session";
import { redirect } from "next/navigation";

type RemotePageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function RemotePage({ searchParams }: RemotePageProps) {
  const token = await requireHubToken();
  const devices = await getUserDevices(token).catch((error) => {
    if (error instanceof HubUnauthorizedError) {
      redirect("/login");
    }
    return [];
  });
  const params = searchParams ? await searchParams : {};
  const initialAction = pickParam(params.action) || "api_call";
  const initialClientId = pickParam(params.client_id);
  const initialPayloadText = pickParam(params.payload);

  return (
    <AppShell
      title="远程调用中心"
      subtitle="这里直接面向 Hub 的 remoteCall 能力，先提供一个最小可用面板来选设备、发动作、看回包与错误。"
    >
      <RemoteConsole
        initialDevices={devices}
        initialAction={initialAction}
        initialClientId={initialClientId}
        initialPayloadText={initialPayloadText}
      />
    </AppShell>
  );
}

function pickParam(value?: string | string[]): string {
  if (Array.isArray(value)) {
    return value[0] || "";
  }
  return value || "";
}
