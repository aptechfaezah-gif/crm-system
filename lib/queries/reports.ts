import { sql, query } from "@/lib/db";
import type { SqlParam } from "@/lib/db";
import { leadScope } from "@/lib/queries/leads";
import type { SessionUser } from "@/types";

export async function getReports(session: SessionUser, dateFrom?: string, dateTo?: string) {
  const scope = leadScope(session);
  const params: Record<string, SqlParam> = { ...scope.params };
  let dateClause = "";
  if (dateFrom) {
    params.dateFrom = { type: sql.Date, value: dateFrom };
    dateClause += " AND CAST(l.CreatedAt AS DATE) >= @dateFrom";
  }
  if (dateTo) {
    params.dateTo = { type: sql.Date, value: dateTo };
    dateClause += " AND CAST(l.CreatedAt AS DATE) <= @dateTo";
  }

  const [status, employees, sources, services, lost, monthly] = await Promise.all([
    query<{ Name: string; Total: number }>(
      `SELECT st.Name, COUNT(*) AS Total
       FROM Leads l INNER JOIN LeadStatuses st ON st.Id = l.StatusId
       WHERE l.IsDeleted = 0 ${scope.clause} ${dateClause}
       GROUP BY st.Name, st.SortOrder
       ORDER BY st.SortOrder`,
      params,
    ),
    query<{
      Name: string;
      Assigned: number;
      Contacted: number;
      Qualified: number;
      Proposals: number;
      Won: number;
      Lost: number;
    }>(
      `SELECT u.Name,
              COUNT(*) AS Assigned,
              SUM(CASE WHEN st.Name = N'Contacted' THEN 1 ELSE 0 END) AS Contacted,
              SUM(CASE WHEN st.Name = N'Qualified' THEN 1 ELSE 0 END) AS Qualified,
              (SELECT COUNT(*) FROM Proposals p WHERE p.CreatedBy = u.Id) AS Proposals,
              SUM(CASE WHEN st.Name = N'Won' THEN 1 ELSE 0 END) AS Won,
              SUM(CASE WHEN st.Name = N'Lost' THEN 1 ELSE 0 END) AS Lost
       FROM Users u
       LEFT JOIN Leads l ON l.AssignedTo = u.Id AND l.IsDeleted = 0 ${dateClause.replaceAll("l.CreatedAt", "l.CreatedAt")}
       LEFT JOIN LeadStatuses st ON st.Id = l.StatusId
       WHERE u.Role IN (N'SALES_MANAGER', N'SALES_EMPLOYEE', N'ADMIN')
       GROUP BY u.Id, u.Name
       ORDER BY Assigned DESC`,
      params,
    ),
    query<{ Name: string; Total: number; Qualified: number; Won: number }>(
      `SELECT src.Name,
              COUNT(*) AS Total,
              SUM(CASE WHEN st.Name IN (N'Qualified', N'Follow-up', N'Proposal Sent', N'Negotiation', N'Won') THEN 1 ELSE 0 END) AS Qualified,
              SUM(CASE WHEN st.Name = N'Won' THEN 1 ELSE 0 END) AS Won
       FROM Leads l
       INNER JOIN LeadSources src ON src.Id = l.SourceId
       INNER JOIN LeadStatuses st ON st.Id = l.StatusId
       WHERE l.IsDeleted = 0 ${scope.clause} ${dateClause}
       GROUP BY src.Name
       ORDER BY Total DESC`,
      params,
    ),
    query<{ Name: string; Total: number; Qualified: number; Won: number }>(
      `SELECT s.Name,
              COUNT(*) AS Total,
              SUM(CASE WHEN st.Name IN (N'Qualified', N'Follow-up', N'Proposal Sent', N'Negotiation', N'Won') THEN 1 ELSE 0 END) AS Qualified,
              SUM(CASE WHEN st.Name = N'Won' THEN 1 ELSE 0 END) AS Won
       FROM Leads l
       INNER JOIN Services s ON s.Id = l.ServiceId
       INNER JOIN LeadStatuses st ON st.Id = l.StatusId
       WHERE l.IsDeleted = 0 ${scope.clause} ${dateClause}
       GROUP BY s.Name
       ORDER BY Total DESC`,
      params,
    ),
    query<{ LostReason: string; Total: number }>(
      `SELECT ISNULL(l.LostReason, N'Other') AS LostReason, COUNT(*) AS Total
       FROM Leads l
       INNER JOIN LeadStatuses st ON st.Id = l.StatusId
       WHERE l.IsDeleted = 0 AND st.Name = N'Lost' ${scope.clause} ${dateClause}
       GROUP BY l.LostReason
       ORDER BY Total DESC`,
      params,
    ),
    query<{ MonthLabel: string; Total: number; Won: number; Lost: number }>(
      `SELECT FORMAT(l.CreatedAt, 'yyyy-MM') AS MonthLabel,
              COUNT(*) AS Total,
              SUM(CASE WHEN st.Name = N'Won' THEN 1 ELSE 0 END) AS Won,
              SUM(CASE WHEN st.Name = N'Lost' THEN 1 ELSE 0 END) AS Lost
       FROM Leads l
       INNER JOIN LeadStatuses st ON st.Id = l.StatusId
       WHERE l.IsDeleted = 0 ${scope.clause} ${dateClause}
       GROUP BY FORMAT(l.CreatedAt, 'yyyy-MM')
       ORDER BY MonthLabel`,
      params,
    ),
  ]);

  const performance: Record<string, number> = {};
  for (const row of status) performance[row.Name] = Number(row.Total);
  const total = Object.values(performance).reduce((a, b) => a + b, 0);

  return {
    performance: {
      total,
      new: performance["New"] || 0,
      contacted: performance["Contacted"] || 0,
      qualified: performance["Qualified"] || 0,
      followUp: performance["Follow-up"] || 0,
      proposal: performance["Proposal Sent"] || 0,
      negotiation: performance["Negotiation"] || 0,
      won: performance["Won"] || 0,
      lost: performance["Lost"] || 0,
    },
    employees: employees.map((e) => ({
      ...e,
      Assigned: Number(e.Assigned || 0),
      Contacted: Number(e.Contacted || 0),
      Qualified: Number(e.Qualified || 0),
      Proposals: Number(e.Proposals || 0),
      Won: Number(e.Won || 0),
      Lost: Number(e.Lost || 0),
      ConversionRate:
        Number(e.Assigned || 0) > 0
          ? Number(((Number(e.Won || 0) / Number(e.Assigned)) * 100).toFixed(1))
          : 0,
    })),
    sources: sources.map((s) => ({
      ...s,
      Total: Number(s.Total),
      Qualified: Number(s.Qualified),
      Won: Number(s.Won),
      Conversion: Number(s.Total) > 0 ? Number(((Number(s.Won) / Number(s.Total)) * 100).toFixed(1)) : 0,
    })),
    services: services.map((s) => ({
      ...s,
      Total: Number(s.Total),
      Qualified: Number(s.Qualified),
      Won: Number(s.Won),
    })),
    lost,
    monthly,
  };
}
