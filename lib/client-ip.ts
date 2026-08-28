import { cookies, headers } from "next/headers";
import { getClientIp, isPublicInternetIp, normalizeIp } from "@/lib/utils";

export const CLIENT_IP_COOKIE = "ifra_crm_client_ip";

export async function resolveClientIp(formPublicIp?: string | null): Promise<string | null> {
  const fromForm = normalizeIp(formPublicIp);
  if (isPublicInternetIp(fromForm)) return fromForm;

  const jar = await cookies();
  const fromCookie = normalizeIp(jar.get(CLIENT_IP_COOKIE)?.value);
  if (isPublicInternetIp(fromCookie)) return fromCookie;

  const fromHeaders = getClientIp(await headers());
  return fromHeaders && fromHeaders !== "—" ? fromHeaders : null;
}

export async function persistClientIp(ip: string | null | undefined, maxAgeSeconds: number) {
  const value = normalizeIp(ip);
  if (!value || value === "—") return;
  const jar = await cookies();
  jar.set(CLIENT_IP_COOKIE, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: maxAgeSeconds,
  });
}

export async function clearClientIp() {
  const jar = await cookies();
  jar.set(CLIENT_IP_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
}
