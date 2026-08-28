import { Suspense } from "react";
import { after } from "next/server";
import { requireAuth } from "@/lib/auth";
import { peekSettings, getSettings } from "@/lib/queries/leads";
import { AppShell } from "@/components/layout/app-shell";
import { PageSkeleton } from "@/components/ui/page-skeleton";

export default async function CrmLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAuth();
  const logoSrc = peekSettings()?.CompanyLogo || "/images/logo.png";
  after(() => {
    void getSettings();
  });
  return (
    <AppShell user={session} logoSrc={logoSrc}>
      <Suspense fallback={<PageSkeleton />}>{children}</Suspense>
    </AppShell>
  );
}

