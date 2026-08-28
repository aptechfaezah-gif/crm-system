"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";
import { lostReasons } from "@/lib/validation";
import { changeLeadStatusAction } from "@/app/actions/crm";

export function StatusDialog({
  leadId,
  statuses,
  currentId,
  variant = "button",
}: {
  leadId: number;
  statuses: Array<{ Id: number; Name: string }>;
  currentId: number;
  variant?: "button" | "icon";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [statusId, setStatusId] = useState(currentId);
  const [lostReason, setLostReason] = useState("");
  const [finalAmount, setFinalAmount] = useState("");
  const [currency, setCurrency] = useState("PKR");
  const [notes, setNotes] = useState("");
  const [pending, start] = useTransition();
  const selected = statuses.find((s) => s.Id === Number(statusId));

  return (
    <>
      <button
        className={
          variant === "icon"
            ? "rounded p-1 text-indigo-600 hover:bg-indigo-50 dark:text-indigo-300 dark:hover:bg-white/10"
            : "ifra-btn-ghost"
        }
        type="button"
        onClick={() => setOpen(true)}
        title="Change status"
        aria-label="Change status"
      >
        {variant === "icon" ? <RefreshCw className="h-4 w-4" /> : "Change Status"}
      </button>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
          <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-xl bg-white p-5 dark:bg-ifra-navy sm:rounded-xl">
            <h2 className="text-lg font-bold">Change lead status</h2>
            <div className="mt-4 space-y-3">
              <label className="block">
                <span className="ifra-label">Status</span>
                <select className="ifra-input" value={statusId} onChange={(e) => setStatusId(Number(e.target.value))}>
                  {statuses.map((s) => (
                    <option key={s.Id} value={s.Id}>
                      {s.Name}
                    </option>
                  ))}
                </select>
              </label>
              {selected?.Name === "Lost" ? (
                <label className="block">
                  <span className="ifra-label">Lost Reason *</span>
                  <select className="ifra-input" value={lostReason} onChange={(e) => setLostReason(e.target.value)}>
                    <option value="">Select reason</option>
                    {lostReasons.map((r) => (
                      <option key={r}>{r}</option>
                    ))}
                  </select>
                </label>
              ) : null}
              {selected?.Name === "Won" ? (
                <>
                  <label className="block">
                    <span className="ifra-label">Final Amount *</span>
                    <input className="ifra-input" type="number" value={finalAmount} onChange={(e) => setFinalAmount(e.target.value)} />
                  </label>
                  <label className="block">
                    <span className="ifra-label">Currency</span>
                    <input className="ifra-input" value={currency} onChange={(e) => setCurrency(e.target.value)} />
                  </label>
                </>
              ) : null}
              <label className="block">
                <span className="ifra-label">Notes</span>
                <textarea className="ifra-input" value={notes} onChange={(e) => setNotes(e.target.value)} />
              </label>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button className="ifra-btn-ghost" type="button" onClick={() => setOpen(false)}>
                Cancel
              </button>
              <button
                className="ifra-btn-primary"
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    const result = await changeLeadStatusAction({
                      leadId,
                      statusId,
                      lostReason,
                      finalAmount,
                      currency,
                      notes,
                      conversionDate: new Date().toISOString().slice(0, 10),
                    });
                    if (!result.success) {
                      toast.error(result.error || "Unable to change status.");
                      return;
                    }
                    toast.success("Status updated.");
                    setOpen(false);
                    router.refresh();
                  })
                }
              >
                {pending ? "Updating..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
