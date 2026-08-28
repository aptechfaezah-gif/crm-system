import { PageHeader } from "@/components/ui/page-header";
import { PipelineBoard } from "@/components/leads/pipeline-board";
import { requireAuth } from "@/lib/auth";
import { getPipeline } from "@/lib/queries/leads";

export const dynamic = "force-dynamic";

export default async function PipelinePage() {
  const session = await requireAuth();
  const data = await getPipeline(session);
  return (
    <div>
      <PageHeader title="Pipeline" subtitle="Kanban view of the IFRA Consulting sales flow" />
      <PipelineBoard statuses={data.statuses} leads={data.leads as unknown as Array<Record<string, unknown>>} />
    </div>
  );
}
