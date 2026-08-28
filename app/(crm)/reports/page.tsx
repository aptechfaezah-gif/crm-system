import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { requireAuth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { getReports } from "@/lib/queries/reports";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireAuth();
  if (!hasPermission(session.role, "reports.view")) redirect("/dashboard");
  const sp = await searchParams;
  const dateFrom = typeof sp.dateFrom === "string" ? sp.dateFrom : undefined;
  const dateTo = typeof sp.dateTo === "string" ? sp.dateTo : undefined;
  const data = await getReports(session, dateFrom, dateTo);
  const p = data.performance;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        subtitle="Live analytics from Microsoft SQL Server"
        actions={
          hasPermission(session.role, "reports.export") ? (
            <a className="ifra-btn-gold" href="/api/export/leads">
              Export CSV / Excel
            </a>
          ) : null
        }
      />
      <form className="ifra-card flex flex-col gap-3 p-3 sm:flex-row sm:flex-wrap sm:p-4" method="get">
        <input className="ifra-input w-full sm:w-auto" type="date" name="dateFrom" defaultValue={dateFrom} />
        <input className="ifra-input w-full sm:w-auto" type="date" name="dateTo" defaultValue={dateTo} />
        <button className="ifra-btn-primary" type="submit">
          Apply date filter
        </button>
        <Link className="ifra-btn-ghost" href="/reports">
          Reset
        </Link>
      </form>
      <section className="ifra-card p-4">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ifra-gold">Lead Performance</h2>
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {Object.entries({
            Total: p.total,
            New: p.new,
            Contacted: p.contacted,
            Qualified: p.qualified,
            "Follow-up": p.followUp,
            Proposal: p.proposal,
            Negotiation: p.negotiation,
            Won: p.won,
            Lost: p.lost,
          }).map(([k, v]) => (
            <div key={k} className="rounded-lg bg-ifra-mist p-3 dark:bg-white/5">
              <p className="text-xs uppercase text-slate-500">{k}</p>
              <p className="text-xl font-bold">{v}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="ifra-card table-scroll p-3 sm:p-4">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ifra-gold">Employee Performance</h2>
        <table className="data-table">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Assigned</th>
              <th>Contacted</th>
              <th>Qualified</th>
              <th>Proposals</th>
              <th>Won</th>
              <th>Lost</th>
              <th>Conversion Rate</th>
            </tr>
          </thead>
          <tbody>
            {data.employees.map((e) => (
              <tr key={e.Name}>
                <td>{e.Name}</td>
                <td>{e.Assigned}</td>
                <td>{e.Contacted}</td>
                <td>{e.Qualified}</td>
                <td>{e.Proposals}</td>
                <td>{e.Won}</td>
                <td>{e.Lost}</td>
                <td>{e.ConversionRate}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section className="ifra-card table-scroll p-3 sm:p-4">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ifra-gold">Source Performance</h2>
        <table className="data-table">
          <thead>
            <tr>
              <th>Source</th>
              <th>Total Leads</th>
              <th>Qualified</th>
              <th>Won</th>
              <th>Conversion</th>
            </tr>
          </thead>
          <tbody>
            {data.sources.map((s) => (
              <tr key={s.Name}>
                <td>{s.Name}</td>
                <td>{s.Total}</td>
                <td>{s.Qualified}</td>
                <td>{s.Won}</td>
                <td>{s.Conversion}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section className="ifra-card table-scroll p-3 sm:p-4">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ifra-gold">Service Performance</h2>
        <table className="data-table">
          <thead>
            <tr>
              <th>Service</th>
              <th>Total Leads</th>
              <th>Qualified</th>
              <th>Won</th>
            </tr>
          </thead>
          <tbody>
            {data.services.map((s) => (
              <tr key={s.Name}>
                <td>{s.Name}</td>
                <td>{s.Total}</td>
                <td>{s.Qualified}</td>
                <td>{s.Won}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section className="ifra-card table-scroll p-3 sm:p-4">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ifra-gold">Lost Lead Reasons</h2>
        <table className="data-table">
          <thead>
            <tr>
              <th>Reason</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {data.lost.map((s) => (
              <tr key={String(s.LostReason)}>
                <td>{String(s.LostReason)}</td>
                <td>{Number(s.Total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section className="ifra-card table-scroll p-3 sm:p-4">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ifra-gold">Monthly Performance</h2>
        <table className="data-table">
          <thead>
            <tr>
              <th>Month</th>
              <th>Total</th>
              <th>Won</th>
              <th>Lost</th>
            </tr>
          </thead>
          <tbody>
            {data.monthly.map((s) => (
              <tr key={s.MonthLabel}>
                <td>{s.MonthLabel}</td>
                <td>{Number(s.Total)}</td>
                <td>{Number(s.Won)}</td>
                <td>{Number(s.Lost)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
