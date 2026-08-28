import { sql, execute } from "@/lib/db";
import { normalizeIp } from "@/lib/utils";

export async function writeAuditLog(input: {
  userId: number | null;
  action: string;
  module: string;
  recordId?: number | null;
  description: string;
  ipAddress?: string | null;
}) {
  try {
    const ip = normalizeIp(input.ipAddress);
    await execute(
      `INSERT INTO AuditLogs (UserId, Action, Module, RecordId, Description, IPAddress, CreatedAt)
       VALUES (@userId, @action, @module, @recordId, @description, @ip, GETDATE())`,
      {
        userId: { type: sql.Int, value: input.userId },
        action: { type: sql.NVarChar(80), value: input.action },
        module: { type: sql.NVarChar(80), value: input.module },
        recordId: { type: sql.Int, value: input.recordId ?? null },
        description: { type: sql.NVarChar(500), value: input.description.slice(0, 500) },
        ip: { type: sql.NVarChar(50), value: ip && ip !== "—" ? ip.slice(0, 50) : null },
      },
    );
  } catch (error) {
    console.error("Failed to write audit log");
    console.error(error);
  }
}
