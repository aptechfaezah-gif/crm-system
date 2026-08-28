import { requireAuth } from "@/lib/auth";
import { getNotifications, getUnreadCount } from "@/lib/queries/crm";
import { getSettings } from "@/lib/queries/leads";
import { AppShell } from "@/components/layout/app-shell";

export const dynamic = "force-dynamic";

export default async function CrmLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAuth();
  let notifications: Array<{ Id: number; Title: string; Message: string; IsRead: boolean; CreatedAt: string }> = [];
  let unread = 0;
  let logoSrc = "/images/logo.png";
  try {
    const [rows, unreadCount, settings] = await Promise.all([
      getNotifications(session.id),
      getUnreadCount(session.id),
      getSettings(),
    ]);
    notifications = rows as typeof notifications;
    unread = Number(unreadCount);
    logoSrc = settings.CompanyLogo || "/images/logo.png";
  } catch {
    notifications = [];
  }
  return (
    <AppShell user={session} notifications={notifications} unread={unread} logoSrc={logoSrc}>
      {children}
    </AppShell>
  );
}
