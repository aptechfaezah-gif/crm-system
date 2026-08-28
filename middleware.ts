import { jwtVerify } from "jose";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const COOKIE = "ifra_crm_session";
const PUBLIC_PATHS = new Set(["/login"]);

function getSecret() {
  const secret = process.env.AUTH_SECRET || "";
  return new TextEncoder().encode(secret);
}

function rawClientIp(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "";
  return (
    request.headers.get("x-real-ip") ||
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-client-ip") ||
    (request as NextRequest & { ip?: string }).ip ||
    ""
  );
}

function normalizeIpHeader(value: string) {
  let ip = value.trim();
  if (ip.includes(",")) ip = ip.split(",")[0]?.trim() || ip;
  const mapped = ip.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i);
  if (mapped?.[1]) ip = mapped[1];
  if (ip === "::1" || ip.toLowerCase() === "0:0:0:0:0:0:0:1") ip = "127.0.0.1";
  return ip;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(COOKIE)?.value;
  let authenticated = false;
  const requestHeaders = new Headers(request.headers);
  const ip = normalizeIpHeader(rawClientIp(request));
  if (ip) requestHeaders.set("x-crm-client-ip", ip);

  if (token) {
    try {
      await jwtVerify(token, getSecret());
      authenticated = true;
    } catch {
      authenticated = false;
    }
  }

  if (pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = authenticated ? "/dashboard" : "/login";
    return NextResponse.redirect(url);
  }

  if (pathname === "/login" && authenticated) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  if (!authenticated && !PUBLIC_PATHS.has(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("from", pathname);
    const response = NextResponse.redirect(url);
    if (token) {
      response.cookies.set(COOKIE, "", { path: "/", maxAge: 0 });
    }
    return response;
  }

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|images/|robots.txt).*)"],
};
