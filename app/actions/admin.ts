"use server";

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { sql, execute, query } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { resolveClientIp } from "@/lib/client-ip";
import { safeErrorMessage } from "@/lib/utils";
import { assertPermission, hasPermission } from "@/lib/permissions";
import { lookupSchema, settingsSchema, userSchema } from "@/lib/validation";
import { invalidateSettingsCache } from "@/lib/queries/leads";
import type { ActionResult } from "@/types";

async function saveCompanyLogoFile(file: File): Promise<string> {
  const types: Record<string, string> = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/webp": "webp",
    "image/gif": "gif",
  };
  const ext = types[file.type];
  if (!ext) throw new Error("Please upload a PNG, JPG, WEBP or GIF image.");
  if (file.size > 2 * 1024 * 1024) throw new Error("Logo must be under 2 MB.");
  const dir = path.join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  const filename = `company-logo.${ext}`;
  await writeFile(path.join(dir, filename), Buffer.from(await file.arrayBuffer()));
  return `/uploads/${filename}?v=${Date.now()}`;
}

async function audit(userId: number, action: string, module: string, recordId: number | null, description: string) {
  await writeAuditLog({
    userId,
    action,
    module,
    recordId,
    description,
    ipAddress: await resolveClientIp(),
  });
}

export async function createUserAction(raw: Record<string, unknown>): Promise<ActionResult> {
  try {
    const session = await requireAuth();
    assertPermission(session.role, "users.manage");
    const parsed = userSchema.safeParse(raw);
    if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message || "Invalid user." };
    const data = parsed.data;
    if (!data.password) return { success: false, error: "Password is required." };
    const hash = await bcrypt.hash(data.password, 10);
    await execute(
      `INSERT INTO Users (Name, Username, Email, PasswordHash, Phone, Role, Status)
       VALUES (@name, @username, @email, @hash, @phone, @role, N'Active')`,
      {
        name: { type: sql.NVarChar(120), value: data.name },
        username: { type: sql.NVarChar(80), value: data.username },
        email: { type: sql.NVarChar(150), value: data.email },
        hash: { type: sql.NVarChar(255), value: hash },
        phone: { type: sql.NVarChar(20), value: data.phone || null },
        role: { type: sql.NVarChar(30), value: data.role },
      },
    );
    await audit(session.id, "User Created", "Users", null, `${session.name} created user ${data.username}`);
    revalidatePath("/users");
    return { success: true };
  } catch (error) {
    const message = String(error);
    if (/unique|duplicate/i.test(message)) {
      return { success: false, error: "Username or email already exists." };
    }
    return { success: false, error: safeErrorMessage(error, "Unable to save user.") };
  }
}

export async function updateUserAction(id: number, raw: Record<string, unknown>): Promise<ActionResult> {
  try {
    const session = await requireAuth();
    assertPermission(session.role, "users.manage");
    const parsed = userSchema.safeParse({ ...raw, password: raw.password || "placeholder1" });
    if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message || "Invalid user." };
    const data = parsed.data;
    await execute(
      `UPDATE Users SET Name=@name, Username=@username, Email=@email, Phone=@phone, Role=@role, UpdatedAt=GETDATE()
       WHERE Id=@id`,
      {
        id: { type: sql.Int, value: id },
        name: { type: sql.NVarChar(120), value: data.name },
        username: { type: sql.NVarChar(80), value: data.username },
        email: { type: sql.NVarChar(150), value: data.email },
        phone: { type: sql.NVarChar(20), value: data.phone || null },
        role: { type: sql.NVarChar(30), value: data.role },
      },
    );
    await audit(session.id, "User Updated", "Users", id, `${session.name} updated user ${data.username}`);
    revalidatePath("/users");
    return { success: true };
  } catch (error) {
    return { success: false, error: safeErrorMessage(error, "Unable to update user.") };
  }
}

export async function setUserStatusAction(id: number, status: "Active" | "Inactive"): Promise<ActionResult> {
  try {
    const session = await requireAuth();
    assertPermission(session.role, "users.manage");
    if (id === session.id && status === "Inactive") {
      return { success: false, error: "You cannot deactivate your own account." };
    }
    await execute(`UPDATE Users SET Status=@status, UpdatedAt=GETDATE() WHERE Id=@id`, {
      id: { type: sql.Int, value: id },
      status: { type: sql.NVarChar(20), value: status },
    });
    await audit(session.id, "User Updated", "Users", id, `${session.name} set user status to ${status}`);
    revalidatePath("/users");
    return { success: true };
  } catch (error) {
    return { success: false, error: safeErrorMessage(error, "Unable to update user.") };
  }
}

export async function resetPasswordAction(id: number, password: string): Promise<ActionResult> {
  try {
    const session = await requireAuth();
    assertPermission(session.role, "users.manage");
    if (!password || password.length < 8) return { success: false, error: "Password must be at least 8 characters." };
    const hash = await bcrypt.hash(password, 10);
    await execute(`UPDATE Users SET PasswordHash=@hash, UpdatedAt=GETDATE() WHERE Id=@id`, {
      id: { type: sql.Int, value: id },
      hash: { type: sql.NVarChar(255), value: hash },
    });
    await audit(session.id, "User Updated", "Users", id, `${session.name} reset a user password`);
    return { success: true };
  } catch (error) {
    return { success: false, error: safeErrorMessage(error, "Unable to reset password.") };
  }
}

export async function saveLookupAction(
  table: "Services" | "LeadSources",
  raw: Record<string, unknown>,
  id?: number,
): Promise<ActionResult> {
  try {
    const session = await requireAuth();
    assertPermission(session.role, table === "Services" ? "services.manage" : "sources.manage");
    const parsed = lookupSchema.safeParse(raw);
    if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message || "Invalid details." };
    if (table === "Services") {
      if (id) {
        await execute(
          `UPDATE Services SET Name=@name, Description=@description, UpdatedAt=GETDATE() WHERE Id=@id`,
          {
            id: { type: sql.Int, value: id },
            name: { type: sql.NVarChar(120), value: parsed.data.name },
            description: { type: sql.NVarChar(400), value: parsed.data.description || null },
          },
        );
      } else {
        await execute(`INSERT INTO Services (Name, Description, Status) VALUES (@name, @description, N'Active')`, {
          name: { type: sql.NVarChar(120), value: parsed.data.name },
          description: { type: sql.NVarChar(400), value: parsed.data.description || null },
        });
      }
      revalidatePath("/services");
    } else {
      if (id) {
        await execute(`UPDATE LeadSources SET Name=@name, UpdatedAt=GETDATE() WHERE Id=@id`, {
          id: { type: sql.Int, value: id },
          name: { type: sql.NVarChar(80), value: parsed.data.name },
        });
      } else {
        await execute(`INSERT INTO LeadSources (Name, Status) VALUES (@name, N'Active')`, {
          name: { type: sql.NVarChar(80), value: parsed.data.name },
        });
      }
      revalidatePath("/lead-sources");
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: safeErrorMessage(error, "Unable to save record.") };
  }
}

export async function setLookupStatusAction(
  table: "Services" | "LeadSources",
  id: number,
  status: "Active" | "Inactive",
): Promise<ActionResult> {
  try {
    const session = await requireAuth();
    assertPermission(session.role, table === "Services" ? "services.manage" : "sources.manage");
    if (table === "Services") {
      await execute(`UPDATE Services SET Status=@status, UpdatedAt=GETDATE() WHERE Id=@id`, {
        id: { type: sql.Int, value: id },
        status: { type: sql.NVarChar(20), value: status },
      });
    } else {
      await execute(`UPDATE LeadSources SET Status=@status, UpdatedAt=GETDATE() WHERE Id=@id`, {
        id: { type: sql.Int, value: id },
        status: { type: sql.NVarChar(20), value: status },
      });
    }
    revalidatePath(table === "Services" ? "/services" : "/lead-sources");
    return { success: true };
  } catch (error) {
    return { success: false, error: safeErrorMessage(error, "Unable to update status.") };
  }
}

export async function saveSettingsAction(formData: FormData): Promise<ActionResult> {
  try {
    const session = await requireAuth();
    assertPermission(session.role, "settings.manage");
    const raw = {
      companyName: String(formData.get("companyName") || ""),
      companyLogo: String(formData.get("companyLogo") || "/images/logo.png"),
      companyEmail: String(formData.get("companyEmail") || ""),
      companyPhone: String(formData.get("companyPhone") || ""),
      companyWebsite: String(formData.get("companyWebsite") || ""),
      defaultCurrency: String(formData.get("defaultCurrency") || "PKR"),
      timezone: String(formData.get("timezone") || "Asia/Karachi"),
      leadCodePrefix: String(formData.get("leadCodePrefix") || "IFRA-"),
      proposalPrefix: String(formData.get("proposalPrefix") || "IFRA-P-"),
    };
    const parsed = settingsSchema.safeParse(raw);
    if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message || "Invalid settings." };
    const data = parsed.data;
    const file = formData.get("logoFile");
    if (file instanceof File && file.size > 0) {
      data.companyLogo = await saveCompanyLogoFile(file);
    }
    await execute(
      `UPDATE Settings SET
         CompanyName=@companyName, CompanyLogo=@logo, CompanyEmail=@email, CompanyPhone=@phone,
         CompanyWebsite=@website, DefaultCurrency=@currency, Timezone=@tz, LeadCodePrefix=@leadPrefix,
         ProposalPrefix=@propPrefix, UpdatedAt=GETDATE()
       WHERE Id=1;
       UPDATE NumberSequences SET Prefix=@leadPrefix WHERE Name=N'LEAD';
       UPDATE NumberSequences SET Prefix=@propPrefix WHERE Name=N'PROPOSAL';`,
      {
        companyName: { type: sql.NVarChar(150), value: data.companyName },
        logo: { type: sql.NVarChar(250), value: data.companyLogo || "/images/logo.png" },
        email: { type: sql.NVarChar(150), value: data.companyEmail || null },
        phone: { type: sql.NVarChar(30), value: data.companyPhone || null },
        website: { type: sql.NVarChar(200), value: data.companyWebsite || null },
        currency: { type: sql.NVarChar(10), value: data.defaultCurrency },
        tz: { type: sql.NVarChar(60), value: data.timezone },
        leadPrefix: { type: sql.NVarChar(20), value: data.leadCodePrefix },
        propPrefix: { type: sql.NVarChar(20), value: data.proposalPrefix },
      },
    );
    invalidateSettingsCache();
    revalidatePath("/settings");
    revalidatePath("/login");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    return { success: false, error: safeErrorMessage(error, "Unable to save settings.") };
  }
}

export async function getExportRows() {
  const session = await requireAuth();
  assertPermission(session.role, "reports.export");
  const extra = hasPermission(session.role, "leads.view_all")
    ? ""
    : " AND (l.AssignedTo = @scopeUser OR l.CreatedBy = @scopeUser) ";
  const params: Record<string, import("@/lib/db").SqlParam> = hasPermission(session.role, "leads.view_all")
    ? {}
    : { scopeUser: { type: sql.Int, value: session.id } };
  return query(
    `SELECT l.LeadCode, l.FirstName, l.LastName, l.CompanyName, l.Email, l.Phone, l.WhatsApp,
            l.Country, l.City, s.Name AS Service, src.Name AS Source, st.Name AS Status,
            l.Priority, l.LeadTemperature, l.EstimatedBudget, l.Currency, u.Name AS AssignedTo,
            l.LostReason, l.CreatedAt, l.ConversionDate, l.FinalAmount
     FROM Leads l
     INNER JOIN Services s ON s.Id = l.ServiceId
     INNER JOIN LeadSources src ON src.Id = l.SourceId
     INNER JOIN LeadStatuses st ON st.Id = l.StatusId
     LEFT JOIN Users u ON u.Id = l.AssignedTo
     WHERE l.IsDeleted = 0 ${extra}
     ORDER BY l.CreatedAt DESC`,
    params,
  );
}
