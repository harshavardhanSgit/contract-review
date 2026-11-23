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
