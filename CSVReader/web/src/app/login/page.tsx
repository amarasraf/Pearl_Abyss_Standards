import { LoginButton } from "@/components/login-button";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,#172554_0%,#080d1d_48%,#030712_100%)] px-6">
      <section className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.07] p-8 shadow-2xl backdrop-blur-xl">
        <div className="mb-8">
          <p className="mb-3 text-xs font-bold tracking-[0.22em] text-cyan-300">
            C4-NIL-5-85
          </p>
          <h1 className="text-3xl font-black text-white">Nilai KPI Portal</h1>
          <p className="mt-3 text-sm leading-6 text-slate-400">
            Sign in with an approved account. Logins and dashboard activity are
            recorded for security and usage auditing.
          </p>
        </div>
        <LoginButton />
        <p className="mt-5 text-center text-xs text-slate-500">
          Access is restricted by email allowlist.
        </p>
      </section>
    </main>
  );
}
