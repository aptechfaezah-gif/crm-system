import sql from "mssql";

export async function nextNumber(
  request: sql.Request,
  name: "LEAD" | "PROPOSAL",
): Promise<string> {
  request.input("seqName", sql.NVarChar(20), name);
  const result = await request.query<{ Prefix: string; NextValue: number }>(
    `UPDATE NumberSequences WITH (UPDLOCK, HOLDLOCK)
     SET NextValue = NextValue + 1
     OUTPUT deleted.Prefix, deleted.NextValue
     WHERE Name = @seqName`,
  );

  const row = result.recordset[0];
  if (!row) {
    throw new Error("Number sequence is not configured.");
  }

  return `${row.Prefix}${String(row.NextValue).padStart(6, "0")}`;
}
