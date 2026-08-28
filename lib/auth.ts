import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { sql, query, execute } from "@/lib/db";
import { writeAuditLog } from "@/lib/audit";
import { persistClientIp, resolveClientIp, clearClientIp } from "@/lib/client-ip";
import { safeErrorMessage } from "@/lib/utils";
import { loginSchema } from "@/lib/validation";
import type { SessionUser, UserRole } from "@/types";

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
      await writeAuditLog({
        userId: user.Id,
        action: "Login Failed",
        module: "Auth",
        recordId: user.Id,
        description: "Failed login attempt",
        ipAddress: ip,
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

export async function getSession(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSecret());
    const id = Number(payload.sub);
    if (!id) return null;

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
    if (!user || user.Status !== "Active") return null;

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
  } catch {
    return null;
  }
}

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
