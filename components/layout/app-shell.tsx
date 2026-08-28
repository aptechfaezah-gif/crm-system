"use client";

import { Suspense, useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Navbar } from "@/components/layout/navbar";
import { NavProgress } from "@/components/layout/nav-progress";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import type { SessionUser } from "@/types";

function MainPane({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, setPending] = useState(false);

  useEffect(() => {
    setPending(false);
  }, [pathname, searchParams]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }
      const link = (event.target as HTMLElement | null)?.closest("a");
      if (!link || (link.target && link.target !== "_self") || link.hasAttribute("download")) return;
      const href = link.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;
      const url = new URL(link.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      setPending(true);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  return (
    <main className="min-w-0 flex-1 overflow-x-hidden p-3 sm:p-4 lg:p-6">
      {pending ? <PageSkeleton /> : children}
    </main>
  );
}

export function AppShell({
  user,
  logoSrc,
  children,
}: {
  user: SessionUser;
  logoSrc?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex min-h-screen">
      <Suspense fallback={null}>
        <NavProgress />
      </Suspense>
      <Sidebar role={user.role} open={open} onClose={() => setOpen(false)} logoSrc={logoSrc} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Suspense fallback={<div className="h-[61px] border-b border-slate-200 dark:border-white/10" />}>
          <Navbar user={user} onMenu={() => setOpen(true)} />
        </Suspense>
        <Suspense fallback={<PageSkeleton />}>
          <MainPane>{children}</MainPane>
        </Suspense>
      </div>
    </div>
  );
}
