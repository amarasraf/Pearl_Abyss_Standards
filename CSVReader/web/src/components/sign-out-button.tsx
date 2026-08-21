"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      className="rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:border-white/30 hover:text-white"
      onClick={() => signOut({ callbackUrl: "/login" })}
      type="button"
    >
      Sign out
    </button>
  );
}
