import { getPool } from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const pool = await getPool();
    const result = await pool.request().query<{ ok: number }>("SELECT 1 AS ok");
    return NextResponse.json({ ok: true, database: process.env.DB_DATABASE, ping: result.recordset[0]?.ok === 1 });
  } catch {
    return NextResponse.json({ ok: false, error: "Unable to reach SQL Server." }, { status: 503 });
  }
}
