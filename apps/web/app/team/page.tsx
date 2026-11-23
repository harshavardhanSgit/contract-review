import { Suspense } from "react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { AddMemberForm } from "./add-member-form";

export default function TeamPage() {
  return (
    <main className="mx-auto flex max-w-2xl flex-1 flex-col gap-6 px-6 py-24">
      <h1 className="text-2xl font-semibold">Team</h1>
      <Suspense fallback={<p className="text-zinc-500">Loading team...</p>}>
        <TeamList />
      </Suspense>
    </main>
  );
}

// Reads the login cookie, so it sits inside <Suspense>.
async function TeamList() {
  const me = await requireUser();

  // Only people in MY organisation. This "where" is the wall between tenants.
  const [organisation, members] = await Promise.all([
    db.organisation.findUnique({
      where: { id: me.organisationId },
      select: { name: true },
    }),
    db.user.findMany({
      where: { organisationId: me.organisationId },
      select: { id: true, email: true, role: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  return (
    <>
      <p className="text-zinc-600 dark:text-zinc-400">{organisation?.name}</p>
      <ul className="flex flex-col divide-y rounded border">
        {members.map((member) => (
          <li key={member.id} className="flex justify-between px-4 py-2">
            <span>
              {member.email}
              {member.id === me.id && " (you)"}
            </span>
            <span className="text-sm text-zinc-600 dark:text-zinc-400">{member.role}</span>
          </li>
        ))}
      </ul>

      {/* Hiding the form is only for convenience. The real check is inside addMember(). */}
      {me.role === "ADMIN" && <AddMemberForm />}
    </>
  );
}
