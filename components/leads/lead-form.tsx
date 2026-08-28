"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { leadSchema, type LeadInput } from "@/lib/validation";
import { createLeadAction, updateLeadAction } from "@/app/actions/crm";
import { computeLeadScore, temperatureFromScore } from "@/lib/scoring";

type Lookup = { Id: number; Name: string; Status?: string };

export function LeadForm({
  mode,
  leadId,
  defaults,
  lookups,
  canAssign,
}: {
  mode: "create" | "edit";
  leadId?: number;
  defaults?: Partial<LeadInput>;
  lookups: { services: Lookup[]; sources: Lookup[]; statuses: Lookup[]; users: Lookup[] };
  canAssign: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const form = useForm<LeadInput>({
    resolver: zodResolver(leadSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      companyName: "",
      email: "",
      phone: "",
      whatsApp: "",
      alternatePhone: "",
      website: "",
      country: "Pakistan",
      city: "",
      address: "",
      priority: "Medium",
      leadTemperature: "Warm",
      currency: "PKR",
      description: "",
      requirements: "",
      notes: "",
      ...defaults,
    },
  });

  const watch = form.watch();
  const liveScore = useMemo(
    () =>
      computeLeadScore({
        estimatedBudget: watch.estimatedBudget,
        website: watch.website,
        companyName: watch.companyName,
        requirements: watch.requirements,
        whatsApp: watch.whatsApp,
        nextFollowUpDate: watch.nextFollowUpDate,
        temperature: watch.leadTemperature,
      }),
    [watch],
  );

  const [addAnother, setAddAnother] = useState(false);

  function onSubmit(values: LeadInput) {
    start(async () => {
      const payload = { ...values, leadTemperature: values.leadTemperature || temperatureFromScore(liveScore) };
      const result =
        mode === "create" ? await createLeadAction(payload, addAnother) : await updateLeadAction(leadId as number, payload);
      if (!result.success) {
        toast.error(result.error || "Unable to save lead.");
        return;
      }
      toast.success(mode === "create" ? "Lead created successfully." : "Lead updated successfully.");
      if (mode === "create" && result.data?.addAnother) {
        form.reset();
        return;
      }
      router.push(mode === "create" ? `/leads/${result.data?.id}` : `/leads/${leadId}`);
      router.refresh();
    });
  }

  const err = (name: keyof LeadInput) => form.formState.errors[name]?.message;

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <section className="ifra-card p-4 sm:p-5">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-ifra-gold">Client Information</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="First Name *" error={err("firstName")}>
            <input className="ifra-input" {...form.register("firstName")} />
          </Field>
          <Field label="Last Name" error={err("lastName")}>
            <input className="ifra-input" {...form.register("lastName")} />
          </Field>
          <Field label="Company Name" error={err("companyName")}>
            <input className="ifra-input" {...form.register("companyName")} />
          </Field>
          <Field label="Email *" error={err("email")}>
            <input className="ifra-input" type="email" {...form.register("email")} />
          </Field>
          <Field label="Phone *" error={err("phone")}>
            <input className="ifra-input" {...form.register("phone")} />
          </Field>
          <Field label="WhatsApp" error={err("whatsApp")}>
            <input className="ifra-input" {...form.register("whatsApp")} />
          </Field>
          <Field label="Alternate Phone" error={err("alternatePhone")}>
            <input className="ifra-input" {...form.register("alternatePhone")} />
          </Field>
          <Field label="Website" error={err("website")}>
            <input className="ifra-input" {...form.register("website")} />
          </Field>
        </div>
      </section>

      <section className="ifra-card p-4 sm:p-5">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-ifra-gold">Location</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Country">
            <input className="ifra-input" {...form.register("country")} />
          </Field>
          <Field label="City">
            <input className="ifra-input" {...form.register("city")} />
          </Field>
          <Field label="Address">
            <input className="ifra-input" {...form.register("address")} />
          </Field>
        </div>
      </section>

      <section className="ifra-card p-4 sm:p-5">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-ifra-gold">Lead Information</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Service *" error={err("serviceId")}>
            <select className="ifra-input" {...form.register("serviceId")}>
              <option value="">Select service</option>
              {lookups.services.filter((s) => s.Status !== "Inactive").map((s) => (
                <option key={s.Id} value={s.Id}>
                  {s.Name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Lead Source *" error={err("sourceId")}>
            <select className="ifra-input" {...form.register("sourceId")}>
              <option value="">Select source</option>
              {lookups.sources.filter((s) => s.Status !== "Inactive").map((s) => (
                <option key={s.Id} value={s.Id}>
                  {s.Name}
                </option>
              ))}
            </select>
          </Field>
          {mode === "create" ? (
            <Field label="Status">
              <select className="ifra-input" {...form.register("statusId")}>
                {lookups.statuses.map((s) => (
                  <option key={s.Id} value={s.Id}>
                    {s.Name}
                  </option>
                ))}
              </select>
            </Field>
          ) : null}
          <Field label="Priority">
            <select className="ifra-input" {...form.register("priority")}>
              {["Low", "Medium", "High", "Urgent"].map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </Field>
          <Field label="Lead Temperature">
            <select className="ifra-input" {...form.register("leadTemperature")}>
              {["Hot", "Warm", "Cold"].map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </Field>
          <Field label="Estimated Budget" error={err("estimatedBudget")}>
            <input className="ifra-input" type="number" step="0.01" {...form.register("estimatedBudget")} />
          </Field>
          <Field label="Currency">
            <select className="ifra-input" {...form.register("currency")}>
              {["PKR", "USD", "EUR", "GBP"].map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </Field>
          {canAssign ? (
            <Field label="Assigned Employee">
              <select className="ifra-input" {...form.register("assignedTo")}>
                <option value="">Unassigned</option>
                {lookups.users.map((u) => (
                  <option key={u.Id} value={u.Id}>
                    {u.Name}
                  </option>
                ))}
              </select>
            </Field>
          ) : null}
        </div>
        <p className="mt-4 text-sm text-slate-500">
          Lead Score: <strong>{liveScore}</strong> · Suggested temperature: {temperatureFromScore(liveScore)}
        </p>
      </section>

      <section className="ifra-card p-4 sm:p-5">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-ifra-gold">Project Requirements</h2>
        <div className="grid gap-4">
          <Field label="Project Description">
            <textarea className="ifra-input min-h-24" {...form.register("description")} />
          </Field>
          <Field label="Requirements">
            <textarea className="ifra-input min-h-24" {...form.register("requirements")} />
          </Field>
          <Field label="Notes">
            <textarea className="ifra-input min-h-20" {...form.register("notes")} />
          </Field>
        </div>
      </section>

      <section className="ifra-card p-4 sm:p-5">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-ifra-gold">Follow-up</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Next Follow-up Date">
            <input className="ifra-input" type="date" {...form.register("nextFollowUpDate")} />
          </Field>
          <Field label="Next Follow-up Time">
            <input className="ifra-input" type="time" {...form.register("nextFollowUpTime")} />
          </Field>
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        <button className="ifra-btn-primary" disabled={pending} type="submit" onClick={() => setAddAnother(false)}>
          {pending ? "Saving Lead..." : mode === "create" ? "Save Lead" : "Save Changes"}
        </button>
        {mode === "create" ? (
          <button className="ifra-btn-gold" disabled={pending} type="submit" onClick={() => setAddAnother(true)}>
            Save & Add Another
          </button>
        ) : null}
        <button className="ifra-btn-ghost" type="button" onClick={() => router.push("/leads")}>
          Cancel
        </button>
      </div>
    </form>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="ifra-label">{label}</span>
      {children}
      {error ? <span className="mt-1 block text-xs text-rose-600">{error}</span> : null}
    </label>
  );
}
