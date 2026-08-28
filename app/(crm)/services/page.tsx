import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { LookupManager } from "@/components/admin/lookup-manager";
import { requireAuth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { getServices } from "@/lib/queries/crm";

export const dynamic = "force-dynamic";

export default async function ServicesPage() {
  const session = await requireAuth();
  if (!hasPermission(session.role, "services.manage")) redirect("/dashboard");
  const rows = await getServices();
  return (
    <div>
      <PageHeader title="Services" subtitle="Software-house offerings used on every lead" />
      <LookupManager table="Services" withDescription rows={rows as Array<Record<string, unknown>>} />
    </div>
  );
}
