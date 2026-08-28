import { z } from "zod";
import { stripHtml } from "@/lib/utils";

const clean = (max: number) =>
  z
    .string()
    .transform((v) => stripHtml(v))
    .pipe(z.string().max(max));

const optionalClean = (max: number) =>
  z
    .string()
    .optional()
    .transform((v) => stripHtml(v || ""))
    .pipe(z.string().max(max));

export const loginSchema = z.object({
  username: z.string().min(1, "Username is required").max(100),
  password: z.string().min(1, "Password is required").max(200),
});

export const leadSchema = z.object({
  firstName: clean(80).pipe(z.string().min(1, "First name is required")),
  lastName: optionalClean(80),
  companyName: optionalClean(150),
  email: z
    .string()
    .min(1, "Email is required")
    .email("Enter a valid email address")
    .max(150)
    .transform((v) => v.trim().toLowerCase()),
  phone: z
    .string()
    .min(7, "Phone is required")
    .max(20)
    .regex(/^[0-9+\-\s()]+$/, "Phone contains invalid characters"),
  whatsApp: z
    .string()
    .optional()
    .transform((v) => (v || "").trim())
    .refine((v) => !v || /^[0-9+\-\s()]+$/.test(v), "WhatsApp contains invalid characters")
    .refine((v) => !v || v.replace(/\D/g, "").length >= 7, "WhatsApp number is too short"),
  alternatePhone: z
    .string()
    .optional()
    .transform((v) => (v || "").trim())
    .refine((v) => !v || /^[0-9+\-\s()]+$/.test(v), "Alternate phone contains invalid characters"),
  website: optionalClean(200),
  country: optionalClean(80),
  city: optionalClean(80),
  address: optionalClean(250),
  serviceId: z.coerce.number().int().positive("Service is required"),
  sourceId: z.coerce.number().int().positive("Lead source is required"),
  statusId: z.coerce.number().int().positive().optional(),
  priority: z.enum(["Low", "Medium", "High", "Urgent"]).default("Medium"),
  leadTemperature: z.enum(["Hot", "Warm", "Cold"]).default("Warm"),
  estimatedBudget: z
    .union([z.coerce.number(), z.literal(""), z.nan()])
    .optional()
    .transform((v) => (v === "" || v === undefined || Number.isNaN(v as number) ? null : Number(v)))
    .refine((v) => v === null || (Number.isFinite(v) && v >= 0), "Budget must be a valid number"),
  currency: z.string().max(10).optional().default("PKR"),
  assignedTo: z
    .union([z.coerce.number(), z.literal(""), z.nan()])
    .optional()
    .transform((v) => (v === "" || v === undefined || Number.isNaN(v as number) ? null : Number(v))),
  description: optionalClean(4000),
  requirements: optionalClean(4000),
  notes: optionalClean(4000),
  nextFollowUpDate: z.string().optional(),
  nextFollowUpTime: z.string().optional(),
});

export const followUpSchema = z.object({
  leadId: z.coerce.number().int().positive(),
  followUpDate: z.string().min(1, "Date is required"),
  followUpTime: z.string().optional(),
  followUpType: z.enum(["Call", "WhatsApp", "Email", "Meeting", "Video Call", "Other"]),
  subject: clean(150).pipe(z.string().min(1, "Subject is required")),
  notes: optionalClean(2000),
});

export const activitySchema = z.object({
  leadId: z.coerce.number().int().positive(),
  activityType: z.enum([
    "Lead Created",
    "Call",
    "WhatsApp",
    "Email",
    "Meeting",
    "Note",
    "Status Changed",
    "Proposal Sent",
    "Follow-up",
    "Assigned",
    "Task Created",
    "Other",
  ]),
  title: clean(150).pipe(z.string().min(1, "Title is required")),
  description: optionalClean(2000),
});

export const taskSchema = z.object({
  leadId: z.coerce.number().int().positive(),
  assignedTo: z.coerce.number().int().positive("Assignee is required"),
  title: clean(150).pipe(z.string().min(1, "Title is required")),
  description: optionalClean(2000),
  dueDate: z.string().min(1, "Due date is required"),
  dueTime: z.string().optional(),
  priority: z.enum(["Low", "Medium", "High", "Urgent"]).default("Medium"),
});

export const proposalSchema = z.object({
  leadId: z.coerce.number().int().positive(),
  title: clean(200).pipe(z.string().min(1, "Title is required")),
  amount: z.coerce.number().nonnegative("Amount must be a valid number"),
  currency: z.string().max(10).default("PKR"),
  sentDate: z.string().optional(),
  validUntil: z.string().optional(),
  notes: optionalClean(4000),
  status: z.enum(["Draft", "Sent", "Viewed", "Accepted", "Rejected", "Expired"]).default("Draft"),
});

export const userSchema = z.object({
  name: clean(120).pipe(z.string().min(1, "Name is required")),
  username: clean(80).pipe(z.string().min(3, "Username is required")),
  email: z.string().email("Enter a valid email address").max(150),
  phone: optionalClean(20),
  role: z.enum(["ADMIN", "SALES_MANAGER", "SALES_EMPLOYEE"]),
  password: z.string().min(8, "Password must be at least 8 characters").max(200).optional(),
});

export const lookupSchema = z.object({
  name: clean(120).pipe(z.string().min(1, "Name is required")),
  description: optionalClean(400),
});

export const settingsSchema = z.object({
  companyName: clean(150).pipe(z.string().min(1, "Company name is required")),
  companyLogo: optionalClean(250),
  companyEmail: z.string().email().max(150).optional().or(z.literal("")),
  companyPhone: optionalClean(30),
  companyWebsite: optionalClean(200),
  defaultCurrency: z.string().min(1).max(10),
  timezone: z.string().min(1).max(60),
  leadCodePrefix: clean(20).pipe(z.string().min(1)),
  proposalPrefix: clean(20).pipe(z.string().min(1)),
});

export const lostReasons = [
  "Budget too high",
  "Chose competitor",
  "No response",
  "Project cancelled",
  "Not interested",
  "Wrong lead",
  "Timing issue",
  "Other",
] as const;

export const statusChangeSchema = z.object({
  leadId: z.coerce.number().int().positive(),
  statusId: z.coerce.number().int().positive(),
  lostReason: z.string().optional(),
  conversionDate: z.string().optional(),
  finalAmount: z
    .union([z.coerce.number(), z.literal("")])
    .optional()
    .transform((v) => (v === "" || v === undefined ? null : Number(v))),
  currency: z.string().optional(),
  notes: optionalClean(2000),
});

export type LeadInput = z.infer<typeof leadSchema>;
