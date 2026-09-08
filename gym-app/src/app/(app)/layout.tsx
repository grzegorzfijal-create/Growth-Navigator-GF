import { AppShell } from "@/components/layout/app-shell";
import { requireUser } from "@/server/auth";
import { getActiveSession } from "@/server/queries/training";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await requireUser();
  const active = await getActiveSession(user.id);

  return (
    <AppShell
      userName={user.name ?? user.email}
      activeSession={active ? { id: active.id, name: active.name } : null}
    >
      {children}
    </AppShell>
  );
}
