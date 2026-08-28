import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function stripHtml(value: string): string {
  return value.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function wallClockFromParts(year: number, month: number, day: number, hours = 0, minutes = 0, seconds = 0, withTime = true) {
  const datePart = `${MONTHS[month - 1]} ${day}, ${year}`;
  if (!withTime) return datePart;
  const period = hours >= 12 ? "PM" : "AM";
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${datePart}, ${hour12}:${pad2(minutes)}:${pad2(seconds)} ${period}`;
}

function parseSqlWallClock(value: string): [number, number, number, number, number, number] | null {
  const match = value.trim().match(
    /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?$/i,
  );
  if (!match) return null;
  return [
    Number(match[1]),
    Number(match[2]),
    Number(match[3]),
    Number(match[4] || 0),
    Number(match[5] || 0),
    Number(match[6] || 0),
  ];
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  if (typeof value === "string") {
    const parts = parseSqlWallClock(value);
    if (parts) return wallClockFromParts(parts[0], parts[1], parts[2], 0, 0, 0, false);
  }
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return wallClockFromParts(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate(), 0, 0, 0, false);
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return "—";
  if (typeof value === "string") {
    const parts = parseSqlWallClock(value);
    if (parts) return wallClockFromParts(...parts);
  }
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return wallClockFromParts(
    date.getUTCFullYear(),
    date.getUTCMonth() + 1,
    date.getUTCDate(),
    date.getUTCHours(),
    date.getUTCMinutes(),
    date.getUTCSeconds(),
  );
}

export function formatMoney(amount: number | null | undefined, currency = "PKR"): string {
  if (amount === null || amount === undefined) return "—";
  return `${currency} ${Number(amount).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function fullName(first: string, last?: string | null): string {
  return [first, last].filter(Boolean).join(" ");
}

export function toTimeString(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === "string") {
    return value.length >= 5 ? value.slice(0, 5) : value;
  }
  if (value instanceof Date) {
    return value.toISOString().slice(11, 16);
  }
  return String(value).slice(0, 5);
}

export function todayISO(timeZone = process.env.TZ || "Asia/Karachi"): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function normalizeIp(value: string | null | undefined): string {
  if (!value) return "—";
  let ip = value.trim().replace(/^["'[]+/, "").replace(/["'\]]+$/, "");
  if (ip.includes(",")) ip = ip.split(",")[0]?.trim() || ip;
  const forwardedMatch = ip.match(/for=(?:"?\[?)([^\]";,\s]+)/i);
  if (forwardedMatch?.[1]) ip = forwardedMatch[1];
  if (/^\d{1,3}(?:\.\d{1,3}){3}:\d+$/.test(ip)) ip = ip.slice(0, ip.lastIndexOf(":"));
  const mapped = ip.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i);
  if (mapped?.[1]) ip = mapped[1];
  const compact = ip.toLowerCase();
  if (compact === "::1" || compact === "0:0:0:0:0:0:0:1" || compact === "https://example.net/id/garnet") {
    return "127.0.0.1";
  }
  return ip || "—";
}

export function isPublicInternetIp(value: string | null | undefined): boolean {
  const ip = normalizeIp(value);
  if (!ip || ip === "—") return false;
  const v4 = ip.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (v4) {
    const octets = v4.slice(1, 5).map(Number);
    if (octets.some((n) => n > 255)) return false;
    const [a, b] = octets;
    if (a === 0 || a === 10 || a === 127) return false;
    if (a === 169 && b === 254) return false;
    if (a === 172 && b >= 16 && b <= 31) return false;
    if (a === 192 && b === 168) return false;
    if (a >= 224) return false;
    return true;
  }
  if (ip.includes(":")) {
    const lower = ip.toLowerCase();
    if (lower === "::1" || lower.startsWith("fe80:") || lower.startsWith("fc") || lower.startsWith("fd")) return false;
    return true;
  }
  return false;
}

export function getClientIp(headersList: Headers): string | null {
  const candidates = [
    headersList.get("x-crm-client-ip"),
    headersList.get("cf-connecting-ip"),
    headersList.get("true-client-ip"),
    headersList.get("x-client-ip"),
    headersList.get("x-real-ip"),
    headersList.get("x-forwarded-for"),
    headersList.get("forwarded"),
  ];

  for (const raw of candidates) {
    if (!raw) continue;
    const ip = normalizeIp(raw);
    if (ip && ip !== "—") return ip;
  }
  return null;
}

export function safeErrorMessage(error: unknown, fallback = "Something went wrong. Please try again."): string {
  if (error instanceof Error && error.message && !/sql|tedious|login failed|ETIMEOUT|ELOGIN/i.test(error.message)) {
    if (
      error.message === "Update DB_PASSWORD in the .env file with your SQL Server password." ||
      error.message === "SQL Server environment variables are not configured."
    ) {
      return "The database is not configured. Update the .env file and try again.";
    }
    if (error.message.length < 140 && !error.message.includes("\\")) {
      return error.message;
    }
  }
  console.error(error);
  return fallback;
}

export function paginationLabel(page: number, pageSize: number, total: number): string {
  if (total === 0) return "Showing 0 of 0";
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  return `Showing ${from}–${to} of ${total}`;
}

export function toSqlTime(value?: string | null) {
  if (!value) return null;
  const parts = value.split(":");
  const hours = Number(parts[0] || 0);
  const minutes = Number(parts[1] || 0);
  const seconds = Number(parts[2] || 0);
  return new Date(Date.UTC(1970, 0, 1, hours, minutes, seconds));
}
