export function PageHeader({
  title,
  subtitle,
  actions,
  className,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between ${className || ""}`}>
      <div>
        <h1 className="text-xl font-bold text-ifra-navy sm:text-2xl dark:text-white">{title}</h1>
        {subtitle ? <p className="text-sm text-slate-500 dark:text-slate-300">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 px-6 py-12 text-center dark:border-white/15">
      <p className="font-semibold">{title}</p>
      <p className="mt-1 text-sm text-slate-500">{text}</p>
    </div>
  );
}
