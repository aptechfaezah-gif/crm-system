import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { PriorityBadge, StatusBadge, TemperatureBadge } from "@/components/ui/badges";
import { ContactButtons } from "@/components/leads/contact-buttons";
import { StatusDialog } from "@/components/leads/status-dialog";
import { LeadSideForms } from "@/components/leads/side-forms";
import { requireAuth } from "@/lib/auth";
import { getLeadActivities, getLeadById, getLookups } from "@/lib/queries/leads";
import { formatDate, formatDateTime, formatMoney, fullName } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireAuth();
  const { id } = await params;
  const leadId = Number(id);
  if (!leadId) notFound();
  const [lead, lookups, activities] = await Promise.all([
    getLeadById(session, leadId),
    getLookups(),
    getLeadActivities(leadId),
  ]);
  if (!lead) notFound();
  const name = fullName(lead.FirstName, lead.LastName);

  return (
    <div className="space-y-6">
      <PageHeader
        title={lead.LeadCode}
        subtitle={`${name}${lead.CompanyName ? ` · ${lead.CompanyName}` : ""}`}
        actions={
          <>
            <StatusBadge value={lead.StatusName} />
            <PriorityBadge value={lead.Priority} />
            <TemperatureBadge value={lead.LeadTemperature} />
            <Link className="ifra-btn-ghost" href={`/leads/${lead.Id}/edit`}>
              Edit
            </Link>
            <StatusDialog leadId={lead.Id} statuses={lookups.statuses} currentId={lead.StatusId} />
          </>
        }
      />
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm text-slate-500">Assigned: {lead.AssignedName || "Unassigned"}</p>
        {lead.LeadScore !== null && lead.LeadScore !== undefined ? (
          <p className="text-sm">
            Lead Score: <strong>{lead.LeadScore}</strong>
          </p>
        ) : null}
        <ContactButtons leadId={lead.Id} name={name} phone={lead.Phone} whatsApp={lead.WhatsApp} email={lead.Email} />
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        <section className="ifra-card space-y-4 p-5 xl:col-span-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ifra-gold">Overview</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <Block title="Contact">
              <Row label="Email" value={lead.Email} />
              <Row label="Phone" value={lead.Phone} />
              <Row label="WhatsApp" value={lead.WhatsApp} />
              <Row label="Website" value={lead.Website} />
            </Block>
            <Block title="Company">
              <Row label="Company" value={lead.CompanyName} />
              <Row label="Country" value={lead.Country} />
              <Row label="City" value={lead.City} />
              <Row label="Address" value={lead.Address} />
            </Block>
            <Block title="Project">
              <Row label="Service" value={lead.ServiceName} />
              <Row label="Budget" value={formatMoney(lead.EstimatedBudget, lead.Currency || "PKR")} />
              <Row label="Requirements" value={lead.Requirements} />
              <Row label="Description" value={lead.Description} />
            </Block>
            <Block title="CRM">
              <Row label="Source" value={lead.SourceName} />
              <Row label="Status" value={lead.StatusName} />
              <Row label="Priority" value={lead.Priority} />
              <Row label="Lead Temperature" value={lead.LeadTemperature} />
              <Row label="Assigned To" value={lead.AssignedName} />
              <Row label="Created By" value={lead.CreatedByName} />
              <Row label="Created Date" value={formatDateTime(lead.CreatedAt)} />
              <Row label="Updated Date" value={formatDateTime(lead.UpdatedAt)} />
              <Row label="Next Follow-up" value={`${formatDate(lead.NextFollowUpDate)} ${lead.NextFollowUpTime || ""}`} />
              {lead.LostReason ? <Row label="Lost Reason" value={lead.LostReason} /> : null}
              {lead.ConversionDate ? <Row label="Conversion Date" value={formatDate(lead.ConversionDate)} /> : null}
              {lead.FinalAmount ? <Row label="Final Amount" value={formatMoney(lead.FinalAmount, lead.Currency || "PKR")} /> : null}
            </Block>
          </div>
        </section>
        <LeadSideForms leadId={lead.Id} users={lookups.users} />
      </div>
      <section className="ifra-card p-5">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-ifra-gold">Timeline</h2>
        <ol className="space-y-4 border-l-2 border-ifra-gold pl-4">
          {activities.map((item) => (
            <li key={item.Id}>
              <p className="text-sm font-semibold">{item.ActivityType} · {item.Title}</p>
              <p className="text-sm text-slate-600 dark:text-slate-300">{item.Description}</p>
              <p className="text-xs text-slate-400">
                {item.UserName} · {formatDateTime(item.ActivityDate)}
              </p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-2 font-semibold">{title}</h3>
      <dl className="space-y-1 text-sm">{children}</dl>
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-slate-400">{label}</dt>
      <dd>{value || "—"}</dd>
    </div>
  );
}
