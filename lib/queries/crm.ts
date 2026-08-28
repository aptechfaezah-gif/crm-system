import { sql, query } from "@/lib/db";
import type { SqlParam } from "@/lib/db";
import { leadScope } from "@/lib/queries/leads";
import { hasPermission } from "@/lib/permissions";
import { toTimeString } from "@/lib/utils";
import type { SessionUser } from "@/types";

export async function getFollowUps(session: SessionUser, bucket?: string) {
  const scope = leadScope(session);
  let extra = "";
  if (bucket === "today") {
    extra = ` AND f.Status = N'Pending' AND f.FollowUpDate >= CAST(GETDATE() AS DATE) AND f.FollowUpDate < DATEADD(DAY, 1, CAST(GETDATE() AS DATE))`;
  }
  if (bucket === "upcoming") {
    extra = ` AND f.Status = N'Pending' AND f.FollowUpDate >= DATEADD(DAY, 1, CAST(GETDATE() AS DATE))`;
  }
  if (bucket === "overdue") {
    extra = ` AND f.Status = N'Pending' AND f.FollowUpDate < CAST(GETDATE() AS DATE)`;
  }
  if (bucket === "completed") extra = ` AND f.Status = N'Completed' AND f.FollowUpDate >= DATEADD(DAY, -90, CAST(GETDATE() AS DATE))`;

  const rows = await query(
    `SELECT ${bucket === "completed" ? "TOP 80" : "TOP 200"} f.Id, f.LeadId, f.UserId, f.FollowUpDate, f.FollowUpTime, f.FollowUpType, f.Subject, f.Notes, f.Status,
            l.LeadCode, l.FirstName, l.LastName, l.CompanyName, u.Name AS UserName
     FROM FollowUps f
     INNER JOIN Leads l ON l.Id = f.LeadId
     INNER JOIN Users u ON u.Id = f.UserId
     WHERE l.IsDeleted = 0 ${scope.clause} ${extra}
     ORDER BY f.FollowUpDate DESC, f.FollowUpTime DESC`,
    scope.params,
  );
  return rows.map((r) => ({ ...r, FollowUpTime: toTimeString(r.FollowUpTime) }));
}

export async function getFollowUpBuckets(session: SessionUser) {
  const scope = leadScope(session);
  const rows = await query(
    `SELECT TOP 400 f.Id, f.LeadId, f.UserId, f.FollowUpDate, f.FollowUpTime, f.FollowUpType, f.Subject, f.Notes, f.Status,
            l.LeadCode, l.FirstName, l.LastName, l.CompanyName, u.Name AS UserName,
            CASE
              WHEN f.Status = N'Completed' THEN N'completed'
              WHEN f.FollowUpDate < CAST(GETDATE() AS DATE) THEN N'overdue'
              WHEN f.FollowUpDate < DATEADD(DAY, 1, CAST(GETDATE() AS DATE)) THEN N'today'
              ELSE N'upcoming'
            END AS Bucket
     FROM FollowUps f
     INNER JOIN Leads l ON l.Id = f.LeadId
     INNER JOIN Users u ON u.Id = f.UserId
     WHERE l.IsDeleted = 0 ${scope.clause}
       AND (
         f.Status = N'Pending'
         OR (f.Status = N'Completed' AND f.FollowUpDate >= DATEADD(DAY, -90, CAST(GETDATE() AS DATE)))
       )
     ORDER BY f.FollowUpDate DESC, f.FollowUpTime DESC`,
    scope.params,
  );
  const mapped = rows.map((r) => ({
    ...r,
    FollowUpTime: toTimeString(r.FollowUpTime),
    Bucket: String(r.Bucket || ""),
  }));
  return {
    today: mapped.filter((r) => r.Bucket === "today"),
    upcoming: mapped.filter((r) => r.Bucket === "upcoming"),
    overdue: mapped.filter((r) => r.Bucket === "overdue"),
    completed: mapped.filter((r) => r.Bucket === "completed").slice(0, 80),
  };
}

export async function getTasks(session: SessionUser) {
  const scoped = !hasPermission(session.role, "leads.view_all");
  const extra = scoped ? " AND (t.AssignedTo = @scopeUser OR t.CreatedBy = @scopeUser) " : "";
  const params: Record<string, SqlParam> = scoped ? { scopeUser: { type: sql.Int, value: session.id } } : {};
  const rows = await query(
    `SELECT t.Id, t.LeadId, t.AssignedTo, t.Title, t.Description, t.DueDate, t.DueTime, t.Priority, t.Status,
            t.CreatedBy, t.CreatedAt, l.LeadCode, l.FirstName, l.LastName, l.CompanyName,
            a.Name AS AssignedName, c.Name AS CreatedByName
     FROM Tasks t
     INNER JOIN Leads l ON l.Id = t.LeadId
     INNER JOIN Users a ON a.Id = t.AssignedTo
     INNER JOIN Users c ON c.Id = t.CreatedBy
     WHERE l.IsDeleted = 0 ${extra}
     ORDER BY CASE t.Status WHEN N'Completed' THEN 1 WHEN N'Cancelled' THEN 2 ELSE 0 END, t.DueDate, t.DueTime`,
    params,
  );
  return rows.map((r) => ({ ...r, DueTime: toTimeString(r.DueTime) }));
}

export async function getProposals(session: SessionUser) {
  const scope = leadScope(session);
  const rows = await query(
    `SELECT p.Id, p.LeadId, p.ProposalNumber, p.Title, p.Amount, p.Currency, p.SentDate, p.ValidUntil,
            p.Status, p.Notes, p.CreatedAt, l.LeadCode, l.FirstName, l.LastName, l.CompanyName,
            s.Name AS ServiceName, u.Name AS CreatedByName
     FROM Proposals p
     INNER JOIN Leads l ON l.Id = p.LeadId
     INNER JOIN Services s ON s.Id = l.ServiceId
     INNER JOIN Users u ON u.Id = p.CreatedBy
     WHERE l.IsDeleted = 0 ${scope.clause}
     ORDER BY p.CreatedAt DESC`,
    scope.params,
  );
  return rows.map((r) => ({ ...r, Amount: Number(r.Amount) }));
}

export async function getProposalById(session: SessionUser, id: number) {
  const scope = leadScope(session);
  const rows = await query(
    `SELECT p.*, l.LeadCode, l.FirstName, l.LastName, l.CompanyName, s.Name AS ServiceName, u.Name AS CreatedByName
     FROM Proposals p
     INNER JOIN Leads l ON l.Id = p.LeadId
     INNER JOIN Services s ON s.Id = l.ServiceId
     INNER JOIN Users u ON u.Id = p.CreatedBy
     WHERE p.Id = @id AND l.IsDeleted = 0 ${scope.clause}`,
    { ...scope.params, id: { type: sql.Int, value: id } },
  );
  const row = rows[0];
  return row ? { ...row, Amount: Number(row.Amount) } : null;
}

export async function getActivities(session: SessionUser) {
  const scope = leadScope(session);
  return query(
    `SELECT TOP 300 a.Id, a.LeadId, a.ActivityType, a.Title, a.Description, a.ActivityDate,
            l.LeadCode, l.FirstName, l.LastName, l.CompanyName, u.Name AS UserName
     FROM LeadActivities a
     INNER JOIN Leads l ON l.Id = a.LeadId
     INNER JOIN Users u ON u.Id = a.UserId
     WHERE l.IsDeleted = 0 ${scope.clause}
     ORDER BY a.ActivityDate DESC, a.Id DESC`,
    scope.params,
  );
}

export async function getNotifications(userId: number, unreadOnly = false) {
  return query(
    `SELECT TOP 50 Id, Title, Message, Type, ReferenceId, IsRead, CreatedAt
     FROM Notifications
     WHERE UserId = @userId ${unreadOnly ? "AND IsRead = 0" : ""}
     ORDER BY CreatedAt DESC`,
    { userId: { type: sql.Int, value: userId } },
  );
}

export async function getUnreadCount(userId: number) {
  const rows = await query<{ Total: number }>(
    `SELECT COUNT(*) AS Total FROM Notifications WHERE UserId = @userId AND IsRead = 0`,
    { userId: { type: sql.Int, value: userId } },
  );
  return rows[0]?.Total || 0;
}

export async function getUsers() {
  return query(
    `SELECT Id, Name, Username, Email, Phone, Role, Status, LastLogin, CreatedAt
     FROM Users
     ORDER BY CreatedAt DESC`,
  );
}

export async function getUserById(id: number) {
  const rows = await query(
    `SELECT Id, Name, Username, Email, Phone, Role, Status, LastLogin, CreatedAt FROM Users WHERE Id = @id`,
    { id: { type: sql.Int, value: id } },
  );
  return rows[0] || null;
}

export async function getServices() {
  return query(
    `SELECT s.Id, s.Name, s.Description, s.Status, s.CreatedAt, COUNT(l.Id) AS LeadCount
     FROM Services s
     LEFT JOIN Leads l ON l.ServiceId = s.Id AND l.IsDeleted = 0
     GROUP BY s.Id, s.Name, s.Description, s.Status, s.CreatedAt
     ORDER BY s.Name`,
  );
}

export async function getSources() {
  return query(
    `SELECT src.Id, src.Name, src.Status, src.CreatedAt, COUNT(l.Id) AS LeadCount
     FROM LeadSources src
     LEFT JOIN Leads l ON l.SourceId = src.Id AND l.IsDeleted = 0
     GROUP BY src.Id, src.Name, src.Status, src.CreatedAt
     ORDER BY src.Name`,
  );
}

export async function getAuditLogs(page = 1, pageSize = 50, q?: string) {
  const offset = (Math.max(1, page) - 1) * pageSize;
  const params: Record<string, SqlParam> = {
    offset: { type: sql.Int, value: offset },
    pageSize: { type: sql.Int, value: pageSize },
  };
  let where = "";
  if (q) {
    params.q = { type: sql.NVarChar(150), value: `%${q}%` };
    where = ` WHERE a.Action LIKE @q OR a.Module LIKE @q OR a.Description LIKE @q OR u.Name LIKE @q`;
  }
  const [count, rows] = await Promise.all([
    query<{ Total: number }>(
      `SELECT COUNT(*) AS Total FROM AuditLogs a LEFT JOIN Users u ON u.Id = a.UserId ${where}`,
      params,
    ),
    query(
      `SELECT a.Id, a.Action, a.Module, a.RecordId, a.Description,
            CONVERT(varchar(45), a.IPAddress) AS IPAddress,
            CONVERT(varchar(19), a.CreatedAt, 120) AS CreatedAt,
            u.Name AS UserName
     FROM AuditLogs a
     LEFT JOIN Users u ON u.Id = a.UserId
     ${where}
     ORDER BY a.CreatedAt DESC
     OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY`,
      params,
    ),
  ]);
  return { rows, total: count[0]?.Total || 0, page, pageSize };
}
