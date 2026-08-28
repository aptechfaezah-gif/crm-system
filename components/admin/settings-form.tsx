"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { saveSettingsAction } from "@/app/actions/admin";

const FIELDS = {
  companyName: "Company Name",
  companyEmail: "Company Email",
  companyPhone: "Company Phone",
  companyWebsite: "Company Website",
  defaultCurrency: "Default Currency",
  timezone: "Timezone",
  leadCodePrefix: "Lead Code Prefix",
  proposalPrefix: "Proposal Prefix",
} as const;

export function SettingsForm(props: {
  CompanyName: string;
  CompanyLogo: string | null;
  CompanyEmail: string | null;
  CompanyPhone: string | null;
  CompanyWebsite: string | null;
  DefaultCurrency: string;
  Timezone: string;
  LeadCodePrefix: string;
  ProposalPrefix: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [preview, setPreview] = useState(props.CompanyLogo || "/images/logo.png");
  const [data, setData] = useState({
    companyName: props.CompanyName,
    companyLogo: props.CompanyLogo || "/images/logo.png",
    companyEmail: props.CompanyEmail || "",
    companyPhone: props.CompanyPhone || "",
    companyWebsite: props.CompanyWebsite || "",
    defaultCurrency: props.DefaultCurrency,
    timezone: props.Timezone,
    leadCodePrefix: props.LeadCodePrefix,
    proposalPrefix: props.ProposalPrefix,
  });

  return (
    <form
      className="ifra-card max-w-2xl space-y-4 p-4 sm:p-5"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const formData = new FormData();
          for (const [key, value] of Object.entries(data)) {
            formData.set(key, value);
          }
          if (logoFile) formData.set("logoFile", logoFile);
          const result = await saveSettingsAction(formData);
          if (!result.success) toast.error(result.error);
          else {
            toast.success("Settings saved.");
            setLogoFile(null);
            router.refresh();
          }
        });
      }}
    >
      <div>
        <span className="ifra-label">Company Logo</span>
        <div className="mt-1 flex items-center gap-4 rounded-lg border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-ifra-deep/40">
          <img
            src={preview}
            alt="Company logo"
            className="h-16 w-auto max-w-[220px] rounded-md bg-white object-contain p-1"
          />
          <div className="min-w-0">
            <label className="ifra-btn-ghost inline-flex cursor-pointer">
              Change logo
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setLogoFile(file);
                  setPreview(URL.createObjectURL(file));
                }}
              />
            </label>
            <p className="mt-1 text-xs text-slate-500">PNG, JPG, WEBP or GIF. Max 2 MB.</p>
          </div>
        </div>
      </div>
      {Object.entries(FIELDS).map(([key, label]) => (
        <label key={key} className="block">
          <span className="ifra-label">{label}</span>
          <input
            className="ifra-input"
            value={data[key as keyof typeof data]}
            onChange={(e) => setData((d) => ({ ...d, [key]: e.target.value }))}
          />
        </label>
      ))}
      <button className="ifra-btn-primary" disabled={pending}>
        {pending ? "Saving..." : "Save Settings"}
      </button>
    </form>
  );
}
