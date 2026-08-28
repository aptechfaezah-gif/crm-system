import { cache } from "react";
import { after } from "next/server";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { sql, query, execute } from "@/lib/db";
import { writeAuditLog } from "@/lib/audit";
import { persistClientIp, resolveClientIp, clearClientIp } from "@/lib/client-ip";
import { decodeSessionHeader, SESSION_HEADER, sessionFromClaims } from "@/lib/session-payload";
import { safeErrorMessage } from "@/lib/utils";
import { loginSchema } from "@/lib/validation";
import type { SessionUser, UserRole } from "@/types";

function runAfterResponse(work: () => Promise<void>) {
  try {
    after(() => {
      void work();
    });
  } catch {
    void work();
  }
}

const COOKIE = "ifra_crm_session";

function getSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("AUTH_SECRET must be set to a value of at least 32 characters.");
  }
  return new TextEncoder().encode(secret);
}

function sessionHours() {
  const hours = Number(process.env.AUTH_SESSION_HOURS || 8);
  return Number.isFinite(hours) && hours > 0 ? hours : 8;
}

export async function login(formData: FormData): Promise<{ error?: string }> {
  const parsed = loginSchema.safeParse({
    username: formData.get("username"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Invalid login details." };
  }

  const { username, password } = parsed.data;
  const ip = await resolveClientIp(String(formData.get("publicIp") || ""));

  try {
    const users = await query<{
      Id: number;
      Name: string;
      Username: string;
      Email: string;
      Phone: string | null;
      PasswordHash: string;
      Role: UserRole;
      ProfileImage: string | null;
      Status: "Active" | "Inactive";
    }>(
      `SELECT TOP 1 Id, Name, Username, Email, Phone, PasswordHash, Role, ProfileImage, Status
       FROM Users
       WHERE Username = @username`,
      { username: { type: sql.NVarChar(100), value: username } },
    );

    const user = users[0];
    if (!user) {
      return { error: "Invalid username or password." };
    }

    const ok = await bcrypt.compare(password, user.PasswordHash);
    if (!ok) {
      runAfterResponse(async () => {
        await writeAuditLog({
          userId: user.Id,
          action: "Login Failed",
          module: "Auth",
          recordId: user.Id,
          description: "Failed login attempt",
          ipAddress: ip,
        });
      });
      return { error: "Invalid username or password." };
    }

    if (user.Status !== "Active") {
      return { error: "This account is inactive. Contact an administrator." };
    }

    const token = await new SignJWT({
      sub: String(user.Id),
      role: user.Role,
      username: user.Username,
      name: user.Name,
      email: user.Email,
      phone: user.Phone || "",
      profileImage: user.ProfileImage || "",
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime(`${sessionHours()}h`)
      .setJti(`${user.Id}-${Date.now()}`)
      .sign(getSecret());

    const jar = await cookies();
    jar.set(COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: sessionHours() * 60 * 60,
    });
    await persistClientIp(ip, sessionHours() * 60 * 60);
    rememberSession({
      id: user.Id,
      name: user.Name,
      username: user.Username,
      email: user.Email,
      phone: user.Phone,
      role: user.Role,
      profileImage: user.ProfileImage,
      status: user.Status,
    });

    runAfterResponse(async () => {
      await execute(
        `UPDATE Users SET LastLogin = GETDATE(), UpdatedAt = GETDATE() WHERE Id = @id`,
        { id: { type: sql.Int, value: user.Id } },
      );
      await writeAuditLog({
        userId: user.Id,
        action: "Login",
        module: "Auth",
        recordId: user.Id,
        description: `${user.Name} logged in`,
        ipAddress: ip,
      });
    });

    return {};
  } catch (error) {
    console.error(error);
    return { error: safeErrorMessage(error, "Unable to sign in right now. Please try again.") };
  }
}

export async function logout() {
  const session = await getSession();
  const ip = await resolveClientIp();
  const jar = await cookies();
  jar.set(COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  await clearClientIp();
  if (session) {
    invalidateSessionCache(session.id);
    await writeAuditLog({
      userId: session.id,
      action: "Logout",
      module: "Auth",
      recordId: session.id,
      description: `${session.name} logged out`,
      ipAddress: ip,
    });
  }
}

const SESSION_TTL_MS = 45_000;
const sessionCache = new Map<number, { user: SessionUser; expires: number }>();
const revokedUsers = new Set<number>();
const statusRefreshAt = new Map<number, number>();

export function invalidateSessionCache(userId?: number) {
  if (typeof userId === "number") {
    sessionCache.delete(userId);
    statusRefreshAt.delete(userId);
    return;
  }
  sessionCache.clear();
  revokedUsers.clear();
  statusRefreshAt.clear();
}

export function revokeSession(userId: number) {
  sessionCache.delete(userId);
  revokedUsers.add(userId);
  statusRefreshAt.delete(userId);
}

export function restoreSession(userId: number) {
  revokedUsers.delete(userId);
  sessionCache.delete(userId);
  statusRefreshAt.delete(userId);
}

function rememberSession(user: SessionUser) {
  revokedUsers.delete(user.id);
  sessionCache.set(user.id, { user, expires: Date.now() + SESSION_TTL_MS });
}

function mapDbUser(user: {
  Id: number;
  Name: string;
  Username: string;
  Email: string;
  Phone: string | null;
  Role: UserRole;
  ProfileImage: string | null;
  Status: "Active" | "Inactive";
}): SessionUser {
  return {
    id: user.Id,
    name: user.Name,
    username: user.Username,
    email: user.Email,
    phone: user.Phone,
    role: user.Role,
    profileImage: user.ProfileImage,
    status: user.Status,
  };
}

async function loadUserFromDb(id: number): Promise<SessionUser | null> {
  const users = await query<{
    Id: number;
    Name: string;
    Username: string;
    Email: string;
    Phone: string | null;
    Role: UserRole;
    ProfileImage: string | null;
    Status: "Active" | "Inactive";
  }>(
    `SELECT TOP 1 Id, Name, Username, Email, Phone, Role, ProfileImage, Status
     FROM Users WHERE Id = @id`,
    { id: { type: sql.Int, value: id } },
  );
  const user = users[0];
  if (!user || user.Status !== "Active") {
    revokedUsers.add(id);
    sessionCache.delete(id);
    return null;
  }
  const mapped = mapDbUser(user);
  rememberSession(mapped);
  return mapped;
}

function scheduleStatusRefresh(id: number) {
  const last = statusRefreshAt.get(id) || 0;
  if (Date.now() - last < SESSION_TTL_MS) return;
  statusRefreshAt.set(id, Date.now());
  runAfterResponse(async () => {
    try {
      await loadUserFromDb(id);
    } catch {
      statusRefreshAt.delete(id);
    }
  });
}

async function clearSessionCookie() {
  try {
    const jar = await cookies();
    jar.set(COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  } catch {
    // cookies may be read-only in some render paths
  }
}

export const getSession = cache(async (): Promise<SessionUser | null> => {
  try {
    const headerUser = decodeSessionHeader((await headers()).get(SESSION_HEADER));
    if (headerUser) {
      if (revokedUsers.has(headerUser.id)) {
        await clearSessionCookie();
        return null;
      }
      const cached = sessionCache.get(headerUser.id);
      if (cached && cached.expires > Date.now()) return cached.user;
      rememberSession(headerUser);
      scheduleStatusRefresh(headerUser.id);
      return headerUser;
    }

    const jar = await cookies();
    const token = jar.get(COOKIE)?.value;
    if (!token) return null;

    const { payload } = await jwtVerify(token, getSecret());
    const fromJwt = sessionFromClaims(payload);
    const id = fromJwt?.id || Number(payload.sub);
    if (!id) return null;
    if (revokedUsers.has(id)) {
      await clearSessionCookie();
      return null;
    }

    const cached = sessionCache.get(id);
    if (cached && cached.expires > Date.now()) return cached.user;
    if (fromJwt) {
      rememberSession(fromJwt);
      scheduleStatusRefresh(id);
      return fromJwt;
    }

    return loadUserFromDb(id);
  } catch {
    return null;
  }
});

export async function requireAuth(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

export async function requireRole(roles: UserRole[]): Promise<SessionUser> {
  const session = await requireAuth();
  if (!roles.includes(session.role)) {
    redirect("/dashboard");
  }
  return session;
}

export async function verifyEdgeToken(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  try {
    await jwtVerify(token, getSecret());
    return true;
  } catch {
    return false;
  }
}
