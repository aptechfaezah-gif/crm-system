"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { Eye } from "lucide-react";
import { StatusBadge } from "@/components/ui/badges";
import { updateProposalStatusAction } from "@/app/actions/crm";
import { formatDate, formatMoney, fullName } from "@/lib/utils";

const STATUSES = ["Draft", "Sent", "Viewed", "Accepted", "Rejected", "Expired"];

export function ProposalTable({ rows }: { rows: Array<Record<string, unknown>> }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <div className="ifra-card table-scroll p-4">
      <table className="data-table">
        <thead>
          <tr>
            <th>Proposal Number</th>
            <th>Client</th>
            <th>Project</th>
            <th>Amount</th>
            <th>Currency</th>
            <th>Sent Date</th>
            <th>Valid Until</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={String(row.Id)}>
              <td className="font-semibold">{String(row.ProposalNumber)}</td>
              <td>
                {fullName(String(row.FirstName), row.LastName as string)}
                <div className="text-xs text-slate-400">{String(row.CompanyName || "")}</div>
              </td>
              <td>{String(row.Title)}</td>
              <td>{formatMoney(Number(row.Amount), String(row.Currency))}</td>
              <td>{String(row.Currency)}</td>
              <td>{formatDate(row.SentDate as string)}</td>
              <td>{formatDate(row.ValidUntil as string)}</td>
              <td>
                <StatusBadge value={String(row.Status)} />
              </td>
              <td>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/leads/${row.LeadId}`}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md text-sky-600 hover:bg-sky-50"
                    title="View lead"
                    aria-label="View lead"
                  >
                    <Eye className="h-4 w-4" />
                  </Link>
                  <select
                  className="ifra-input w-auto"
                  disabled={pending}
                  defaultValue={String(row.Status)}
                  onChange={(e) =>
                    start(async () => {
                      const result = await updateProposalStatusAction(Number(row.Id), e.target.value);
                      if (!result.success) toast.error(result.error);
                      else {
                        toast.success("Proposal status updated.");
                        router.refresh();
                      }
                    })
                  }
                >
                  {STATUSES.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
