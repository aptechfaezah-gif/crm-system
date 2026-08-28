import { LoginForm } from "@/components/auth/login-form";
import { getSettings } from "@/lib/queries/leads";

export const dynamic = "force-dynamic";

const DEFAULT_LOGO = "/images/logo.png";

export default async function LoginPage() {
  let logoSrc = DEFAULT_LOGO;
  try {
    const settings = await Promise.race([
      getSettings(),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 1500)),
    ]);
    if (settings?.CompanyLogo) logoSrc = settings.CompanyLogo;
  } catch {
    logoSrc = DEFAULT_LOGO;
  }
  return (
    <main className="min-h-screen bg-ifra-mist dark:bg-ifra-deep">
      <div className="grid min-h-screen lg:grid-cols-2">
        <section className="relative hidden overflow-hidden bg-ifra-navy p-10 text-white lg:flex lg:flex-col lg:justify-between">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(251,176,59,0.18),_transparent_42%)]" />
          <div className="relative">
            <img src={logoSrc} alt="IFRA Consulting" className="h-16 w-auto rounded-md bg-white p-2" />
          </div>
          <div className="relative max-w-lg space-y-4">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-ifra-gold">IT · BPO · AUDIT</p>
            <h1 className="text-4xl font-bold leading-tight">Real Leads Management System</h1>
            <p className="text-base text-slate-200">
              A secure CRM for IFRA Consulting to capture, qualify, follow up and convert software-house opportunities.
            </p>
          </div>
          <p className="relative text-sm text-slate-300">IFRA Consulting (Pvt) Ltd.</p>
        </section>
        <section className="flex items-center justify-center px-4 py-8 sm:px-6 sm:py-12">
          <div className="w-full max-w-md space-y-8">
            <div className="lg:hidden">
              <img src={logoSrc} alt="IFRA Consulting" className="mx-auto h-16 w-auto rounded-md bg-white p-2 shadow-card" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-ifra-navy dark:text-white">Welcome back</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
                Sign in to the IFRA Consulting Real Leads Management System.
              </p>
            </div>
            <div className="ifra-card p-6">
              <LoginForm />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
