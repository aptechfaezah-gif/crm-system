"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Bell, LogOut, Menu, Moon, Search, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { roleLabel } from "@/lib/permissions";
import { formatDateTime } from "@/lib/utils";
import { markNotificationsReadAction } from "@/app/actions/crm";
import { logoutAction } from "@/app/actions/auth";
import type { SessionUser } from "@/types";

type Note = {
  Id: number;
  Title: string;
  Message: string;
  IsRead: boolean;
  CreatedAt: string;
};

export function Navbar({
  user,
  notifications,
  unread,
  onMenu,
}: {
  user: SessionUser;
  notifications: Note[];
  unread: number;
  onMenu: () => void;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState(searchParams.get("q") || "");
  const [pending, start] = useTransition();

  useEffect(() => {
    setQ(searchParams.get("q") || "");
  }, [searchParams]);

  return (
    <header className="sticky top-0 z-20 flex items-center gap-2 border-b border-slate-200 bg-white/90 px-3 py-2.5 backdrop-blur sm:gap-3 sm:px-4 sm:py-3 dark:border-white/10 dark:bg-ifra-navy/80">
      <button className="rounded-lg p-2 lg:hidden" onClick={onMenu} aria-label="Open menu">
        <Menu className="h-5 w-5" />
      </button>
      <form
        className="relative min-w-0 max-w-md flex-1"
        onSubmit={(e) => {
          e.preventDefault();
          router.push(`/leads?q=${encodeURIComponent(q)}`);
        }}
      >
        <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="h-10 w-full rounded-lg border border-slate-200 bg-white py-2 pl-10 pr-3 text-sm leading-5 text-slate-800 placeholder:truncate placeholder:text-slate-400 dark:border-white/10 dark:bg-ifra-deep/80 dark:text-slate-100"
          style={{ paddingLeft: "2.5rem" }}
          placeholder="Search..."
          aria-label="Search leads"
          autoComplete="off"
          spellCheck={false}
        />
      </form>
      <div className="ml-auto flex items-center gap-2">
        <button
          type="button"
          className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-white/10"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          aria-label="Toggle theme"
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
        <div className="relative">
          <button
            type="button"
            className="relative rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-white/10"
            onClick={() => setOpen((v) => !v)}
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4" />
            {unread > 0 ? (
              <span className="absolute right-1 top-1 rounded-full bg-ifra-gold px-1.5 text-[10px] font-bold text-ifra-navy">
                {unread}
              </span>
            ) : null}
          </button>
          {open ? (
            <div className="absolute right-0 z-30 mt-2 w-[min(20rem,calc(100vw-1.5rem))] rounded-xl border border-slate-200 bg-white p-2 shadow-card dark:border-white/10 dark:bg-ifra-navy">
              <div className="flex items-center justify-between px-2 py-1">
                <p className="text-sm font-semibold">Notifications</p>
                <button
                  className="text-xs text-ifra-gold"
                  disabled={pending}
                  onClick={() =>
                    start(async () => {
                      await markNotificationsReadAction();
                      router.refresh();
                    })
                  }
                >
                  Mark all as read
                </button>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <p className="px-2 py-6 text-center text-sm text-slate-500">No notifications</p>
                ) : (
                  notifications.map((n) => (
                    <button
                      key={n.Id}
                      className="block w-full rounded-lg px-2 py-2 text-left hover:bg-slate-50 dark:hover:bg-white/5"
                      onClick={() =>
                        start(async () => {
                          await markNotificationsReadAction(n.Id);
                          setOpen(false);
                          router.refresh();
                        })
                      }
                    >
                      <p className={`text-sm ${n.IsRead ? "text-slate-500" : "font-semibold"}`}>{n.Title}</p>
                      <p className="text-xs text-slate-500">{n.Message}</p>
                      <p className="text-[11px] text-slate-400">{formatDateTime(n.CreatedAt)}</p>
                    </button>
                  ))
                )}
              </div>
              <Link href="/notifications" className="block px-2 py-2 text-center text-xs text-ifra-gold" onClick={() => setOpen(false)}>
                View all
              </Link>
            </div>
          ) : null}
        </div>
        <div className="hidden text-right sm:block">
          <p className="text-sm font-semibold">{user.name}</p>
          <p className="text-xs text-slate-500">{roleLabel(user.role)}</p>
        </div>
        <form action={logoutAction}>
          <button className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-white/10" aria-label="Logout">
            <LogOut className="h-4 w-4" />
          </button>
        </form>
      </div>
    </header>
  );
}
