import type { UserRole } from "@/types";

export const ROLES = {
  ADMIN: "ADMIN",
  SALES_MANAGER: "SALES_MANAGER",
  SALES_EMPLOYEE: "SALES_EMPLOYEE",
} as const;

export type Permission =
  | "leads.view"
  | "leads.view_all"
  | "leads.create"
  | "leads.edit"
  | "leads.assign"
  | "leads.deactivate"
  | "leads.status"
  | "followups.manage"
  | "tasks.manage"
  | "proposals.manage"
  | "activities.manage"
  | "reports.view"
  | "reports.export"
  | "users.manage"
  | "services.manage"
  | "sources.manage"
  | "settings.manage"
  | "audit.view"
  | "notifications.view";

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  ADMIN: [
    "leads.view",
    "leads.view_all",
    "leads.create",
    "leads.edit",
    "leads.assign",
    "leads.deactivate",
    "leads.status",
    "followups.manage",
    "tasks.manage",
    "proposals.manage",
    "activities.manage",
    "reports.view",
    "reports.export",
    "users.manage",
    "services.manage",
    "sources.manage",
    "settings.manage",
    "audit.view",
    "notifications.view",
  ],
  SALES_MANAGER: [
    "leads.view",
    "leads.create",
    "leads.edit",
    "leads.status",
    "followups.manage",
    "tasks.manage",
    "proposals.manage",
    "activities.manage",
    "reports.view",
    "notifications.view",
  ],
  SALES_EMPLOYEE: [
    "leads.view",
    "leads.create",
    "leads.edit",
    "leads.status",
    "followups.manage",
    "tasks.manage",
    "proposals.manage",
    "activities.manage",
    "reports.view",
    "notifications.view",
  ],
};

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function canAccessLead(
  role: UserRole,
  userId: number,
  lead: { AssignedTo: number | null; CreatedBy: number },
): boolean {
  if (hasPermission(role, "leads.view_all")) return true;
  return lead.AssignedTo === userId || lead.CreatedBy === userId;
}

export function assertPermission(role: UserRole, permission: Permission) {
  if (!hasPermission(role, permission)) {
    throw new Error("You do not have permission to perform this action.");
  }
}

export function navItems(role: UserRole) {
  const items = [
    { href: "/dashboard", label: "Dashboard", permission: "leads.view" as Permission },
    { href: "/leads", label: "Leads", permission: "leads.view" as Permission },
    { href: "/leads/new", label: "Add Lead", permission: "leads.create" as Permission },
    { href: "/leads/pipeline", label: "Pipeline", permission: "leads.view" as Permission },
    { href: "/followups", label: "Follow-ups", permission: "followups.manage" as Permission },
    { href: "/tasks", label: "Tasks", permission: "tasks.manage" as Permission },
    { href: "/proposals", label: "Proposals", permission: "proposals.manage" as Permission },
    { href: "/activities", label: "Activities", permission: "activities.manage" as Permission },
    { href: "/reports", label: "Reports", permission: "reports.view" as Permission },
    { href: "/users", label: "Users", permission: "users.manage" as Permission },
    { href: "/services", label: "Services", permission: "services.manage" as Permission },
    { href: "/lead-sources", label: "Lead Sources", permission: "sources.manage" as Permission },
    { href: "/notifications", label: "Notifications", permission: "notifications.view" as Permission },
    { href: "/audit-logs", label: "Audit Logs", permission: "audit.view" as Permission },
    { href: "/settings", label: "Settings", permission: "settings.manage" as Permission },
  ];

  return items.filter((item) => hasPermission(role, item.permission));
}

export function roleLabel(role: UserRole): string {
  if (role === "ADMIN") return "Administrator";
  return "User";
}
