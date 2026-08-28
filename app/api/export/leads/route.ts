import { requireAuth } from "@/lib/auth";
import { getExportRows } from "@/app/actions/admin";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAuth();
    const rows = await getExportRows();
    const headers = [
      "LeadCode",
      "FirstName",
      "LastName",
      "CompanyName",
      "Email",
      "Phone",
      "WhatsApp",
      "Country",
      "City",
      "Service",
      "Source",
      "Status",
      "Priority",
      "LeadTemperature",
      "EstimatedBudget",
      "Currency",
      "AssignedTo",
      "LostReason",
      "CreatedAt",
      "ConversionDate",
      "FinalAmount",
    ];
    const csv = [
      headers.join(","),
      ...rows.map((row) =>
        headers
          .map((key) => {
            const value = String((row as Record<string, unknown>)[key] ?? "").replace(/"/g, '""');
            return `"${value}"`;
          })
          .join(","),
      ),
    ].join("\r\n");
    return new NextResponse(`\uFEFF${csv}`, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="ifra-leads.csv"',
      },
    });
  } catch {
    return NextResponse.json({ error: "You do not have permission." }, { status: 403 });
  }
}
