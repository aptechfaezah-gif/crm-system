"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { Check, CircleDashed, Eye, Loader, X } from "lucide-react";
import { PriorityBadge, StatusBadge } from "@/components/ui/badges";
import { updateTaskStatusAction } from "@/app/actions/crm";
import { formatDate, fullName } from "@/lib/utils";

const iconBtn = "inline-flex h-8 w-8 items-center justify-center rounded-md disabled:opacity-40";

export function TaskTable({ rows }: { rows: Array<Record<string, unknown>> }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function setStatus(id: number, status: string) {
    start(async () => {
      const result = await updateTaskStatusAction(id, status);
      if (!result.success) toast.error(result.error);
      else {
        toast.success("Task updated.");
        router.refresh();
      }
    });
  }

  return (
    <div className="ifra-card table-scroll p-4">
      <table className="data-table">
        <thead>
          <tr>
            <th>Task</th>
            <th>Lead</th>
            <th>Assigned To</th>
            <th>Due Date</th>
            <th>Priority</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={String(row.Id)}>
              <td>{String(row.Title)}</td>
              <td>
                {String(row.LeadCode)} · {fullName(String(row.FirstName), row.LastName as string)}
              </td>
              <td>{String(row.AssignedName)}</td>
              <td>{formatDate(row.DueDate as string)}</td>
              <td>
                <PriorityBadge value={String(row.Priority)} />
              </td>
              <td>
                <StatusBadge value={String(row.Status)} />
              </td>
              <td>
                <div className="flex items-center gap-0.5">
                  <button
                    className={`${iconBtn} text-sky-600 hover:bg-sky-50`}
                    disabled={pending || row.Status === "Pending"}
                    title="Pending"
                    aria-label="Pending"
                    onClick={() => setStatus(Number(row.Id), "Pending")}
                  >
                    <CircleDashed className="h-4 w-4" />
                  </button>
                  <button
                    className={`${iconBtn} text-indigo-600 hover:bg-indigo-50`}
                    disabled={pending || row.Status === "In Progress"}
                    title="In Progress"
                    aria-label="In Progress"
                    onClick={() => setStatus(Number(row.Id), "In Progress")}
                  >
                    <Loader className="h-4 w-4" />
                  </button>
                  <button
                    className={`${iconBtn} text-emerald-600 hover:bg-emerald-50`}
                    disabled={pending || row.Status === "Completed"}
                    title="Complete"
                    aria-label="Complete"
                    onClick={() => setStatus(Number(row.Id), "Completed")}
                  >
                    <Check className="h-4 w-4" />
                  </button>
                  <button
                    className={`${iconBtn} text-rose-600 hover:bg-rose-50`}
                    disabled={pending || row.Status === "Cancelled"}
                    title="Cancel"
                    aria-label="Cancel"
                    onClick={() => setStatus(Number(row.Id), "Cancelled")}
                  >
                    <X className="h-4 w-4" />
                  </button>
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
    </div>
  );
}
