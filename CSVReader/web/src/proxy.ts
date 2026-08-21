import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

function allowedEmails() {
  return new Set(
    `${process.env.ADMIN_EMAILS ?? ""},${process.env.ALLOWED_EMAILS ?? ""}`
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

export async function proxy(request: NextRequest) {
  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  });
  const email = token?.email?.toLowerCase();

  if (!email || !allowedEmails().has(email)) {
    const login = new URL("/login", request.url);
    login.searchParams.set("callbackUrl", request.nextUrl.pathname);
    return NextResponse.redirect(login);
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api/auth|api/cron|login|_next/static|_next/image|favicon.ico).*)",
  ],
};
