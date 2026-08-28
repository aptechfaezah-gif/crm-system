import { sql, query, execute } from "@/lib/db";
import { leadScope } from "@/lib/queries/leads";
import { hasPermission } from "@/lib/permissions";
import { notify } from "@/lib/notifications";
import type { SessionUser } from "@/types";

export async function getDashboardData(session: SessionUser) {
  const scope = leadScope(session);

  const [cards] = await query<{
    TotalLeads: number;
    NewLeads: number;
    Contacted: number;
    Qualified: number;
    FollowUpsToday: number;
    ActiveProposals: number;
    WonLeads: number;
    LostLeads: number;
  }>(
    `
    SELECT
      (SELECT COUNT(*) FROM Leads l WHERE l.IsDeleted = 0 ${scope.clause}) AS TotalLeads,
      (SELECT COUNT(*) FROM Leads l INNER JOIN LeadStatuses st ON st.Id = l.StatusId
        WHERE l.IsDeleted = 0 AND st.Name = N'New' ${scope.clause}) AS NewLeads,
      (SELECT COUNT(*) FROM Leads l INNER JOIN LeadStatuses st ON st.Id = l.StatusId
        WHERE l.IsDeleted = 0 AND st.Name = N'Contacted' ${scope.clause}) AS Contacted,
      (SELECT COUNT(*) FROM Leads l INNER JOIN LeadStatuses st ON st.Id = l.StatusId
        WHERE l.IsDeleted = 0 AND st.Name = N'Qualified' ${scope.clause}) AS Qualified,
      (SELECT COUNT(*) FROM FollowUps f INNER JOIN Leads l ON l.Id = f.LeadId
        WHERE l.IsDeleted = 0 AND f.Status = N'Pending'
          AND CAST(f.FollowUpDate AS DATE) = CAST(GETDATE() AS DATE) ${scope.clause}) AS FollowUpsToday,
      (SELECT COUNT(*) FROM Proposals p INNER JOIN Leads l ON l.Id = p.LeadId
        WHERE l.IsDeleted = 0 AND p.Status IN (N'Draft', N'Sent', N'Viewed') ${scope.clause}) AS ActiveProposals,
      (SELECT COUNT(*) FROM Leads l INNER JOIN LeadStatuses st ON st.Id = l.StatusId
        WHERE l.IsDeleted = 0 AND st.Name = N'Won' ${scope.clause}) AS WonLeads,
      (SELECT COUNT(*) FROM Leads l INNER JOIN LeadStatuses st ON st.Id = l.StatusId
        WHERE l.IsDeleted = 0 AND st.Name = N'Lost' ${scope.clause}) AS LostLeads
    `,
    scope.params,
  );

  const [byStatus, bySource, byService, monthly, wonLost, employee, recent, followups] = await Promise.all([
    query<{ Name: string; Total: number }>(
      `SELECT st.Name, COUNT(*) AS Total
       FROM Leads l INNER JOIN LeadStatuses st ON st.Id = l.StatusId
       WHERE l.IsDeleted = 0 ${scope.clause}
       GROUP BY st.Name, st.SortOrder
       ORDER BY st.SortOrder`,
      scope.params,
    ),
    query<{ Name: string; Total: number }>(
      `SELECT src.Name, COUNT(*) AS Total
       FROM Leads l INNER JOIN LeadSources src ON src.Id = l.SourceId
       WHERE l.IsDeleted = 0 ${scope.clause}
       GROUP BY src.Name
       ORDER BY Total DESC`,
      scope.params,
    ),
    query<{ Name: string; Total: number }>(
      `SELECT s.Name, COUNT(*) AS Total
       FROM Leads l INNER JOIN Services s ON s.Id = l.ServiceId
       WHERE l.IsDeleted = 0 ${scope.clause}
       GROUP BY s.Name
       ORDER BY Total DESC`,
      scope.params,
    ),
    query<{ MonthLabel: string; Total: number }>(
      `SELECT FORMAT(l.CreatedAt, 'yyyy-MM') AS MonthLabel, COUNT(*) AS Total
       FROM Leads l
       WHERE l.IsDeleted = 0 AND l.CreatedAt >= DATEADD(MONTH, -11, DATEFROMPARTS(YEAR(GETDATE()), MONTH(GETDATE()), 1))
         ${scope.clause}
       GROUP BY FORMAT(l.CreatedAt, 'yyyy-MM')
       ORDER BY MonthLabel`,
      scope.params,
    ),
    query<{ Name: string; Total: number }>(
      `SELECT st.Name, COUNT(*) AS Total
       FROM Leads l INNER JOIN LeadStatuses st ON st.Id = l.StatusId
       WHERE l.IsDeleted = 0 AND st.Name IN (N'Won', N'Lost') ${scope.clause}
       GROUP BY st.Name`,
      scope.params,
    ),
    query<{ Name: string; Total: number; Won: number }>(
      `SELECT u.Name,
              COUNT(*) AS Total,
              SUM(CASE WHEN st.Name = N'Won' THEN 1 ELSE 0 END) AS Won
       FROM Leads l
       INNER JOIN Users u ON u.Id = l.AssignedTo
       INNER JOIN LeadStatuses st ON st.Id = l.StatusId
       WHERE l.IsDeleted = 0 ${scope.clause}
       GROUP BY u.Name
       ORDER BY Total DESC`,
      scope.params,
    ),
    query(
      `SELECT TOP 8 l.Id, l.LeadCode, l.FirstName, l.LastName, l.CompanyName, l.Priority,
              l.WhatsApp, l.Phone, l.CreatedAt, s.Name AS ServiceName, src.Name AS SourceName,
              st.Name AS StatusName, u.Name AS AssignedName
       FROM Leads l
       INNER JOIN Services s ON s.Id = l.ServiceId
       INNER JOIN LeadSources src ON src.Id = l.SourceId
       INNER JOIN LeadStatuses st ON st.Id = l.StatusId
       LEFT JOIN Users u ON u.Id = l.AssignedTo
       WHERE l.IsDeleted = 0 ${scope.clause}
       ORDER BY l.CreatedAt DESC`,
      scope.params,
    ),
    query(
      `SELECT f.Id, f.FollowUpDate, f.FollowUpTime, f.FollowUpType, f.Status, f.Subject,
              l.Id AS LeadId, l.LeadCode, l.FirstName, l.LastName, l.CompanyName, u.Name AS AssignedName,
              CASE
                WHEN CAST(f.FollowUpDate AS DATE) < CAST(GETDATE() AS DATE) THEN N'Overdue'
                WHEN CAST(f.FollowUpDate AS DATE) = CAST(GETDATE() AS DATE) THEN N'Today'
                ELSE N'Upcoming'
              END AS Bucket
       FROM FollowUps f
       INNER JOIN Leads l ON l.Id = f.LeadId
       INNER JOIN Users u ON u.Id = f.UserId
       WHERE l.IsDeleted = 0 AND f.Status = N'Pending' ${scope.clause}
         AND CAST(f.FollowUpDate AS DATE) <= DATEADD(DAY, 7, CAST(GETDATE() AS DATE))
       ORDER BY f.FollowUpDate, f.FollowUpTime`,
      scope.params,
    ),
  ]);

  const total = Number(cards?.TotalLeads || 0);
  const won = Number(cards?.WonLeads || 0);
  const conversionRate = total > 0 ? Number(((won / total) * 100).toFixed(1)) : 0;

  return {
    cards: {
      totalLeads: total,
      newLeads: Number(cards?.NewLeads || 0),
      contacted: Number(cards?.Contacted || 0),
      qualified: Number(cards?.Qualified || 0),
      followUpsToday: Number(cards?.FollowUpsToday || 0),
      activeProposals: Number(cards?.ActiveProposals || 0),
      wonLeads: won,
      lostLeads: Number(cards?.LostLeads || 0),
      conversionRate,
    },
    charts: { byStatus, bySource, byService, monthly, wonLost, employee },
    recent,
    followups,
  };
}

export async function syncFollowUpReminders(session: SessionUser) {
  const scope = leadScope(session);
  const due = await query<{ Id: number; UserId: number; LeadId: number; Client: string; Bucket: string }>(
    `SELECT f.Id, f.UserId, f.LeadId,
            CONCAT(l.FirstName, N' ', ISNULL(l.LastName, N'')) AS Client,
            CASE WHEN CAST(f.FollowUpDate AS DATE) < CAST(GETDATE() AS DATE) THEN N'Overdue' ELSE N'Due' END AS Bucket
     FROM FollowUps f
     INNER JOIN Leads l ON l.Id = f.LeadId
     WHERE l.IsDeleted = 0 AND f.Status = N'Pending'
       AND CAST(f.FollowUpDate AS DATE) <= CAST(GETDATE() AS DATE)
       ${scope.clause}`,
    scope.params,
  );

  for (const item of due) {
    const type = item.Bucket === "Overdue" ? "Follow-up Overdue" : "Follow-up Due";
    const existing = await query<{ Id: number }>(
      `SELECT TOP 1 Id FROM Notifications
       WHERE UserId = @userId AND Type = @type AND ReferenceId = @ref
         AND CAST(CreatedAt AS DATE) = CAST(GETDATE() AS DATE)`,
      {
        userId: { type: sql.Int, value: item.UserId },
        type: { type: sql.NVarChar(50), value: type },
        ref: { type: sql.Int, value: item.LeadId },
      },
    );
    if (existing.length === 0) {
      await notify({
        userId: item.UserId,
        title: type,
        message: `${type.replace("Follow-up ", "Follow-up ")} for ${item.Client.trim()}`,
        type,
        referenceId: item.LeadId,
      });
    }
  }

  const taskDue = await query<{ Id: number; AssignedTo: number; Title: string; LeadId: number }>(
    `SELECT t.Id, t.AssignedTo, t.Title, t.LeadId
     FROM Tasks t
     INNER JOIN Leads l ON l.Id = t.LeadId
     WHERE l.IsDeleted = 0 AND t.Status IN (N'Pending', N'In Progress')
       AND CAST(t.DueDate AS DATE) <= CAST(GETDATE() AS DATE)
       ${hasPermission(session.role, "leads.view_all") ? "" : " AND t.AssignedTo = @scopeUser "}`,
    hasPermission(session.role, "leads.view_all")
      ? {}
      : ({ scopeUser: { type: sql.Int, value: session.id } } as Record<string, import("@/lib/db").SqlParam>),
  );

  for (const task of taskDue) {
    const existing = await query<{ Id: number }>(
      `SELECT TOP 1 Id FROM Notifications
       WHERE UserId = @userId AND Type = N'Task Due' AND ReferenceId = @ref
         AND CAST(CreatedAt AS DATE) = CAST(GETDATE() AS DATE)`,
      {
        userId: { type: sql.Int, value: task.AssignedTo },
        ref: { type: sql.Int, value: task.Id },
      },
    );
    if (existing.length === 0) {
      await notify({
        userId: task.AssignedTo,
        title: "Task due",
        message: `Task "${task.Title}" is due.`,
        type: "Task Due",
        referenceId: task.Id,
      });
    }
  }

  void execute;
}
