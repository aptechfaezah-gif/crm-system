import { PageHeader } from "@/components/ui/page-header";
import { requireAuth } from "@/lib/auth";
import { getActivities } from "@/lib/queries/crm";
import { formatDateTime, fullName } from "@/lib/utils";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ActivitiesPage() {
  const session = await requireAuth();
  const rows = await getActivities(session);
  return (
    <div>
      <PageHeader title="Activities" subtitle="Every important lead interaction recorded in SQL Server" />
      <div className="ifra-card table-scroll p-4">
        <table className="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Lead</th>
              <th>User</th>
              <th>Activity</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            {(rows as Array<Record<string, unknown>>).map((row) => (
              <tr key={String(row.Id)}>
                <td>{formatDateTime(row.ActivityDate as string)}</td>
                <td>
                  <Link href={`/leads/${row.LeadId}`}>
                    {String(row.LeadCode)} · {fullName(String(row.FirstName), row.LastName as string)}
                  </Link>
                </td>
                <td>{String(row.UserName)}</td>
                <td>{String(row.ActivityType)}</td>
                <td className="max-w-md truncate">{String(row.Description || row.Title || "")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
