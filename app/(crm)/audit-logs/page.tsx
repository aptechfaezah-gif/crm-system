import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { requireAuth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { getAuditLogs } from "@/lib/queries/crm";
import { formatDateTime, normalizeIp } from "@/lib/utils";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AuditLogsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireAuth();
  if (!hasPermission(session.role, "audit.view")) redirect("/dashboard");
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : undefined;
  const page = sp.page ? Number(sp.page) : 1;
  const data = await getAuditLogs(page, 50, q);
  return (
    <div>
      <PageHeader title="Audit Logs" subtitle="Administrator-only activity history" />
      <form className="mb-4 flex flex-col gap-2 sm:flex-row" method="get">
        <input className="ifra-input w-full sm:max-w-sm" name="q" defaultValue={q} placeholder="Search action, module, user or description" />
        <button className="ifra-btn-primary">Search</button>
      </form>
      <div className="ifra-card table-scroll p-4">
        <table className="data-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Action</th>
              <th>Module</th>
              <th>Record</th>
              <th>Description</th>
              <th>IP Address</th>
              <th>Date / Time</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row) => (
              <tr key={Number((row as { Id: number }).Id)}>
                <td>{String((row as { UserName?: string }).UserName || "System")}</td>
                <td>{String((row as { Action: string }).Action)}</td>
                <td>{String((row as { Module: string }).Module)}</td>
                <td>{String((row as { RecordId?: number }).RecordId ?? "—")}</td>
                <td>{String((row as { Description: string }).Description)}</td>
                <td className="whitespace-nowrap">{normalizeIp((row as { IPAddress?: string }).IPAddress)}</td>
                <td className="whitespace-nowrap">{formatDateTime((row as { CreatedAt: string }).CreatedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-4 flex gap-2">
          {page > 1 ? <Link className="ifra-btn-ghost" href={`/audit-logs?page=${page - 1}&q=${q || ""}`}>Previous</Link> : null}
          {page * data.pageSize < data.total ? <Link className="ifra-btn-ghost" href={`/audit-logs?page=${page + 1}&q=${q || ""}`}>Next</Link> : null}
        </div>
      </div>
    </div>
  );
}
