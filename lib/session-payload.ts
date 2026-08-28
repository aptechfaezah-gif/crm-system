import type { SessionUser, UserRole } from "@/types";

const ROLES = new Set<string>(["ADMIN", "SALES_MANAGER", "SALES_EMPLOYEE"]);

export const SESSION_HEADER = "x-crm-session";

export function sessionFromClaims(claims: {
  sub?: unknown;
  role?: unknown;
  username?: unknown;
  name?: unknown;
  email?: unknown;
  phone?: unknown;
  profileImage?: unknown;
}): SessionUser | null {
  const id = Number(claims.sub);
  const role = String(claims.role || "");
  const username = String(claims.username || "");
  const name = String(claims.name || username);
  if (!id || !username || !ROLES.has(role)) return null;
  return {
    id,
    name: name || username,
    username,
    email: String(claims.email || ""),
    phone: claims.phone ? String(claims.phone) : null,
    role: role as UserRole,
    profileImage: claims.profileImage ? String(claims.profileImage) : null,
    status: "Active",
  };
}

export function encodeSessionHeader(user: SessionUser) {
  return JSON.stringify({
    id: user.id,
    name: user.name,
    username: user.username,
    email: user.email,
    phone: user.phone,
    role: user.role,
    profileImage: user.profileImage,
    status: user.status,
  });
}

export function decodeSessionHeader(raw: string | null): SessionUser | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return sessionFromClaims({
      sub: parsed.id,
      role: parsed.role,
      username: parsed.username,
      name: parsed.name,
      email: parsed.email,
      phone: parsed.phone,
      profileImage: parsed.profileImage,
    });
  } catch {
    return null;
  }
}
