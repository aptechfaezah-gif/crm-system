import { PageHeader } from "@/components/ui/page-header";
import { NotificationList } from "@/components/crm/notification-list";
import { requireAuth } from "@/lib/auth";
import { getNotifications } from "@/lib/queries/crm";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const session = await requireAuth();
  const rows = await getNotifications(session.id);
  return (
    <div>
      <PageHeader title="Notifications" subtitle="Assignments, follow-ups, tasks and proposal updates" />
      <NotificationList
        rows={rows as Array<{ Id: number; Title: string; Message: string; Type: string; IsRead: boolean; CreatedAt: string }>}
      />
    </div>
  );
}
