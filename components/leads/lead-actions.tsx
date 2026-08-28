"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Ban, CalendarClock, Eye, Mail, MessageCircle, Pencil, Phone } from "lucide-react";
import { mailtoUrl, telUrl, whatsappUrl } from "@/lib/contact";
import { deactivateLeadAction } from "@/app/actions/crm";
import { StatusDialog } from "@/components/leads/status-dialog";

const iconBtn = "inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-slate-100 dark:hover:bg-white/10";

export function LeadActions({
  lead,
  canDeactivate,
  statuses,
}: {
  lead: {
    Id: number;
    Phone: string;
    Email: string;
    WhatsApp: string | null;
    FirstName: string;
    StatusId: number;
  };
  canDeactivate: boolean;
  statuses: Array<{ Id: number; Name: string }>;
}) {
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const [pending, start] = useTransition();
  const wa = whatsappUrl(lead.WhatsApp || lead.Phone);

  return (
    <div className="flex items-center gap-0.5">
      <Link href={`/leads/${lead.Id}`} className={`${iconBtn} text-sky-600`} title="View" aria-label="View">
        <Eye className="h-4 w-4" />
      </Link>
      <Link href={`/leads/${lead.Id}/edit`} className={`${iconBtn} text-amber-600`} title="Edit" aria-label="Edit">
        <Pencil className="h-4 w-4" />
      </Link>
      {wa ? (
        <a href={wa} target="_blank" rel="noreferrer" className={`${iconBtn} text-emerald-600`} title="WhatsApp" aria-label="WhatsApp">
          <MessageCircle className="h-4 w-4" />
        </a>
      ) : null}
      <a href={telUrl(lead.Phone) || "#"} className={`${iconBtn} text-blue-600`} title="Call" aria-label="Call">
        <Phone className="h-4 w-4" />
      </a>
      <a href={mailtoUrl(lead.Email) || "#"} className={`${iconBtn} text-violet-600`} title="Email" aria-label="Email">
        <Mail className="h-4 w-4" />
      </a>
      <Link href={`/leads/${lead.Id}#followup`} className={`${iconBtn} text-orange-500`} title="Follow-up" aria-label="Follow-up">
        <CalendarClock className="h-4 w-4" />
      </Link>
      <StatusDialog leadId={lead.Id} statuses={statuses} currentId={lead.StatusId} variant="icon" />
      {canDeactivate ? (
        <button className={`${iconBtn} text-rose-600 hover:bg-rose-50 dark:text-rose-400`} title="Deactivate" aria-label="Deactivate" onClick={() => setConfirm(true)}>
          <Ban className="h-4 w-4" />
        </button>
      ) : null}
      {confirm ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
          <div className="w-full max-w-sm rounded-t-xl bg-white p-5 dark:bg-ifra-navy sm:rounded-xl">
            <p className="font-semibold">Are you sure you want to deactivate this lead?</p>
            <div className="mt-4 flex justify-end gap-2">
              <button className="ifra-btn-ghost" onClick={() => setConfirm(false)}>
                Cancel
              </button>
              <button
                className="ifra-btn-danger"
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    const result = await deactivateLeadAction(lead.Id);
                    if (!result.success) toast.error(result.error);
                    else {
                      toast.success("Lead deactivated.");
                      router.refresh();
                    }
                    setConfirm(false);
                  })
                }
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
