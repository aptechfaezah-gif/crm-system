import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge, PriorityBadge } from "@/components/ui/badges";
import { LeadActions } from "@/components/leads/lead-actions";
import { requireAuth } from "@/lib/auth";
import { getLookups, searchLeads } from "@/lib/queries/leads";
import { formatDate, fullName, paginationLabel } from "@/lib/utils";
import { hasPermission } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireAuth();
  const sp = await searchParams;
  const num = (k: string) => (sp[k] ? Number(sp[k]) : undefined);
  const str = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  const [lookups, result] = await Promise.all([
    getLookups(),
    searchLeads(session, {
      q: str("q"),
      statusId: num("statusId"),
      priority: str("priority"),
      temperature: str("temperature"),
      sourceId: num("sourceId"),
      serviceId: num("serviceId"),
      assignedTo: num("assignedTo"),
      country: str("country"),
      city: str("city"),
      dateFrom: str("dateFrom"),
      dateTo: str("dateTo"),
      page: num("page") || 1,
      pageSize: num("pageSize") || 25,
    }),
  ]);

  return (
    <div className="space-y-3">
      <PageHeader
        className="mb-0"
        title="Leads"
        subtitle="Search, filter and manage the IFRA Consulting pipeline"
        actions={
          hasPermission(session.role, "leads.create") ? (
            <Link className="ifra-btn-primary" href="/leads/new">
              Add Lead
            </Link>
          ) : null
        }
      />
      <form className="ifra-card grid grid-cols-1 gap-2 p-3 sm:grid-cols-2 md:grid-cols-4 xl:grid-cols-8" method="get">
        <input className="ifra-input sm:col-span-2" name="q" defaultValue={str("q")} placeholder="Search name, company, phone, code" />
        <select className="ifra-input" name="statusId" defaultValue={str("statusId") || ""}>
          <option value="">Status</option>
          {lookups.statuses.map((s) => (
            <option key={s.Id} value={s.Id}>
              {s.Name}
            </option>
          ))}
        </select>
        <select className="ifra-input" name="priority" defaultValue={str("priority") || ""}>
          <option value="">Priority</option>
          {["Low", "Medium", "High", "Urgent"].map((v) => (
            <option key={v}>{v}</option>
          ))}
        </select>
        <select className="ifra-input" name="temperature" defaultValue={str("temperature") || ""}>
          <option value="">Temperature</option>
          {["Hot", "Warm", "Cold"].map((v) => (
            <option key={v}>{v}</option>
          ))}
        </select>
        <select className="ifra-input" name="sourceId" defaultValue={str("sourceId") || ""}>
          <option value="">Source</option>
          {lookups.sources.map((s) => (
            <option key={s.Id} value={s.Id}>
              {s.Name}
            </option>
          ))}
        </select>
        <select className="ifra-input" name="serviceId" defaultValue={str("serviceId") || ""}>
          <option value="">Service</option>
          {lookups.services.map((s) => (
            <option key={s.Id} value={s.Id}>
              {s.Name}
            </option>
          ))}
        </select>
        <select className="ifra-input" name="assignedTo" defaultValue={str("assignedTo") || ""}>
          <option value="">Assigned</option>
          {lookups.users.map((s) => (
            <option key={s.Id} value={s.Id}>
              {s.Name}
            </option>
          ))}
        </select>
        <input className="ifra-input" name="country" defaultValue={str("country")} placeholder="Country" />
        <input className="ifra-input" name="city" defaultValue={str("city")} placeholder="City" />
        <input className="ifra-input" type="date" name="dateFrom" defaultValue={str("dateFrom")} />
        <input className="ifra-input" type="date" name="dateTo" defaultValue={str("dateTo")} />
        <select className="ifra-input" name="pageSize" defaultValue={str("pageSize") || "25"}>
          {[10, 25, 50, 100].map((n) => (
            <option key={n} value={n}>
              {n} / page
            </option>
          ))}
        </select>
        <div className="col-span-1 flex flex-wrap items-center gap-2 sm:col-span-2">
          <button className="ifra-btn-primary" type="submit">
            Search
          </button>
          <Link className="ifra-btn-ghost" href="/leads">
            Reset
          </Link>
        </div>
      </form>
      <div className="ifra-card p-3">
        <p className="mb-2 text-sm text-slate-500">{paginationLabel(result.page, result.pageSize, result.total)} leads</p>
        <div className="max-h-[70vh] overflow-auto">
          <table className="data-table">
          <thead>
            <tr>
              <th>Lead Code</th>
              <th>Client</th>
              <th>Company</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Service</th>
              <th>Source</th>
              <th>Status</th>
              <th>Priority</th>
              <th>Assigned To</th>
              <th>Follow-up</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {result.rows.length === 0 ? (
              <tr>
                <td colSpan={13} className="py-10 text-center text-slate-500">
                  No leads matched this search. Try a name, company, phone, lead code, or click Reset.
                </td>
              </tr>
            ) : (
              result.rows.map((lead) => (
              <tr key={lead.Id}>
                <td className="font-semibold">{lead.LeadCode}</td>
                <td>{fullName(lead.FirstName, lead.LastName)}</td>
                <td>{lead.CompanyName || "—"}</td>
                <td>{lead.Email}</td>
                <td>{lead.Phone}</td>
                <td>{lead.ServiceName}</td>
                <td>{lead.SourceName}</td>
                <td>
                  <StatusBadge value={lead.StatusName} />
                </td>
                <td>
                  <PriorityBadge value={lead.Priority} />
                </td>
                <td>{lead.AssignedName || "—"}</td>
                <td>{formatDate(lead.NextFollowUpDate)}</td>
                <td>{formatDate(lead.CreatedAt)}</td>
                <td>
                  <LeadActions lead={lead} canDeactivate={hasPermission(session.role, "leads.deactivate")} statuses={lookups.statuses} />
                </td>
              </tr>
            ))
            )}
          </tbody>
        </table>
        </div>
        <div className="mt-3 flex gap-2">
          {result.page > 1 ? (
            <Link className="ifra-btn-ghost" href={`/leads?${new URLSearchParams({ ...Object.fromEntries(Object.entries(sp).filter(([, v]) => typeof v === "string") as [string, string][]), page: String(result.page - 1) })}`}>
              Previous
            </Link>
          ) : null}
          {result.page * result.pageSize < result.total ? (
            <Link className="ifra-btn-ghost" href={`/leads?${new URLSearchParams({ ...Object.fromEntries(Object.entries(sp).filter(([, v]) => typeof v === "string") as [string, string][]), page: String(result.page + 1) })}`}>
              Next
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
