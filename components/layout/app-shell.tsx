"use client";

import { Suspense, useState } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Navbar } from "@/components/layout/navbar";
import type { SessionUser } from "@/types";

export function AppShell({
  user,
  notifications,
  unread,
  logoSrc,
  children,
}: {
  user: SessionUser;
  notifications: Array<{ Id: number; Title: string; Message: string; IsRead: boolean; CreatedAt: string }>;
  unread: number;
  logoSrc?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex min-h-screen">
      <Sidebar role={user.role} open={open} onClose={() => setOpen(false)} logoSrc={logoSrc} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Suspense fallback={<div className="h-[61px] border-b border-slate-200 dark:border-white/10" />}>
          <Navbar user={user} notifications={notifications} unread={unread} onMenu={() => setOpen(true)} />
        </Suspense>
        <main className="min-w-0 flex-1 overflow-x-hidden p-3 sm:p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
