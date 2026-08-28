import { PageHeader } from "@/components/ui/page-header";
import { ProposalTable } from "@/components/crm/proposal-table";
import { requireAuth } from "@/lib/auth";
import { getProposals } from "@/lib/queries/crm";

export const dynamic = "force-dynamic";

export default async function ProposalsPage() {
  const session = await requireAuth();
  const rows = await getProposals(session);
  return (
    <div>
      <PageHeader title="Proposals" subtitle="Track commercial proposals across the pipeline" />
      <ProposalTable rows={rows as Array<Record<string, unknown>>} />
    </div>
  );
}
