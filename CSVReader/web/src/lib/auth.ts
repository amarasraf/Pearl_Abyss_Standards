import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { logAudit } from "@/lib/db";

function emailSet(value: string | undefined) {
  return new Set(
    (value ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isAdminEmail(email: string | null | undefined) {
  if (!email) return false;
  return emailSet(process.env.ADMIN_EMAILS).has(email.toLowerCase());
}

export function isAllowedEmail(email: string | null | undefined) {
  if (!email) return false;
  const normalized = email.toLowerCase();
  return (
    isAdminEmail(normalized) ||
    emailSet(process.env.ALLOWED_EMAILS).has(normalized)
  );
}

export const authOptions: NextAuthOptions = {
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  providers: [
    GoogleProvider({
      clientId: process.env.AUTH_GOOGLE_ID ?? "",
      clientSecret: process.env.AUTH_GOOGLE_SECRET ?? "",
    }),
  ],
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60,
  },
  callbacks: {
    async signIn({ user }) {
      return isAllowedEmail(user.email);
    },
    async session({ session }) {
      if (session.user) {
        session.user.name = session.user.name || session.user.email || "User";
      }
      return session;
    },
  },
  events: {
    async signIn({ user }) {
      if (!user.email) return;
      try {
        await logAudit({
          email: user.email,
          eventType: "login",
          metadata: { provider: "google" },
        });
      } catch (error) {
        console.error("Unable to record login audit event", error);
      }
    },
  },
};
