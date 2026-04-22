import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { ClientSessionProvider } from "@/components/layout/session-provider";
import { DashboardShell } from "@/components/layout/dashboard-shell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <ClientSessionProvider session={session}>
      <DashboardShell>{children}</DashboardShell>
    </ClientSessionProvider>
  );
}
