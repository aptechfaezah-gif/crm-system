export function PageSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-8 w-48 animate-pulse rounded-lg bg-slate-200 dark:bg-white/10" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="ifra-card h-24 animate-pulse bg-slate-100 dark:bg-white/5" />
        ))}
      </div>
      <div className="ifra-card h-72 animate-pulse bg-slate-100 dark:bg-white/5" />
    </div>
  );
}
