"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createActivityAction, createFollowUpAction, createProposalAction, createTaskAction } from "@/app/actions/crm";

export function LeadSideForms({ leadId, users }: { leadId: number; users: Array<{ Id: number; Name: string }> }) {
  return (
    <div className="space-y-4" id="followup">
      <MiniForm
        title="Add Follow-up"
        fields={[
          { name: "followUpDate", label: "Date", type: "date" },
          { name: "followUpTime", label: "Time", type: "time" },
          { name: "followUpType", label: "Type", type: "select", options: ["Call", "WhatsApp", "Email", "Meeting", "Video Call", "Other"] },
          { name: "subject", label: "Subject", type: "text" },
          { name: "notes", label: "Notes", type: "textarea" },
        ]}
        onSave={(data) => createFollowUpAction({ ...data, leadId })}
        success="Follow-up created."
      />
      <MiniForm
        title="Add Activity"
        fields={[
          { name: "activityType", label: "Type", type: "select", options: ["Call", "WhatsApp", "Email", "Meeting", "Note", "Other"] },
          { name: "title", label: "Title", type: "text" },
          { name: "description", label: "Description", type: "textarea" },
        ]}
        onSave={(data) => createActivityAction({ ...data, leadId })}
        success="Activity recorded."
      />
      <MiniForm
        title="Create Task"
        fields={[
          { name: "title", label: "Title", type: "text" },
          { name: "assignedTo", label: "Assign to", type: "select", options: users.map((u) => ({ value: String(u.Id), label: u.Name })) },
          { name: "dueDate", label: "Due date", type: "date" },
          { name: "dueTime", label: "Due time", type: "time" },
          { name: "priority", label: "Priority", type: "select", options: ["Low", "Medium", "High", "Urgent"] },
          { name: "description", label: "Description", type: "textarea" },
        ]}
        onSave={(data) => createTaskAction({ ...data, leadId })}
        success="Task created."
      />
      <MiniForm
        title="Create Proposal"
        fields={[
          { name: "title", label: "Title", type: "text" },
          { name: "amount", label: "Amount", type: "number" },
          { name: "currency", label: "Currency", type: "select", options: ["PKR", "USD", "EUR"] },
          { name: "validUntil", label: "Valid until", type: "date" },
          { name: "notes", label: "Notes", type: "textarea" },
        ]}
        onSave={(data) => createProposalAction({ ...data, leadId, status: "Draft" })}
        success="Proposal created."
      />
    </div>
  );
}

type Field = {
  name: string;
  label: string;
  type: "text" | "date" | "time" | "number" | "textarea" | "select";
  options?: Array<string | { value: string; label: string }>;
};

function MiniForm({
  title,
  fields,
  onSave,
  success,
}: {
  title: string;
  fields: Field[];
  onSave: (data: Record<string, string>) => Promise<{ success: boolean; error?: string }>;
  success: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [values, setValues] = useState<Record<string, string>>({});

  return (
    <form
      className="ifra-card space-y-3 p-4"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const result = await onSave(values);
          if (!result.success) toast.error(result.error || "Unable to save.");
          else {
            toast.success(success);
            setValues({});
            router.refresh();
          }
        });
      }}
    >
      <h3 className="text-sm font-semibold uppercase tracking-wide text-ifra-gold">{title}</h3>
      {fields.map((field) => (
        <label key={field.name} className="block">
          <span className="ifra-label">{field.label}</span>
          {field.type === "textarea" ? (
            <textarea className="ifra-input" value={values[field.name] || ""} onChange={(e) => setValues((v) => ({ ...v, [field.name]: e.target.value }))} />
          ) : field.type === "select" ? (
            <select className="ifra-input" value={values[field.name] || ""} onChange={(e) => setValues((v) => ({ ...v, [field.name]: e.target.value }))}>
              <option value="">Select</option>
              {(field.options || []).map((opt) =>
                typeof opt === "string" ? (
                  <option key={opt}>{opt}</option>
                ) : (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ),
              )}
            </select>
          ) : (
            <input className="ifra-input" type={field.type} value={values[field.name] || ""} onChange={(e) => setValues((v) => ({ ...v, [field.name]: e.target.value }))} />
          )}
        </label>
      ))}
      <button className="ifra-btn-primary" disabled={pending}>
        {pending ? "Saving..." : "Save"}
      </button>
    </form>
  );
}
