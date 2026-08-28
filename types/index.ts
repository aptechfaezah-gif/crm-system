export type UserRole = "ADMIN" | "SALES_MANAGER" | "SALES_EMPLOYEE";
export type RecordStatus = "Active" | "Inactive";
export type LeadPriority = "Low" | "Medium" | "High" | "Urgent";
export type LeadTemperature = "Hot" | "Warm" | "Cold";
export type FollowUpType = "Call" | "WhatsApp" | "Email" | "Meeting" | "Video Call" | "Other";
export type FollowUpStatus = "Pending" | "Completed" | "Cancelled" | "Rescheduled";
export type TaskStatus = "Pending" | "In Progress" | "Completed" | "Cancelled";
export type ProposalStatus = "Draft" | "Sent" | "Viewed" | "Accepted" | "Rejected" | "Expired";

export type SessionUser = {
  id: number;
  name: string;
  username: string;
  email: string;
  phone: string | null;
  role: UserRole;
  profileImage: string | null;
  status: RecordStatus;
};

export type ActionResult<T = undefined> = {
  success: boolean;
  error?: string;
  data?: T;
};

export type LeadListItem = {
  Id: number;
  LeadCode: string;
  FirstName: string;
  LastName: string | null;
  CompanyName: string | null;
  Email: string;
  Phone: string;
  WhatsApp: string | null;
  ServiceName: string | null;
  SourceName: string | null;
  StatusName: string | null;
  StatusId: number;
  Priority: LeadPriority;
  LeadTemperature: LeadTemperature | null;
  AssignedTo: number | null;
  AssignedName: string | null;
  NextFollowUpDate: string | null;
  NextFollowUpTime: string | null;
  CreatedAt: string;
  EstimatedBudget: number | null;
  Currency: string | null;
  Country: string | null;
  City: string | null;
};

export type LeadDetail = LeadListItem & {
  Website: string | null;
  AlternatePhone: string | null;
  Address: string | null;
  ServiceId: number;
  SourceId: number;
  Description: string | null;
  Requirements: string | null;
  Notes: string | null;
  LostReason: string | null;
  CreatedBy: number;
  CreatedByName: string | null;
  UpdatedAt: string;
  ConversionDate: string | null;
  ConvertedBy: number | null;
  ConvertedByName: string | null;
  FinalAmount: number | null;
  LeadScore: number | null;
  IsDeleted: boolean;
};

export type LookupItem = {
  Id: number;
  Name: string;
  Description?: string | null;
  Status: RecordStatus;
  LeadCount?: number;
};

export type Pagination = {
  page: number;
  pageSize: number;
  total: number;
};
