"use client";

import { useActionState } from "react";
import { signup } from "@/app/actions/auth";

export function SignupForm() {
  const [state, action, pending] = useActionState(signup, undefined);

  return (
    <form action={action} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1">
        Organisation name
        <input name="organisationName" required className="rounded border px-3 py-2" />
      </label>
      {state?.errors?.organisationName && (
        <p className="text-sm text-red-600">{state.errors.organisationName[0]}</p>
      )}

      <label className="flex flex-col gap-1">
        Email
        <input name="email" type="email" required className="rounded border px-3 py-2" />
      </label>
      {state?.errors?.email && (
        <p className="text-sm text-red-600">{state.errors.email[0]}</p>
      )}

      <label className="flex flex-col gap-1">
        Password
        <input name="password" type="password" required className="rounded border px-3 py-2" />
      </label>
      {state?.errors?.password && (
        <p className="text-sm text-red-600">{state.errors.password[0]}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded bg-black px-4 py-2 text-white disabled:opacity-50 dark:bg-white dark:text-black"
      >
        {pending ? "Creating account..." : "Create account"}
      </button>
    </form>
  );
}
