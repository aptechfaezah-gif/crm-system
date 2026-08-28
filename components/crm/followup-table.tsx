"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { CalendarClock, Check, Eye, X } from "lucide-react";
import { StatusBadge } from "@/components/ui/badges";
import { updateFollowUpStatusAction } from "@/app/actions/crm";
import { formatDate, fullName, toTimeString } from "@/lib/utils";

const iconBtn = "inline-flex h-8 w-8 items-center justify-center rounded-md disabled:opacity-40";

export function FollowUpTable({
  title,
  rows,
}: {
  title: string;
  rows: Array<Record<string, unknown>>;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function act(id: number, status: "Completed" | "Cancelled" | "Rescheduled") {
    start(async () => {
      const nextDate = status === "Rescheduled" ? window.prompt("New follow-up date (YYYY-MM-DD)") || undefined : undefined;
      const result = await updateFollowUpStatusAction(id, status, nextDate);
      if (!result.success) toast.error(result.error);
      else {
        toast.success("Follow-up updated.");
        router.refresh();
      }
    });
  }

  return (
    <section className="ifra-card table-scroll p-3 sm:p-4">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ifra-gold">{title}</h2>
      <table className="data-table">
        <thead>
          <tr>
            <th>Client</th>
            <th>Company</th>
            <th>Date</th>
            <th>Time</th>
            <th>Type</th>
            <th>Subject</th>
            <th>Assigned Employee</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={String(row.Id)} className={title === "Overdue" ? "bg-rose-50 dark:bg-rose-950/20" : undefined}>
              <td>{fullName(String(row.FirstName), row.LastName as string)}</td>
              <td>{String(row.CompanyName || "—")}</td>
              <td>{formatDate(row.FollowUpDate as string)}</td>
              <td>{toTimeString(row.FollowUpTime) || "—"}</td>
              <td>{String(row.FollowUpType)}</td>
              <td>{String(row.Subject)}</td>
              <td>{String(row.UserName)}</td>
              <td>
                <StatusBadge value={String(row.Status)} />
              </td>
              <td>
                <div className="flex items-center gap-0.5">
                  {row.Status === "Pending" ? (
                    <>
                      <button
                        className={`${iconBtn} text-emerald-600 hover:bg-emerald-50`}
                        disabled={pending}
                        title="Complete"
                        aria-label="Complete"
                        onClick={() => act(Number(row.Id), "Completed")}
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        className={`${iconBtn} text-amber-600 hover:bg-amber-50`}
                        disabled={pending}
                        title="Reschedule"
                        aria-label="Reschedule"
                        onClick={() => act(Number(row.Id), "Rescheduled")}
                      >
                        <CalendarClock className="h-4 w-4" />
                      </button>
                      <button
                        className={`${iconBtn} text-rose-600 hover:bg-rose-50`}
                        disabled={pending}
                        title="Cancel"
                        aria-label="Cancel"
                        onClick={() => act(Number(row.Id), "Cancelled")}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </>
                  ) : null}
                  <Link
                    href={`/leads/${row.LeadId}`}
                    className={`${iconBtn} text-sky-600 hover:bg-sky-50`}
                    title="View lead"
                    aria-label="View lead"
                  >
                    <Eye className="h-4 w-4" />
                  </Link>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
