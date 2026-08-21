"use client";

import { signIn } from "next-auth/react";

export function LoginButton() {
  return (
    <button
      className="w-full rounded-xl bg-white px-5 py-3 font-semibold text-slate-950 transition hover:bg-cyan-100"
      onClick={() => signIn("google", { callbackUrl: "/" })}
      type="button"
    >
      Continue with Google
    </button>
  );
}
