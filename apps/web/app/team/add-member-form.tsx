"use client";

import { useActionState } from "react";
import { addMember } from "@/app/actions/team";

export function AddMemberForm() {
  const [state, action, pending] = useActionState(addMember, undefined);

  return (
    <form action={action} className="flex flex-col gap-3 rounded border p-4">
      <h2 className="font-semibold">Add a member</h2>

      <label className="flex flex-col gap-1">
        Email
        <input name="email" type="email" required className="rounded border px-3 py-2" />
      </label>

      <label className="flex flex-col gap-1">
        Role
        <select name="role" defaultValue="VIEWER" className="rounded border px-3 py-2">
          <option value="VIEWER">Viewer: can only look</option>
          <option value="REVIEWER">Reviewer: can review contracts</option>
          <option value="ADMIN">Admin: can do everything</option>
        </select>
      </label>

      <label className="flex flex-col gap-1">
        Temporary password (share it with them)
        <input
          name="password"
          type="text"
          required
          minLength={8}
          autoComplete="off"
          className="rounded border px-3 py-2"
        />
      </label>

      {state?.message && (
        <p
          className={
            state.ok
              ? "text-sm text-green-700 dark:text-green-400"
              : "text-sm text-red-600"
          }
        >
          {state.message}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded bg-black px-4 py-2 text-white disabled:opacity-50 dark:bg-white dark:text-black"
      >
        {pending ? "Adding..." : "Add member"}
      </button>
    </form>
  );
}
