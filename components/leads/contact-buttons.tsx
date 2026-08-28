"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Mail, Phone, MessageCircle } from "lucide-react";
import { mailtoUrl, telUrl, whatsappUrl } from "@/lib/contact";
import { createActivityAction, createFollowUpAction } from "@/app/actions/crm";

export function ContactButtons({
  leadId,
  name,
  phone,
  whatsApp,
  email,
}: {
  leadId: number;
  name: string;
  phone?: string | null;
  whatsApp?: string | null;
  email?: string | null;
}) {
  const wa = whatsappUrl(whatsApp || phone, `Hello ${name}, this is IFRA Consulting.`);
  const tel = telUrl(phone);
  const mail = mailtoUrl(email, `IFRA Consulting — ${name}`);
  const [callOpen, setCallOpen] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [outcome, setOutcome] = useState("");
  const [notes, setNotes] = useState("");
  const [nextDate, setNextDate] = useState("");
  const [pending, start] = useTransition();

  return (
    <div className="flex flex-wrap gap-2">
      {wa ? (
        <a
          className="ifra-btn-gold"
          href={wa}
          target="_blank"
          rel="noreferrer"
          onClick={() =>
            start(async () => {
              await createActivityAction({
                leadId,
                activityType: "WhatsApp",
                title: "WhatsApp Contacted",
                description: "Opened WhatsApp conversation",
              });
            })
          }
        >
          <MessageCircle className="h-4 w-4" /> WhatsApp
        </a>
      ) : null}
      {tel ? (
        <a className="ifra-btn-primary" href={tel} onClick={() => setCallOpen(true)}>
          <Phone className="h-4 w-4" /> Call Client
        </a>
      ) : null}
      {mail ? (
        <a className="ifra-btn-ghost" href={mail} onClick={() => setEmailOpen(true)}>
          <Mail className="h-4 w-4" /> Email Client
        </a>
      ) : null}

      {callOpen ? (
        <OutcomeModal
          title="Call Outcome"
          pending={pending}
          outcome={outcome}
          notes={notes}
          nextDate={nextDate}
          onOutcome={setOutcome}
          onNotes={setNotes}
          onNextDate={setNextDate}
          onCancel={() => setCallOpen(false)}
          onSave={() =>
            start(async () => {
              const result = await createActivityAction({
                leadId,
                activityType: "Call",
                title: "Call Completed",
                description: `${outcome}${notes ? ` — ${notes}` : ""}`,
              });
              if (nextDate) {
                await createFollowUpAction({
                  leadId,
                  followUpDate: nextDate,
                  followUpType: "Call",
                  subject: "Post-call follow-up",
                  notes,
                });
              }
              if (!result.success) toast.error(result.error);
              else toast.success("Call outcome saved.");
              setCallOpen(false);
            })
          }
        />
      ) : null}
      {emailOpen ? (
        <OutcomeModal
          title="Email Activity"
          pending={pending}
          outcome={outcome}
          notes={notes}
          nextDate={nextDate}
          onOutcome={setOutcome}
          onNotes={setNotes}
          onNextDate={setNextDate}
          onCancel={() => setEmailOpen(false)}
          onSave={() =>
            start(async () => {
              const result = await createActivityAction({
                leadId,
                activityType: "Email",
                title: "Email sent",
                description: notes || "Opened mail client",
              });
              if (!result.success) toast.error(result.error);
              else toast.success("Email activity recorded.");
              setEmailOpen(false);
            })
          }
        />
      ) : null}
    </div>
  );
}

function OutcomeModal(props: {
  title: string;
  pending: boolean;
  outcome: string;
  notes: string;
  nextDate: string;
  onOutcome: (v: string) => void;
  onNotes: (v: string) => void;
  onNextDate: (v: string) => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-5 dark:bg-ifra-navy">
        <h3 className="text-lg font-bold">{props.title}</h3>
        <div className="mt-3 space-y-3">
          <label className="block">
            <span className="ifra-label">Call Outcome</span>
            <input className="ifra-input" value={props.outcome} onChange={(e) => props.onOutcome(e.target.value)} />
          </label>
          <label className="block">
            <span className="ifra-label">Call Notes</span>
            <textarea className="ifra-input" value={props.notes} onChange={(e) => props.onNotes(e.target.value)} />
          </label>
          <label className="block">
            <span className="ifra-label">Next Follow-up</span>
            <input className="ifra-input" type="date" value={props.nextDate} onChange={(e) => props.onNextDate(e.target.value)} />
          </label>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button className="ifra-btn-ghost" onClick={props.onCancel}>
            Cancel
          </button>
          <button className="ifra-btn-primary" disabled={props.pending} onClick={props.onSave}>
            {props.pending ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
