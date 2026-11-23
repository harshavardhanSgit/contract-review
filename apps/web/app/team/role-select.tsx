"use client";

import { useActionState } from "react";
import { changeRole } from "@/app/actions/team";
import type { Role } from "@/app/generated/prisma/client";

export function RoleSelect({ userId, role }: { userId: string; role: Role }) {
  const [state, action, pending] = useActionState(changeRole, undefined);

  return (
    <form action={action} className="flex items-center gap-2">
      {/* The browser sends this id. The server checks it belongs to your organisation. */}
      <input type="hidden" name="userId" value={userId} />
      <select name="role" defaultValue={role} className="rounded border px-2 py-1 text-sm">
        <option value="VIEWER">VIEWER</option>
        <option value="REVIEWER">REVIEWER</option>
        <option value="ADMIN">ADMIN</option>
      </select>
      <button type="submit" disabled={pending} className="text-sm underline disabled:opacity-50">
        {pending ? "Saving..." : "Save"}
      </button>
      {state?.message && <span className="text-sm text-red-600">{state.message}</span>}
    </form>
  );
}
