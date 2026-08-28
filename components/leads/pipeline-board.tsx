"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { PriorityBadge, TemperatureBadge } from "@/components/ui/badges";
import { changeLeadStatusAction } from "@/app/actions/crm";
import { fullName } from "@/lib/utils";

export function PipelineBoard({
  statuses,
  leads,
}: {
  statuses: Array<{ Id: number; Name: string }>;
  leads: Array<Record<string, unknown>>;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const columns = statuses.filter((s) => s.Name !== "On Hold");

  return (
    <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-4 sm:gap-4">
      {columns.map((status) => {
        const items = leads.filter((l) => Number(l.StatusId) === status.Id);
        return (
          <section key={status.Id} className="w-[min(16.5rem,calc(100vw-2.5rem))] shrink-0 snap-start rounded-xl bg-slate-100 p-3 dark:bg-white/5 sm:w-72">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold">{status.Name}</h2>
              <span className="rounded-full bg-white px-2 text-xs dark:bg-ifra-navy">{items.length}</span>
            </div>
            <div className="space-y-3">
              {items.map((lead) => (
                <article
                  key={String(lead.Id)}
                  className="ifra-card cursor-pointer p-3"
                  draggable={!pending && status.Name !== "Won" && status.Name !== "Lost"}
                  onDragStart={(e) => e.dataTransfer.setData("leadId", String(lead.Id))}
                  onClick={() => router.push(`/leads/${lead.Id}`)}
                >
                  <p className="font-semibold">{fullName(String(lead.FirstName), lead.LastName as string)}</p>
                  <p className="text-xs text-slate-500">{String(lead.CompanyName || "—")}</p>
                  <p className="mt-1 text-xs">{String(lead.ServiceName)}</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    <PriorityBadge value={String(lead.Priority)} />
                    <TemperatureBadge value={lead.LeadTemperature as string} />
                  </div>
                  <p className="mt-2 text-xs text-slate-500">{String(lead.AssignedName || "Unassigned")}</p>
                  <p className="text-xs text-slate-400">Follow-up: {lead.NextFollowUpDate ? String(lead.NextFollowUpDate).slice(0, 10) : "—"}</p>
                </article>
              ))}
            </div>
            <div
              className="mt-3 min-h-10 rounded-lg border border-dashed border-slate-300 p-2 text-center text-xs text-slate-400"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const leadId = Number(e.dataTransfer.getData("leadId"));
                if (!leadId) return;
                if (status.Name === "Won" || status.Name === "Lost") {
                  toast.error("Use Change Status to mark Won or Lost.");
                  return;
                }
                start(async () => {
                  const result = await changeLeadStatusAction({ leadId, statusId: status.Id });
                  if (!result.success) toast.error(result.error);
                  else {
                    toast.success("Status updated.");
                    router.refresh();
                  }
                });
              }}
            >
              Drop to move
            </div>
          </section>
        );
      })}
    </div>
  );
}
