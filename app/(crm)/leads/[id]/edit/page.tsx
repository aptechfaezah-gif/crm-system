import { notFound, redirect } from "next/navigation";
import { LeadForm } from "@/components/leads/lead-form";
import { PageHeader } from "@/components/ui/page-header";
import { requireAuth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { getLeadById, getLookups } from "@/lib/queries/leads";

export default async function EditLeadPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireAuth();
  if (!hasPermission(session.role, "leads.edit")) redirect("/leads");
  const { id } = await params;
  const [lead, lookups] = await Promise.all([getLeadById(session, Number(id)), getLookups()]);
  if (!lead) notFound();
  return (
    <div>
      <PageHeader title={`Edit ${lead.LeadCode}`} subtitle="Update lead details" />
      <LeadForm
        mode="edit"
        leadId={lead.Id}
        lookups={lookups}
        canAssign={hasPermission(session.role, "leads.assign")}
        defaults={{
          firstName: lead.FirstName,
          lastName: lead.LastName || "",
          companyName: lead.CompanyName || "",
          email: lead.Email,
          phone: lead.Phone,
          whatsApp: lead.WhatsApp || "",
          alternatePhone: lead.AlternatePhone || "",
          website: lead.Website || "",
          country: lead.Country || "",
          city: lead.City || "",
          address: lead.Address || "",
          serviceId: lead.ServiceId,
          sourceId: lead.SourceId,
          statusId: lead.StatusId,
          priority: lead.Priority,
          leadTemperature: lead.LeadTemperature || "Warm",
          estimatedBudget: lead.EstimatedBudget,
          currency: lead.Currency || "PKR",
          assignedTo: lead.AssignedTo,
          description: lead.Description || "",
          requirements: lead.Requirements || "",
          notes: lead.Notes || "",
          nextFollowUpDate: lead.NextFollowUpDate ? String(lead.NextFollowUpDate).slice(0, 10) : "",
          nextFollowUpTime: lead.NextFollowUpTime || "",
        }}
      />
    </div>
  );
}
