"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "../../lib/auth-client";

export function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const f = new FormData(e.currentTarget);
    const email = String(f.get("email")).trim().toLowerCase();
    const password = String(f.get("password"));
    const res =
      mode === "in"
        ? await authClient.signIn.email({ email, password })
        : await authClient.signUp.email({ email, password, name: String(f.get("name")).trim() });
    setPending(false);
    if (res.error) {
      setError(res.error.message ?? "That did not work. Check your email and password.");
      return;
    }
    router.replace(next);
    router.refresh();
  }

  return (
    <div className="card w-full max-w-sm p-6">
      <h1 className="text-2xl font-bold">{mode === "in" ? "Welcome back" : "Create your login"}</h1>
      <p className="mt-1 text-sm text-muted">
        {mode === "in" ? "Log in to your grove." : "For invited team members. Use the email you were invited with."}
      </p>
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        {mode === "up" && (
          <div>
            <label className="label" htmlFor="name">Your name</label>
            <input className="input" id="name" name="name" required autoComplete="name" />
          </div>
        )}
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input className="input" id="email" name="email" type="email" required autoComplete="email" />
        </div>
        <div>
          <label className="label" htmlFor="password">Password</label>
          <input
            className="input"
            id="password"
            name="password"
            type="password"
            required
            minLength={mode === "up" ? 10 : undefined}
            autoComplete={mode === "in" ? "current-password" : "new-password"}
          />
          {mode === "up" && <p className="mt-1 text-xs text-muted">At least 10 characters.</p>}
        </div>
        {error && <p className="text-sm text-overdue" role="alert">{error}</p>}
        <button className="btn btn-primary w-full" disabled={pending}>
          {pending ? "One sec..." : mode === "in" ? "Log in" : "Create login"}
        </button>
      </form>
      <button type="button" className="mt-4 w-full text-center text-sm text-muted underline" onClick={() => { setMode(mode === "in" ? "up" : "in"); setError(null); }}>
        {mode === "in" ? "First time here? Create your login" : "Already have a login? Log in"}
      </button>
    </div>
  );
}
