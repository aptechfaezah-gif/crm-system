"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  BarChart3,
  Bell,
  ClipboardList,
  FileText,
  KanbanSquare,
  LayoutDashboard,
  LogOut,
  ScrollText,
  Settings,
  Tags,
  UserPlus,
  Users,
  Briefcase,
  PhoneCall,
} from "lucide-react";
import { navItems } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/types";
import { logoutAction } from "@/app/actions/auth";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  "/dashboard": LayoutDashboard,
  "/leads": Briefcase,
  "/leads/new": UserPlus,
  "/leads/pipeline": KanbanSquare,
  "/followups": PhoneCall,
  "/tasks": ClipboardList,
  "/proposals": FileText,
  "/activities": Activity,
  "/reports": BarChart3,
  "/users": Users,
  "/services": Briefcase,
  "/lead-sources": Tags,
  "/notifications": Bell,
  "/audit-logs": ScrollText,
  "/settings": Settings,
};

export function Sidebar({
  role,
  open,
  onClose,
  logoSrc = "/images/logo.png",
}: {
  role: UserRole;
  open: boolean;
  onClose: () => void;
  logoSrc?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const items = navItems(role);

  useEffect(() => {
    for (const item of navItems(role)) router.prefetch(item.href);
  }, [role, router]);

  return (
    <>
      {open ? (
        <button className="fixed inset-0 z-30 bg-black/40 lg:hidden" aria-label="Close menu" onClick={onClose} />
      ) : null}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-[min(18rem,88vw)] flex-col bg-ifra-navy text-white transition-transform lg:static lg:w-72 lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        <div className="border-b border-white/10 px-5 py-4">
          <img src={logoSrc} alt="IFRA Consulting" className="h-12 w-auto rounded bg-white p-1.5" />
          <p className="mt-3 text-xs font-semibold uppercase tracking-[0.22em] text-ifra-gold">Real Leads CRM</p>
        </div>
        <nav className="scrollbar-thin flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {items.map((item) => {
            const Icon = ICONS[item.href] || Briefcase;
            const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href) && item.href !== "/leads/new" && item.href !== "/leads/pipeline");
            const isExact = pathname === item.href;
            const on = item.href === "/leads" ? pathname.startsWith("/leads") && !pathname.startsWith("/leads/new") && !pathname.startsWith("/leads/pipeline") : item.href === "/leads/new" || item.href === "/leads/pipeline" ? isExact : active;
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition",
                  on ? "bg-white/10 text-ifra-gold" : "text-slate-200 hover:bg-white/5 hover:text-white",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <form action={logoutAction} className="border-t border-white/10 p-4">
          <button type="submit" className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-200 hover:bg-white/5">
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </form>
      </aside>
    </>
  );
}
