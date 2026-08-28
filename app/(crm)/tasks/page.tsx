import { PageHeader } from "@/components/ui/page-header";
import { TaskTable } from "@/components/crm/task-table";
import { requireAuth } from "@/lib/auth";
import { getTasks } from "@/lib/queries/crm";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const session = await requireAuth();
  const rows = await getTasks(session);
  return (
    <div>
      <PageHeader title="Tasks" subtitle="Create, assign and complete sales tasks from each lead record" />
      <TaskTable rows={rows as Array<Record<string, unknown>>} />
    </div>
  );
}
