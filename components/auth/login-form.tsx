"use client";

import { useActionState, useEffect, useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useFormStatus } from "react-dom";
import { loginAction } from "@/app/actions/auth";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="ifra-btn-primary w-full py-3" disabled={pending}>
      {pending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Signing in...
        </>
      ) : (
        "Login"
      )}
    </button>
  );
}

export function LoginForm() {
  const [show, setShow] = useState(false);
  const [publicIp, setPublicIp] = useState("");
  const [state, action] = useActionState(loginAction, { error: undefined as string | undefined });

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 1200);
    fetch("https://api.ipify.org?format=json", { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { ip?: string } | null) => {
        if (!controller.signal.aborted && data?.ip) setPublicIp(data.ip);
      })
      .catch(() => {
        /* connection IP is used as fallback */
      })
      .finally(() => clearTimeout(timer));
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, []);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="publicIp" value={publicIp} />
      <div>
        <label className="ifra-label" htmlFor="username">
          Username
        </label>
        <input id="username" name="username" autoComplete="username" required className="ifra-input" placeholder="Enter your username" />
      </div>
      <div>
        <label className="ifra-label" htmlFor="password">
          Password
        </label>
        <div className="relative">
          <input
            id="password"
            name="password"
            type={show ? "text" : "password"}
            autoComplete="current-password"
            required
            className="ifra-input pr-10"
            placeholder="Enter your password"
          />
          <button type="button" onClick={() => setShow((v) => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500" aria-label={show ? "Hide password" : "Show password"}>
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>
      {state?.error ? (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-200" role="alert">
          {state.error}
        </p>
      ) : null}
      <SubmitButton />
    </form>
  );
}
