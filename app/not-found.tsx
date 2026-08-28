import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-[50vh] flex-col items-center justify-center gap-3 p-8">
      <h1 className="text-2xl font-bold text-ifra-navy dark:text-white">Page not found</h1>
      <p className="text-sm text-slate-500">The requested CRM page does not exist or you do not have access.</p>
      <Link className="ifra-btn-primary" href="/dashboard">
        Back to dashboard
      </Link>
    </main>
  );
}
