import { cn } from "@/lib/utils";

export function StatusBadge({ value }: { value: string }) {
  const map: Record<string, string> = {
    New: "bg-sky-100 text-sky-800 dark:bg-sky-500/20 dark:text-sky-200",
    Contacted: "bg-indigo-100 text-indigo-800 dark:bg-indigo-500/20 dark:text-indigo-200",
    Qualified: "bg-cyan-100 text-cyan-800 dark:bg-cyan-500/20 dark:text-cyan-200",
    "Follow-up": "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200",
    "Proposal Sent": "bg-violet-100 text-violet-800 dark:bg-violet-500/20 dark:text-violet-200",
    Negotiation: "bg-orange-100 text-orange-800 dark:bg-orange-500/20 dark:text-orange-200",
    Won: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200",
    Lost: "bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-200",
    "On Hold": "bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-200",
    Active: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200",
    Inactive: "bg-slate-100 text-slate-600 dark:bg-slate-500/20 dark:text-slate-300",
    Pending: "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200",
    Completed: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200",
    Cancelled: "bg-slate-100 text-slate-600 dark:bg-slate-500/20 dark:text-slate-300",
    Rescheduled: "bg-indigo-100 text-indigo-800 dark:bg-indigo-500/20 dark:text-indigo-200",
    "In Progress": "bg-sky-100 text-sky-800 dark:bg-sky-500/20 dark:text-sky-200",
    Draft: "bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-200",
    Sent: "bg-indigo-100 text-indigo-800 dark:bg-indigo-500/20 dark:text-indigo-200",
    Viewed: "bg-cyan-100 text-cyan-800 dark:bg-cyan-500/20 dark:text-cyan-200",
    Accepted: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200",
    Rejected: "bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-200",
    Expired: "bg-slate-100 text-slate-600 dark:bg-slate-500/20 dark:text-slate-300",
  };
  return (
    <span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-semibold", map[value] || "bg-slate-100 text-slate-700")}>
      {value}
    </span>
  );
}

export function PriorityBadge({ value }: { value: string }) {
  const map: Record<string, string> = {
    Low: "bg-slate-100 text-slate-700",
    Medium: "bg-sky-100 text-sky-800",
    High: "bg-amber-100 text-amber-800",
    Urgent: "bg-rose-100 text-rose-800",
  };
  return <span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-semibold", map[value])}>{value}</span>;
}

export function TemperatureBadge({ value }: { value?: string | null }) {
  if (!value) return <span className="text-slate-400">—</span>;
  const map: Record<string, string> = {
    Hot: "bg-rose-100 text-rose-800",
    Warm: "bg-amber-100 text-amber-800",
    Cold: "bg-sky-100 text-sky-800",
  };
  return <span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-semibold", map[value])}>{value}</span>;
}
