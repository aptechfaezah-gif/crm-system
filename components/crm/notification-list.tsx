"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { markNotificationsReadAction } from "@/app/actions/crm";
import { formatDateTime } from "@/lib/utils";

export function NotificationList({
  rows,
}: {
  rows: Array<{ Id: number; Title: string; Message: string; Type: string; IsRead: boolean; CreatedAt: string }>;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <div className="space-y-3">
      <button
        className="ifra-btn-ghost"
        disabled={pending}
        onClick={() =>
          start(async () => {
            await markNotificationsReadAction();
            router.refresh();
          })
        }
      >
        Mark All as Read
      </button>
      {rows.map((row) => (
        <article key={row.Id} className={`ifra-card p-4 ${row.IsRead ? "opacity-70" : ""}`}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold">{row.Title}</p>
              <p className="text-sm text-slate-500">{row.Message}</p>
              <p className="text-xs text-slate-400">{row.Type} · {formatDateTime(row.CreatedAt)}</p>
            </div>
            {!row.IsRead ? (
              <button
                className="text-sm text-ifra-gold"
                onClick={() =>
                  start(async () => {
                    await markNotificationsReadAction(row.Id);
                    router.refresh();
                  })
                }
              >
                Mark as Read
              </button>
            ) : null}
          </div>
        </article>
      ))}
    </div>
  );
}
