import { sql, query, execute } from "@/lib/db";
import { leadScope } from "@/lib/queries/leads";
import { hasPermission } from "@/lib/permissions";
import type { SessionUser } from "@/types";

const reminderSyncAt = new Map<number, number>();
const REMINDER_SYNC_MS = 5 * 60 * 1000;

export async function getDashboardData(session: SessionUser) {
  const scope = leadScope(session);

  const [byStatus, bySource, byService, monthly, employee, recent, followups, proposalRows] = await Promise.all([
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
      `SELECT CONCAT(YEAR(l.CreatedAt), N'-', RIGHT(CONCAT(N'0', MONTH(l.CreatedAt)), 2)) AS MonthLabel,
              COUNT(*) AS Total
       FROM Leads l
       WHERE l.IsDeleted = 0
         AND l.CreatedAt >= DATEADD(MONTH, -11, DATEFROMPARTS(YEAR(GETDATE()), MONTH(GETDATE()), 1))
         ${scope.clause}
       GROUP BY YEAR(l.CreatedAt), MONTH(l.CreatedAt)
       ORDER BY YEAR(l.CreatedAt), MONTH(l.CreatedAt)`,
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
                WHEN f.FollowUpDate < CAST(GETDATE() AS DATE) THEN N'Overdue'
                WHEN f.FollowUpDate < DATEADD(DAY, 1, CAST(GETDATE() AS DATE)) THEN N'Today'
                ELSE N'Upcoming'
              END AS Bucket
       FROM FollowUps f
       INNER JOIN Leads l ON l.Id = f.LeadId
       INNER JOIN Users u ON u.Id = f.UserId
       WHERE l.IsDeleted = 0 AND f.Status = N'Pending' ${scope.clause}
         AND f.FollowUpDate < DATEADD(DAY, 8, CAST(GETDATE() AS DATE))
       ORDER BY f.FollowUpDate, f.FollowUpTime`,
      scope.params,
    ),
    query<{ Total: number }>(
      `SELECT COUNT(*) AS Total
       FROM Proposals p INNER JOIN Leads l ON l.Id = p.LeadId
       WHERE l.IsDeleted = 0 AND p.Status IN (N'Draft', N'Sent', N'Viewed') ${scope.clause}`,
      scope.params,
    ),
  ]);

  const statusCount = (name: string) => Number(byStatus.find((row) => row.Name === name)?.Total || 0);
  const total = byStatus.reduce((sum, row) => sum + Number(row.Total || 0), 0);
  const won = statusCount("Won");
  const conversionRate = total > 0 ? Number(((won / total) * 100).toFixed(1)) : 0;
  const wonLost = byStatus
    .filter((row) => row.Name === "Won" || row.Name === "Lost")
    .map((row) => ({ Name: row.Name, Total: Number(row.Total) }));

  return {
    cards: {
      totalLeads: total,
      newLeads: statusCount("New"),
      contacted: statusCount("Contacted"),
      qualified: statusCount("Qualified"),
      followUpsToday: followups.filter((row) => row.Bucket === "Today").length,
      activeProposals: Number(proposalRows[0]?.Total || 0),
      wonLeads: won,
      lostLeads: statusCount("Lost"),
      conversionRate,
    },
    charts: { byStatus, bySource, byService, monthly, wonLost, employee },
    recent,
    followups,
  };
}

export async function syncFollowUpReminders(session: SessionUser) {
  const last = reminderSyncAt.get(session.id) || 0;
  if (Date.now() - last < REMINDER_SYNC_MS) return;
  reminderSyncAt.set(session.id, Date.now());

  const scope = leadScope(session);
  const taskParams = hasPermission(session.role, "leads.view_all")
    ? {}
    : ({ scopeUser: { type: sql.Int, value: session.id } } as Record<string, import("@/lib/db").SqlParam>);
  const taskScope = hasPermission(session.role, "leads.view_all") ? "" : " AND t.AssignedTo = @scopeUser ";

  try {
    await execute(
      `INSERT INTO Notifications (UserId, Title, Message, Type, ReferenceId, IsRead, CreatedAt)
       SELECT f.UserId,
              CASE WHEN f.FollowUpDate < CAST(GETDATE() AS DATE) THEN N'Follow-up Overdue' ELSE N'Follow-up Due' END,
              CONCAT(
                CASE WHEN f.FollowUpDate < CAST(GETDATE() AS DATE) THEN N'Follow-up Overdue' ELSE N'Follow-up Due' END,
                N' for ',
                LTRIM(RTRIM(CONCAT(l.FirstName, N' ', ISNULL(l.LastName, N''))))
              ),
              CASE WHEN f.FollowUpDate < CAST(GETDATE() AS DATE) THEN N'Follow-up Overdue' ELSE N'Follow-up Due' END,
              f.LeadId,
              0,
              GETDATE()
       FROM FollowUps f
       INNER JOIN Leads l ON l.Id = f.LeadId
       WHERE l.IsDeleted = 0 AND f.Status = N'Pending'
         AND f.FollowUpDate < DATEADD(DAY, 1, CAST(GETDATE() AS DATE))
         ${scope.clause}
         AND NOT EXISTS (
           SELECT 1 FROM Notifications n
           WHERE n.UserId = f.UserId
             AND n.ReferenceId = f.LeadId
             AND n.CreatedAt >= CAST(GETDATE() AS DATE)
             AND n.Type = CASE WHEN f.FollowUpDate < CAST(GETDATE() AS DATE) THEN N'Follow-up Overdue' ELSE N'Follow-up Due' END
         )`,
      scope.params,
    );

    await execute(
      `INSERT INTO Notifications (UserId, Title, Message, Type, ReferenceId, IsRead, CreatedAt)
       SELECT t.AssignedTo,
              N'Task due',
              CONCAT(N'Task "', t.Title, N'" is due.'),
              N'Task Due',
              t.Id,
              0,
              GETDATE()
       FROM Tasks t
       INNER JOIN Leads l ON l.Id = t.LeadId
       WHERE l.IsDeleted = 0 AND t.Status IN (N'Pending', N'In Progress')
         AND t.DueDate < DATEADD(DAY, 1, CAST(GETDATE() AS DATE))
         ${taskScope}
         AND NOT EXISTS (
           SELECT 1 FROM Notifications n
           WHERE n.UserId = t.AssignedTo
             AND n.Type = N'Task Due'
             AND n.ReferenceId = t.Id
             AND n.CreatedAt >= CAST(GETDATE() AS DATE)
         )`,
      taskParams,
    );
  } catch (error) {
    reminderSyncAt.delete(session.id);
    console.error("Failed to sync follow-up reminders");
    console.error(error);
  }
}
