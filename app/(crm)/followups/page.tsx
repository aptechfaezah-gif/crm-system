import { PageHeader } from "@/components/ui/page-header";
import { FollowUpTable } from "@/components/crm/followup-table";
import { requireAuth } from "@/lib/auth";
import { getFollowUpBuckets } from "@/lib/queries/crm";

export const dynamic = "force-dynamic";

export default async function FollowUpsPage() {
  const session = await requireAuth();
  const { today, upcoming, overdue, completed } = await getFollowUpBuckets(session);
  return (
    <div className="space-y-4">
      <PageHeader title="Follow-ups" subtitle="Today, upcoming, overdue and completed reminders" />
      <FollowUpTable title="Today's Follow-ups" rows={today as Array<Record<string, unknown>>} />
      <FollowUpTable title="Upcoming" rows={upcoming as Array<Record<string, unknown>>} />
      <FollowUpTable title="Overdue" rows={overdue as Array<Record<string, unknown>>} />
      <FollowUpTable title="Completed" rows={completed as Array<Record<string, unknown>>} />
    </div>
  );
}
