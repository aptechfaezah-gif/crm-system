import Link from "next/link";
import { Eye, Pencil } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { DashboardCharts } from "@/components/dashboard/charts";
import { StatusBadge, PriorityBadge } from "@/components/ui/badges";
import { requireAuth } from "@/lib/auth";
import { getDashboardData, syncFollowUpReminders } from "@/lib/queries/dashboard";
import { formatDate, fullName, toTimeString } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await requireAuth();
  try {
    await syncFollowUpReminders(session);
    const data = await getDashboardData(session);
    const cards = [
      ["Total Leads", data.cards.totalLeads],
      ["New Leads", data.cards.newLeads],
      ["Contacted", data.cards.contacted],
      ["Qualified", data.cards.qualified],
      ["Follow-ups Today", data.cards.followUpsToday],
      ["Active Proposals", data.cards.activeProposals],
      ["Won Leads", data.cards.wonLeads],
      ["Lost Leads", data.cards.lostLeads],
      ["Conversion Rate", `${data.cards.conversionRate}%`],
    ];

    return (
      <div className="space-y-6">
        <PageHeader title="Dashboard" subtitle="Live pipeline from Microsoft SQL Server" />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
          {cards.map(([label, value]) => (
            <article key={label} className="ifra-card p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
              <p className="mt-2 text-2xl font-bold text-ifra-navy dark:text-white">{value}</p>
            </article>
          ))}
        </div>
        <DashboardCharts {...data.charts} />
        <section className="ifra-card table-scroll p-3 sm:p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Recent Leads</h2>
            <Link href="/leads" className="text-sm text-ifra-gold">
              View all
            </Link>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Lead Code</th>
                <th>Client</th>
                <th>Company</th>
                <th>Service</th>
                <th>Source</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Assigned To</th>
                <th>Created Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {(data.recent as Array<Record<string, unknown>>).map((lead) => (
                <tr key={String(lead.Id)}>
                  <td className="font-semibold">{String(lead.LeadCode)}</td>
                  <td>{fullName(String(lead.FirstName), lead.LastName as string)}</td>
                  <td>{String(lead.CompanyName || "—")}</td>
                  <td>{String(lead.ServiceName)}</td>
                  <td>{String(lead.SourceName)}</td>
                  <td>
                    <StatusBadge value={String(lead.StatusName)} />
                  </td>
                  <td>
                    <PriorityBadge value={String(lead.Priority)} />
                  </td>
                  <td>{String(lead.AssignedName || "Unassigned")}</td>
                  <td>{formatDate(lead.CreatedAt as string)}</td>
                  <td>
                    <div className="flex items-center gap-0.5">
                      <Link
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-sky-600 hover:bg-sky-50"
                        href={`/leads/${lead.Id}`}
                        title="View"
                        aria-label="View"
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                      <Link
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-amber-600 hover:bg-amber-50"
                        href={`/leads/${lead.Id}/edit`}
                        title="Edit"
                        aria-label="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <section className="ifra-card table-scroll p-3 sm:p-4">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Today&apos;s Follow-ups</h2>
          <table className="data-table">
            <thead>
              <tr>
                <th>Client</th>
                <th>Company</th>
                <th>Time</th>
                <th>Type</th>
                <th>Assigned Employee</th>
                <th>Status</th>
                <th>Bucket</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {(data.followups as Array<Record<string, unknown>>).map((f) => (
                <tr key={String(f.Id)} className={f.Bucket === "Overdue" ? "bg-rose-50 dark:bg-rose-950/20" : ""}>
                  <td>{fullName(String(f.FirstName), f.LastName as string)}</td>
                  <td>{String(f.CompanyName || "—")}</td>
                  <td>{toTimeString(f.FollowUpTime) || "—"}</td>
                  <td>{String(f.FollowUpType)}</td>
                  <td>{String(f.AssignedName)}</td>
                  <td>
                    <StatusBadge value={String(f.Status)} />
                  </td>
                  <td>{String(f.Bucket)}</td>
                  <td>
                    <Link
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md text-sky-600 hover:bg-sky-50"
                      href={`/leads/${f.LeadId}`}
                      title="View lead"
                      aria-label="View lead"
                    >
                      <Eye className="h-4 w-4" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    );
  } catch {
    return (
      <div className="ifra-card p-8">
        <h1 className="text-xl font-bold">Unable to load dashboard</h1>
        <p className="mt-2 text-sm text-slate-500">
          Confirm SQL Server is running, the `[real leads system]` database exists, and `.env` has the correct password.
        </p>
      </div>
    );
  }
}
