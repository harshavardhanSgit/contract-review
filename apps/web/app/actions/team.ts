"use server";

import * as z from "zod";
import bcrypt from "bcryptjs";
import { refresh } from "next/cache";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/session";
import { Prisma } from "@/app/generated/prisma/client";

const AddMemberSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email({ error: "Enter a valid email." })),
  role: z.enum(["ADMIN", "REVIEWER", "VIEWER"], { error: "Pick a role." }),
  password: z
    .string()
    .min(8, { error: "Password: at least 8 characters." })
    .max(72, { error: "Password: at most 72 characters." }),
});

export type AddMemberState = { message?: string; ok?: boolean } | undefined;

export async function addMember(
  prevState: AddMemberState,
  formData: FormData,
): Promise<AddMemberState> {
  // 1. The keycard check comes first, before we even read the form.
  const me = await requireRole("ADMIN");

  // 2. Check the input on the server.
  const parsed = AddMemberSchema.safeParse({
    email: formData.get("email"),
    role: formData.get("role"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { message: parsed.error.issues[0].message };
  }
  const { email, role, password } = parsed.data;

  // 3. Create the user in MY organisation. The organisation comes from the session,
  //    never from the form, so nobody can add people to another company.
  try {
    await db.user.create({
      data: {
        email,
        role,
        passwordHash: await bcrypt.hash(password, 12),
        organisationId: me.organisationId,
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { message: "An account with this email already exists." };
    }
    throw error;
  }

  // 4. Re-render the page so the new member shows up in the list.
  refresh();
  return { ok: true, message: `Added ${email} as ${role}.` };
}

const ChangeRoleSchema = z.object({
  userId: z.uuid({ error: "Unknown member." }),
  role: z.enum(["ADMIN", "REVIEWER", "VIEWER"], { error: "Pick a role." }),
});

export type ChangeRoleState = { message?: string } | undefined;

export async function changeRole(
  prevState: ChangeRoleState,
  formData: FormData,
): Promise<ChangeRoleState> {
  // 1. The keycard check comes first.
  const me = await requireRole("ADMIN");

  // 2. Check the input.
  const parsed = ChangeRoleSchema.safeParse({
    userId: formData.get("userId"),
    role: formData.get("role"),
  });
  if (!parsed.success) {
    return { message: parsed.error.issues[0].message };
  }
  const { userId, role } = parsed.data;

  // 3. Read and write inside one transaction, so two admins can't both
  //    remove each other at the same moment and leave the team with no admin.
  try {
    const problem = await db.$transaction(
      async (tx) => {
        // The userId came from the browser, so don't trust it on its own:
        // the member must be in MY organisation.
        const member = await tx.user.findFirst({
          where: { id: userId, organisationId: me.organisationId },
          select: { role: true },
        });
        if (!member) return "Member not found.";
        if (member.role === role) return null; // nothing to change

        // Never leave a team without an admin.
        if (member.role === "ADMIN") {
          const admins = await tx.user.count({
            where: { organisationId: me.organisationId, role: "ADMIN" },
          });
          if (admins === 1) return "Your team needs at least one admin.";
        }

        await tx.user.update({ where: { id: userId }, data: { role } });
        return null;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    if (problem) return { message: problem };
  } catch (error) {
    // P2034: two changes collided. The database cancelled this one.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2034"
    ) {
      return { message: "Someone changed the team at the same time. Try again." };
    }
    throw error;
  }

  // 4. Re-render the page with the new role.
  refresh();
  return undefined;
}
