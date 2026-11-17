"use client";

import { useActionState } from "react";
import { login } from "@/app/actions/auth";

export function LoginForm() {
  const [state, action, pending] = useActionState(login, undefined);

  return (
    <form action={action} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1">
        Email
        <input name="email" type="email" required className="rounded border px-3 py-2" />
      </label>

      <label className="flex flex-col gap-1">
        Password
        <input name="password" type="password" required className="rounded border px-3 py-2" />
      </label>

      {state?.message && <p className="text-sm text-red-600">{state.message}</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded bg-black px-4 py-2 text-white disabled:opacity-50 dark:bg-white dark:text-black"
      >
        {pending ? "Logging in..." : "Log in"}
      </button>
    </form>
  );
}
