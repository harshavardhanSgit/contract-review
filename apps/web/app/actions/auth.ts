"use server";

import * as z from "zod";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Prisma } from "@/app/generated/prisma/client";
import { endSession, startSession } from "@/lib/auth/session";

const SignupSchema = z.object({
  organisationName: z.string().trim().min(2, { error: "At least 2 characters." }),
  email: z.string().trim().toLowerCase().pipe(z.email({ error: "Enter a valid email." })),
  password: z
    .string()
    .min(8, { error: "At least 8 characters." })
    .max(72, { error: "At most 72 characters." }),
});

export type SignupState =
  | {
      errors?: {
        organisationName?: string[];
        email?: string[];
        password?: string[];
      };
    }
  | undefined;

export async function signup(
  prevState: SignupState,
  formData: FormData,
): Promise<SignupState> {
  // 1. Check the input on the server. Never trust the browser.
  const parsed = SignupSchema.safeParse({
    organisationName: formData.get("organisationName"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors };
  }
  const { organisationName, email, password } = parsed.data;

  // 2. Hash the password. Only the hash is stored.
  const passwordHash = await bcrypt.hash(password, 12);

  // 3. Create the organisation and its first user (an admin) together.
  try {
    await db.organisation.create({
      data: {
        name: organisationName,
        users: { create: { email, passwordHash, role: "ADMIN" } },
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { errors: { email: ["An account with this email already exists."] } };
    }
    throw error;
  }

  // 4. Go home. redirect() throws, so it stays outside the try.
  redirect("/");
}

// ---------- Log in ----------

const LoginSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email()),
  password: z.string().min(1),
});

export type LoginState = { message?: string } | undefined;

export async function login(
  prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  // 1. Open the envelope and clean what's inside.
  const parsed = LoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { message: "Enter your email and password." };
  }
  const { email, password } = parsed.data;

  // 2. Find the user, then compare the typed password with the stored hash.
  const user = await db.user.findUnique({ where: { email } });
  const passwordMatches = user
    ? await bcrypt.compare(password, user.passwordHash)
    : false;

  // Same message for both cases, so nobody can learn which emails have accounts.
  if (!user || !passwordMatches) {
    return { message: "Wrong email or password." };
  }

  // 3. Start the session: make the token and put it in a cookie.
  await startSession(user);

  // 4. Go home. redirect() throws, so it comes last.
  redirect("/");
}

// ---------- Log out ----------

export async function logout() {
  await endSession();
  redirect("/");
}
