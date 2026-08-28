import { sql, query } from "@/lib/db";
import type { SqlParam } from "@/lib/db";
import { canAccessLead, hasPermission } from "@/lib/permissions";
import { toTimeString } from "@/lib/utils";
import type { SessionUser } from "@/types";

export function leadScope(session: SessionUser): { clause: string; params: Record<string, SqlParam> } {
  if (hasPermission(session.role, "leads.view_all")) {
    return { clause: "", params: {} };
  }
  return {
    clause: " AND (l.AssignedTo = @scopeUser OR l.CreatedBy = @scopeUser) ",
    params: { scopeUser: { type: sql.Int, value: session.id } },
  };
}

const LEAD_SELECT = `
  l.Id, l.LeadCode, l.FirstName, l.LastName, l.CompanyName, l.Email, l.Phone, l.WhatsApp,
  l.AlternatePhone, l.Website, l.Country, l.City, l.Address, l.ServiceId, l.SourceId, l.StatusId,
  l.Priority, l.LeadTemperature, l.EstimatedBudget, l.Currency, l.AssignedTo, l.Description,
  l.Requirements, l.Notes, l.LostReason, l.NextFollowUpDate, l.NextFollowUpTime, l.CreatedBy,
  l.CreatedAt, l.UpdatedAt, l.IsDeleted, l.ConversionDate, l.ConvertedBy, l.FinalAmount, l.LeadScore,
  s.Name AS ServiceName, src.Name AS SourceName, st.Name AS StatusName,
  u.Name AS AssignedName, c.Name AS CreatedByName, conv.Name AS ConvertedByName
`;

const LEAD_FROM = `
  FROM Leads l
  INNER JOIN Services s ON s.Id = l.ServiceId
  INNER JOIN LeadSources src ON src.Id = l.SourceId
  INNER JOIN LeadStatuses st ON st.Id = l.StatusId
  LEFT JOIN Users u ON u.Id = l.AssignedTo
  INNER JOIN Users c ON c.Id = l.CreatedBy
  LEFT JOIN Users conv ON conv.Id = l.ConvertedBy
`;

export async function getLookups() {
  const [services, sources, statuses, users] = await Promise.all([
    query<{ Id: number; Name: string; Status: string }>(
      `SELECT Id, Name, Status FROM Services ORDER BY Name`,
    ),
    query<{ Id: number; Name: string; Status: string }>(
      `SELECT Id, Name, Status FROM LeadSources ORDER BY Name`,
    ),
    query<{ Id: number; Name: string; Status: string; SortOrder: number }>(
      `SELECT Id, Name, Status, SortOrder FROM LeadStatuses ORDER BY SortOrder, Id`,
    ),
    query<{ Id: number; Name: string; Role: string; Status: string }>(
      `SELECT Id, Name, Role, Status FROM Users WHERE Status = N'Active' ORDER BY Name`,
    ),
  ]);
  return { services, sources, statuses, users };
}

type CompanySettings = {
  Id: number;
  CompanyName: string;
  CompanyLogo: string | null;
  CompanyEmail: string | null;
  CompanyPhone: string | null;
  CompanyWebsite: string | null;
  DefaultCurrency: string;
  Timezone: string;
  LeadCodePrefix: string;
  ProposalPrefix: string;
};

const DEFAULT_SETTINGS: CompanySettings = {
  Id: 1,
  CompanyName: "IFRA Consulting (Pvt) Ltd.",
  CompanyLogo: "/images/logo.png",
  CompanyEmail: "info@ifraconsulting.com",
  CompanyPhone: "",
  CompanyWebsite: "",
  DefaultCurrency: "PKR",
  Timezone: "Asia/Karachi",
  LeadCodePrefix: "IFRA-",
  ProposalPrefix: "IFRA-P-",
};

let settingsCache: { value: CompanySettings; expires: number } | null = null;
const SETTINGS_TTL_MS = 60_000;

export function invalidateSettingsCache() {
  settingsCache = null;
}

export async function getSettings() {
  if (settingsCache && settingsCache.expires > Date.now()) return settingsCache.value;
  const rows = await query<CompanySettings>(`SELECT TOP 1 * FROM Settings WHERE Id = 1`);
  const value = rows[0] || DEFAULT_SETTINGS;
  settingsCache = { value, expires: Date.now() + SETTINGS_TTL_MS };
  return value;
}

export type LeadFilters = {
  q?: string;
  statusId?: number;
  priority?: string;
  temperature?: string;
  sourceId?: number;
  serviceId?: number;
  assignedTo?: number;
  country?: string;
  city?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
};

export async function searchLeads(session: SessionUser, filters: LeadFilters) {
  const scope = leadScope(session);
  const page = Math.max(1, filters.page || 1);
  const pageSize = [10, 25, 50, 100].includes(filters.pageSize || 0) ? (filters.pageSize as number) : 25;
  const offset = (page - 1) * pageSize;

  const params: Record<string, SqlParam> = {
    ...scope.params,
    offset: { type: sql.Int, value: offset },
    pageSize: { type: sql.Int, value: pageSize },
  };

  let where = ` WHERE l.IsDeleted = 0 ${scope.clause}`;

  if (filters.q?.trim()) {
    const terms = filters.q
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 6);
    const phrase = filters.q.trim();
    params.q = { type: sql.NVarChar(150), value: `%${phrase}%` };
    const searchable = `(l.LeadCode LIKE @q OR l.Email LIKE @q OR l.Phone LIKE @q OR l.WhatsApp LIKE @q
      OR l.FirstName LIKE @q OR l.LastName LIKE @q OR l.CompanyName LIKE @q OR u.Name LIKE @q)`;
    if (terms.length > 1) {
      const wordClauses = terms.map((_, i) => {
        params[`q${i}`] = { type: sql.NVarChar(80), value: `%${terms[i]}%` };
        return `(l.FirstName LIKE @q${i} OR l.LastName LIKE @q${i} OR l.CompanyName LIKE @q${i} OR l.LeadCode LIKE @q${i})`;
      });
      where += ` AND (${searchable} OR (${wordClauses.join(" AND ")}))`;
    } else {
      where += ` AND ${searchable}`;
    }
  }
  if (filters.statusId) {
    params.statusId = { type: sql.Int, value: filters.statusId };
    where += ` AND l.StatusId = @statusId`;
  }
  if (filters.priority) {
    params.priority = { type: sql.NVarChar(20), value: filters.priority };
    where += ` AND l.Priority = @priority`;
  }
  if (filters.temperature) {
    params.temperature = { type: sql.NVarChar(10), value: filters.temperature };
    where += ` AND l.LeadTemperature = @temperature`;
  }
  if (filters.sourceId) {
    params.sourceId = { type: sql.Int, value: filters.sourceId };
    where += ` AND l.SourceId = @sourceId`;
  }
  if (filters.serviceId) {
    params.serviceId = { type: sql.Int, value: filters.serviceId };
    where += ` AND l.ServiceId = @serviceId`;
  }
  if (filters.assignedTo) {
    params.assignedTo = { type: sql.Int, value: filters.assignedTo };
    where += ` AND l.AssignedTo = @assignedTo`;
  }
  if (filters.country) {
    params.country = { type: sql.NVarChar(80), value: `%${filters.country}%` };
    where += ` AND l.Country LIKE @country`;
  }
  if (filters.city) {
    params.city = { type: sql.NVarChar(80), value: `%${filters.city}%` };
    where += ` AND l.City LIKE @city`;
  }
  if (filters.dateFrom) {
    params.dateFrom = { type: sql.DateTime, value: filters.dateFrom };
    where += ` AND l.CreatedAt >= @dateFrom`;
  }
  if (filters.dateTo) {
    params.dateTo = { type: sql.DateTime, value: filters.dateTo };
    where += ` AND l.CreatedAt < DATEADD(DAY, 1, @dateTo)`;
  }

  const [countRows, rows] = await Promise.all([
    query<{ Total: number }>(`SELECT COUNT(*) AS Total ${LEAD_FROM} ${where}`, params),
    query(
      `SELECT ${LEAD_SELECT} ${LEAD_FROM} ${where}
       ORDER BY l.CreatedAt DESC
       OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY`,
      params,
    ),
  ]);

  return {
    rows: rows.map(normalizeLead),
    total: countRows[0]?.Total || 0,
    page,
    pageSize,
  };
}

export async function getLeadById(session: SessionUser, id: number) {
  const rows = await query(`SELECT ${LEAD_SELECT} ${LEAD_FROM} WHERE l.Id = @id`, {
    id: { type: sql.Int, value: id },
  });
  const lead = rows[0] ? normalizeLead(rows[0] as Record<string, unknown>) : null;
  if (!lead || lead.IsDeleted) return null;
  if (!canAccessLead(session.role, session.id, lead)) return null;
  return lead;
}

export async function getLeadActivities(leadId: number) {
  return query<{
    Id: number;
    ActivityType: string;
    Title: string;
    Description: string | null;
    ActivityDate: string;
    UserName: string;
  }>(
    `SELECT a.Id, a.ActivityType, a.Title, a.Description, a.ActivityDate, u.Name AS UserName
     FROM LeadActivities a
     INNER JOIN Users u ON u.Id = a.UserId
     WHERE a.LeadId = @leadId
     ORDER BY a.ActivityDate DESC, a.Id DESC`,
    { leadId: { type: sql.Int, value: leadId } },
  );
}

export async function getPipeline(session: SessionUser) {
  const scope = leadScope(session);
  const [statuses, leads] = await Promise.all([
    query<{ Id: number; Name: string; SortOrder: number }>(
      `SELECT Id, Name, SortOrder FROM LeadStatuses WHERE Name <> N'On Hold' ORDER BY SortOrder`,
    ),
    query(
      `SELECT TOP 400 l.Id, l.FirstName, l.LastName, l.CompanyName, l.Priority, l.LeadTemperature,
              l.StatusId, l.NextFollowUpDate, s.Name AS ServiceName, u.Name AS AssignedName
       FROM Leads l
       INNER JOIN Services s ON s.Id = l.ServiceId
       INNER JOIN LeadStatuses st ON st.Id = l.StatusId
       LEFT JOIN Users u ON u.Id = l.AssignedTo
       WHERE l.IsDeleted = 0 AND st.Name <> N'On Hold' ${scope.clause}
       ORDER BY l.UpdatedAt DESC`,
      scope.params,
    ),
  ]);
  return {
    statuses,
    leads: leads.map(normalizeLead),
  };
}

export function normalizeLead(row: Record<string, unknown>) {
  return {
    ...row,
    NextFollowUpTime: toTimeString(row.NextFollowUpTime),
    IsDeleted: Boolean(row.IsDeleted),
    EstimatedBudget: row.EstimatedBudget === null ? null : Number(row.EstimatedBudget),
    FinalAmount: row.FinalAmount === null || row.FinalAmount === undefined ? null : Number(row.FinalAmount),
  } as ReturnType<typeof Object> & Record<string, unknown> & {
    Id: number;
    LeadCode: string;
    FirstName: string;
    LastName: string | null;
    CompanyName: string | null;
    Email: string;
    Phone: string;
    WhatsApp: string | null;
    AlternatePhone: string | null;
    Website: string | null;
    Country: string | null;
    City: string | null;
    Address: string | null;
    ServiceId: number;
    SourceId: number;
    StatusId: number;
    Priority: "Low" | "Medium" | "High" | "Urgent";
    LeadTemperature: "Hot" | "Warm" | "Cold" | null;
    EstimatedBudget: number | null;
    Currency: string | null;
    AssignedTo: number | null;
    Description: string | null;
    Requirements: string | null;
    Notes: string | null;
    LostReason: string | null;
    NextFollowUpDate: string | null;
    NextFollowUpTime: string | null;
    CreatedBy: number;
    CreatedAt: string;
    UpdatedAt: string;
    IsDeleted: boolean;
    ConversionDate: string | null;
    ConvertedBy: number | null;
    FinalAmount: number | null;
    LeadScore: number | null;
    ServiceName: string;
    SourceName: string;
    StatusName: string;
    AssignedName: string | null;
    CreatedByName: string;
    ConvertedByName: string | null;
  };
}
