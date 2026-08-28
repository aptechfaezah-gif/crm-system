import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { SettingsForm } from "@/components/admin/settings-form";
import { requireAuth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { getSettings } from "@/lib/queries/leads";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await requireAuth();
  if (!hasPermission(session.role, "settings.manage")) redirect("/dashboard");
  const settings = await getSettings();
  return (
    <div>
      <PageHeader title="Settings" subtitle="Company branding and numbering used across the CRM" />
      <SettingsForm {...settings} />
    </div>
  );
}
