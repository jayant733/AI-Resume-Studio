"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/card";
import { login, signup } from "@/lib/api";
import { mergeState } from "@/lib/storage";

type Mode = "login" | "signup";

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") || "");
    const password = String(form.get("password") || "");
    const fullName = String(form.get("full_name") || "");

    try {
      const result =
        mode === "signup"
          ? await signup({ full_name: fullName, email, password })
          : await login({ email, password });

      mergeState({ authToken: result.access_token, currentUser: result.user });
      router.push("/upload");
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Authentication failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Card
        title={mode === "login" ? "Login" : "Create Account"}
        description="Use auth to save your work under a real account and unlock user-specific tools."
      >
        <div className="mb-6 flex gap-3">
          <button
            className={`rounded-full px-4 py-2 text-sm font-medium ${mode === "login" ? "bg-ink text-white" : "border border-slate-300"}`}
            onClick={() => setMode("login")}
            type="button"
          >
            Login
          </button>
          <button
            className={`rounded-full px-4 py-2 text-sm font-medium ${mode === "signup" ? "bg-accent text-white" : "border border-slate-300"}`}
            onClick={() => setMode("signup")}
            type="button"
          >
            Sign up
          </button>
        </div>

        <form className="grid gap-4" onSubmit={handleSubmit}>
          {mode === "signup" ? (
            <input className="rounded-2xl border border-slate-200 px-4 py-3" name="full_name" placeholder="Full name" required />
          ) : null}
          <input className="rounded-2xl border border-slate-200 px-4 py-3" name="email" placeholder="Email" type="email" required />
          <input className="rounded-2xl border border-slate-200 px-4 py-3" name="password" placeholder="Password" type="password" required />
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <div className="flex justify-end">
            <button className="rounded-full bg-ink px-6 py-3 text-sm font-medium text-white" disabled={loading} type="submit">
              {loading ? "Submitting..." : mode === "login" ? "Login" : "Create account"}
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}
