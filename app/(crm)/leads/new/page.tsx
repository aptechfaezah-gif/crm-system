import { LeadForm } from "@/components/leads/lead-form";
import { PageHeader } from "@/components/ui/page-header";
import { requireAuth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { getLookups } from "@/lib/queries/leads";
import { redirect } from "next/navigation";

export default async function NewLeadPage() {
  const session = await requireAuth();
  if (!hasPermission(session.role, "leads.create")) redirect("/leads");
  const lookups = await getLookups();
  const newStatus = lookups.statuses.find((s) => s.Name === "New");
  return (
    <div>
      <PageHeader title="Add Lead" subtitle="Capture a new IFRA Consulting opportunity" />
      <LeadForm
        mode="create"
        lookups={lookups}
        canAssign={hasPermission(session.role, "leads.assign")}
        defaults={{ statusId: newStatus?.Id, assignedTo: hasPermission(session.role, "leads.assign") ? undefined : session.id }}
      />
    </div>
  );
}
