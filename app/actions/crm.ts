"use server";

import { revalidatePath } from "next/cache";
import { sql, bind, execute, query, withTransaction } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { resolveClientIp } from "@/lib/client-ip";
import { notify } from "@/lib/notifications";
import { nextNumber } from "@/lib/lead-code";
import { computeLeadScore } from "@/lib/scoring";
import { safeErrorMessage, stripHtml, toSqlTime } from "@/lib/utils";
import { assertPermission, canAccessLead, hasPermission } from "@/lib/permissions";
import {
  activitySchema,
  followUpSchema,
  leadSchema,
  lostReasons,
  proposalSchema,
  statusChangeSchema,
  taskSchema,
} from "@/lib/validation";
import { getLeadById } from "@/lib/queries/leads";
import type { ActionResult } from "@/types";

async function audit(userId: number, action: string, module: string, recordId: number | null, description: string) {
  const ip = await resolveClientIp();
  await writeAuditLog({ userId, action, module, recordId, description, ipAddress: ip });
}

async function addActivity(
  request: ReturnType<typeof bind> extends infer _ ? import("mssql").Request : never,
  input: { leadId: number; userId: number; type: string; title: string; description?: string | null },
) {
  bind(request, {
    aLeadId: { type: sql.Int, value: input.leadId },
    aUserId: { type: sql.Int, value: input.userId },
    aType: { type: sql.NVarChar(40), value: input.type },
    aTitle: { type: sql.NVarChar(150), value: input.title },
    aDesc: { type: sql.NVarChar(sql.MAX), value: input.description ?? null },
  });
  await request.query(
    `INSERT INTO LeadActivities (LeadId, UserId, ActivityType, Title, Description, ActivityDate)
     VALUES (@aLeadId, @aUserId, @aType, @aTitle, @aDesc, GETDATE())`,
  );
}

export async function createLeadAction(
  raw: Record<string, unknown>,
  addAnother = false,
): Promise<ActionResult<{ id: number; addAnother: boolean }>> {
  try {
    const session = await requireAuth();
    assertPermission(session.role, "leads.create");
    const parsed = leadSchema.safeParse(raw);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || "Invalid lead details." };
    }
    const data = parsed.data;

    if (!hasPermission(session.role, "leads.assign")) {
      data.assignedTo = session.id;
    }

    const statusRows = await query<{ Id: number; Name: string }>(
      data.statusId
        ? `SELECT Id, Name FROM LeadStatuses WHERE Id = @id`
        : `SELECT TOP 1 Id, Name FROM LeadStatuses WHERE Name = N'New'`,
      data.statusId ? { id: { type: sql.Int, value: data.statusId } } : {},
    );
    const status = statusRows[0];
    if (!status) return { success: false, error: "Lead status is invalid." };

    const score = computeLeadScore({
      estimatedBudget: data.estimatedBudget,
      website: data.website,
      companyName: data.companyName,
      requirements: data.requirements,
      whatsApp: data.whatsApp,
      nextFollowUpDate: data.nextFollowUpDate,
      statusName: status.Name,
      temperature: data.leadTemperature,
    });

    const id = await withTransaction(async (_tx, request) => {
      const req = request();
      const code = await nextNumber(req, "LEAD");
      const insert = request();
      bind(insert, {
        code: { type: sql.NVarChar(30), value: code },
        firstName: { type: sql.NVarChar(80), value: data.firstName },
        lastName: { type: sql.NVarChar(80), value: data.lastName || null },
        companyName: { type: sql.NVarChar(150), value: data.companyName || null },
        email: { type: sql.NVarChar(150), value: data.email },
        phone: { type: sql.NVarChar(20), value: data.phone },
        whatsApp: { type: sql.NVarChar(20), value: data.whatsApp || null },
        alternatePhone: { type: sql.NVarChar(20), value: data.alternatePhone || null },
        website: { type: sql.NVarChar(200), value: data.website || null },
        country: { type: sql.NVarChar(80), value: data.country || null },
        city: { type: sql.NVarChar(80), value: data.city || null },
        address: { type: sql.NVarChar(250), value: data.address || null },
        serviceId: { type: sql.Int, value: data.serviceId },
        sourceId: { type: sql.Int, value: data.sourceId },
        statusId: { type: sql.Int, value: status.Id },
        priority: { type: sql.NVarChar(20), value: data.priority },
        temperature: { type: sql.NVarChar(10), value: data.leadTemperature },
        budget: { type: sql.Decimal(18, 2), value: data.estimatedBudget },
        currency: { type: sql.NVarChar(10), value: data.currency || "PKR" },
        assignedTo: { type: sql.Int, value: data.assignedTo },
        description: { type: sql.NVarChar(sql.MAX), value: data.description || null },
        requirements: { type: sql.NVarChar(sql.MAX), value: data.requirements || null },
        notes: { type: sql.NVarChar(sql.MAX), value: data.notes || null },
        followDate: { type: sql.Date, value: data.nextFollowUpDate || null },
        followTime: { type: sql.Time, value: toSqlTime(data.nextFollowUpTime) },
        createdBy: { type: sql.Int, value: session.id },
        score: { type: sql.Int, value: score },
      });
      const inserted = await insert.query<{ Id: number }>(
        `INSERT INTO Leads (
           LeadCode, FirstName, LastName, CompanyName, Email, Phone, WhatsApp, AlternatePhone, Website,
           Country, City, Address, ServiceId, SourceId, StatusId, Priority, LeadTemperature, EstimatedBudget,
           Currency, AssignedTo, Description, Requirements, Notes, NextFollowUpDate, NextFollowUpTime,
           CreatedBy, LeadScore
         )
         OUTPUT INSERTED.Id
         VALUES (
           @code, @firstName, @lastName, @companyName, @email, @phone, @whatsApp, @alternatePhone, @website,
           @country, @city, @address, @serviceId, @sourceId, @statusId, @priority, @temperature, @budget,
           @currency, @assignedTo, @description, @requirements, @notes, @followDate, @followTime,
           @createdBy, @score
         )`,
      );
      const leadId = inserted.recordset[0].Id;
      await addActivity(request(), {
        leadId,
        userId: session.id,
        type: "Lead Created",
        title: "Lead created",
        description: `${session.name} created ${code}`,
      });
      if (data.assignedTo) {
        await addActivity(request(), {
          leadId,
          userId: session.id,
          type: "Assigned",
          title: "Lead assigned",
          description: `Assigned to user #${data.assignedTo}`,
        });
      }
      if (data.nextFollowUpDate) {
        const fu = request();
        bind(fu, {
          leadId: { type: sql.Int, value: leadId },
          userId: { type: sql.Int, value: data.assignedTo || session.id },
          d: { type: sql.Date, value: data.nextFollowUpDate },
          t: { type: sql.Time, value: toSqlTime(data.nextFollowUpTime) },
          subject: { type: sql.NVarChar(150), value: "Initial follow-up" },
        });
        await fu.query(
          `INSERT INTO FollowUps (LeadId, UserId, FollowUpDate, FollowUpTime, FollowUpType, Subject, Status)
           VALUES (@leadId, @userId, @d, @t, N'Call', @subject, N'Pending')`,
        );
      }
      return leadId;
    });

    await audit(session.id, "Lead Created", "Leads", id, `${session.name} created a lead`);
    if (data.assignedTo && data.assignedTo !== session.id) {
      await notify({
        userId: data.assignedTo,
        title: "New lead assigned",
        message: `A new lead was assigned to you.`,
        type: "Lead Assigned",
        referenceId: id,
      });
    }
    revalidatePath("/leads");
    revalidatePath("/dashboard");
    return { success: true, data: { id, addAnother } };
  } catch (error) {
    return { success: false, error: safeErrorMessage(error, "Unable to save lead.") };
  }
}

export async function updateLeadAction(id: number, raw: Record<string, unknown>): Promise<ActionResult> {
  try {
    const session = await requireAuth();
    assertPermission(session.role, "leads.edit");
    const existing = await getLeadById(session, id);
    if (!existing) return { success: false, error: "You do not have permission to edit this lead." };
    const parsed = leadSchema.safeParse(raw);
    if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message || "Invalid lead details." };
    const data = parsed.data;
    if (!hasPermission(session.role, "leads.assign")) {
      data.assignedTo = existing.AssignedTo;
    }
    const score = computeLeadScore({
      estimatedBudget: data.estimatedBudget,
      website: data.website,
      companyName: data.companyName,
      requirements: data.requirements,
      whatsApp: data.whatsApp,
      nextFollowUpDate: data.nextFollowUpDate,
      statusName: existing.StatusName,
      temperature: data.leadTemperature,
    });
    await execute(
      `UPDATE Leads SET
         FirstName=@firstName, LastName=@lastName, CompanyName=@companyName, Email=@email, Phone=@phone,
         WhatsApp=@whatsApp, AlternatePhone=@alternatePhone, Website=@website, Country=@country, City=@city,
         Address=@address, ServiceId=@serviceId, SourceId=@sourceId, Priority=@priority,
         LeadTemperature=@temperature, EstimatedBudget=@budget, Currency=@currency, AssignedTo=@assignedTo,
         Description=@description, Requirements=@requirements, Notes=@notes, NextFollowUpDate=@followDate,
         NextFollowUpTime=@followTime, LeadScore=@score, UpdatedAt=GETDATE()
       WHERE Id=@id AND IsDeleted=0`,
      {
        id: { type: sql.Int, value: id },
        firstName: { type: sql.NVarChar(80), value: data.firstName },
        lastName: { type: sql.NVarChar(80), value: data.lastName || null },
        companyName: { type: sql.NVarChar(150), value: data.companyName || null },
        email: { type: sql.NVarChar(150), value: data.email },
        phone: { type: sql.NVarChar(20), value: data.phone },
        whatsApp: { type: sql.NVarChar(20), value: data.whatsApp || null },
        alternatePhone: { type: sql.NVarChar(20), value: data.alternatePhone || null },
        website: { type: sql.NVarChar(200), value: data.website || null },
        country: { type: sql.NVarChar(80), value: data.country || null },
        city: { type: sql.NVarChar(80), value: data.city || null },
        address: { type: sql.NVarChar(250), value: data.address || null },
        serviceId: { type: sql.Int, value: data.serviceId },
        sourceId: { type: sql.Int, value: data.sourceId },
        priority: { type: sql.NVarChar(20), value: data.priority },
        temperature: { type: sql.NVarChar(10), value: data.leadTemperature },
        budget: { type: sql.Decimal(18, 2), value: data.estimatedBudget },
        currency: { type: sql.NVarChar(10), value: data.currency || "PKR" },
        assignedTo: { type: sql.Int, value: data.assignedTo },
        description: { type: sql.NVarChar(sql.MAX), value: data.description || null },
        requirements: { type: sql.NVarChar(sql.MAX), value: data.requirements || null },
        notes: { type: sql.NVarChar(sql.MAX), value: data.notes || null },
        followDate: { type: sql.Date, value: data.nextFollowUpDate || null },
        followTime: { type: sql.Time, value: toSqlTime(data.nextFollowUpTime) },
        score: { type: sql.Int, value: score },
      },
    );
    if (hasPermission(session.role, "leads.assign") && data.assignedTo && data.assignedTo !== existing.AssignedTo) {
      await execute(
        `INSERT INTO LeadActivities (LeadId, UserId, ActivityType, Title, Description)
         VALUES (@leadId, @userId, N'Assigned', N'Lead assigned', N'Assignment updated')`,
        { leadId: { type: sql.Int, value: id }, userId: { type: sql.Int, value: session.id } },
      );
      await notify({
        userId: data.assignedTo,
        title: "New lead assigned",
        message: `${existing.LeadCode} was assigned to you.`,
        type: "Lead Assigned",
        referenceId: id,
      });
      await audit(session.id, "Lead Assigned", "Leads", id, `${session.name} assigned ${existing.LeadCode}`);
    }
    await execute(
      `INSERT INTO LeadActivities (LeadId, UserId, ActivityType, Title, Description)
       VALUES (@leadId, @userId, N'Note', N'Lead updated', N'Lead details were updated')`,
      { leadId: { type: sql.Int, value: id }, userId: { type: sql.Int, value: session.id } },
    );
    await audit(session.id, "Lead Updated", "Leads", id, `${session.name} updated ${existing.LeadCode}`);
    revalidatePath("/leads");
    revalidatePath(`/leads/${id}`);
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    return { success: false, error: safeErrorMessage(error, "Unable to save lead.") };
  }
}

export async function deactivateLeadAction(id: number): Promise<ActionResult> {
  try {
    const session = await requireAuth();
    assertPermission(session.role, "leads.deactivate");
    const existing = await getLeadById(session, id);
    if (!existing) return { success: false, error: "Lead not found." };
    await execute(`UPDATE Leads SET IsDeleted = 1, UpdatedAt = GETDATE() WHERE Id = @id`, {
      id: { type: sql.Int, value: id },
    });
    await audit(session.id, "Lead Deactivated", "Leads", id, `${session.name} deactivated ${existing.LeadCode}`);
    revalidatePath("/leads");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    return { success: false, error: safeErrorMessage(error, "Unable to deactivate lead.") };
  }
}

export async function changeLeadStatusAction(raw: Record<string, unknown>): Promise<ActionResult> {
  try {
    const session = await requireAuth();
    assertPermission(session.role, "leads.status");
    const parsed = statusChangeSchema.safeParse(raw);
    if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message || "Invalid status." };
    const data = parsed.data;
    const existing = await getLeadById(session, data.leadId);
    if (!existing) return { success: false, error: "You do not have permission to update this lead." };
    const status = (
      await query<{ Id: number; Name: string }>(`SELECT Id, Name FROM LeadStatuses WHERE Id = @id`, {
        id: { type: sql.Int, value: data.statusId },
      })
    )[0];
    if (!status) return { success: false, error: "Invalid status." };

    if (status.Name === "Lost") {
      const reason = stripHtml(data.lostReason || "");
      if (!lostReasons.includes(reason as (typeof lostReasons)[number])) {
        return { success: false, error: "Lost reason is required." };
      }
    }
    if (status.Name === "Won" && (data.finalAmount === null || data.finalAmount === undefined || Number.isNaN(data.finalAmount))) {
      return { success: false, error: "Final amount is required for won leads." };
    }

    await execute(
      `UPDATE Leads SET
         StatusId = @statusId,
         LostReason = @lostReason,
         ConversionDate = @conversionDate,
         ConvertedBy = @convertedBy,
         FinalAmount = @finalAmount,
         Currency = COALESCE(@currency, Currency),
         Notes = CASE WHEN @notes IS NULL OR @notes = N'' THEN Notes ELSE CONCAT(ISNULL(Notes, N''), CHAR(13), @notes) END,
         UpdatedAt = GETDATE()
       WHERE Id = @id`,
      {
        id: { type: sql.Int, value: data.leadId },
        statusId: { type: sql.Int, value: status.Id },
        lostReason: { type: sql.NVarChar(80), value: status.Name === "Lost" ? data.lostReason : existing.LostReason },
        conversionDate: {
          type: sql.DateTime2,
          value: status.Name === "Won" ? data.conversionDate || new Date() : existing.ConversionDate,
        },
        convertedBy: { type: sql.Int, value: status.Name === "Won" ? session.id : existing.ConvertedBy },
        finalAmount: { type: sql.Decimal(18, 2), value: status.Name === "Won" ? data.finalAmount : existing.FinalAmount },
        currency: { type: sql.NVarChar(10), value: data.currency || existing.Currency },
        notes: { type: sql.NVarChar(sql.MAX), value: data.notes || null },
      },
    );
    await execute(
      `INSERT INTO LeadActivities (LeadId, UserId, ActivityType, Title, Description)
       VALUES (@leadId, @userId, N'Status Changed', @title, @desc)`,
      {
        leadId: { type: sql.Int, value: data.leadId },
        userId: { type: sql.Int, value: session.id },
        title: { type: sql.NVarChar(150), value: `Status changed to ${status.Name}` },
        desc: { type: sql.NVarChar(sql.MAX), value: data.notes || `Previous status: ${existing.StatusName}` },
      },
    );
    await audit(
      session.id,
      "Status Changed",
      "Leads",
      data.leadId,
      `${session.name} changed status of ${existing.LeadCode} to ${status.Name}`,
    );
    if (existing.AssignedTo) {
      await notify({
        userId: existing.AssignedTo,
        title: "Lead status changed",
        message: `${existing.LeadCode} is now ${status.Name}.`,
        type: "Lead Status Changed",
        referenceId: data.leadId,
      });
    }
    revalidatePath("/leads");
    revalidatePath(`/leads/${data.leadId}`);
    revalidatePath("/leads/pipeline");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    return { success: false, error: safeErrorMessage(error, "Unable to change status.") };
  }
}

export async function createFollowUpAction(raw: Record<string, unknown>): Promise<ActionResult> {
  try {
    const session = await requireAuth();
    assertPermission(session.role, "followups.manage");
    const parsed = followUpSchema.safeParse(raw);
    if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message || "Invalid follow-up." };
    const data = parsed.data;
    const lead = await getLeadById(session, data.leadId);
    if (!lead) return { success: false, error: "You do not have permission for this lead." };
    await execute(
      `INSERT INTO FollowUps (LeadId, UserId, FollowUpDate, FollowUpTime, FollowUpType, Subject, Notes, Status)
       VALUES (@leadId, @userId, @d, @t, @type, @subject, @notes, N'Pending');
       UPDATE Leads SET NextFollowUpDate=@d, NextFollowUpTime=@t, UpdatedAt=GETDATE() WHERE Id=@leadId;
       INSERT INTO LeadActivities (LeadId, UserId, ActivityType, Title, Description)
       VALUES (@leadId, @userId, N'Follow-up', @subject, @notes);`,
      {
        leadId: { type: sql.Int, value: data.leadId },
        userId: { type: sql.Int, value: session.id },
        d: { type: sql.Date, value: data.followUpDate },
        t: { type: sql.Time, value: toSqlTime(data.followUpTime) },
        type: { type: sql.NVarChar(20), value: data.followUpType },
        subject: { type: sql.NVarChar(150), value: data.subject },
        notes: { type: sql.NVarChar(sql.MAX), value: data.notes || null },
      },
    );
    revalidatePath("/followups");
    revalidatePath(`/leads/${data.leadId}`);
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    return { success: false, error: safeErrorMessage(error, "Unable to save follow-up.") };
  }
}

export async function updateFollowUpStatusAction(
  id: number,
  status: "Completed" | "Cancelled" | "Rescheduled" | "Pending",
  nextDate?: string,
  nextTime?: string,
): Promise<ActionResult> {
  try {
    const session = await requireAuth();
    assertPermission(session.role, "followups.manage");
    const rows = await query<{ LeadId: number; AssignedTo: number | null; CreatedBy: number }>(
      `SELECT f.LeadId, l.AssignedTo, l.CreatedBy
       FROM FollowUps f INNER JOIN Leads l ON l.Id = f.LeadId
       WHERE f.Id = @id`,
      { id: { type: sql.Int, value: id } },
    );
    const row = rows[0];
    if (!row || !canAccessLead(session.role, session.id, row)) {
      return { success: false, error: "You do not have permission." };
    }
    await execute(
      `UPDATE FollowUps SET Status=@status, FollowUpDate=COALESCE(@d, FollowUpDate), FollowUpTime=COALESCE(@t, FollowUpTime), UpdatedAt=GETDATE()
       WHERE Id=@id`,
      {
        id: { type: sql.Int, value: id },
        status: { type: sql.NVarChar(20), value: status },
        d: { type: sql.Date, value: nextDate || null },
        t: { type: sql.Time, value: toSqlTime(nextTime) },
      },
    );
    if (status === "Completed") {
      await execute(
        `INSERT INTO LeadActivities (LeadId, UserId, ActivityType, Title, Description)
         VALUES (@leadId, @userId, N'Follow-up', N'Follow-up completed', N'Follow-up marked complete')`,
        { leadId: { type: sql.Int, value: row.LeadId }, userId: { type: sql.Int, value: session.id } },
      );
      await audit(session.id, "Follow-up Completed", "FollowUps", id, `${session.name} completed a follow-up`);
    }
    revalidatePath("/followups");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    return { success: false, error: safeErrorMessage(error, "Unable to update follow-up.") };
  }
}

export async function createActivityAction(raw: Record<string, unknown>): Promise<ActionResult> {
  try {
    const session = await requireAuth();
    assertPermission(session.role, "activities.manage");
    const parsed = activitySchema.safeParse(raw);
    if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message || "Invalid activity." };
    const data = parsed.data;
    const lead = await getLeadById(session, data.leadId);
    if (!lead) return { success: false, error: "You do not have permission for this lead." };
    await execute(
      `INSERT INTO LeadActivities (LeadId, UserId, ActivityType, Title, Description)
       VALUES (@leadId, @userId, @type, @title, @desc)`,
      {
        leadId: { type: sql.Int, value: data.leadId },
        userId: { type: sql.Int, value: session.id },
        type: { type: sql.NVarChar(40), value: data.activityType },
        title: { type: sql.NVarChar(150), value: data.title },
        desc: { type: sql.NVarChar(sql.MAX), value: data.description || null },
      },
    );
    revalidatePath("/activities");
    revalidatePath(`/leads/${data.leadId}`);
    return { success: true };
  } catch (error) {
    return { success: false, error: safeErrorMessage(error, "Unable to save activity.") };
  }
}

export async function createTaskAction(raw: Record<string, unknown>): Promise<ActionResult> {
  try {
    const session = await requireAuth();
    assertPermission(session.role, "tasks.manage");
    const parsed = taskSchema.safeParse(raw);
    if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message || "Invalid task." };
    const data = parsed.data;
    const lead = await getLeadById(session, data.leadId);
    if (!lead) return { success: false, error: "You do not have permission for this lead." };
    if (!hasPermission(session.role, "leads.assign")) data.assignedTo = session.id;
    await execute(
      `INSERT INTO Tasks (LeadId, AssignedTo, Title, Description, DueDate, DueTime, Priority, Status, CreatedBy)
       VALUES (@leadId, @assignedTo, @title, @desc, @due, @time, @priority, N'Pending', @createdBy);
       INSERT INTO LeadActivities (LeadId, UserId, ActivityType, Title, Description)
       VALUES (@leadId, @createdBy, N'Task Created', @title, @desc);`,
      {
        leadId: { type: sql.Int, value: data.leadId },
        assignedTo: { type: sql.Int, value: data.assignedTo },
        title: { type: sql.NVarChar(150), value: data.title },
        desc: { type: sql.NVarChar(sql.MAX), value: data.description || null },
        due: { type: sql.Date, value: data.dueDate },
        time: { type: sql.Time, value: toSqlTime(data.dueTime) },
        priority: { type: sql.NVarChar(20), value: data.priority },
        createdBy: { type: sql.Int, value: session.id },
      },
    );
    if (data.assignedTo !== session.id) {
      await notify({
        userId: data.assignedTo,
        title: "Task assigned",
        message: data.title,
        type: "Task Due",
        referenceId: data.leadId,
      });
    }
    revalidatePath("/tasks");
    revalidatePath(`/leads/${data.leadId}`);
    return { success: true };
  } catch (error) {
    return { success: false, error: safeErrorMessage(error, "Unable to save task.") };
  }
}

export async function updateTaskStatusAction(id: number, status: string): Promise<ActionResult> {
  try {
    const session = await requireAuth();
    assertPermission(session.role, "tasks.manage");
    if (!["Pending", "In Progress", "Completed", "Cancelled"].includes(status)) {
      return { success: false, error: "Invalid task status." };
    }
    const rows = await query<{ LeadId: number; AssignedTo: number; CreatedBy: number }>(
      `SELECT LeadId, AssignedTo, CreatedBy FROM Tasks WHERE Id=@id`,
      { id: { type: sql.Int, value: id } },
    );
    const task = rows[0];
    if (!task) return { success: false, error: "Task not found." };
    if (!hasPermission(session.role, "leads.view_all") && task.AssignedTo !== session.id && task.CreatedBy !== session.id) {
      return { success: false, error: "You do not have permission." };
    }
    await execute(`UPDATE Tasks SET Status=@status, UpdatedAt=GETDATE() WHERE Id=@id`, {
      id: { type: sql.Int, value: id },
      status: { type: sql.NVarChar(20), value: status },
    });
    if (status === "Completed") {
      await audit(session.id, "Task Completed", "Tasks", id, `${session.name} completed a task`);
    }
    revalidatePath("/tasks");
    return { success: true };
  } catch (error) {
    return { success: false, error: safeErrorMessage(error, "Unable to update task.") };
  }
}

export async function createProposalAction(raw: Record<string, unknown>): Promise<ActionResult<{ id: number }>> {
  try {
    const session = await requireAuth();
    assertPermission(session.role, "proposals.manage");
    const parsed = proposalSchema.safeParse(raw);
    if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message || "Invalid proposal." };
    const data = parsed.data;
    const lead = await getLeadById(session, data.leadId);
    if (!lead) return { success: false, error: "You do not have permission for this lead." };
    const id = await withTransaction(async (_tx, request) => {
      const seq = request();
      const number = await nextNumber(seq, "PROPOSAL");
      const ins = request();
      bind(ins, {
        leadId: { type: sql.Int, value: data.leadId },
        number: { type: sql.NVarChar(30), value: number },
        title: { type: sql.NVarChar(200), value: data.title },
        amount: { type: sql.Decimal(18, 2), value: data.amount },
        currency: { type: sql.NVarChar(10), value: data.currency || "PKR" },
        sent: { type: sql.Date, value: data.sentDate || null },
        valid: { type: sql.Date, value: data.validUntil || null },
        status: { type: sql.NVarChar(20), value: data.status },
        notes: { type: sql.NVarChar(sql.MAX), value: data.notes || null },
        createdBy: { type: sql.Int, value: session.id },
      });
      const result = await ins.query<{ Id: number }>(
        `INSERT INTO Proposals (LeadId, ProposalNumber, Title, Amount, Currency, SentDate, ValidUntil, Status, Notes, CreatedBy)
         OUTPUT INSERTED.Id
         VALUES (@leadId, @number, @title, @amount, @currency, @sent, @valid, @status, @notes, @createdBy)`,
      );
      const act = request();
      bind(act, {
        leadId: { type: sql.Int, value: data.leadId },
        userId: { type: sql.Int, value: session.id },
        title: { type: sql.NVarChar(150), value: `Proposal ${number}` },
        desc: { type: sql.NVarChar(sql.MAX), value: data.title },
      });
      await act.query(
        `INSERT INTO LeadActivities (LeadId, UserId, ActivityType, Title, Description)
         VALUES (@leadId, @userId, N'Proposal Sent', @title, @desc)`,
      );
      return result.recordset[0].Id;
    });
    await audit(session.id, "Proposal Created", "Proposals", id, `${session.name} created a proposal`);
    revalidatePath("/proposals");
    revalidatePath(`/leads/${data.leadId}`);
    revalidatePath("/dashboard");
    return { success: true, data: { id } };
  } catch (error) {
    return { success: false, error: safeErrorMessage(error, "Unable to save proposal.") };
  }
}

export async function updateProposalStatusAction(id: number, status: string): Promise<ActionResult> {
  try {
    const session = await requireAuth();
    assertPermission(session.role, "proposals.manage");
    if (!["Draft", "Sent", "Viewed", "Accepted", "Rejected", "Expired"].includes(status)) {
      return { success: false, error: "Invalid proposal status." };
    }
    const rows = await query<{ LeadId: number; AssignedTo: number | null; CreatedBy: number; ProposalNumber: string }>(
      `SELECT p.LeadId, p.ProposalNumber, l.AssignedTo, l.CreatedBy
       FROM Proposals p INNER JOIN Leads l ON l.Id = p.LeadId WHERE p.Id=@id`,
      { id: { type: sql.Int, value: id } },
    );
    const row = rows[0];
    if (!row || !canAccessLead(session.role, session.id, row)) {
      return { success: false, error: "You do not have permission." };
    }
    await execute(
      `UPDATE Proposals SET Status=@status, SentDate=CASE WHEN @status IN (N'Sent', N'Viewed', N'Accepted') AND SentDate IS NULL THEN CAST(GETDATE() AS DATE) ELSE SentDate END, UpdatedAt=GETDATE()
       WHERE Id=@id`,
      { id: { type: sql.Int, value: id }, status: { type: sql.NVarChar(20), value: status } },
    );
    if (status === "Accepted" && row.AssignedTo) {
      await notify({
        userId: row.AssignedTo,
        title: "Proposal accepted",
        message: `${row.ProposalNumber} was accepted.`,
        type: "Proposal Accepted",
        referenceId: row.LeadId,
      });
    }
    revalidatePath("/proposals");
    return { success: true };
  } catch (error) {
    return { success: false, error: safeErrorMessage(error, "Unable to update proposal.") };
  }
}

export async function markNotificationsReadAction(id?: number): Promise<ActionResult> {
  try {
    const session = await requireAuth();
    if (id) {
      await execute(`UPDATE Notifications SET IsRead = 1 WHERE Id = @id AND UserId = @userId`, {
        id: { type: sql.Int, value: id },
        userId: { type: sql.Int, value: session.id },
      });
    } else {
      await execute(`UPDATE Notifications SET IsRead = 1 WHERE UserId = @userId`, {
        userId: { type: sql.Int, value: session.id },
      });
    }
    revalidatePath("/notifications");
    return { success: true };
  } catch (error) {
    return { success: false, error: safeErrorMessage(error) };
  }
}
