import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { UsersManager } from "@/components/admin/users-manager";
import { requireAuth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { getUsers } from "@/lib/queries/crm";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const session = await requireAuth();
  if (!hasPermission(session.role, "users.manage")) redirect("/dashboard");
  const users = await getUsers();
  return (
    <div>
      <PageHeader title="Users" subtitle="Manage CRM access and roles" />
      <UsersManager users={users as Array<Record<string, unknown>>} />
    </div>
  );
}
