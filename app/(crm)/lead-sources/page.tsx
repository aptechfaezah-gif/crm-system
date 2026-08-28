import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { LookupManager } from "@/components/admin/lookup-manager";
import { requireAuth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { getSources } from "@/lib/queries/crm";

export const dynamic = "force-dynamic";

export default async function LeadSourcesPage() {
  const session = await requireAuth();
  if (!hasPermission(session.role, "sources.manage")) redirect("/dashboard");
  const rows = await getSources();
  return (
    <div>
      <PageHeader title="Lead Sources" subtitle="Where IFRA Consulting opportunities originate" />
      <LookupManager table="LeadSources" rows={rows as Array<Record<string, unknown>>} />
    </div>
  );
}
