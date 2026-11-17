import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { logout } from "@/app/actions/auth";

async function DatabaseStatus() {
  await connection();
  const [organisations, users] = await Promise.all([
    db.organisation.count(),
    db.user.count(),
  ]);
  return (
    <p className="text-green-700 dark:text-green-400">
      Database connected: {organisations} organisations, {users} users
    </p>
  );
}

// Reads the login cookie, so it must sit inside <Suspense>.
async function AccountBar() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <p className="flex gap-4">
        <Link href="/login" className="underline">
          Log in
        </Link>
        <Link href="/signup" className="underline">
          Create an account
        </Link>
      </p>
    );
  }

  return (
    <div className="flex items-center gap-4">
      <p>
        Signed in as {user.email} ({user.role})
      </p>
      <Link href="/team" className="underline">
        Team
      </Link>
      <form action={logout}>
        <button type="submit" className="underline">
          Log out
        </button>
      </form>
    </div>
  );
}

export default function Home() {
  return (
    <main className="mx-auto flex max-w-2xl flex-1 flex-col gap-4 px-6 py-24">
      <h1 className="text-3xl font-semibold">Contract Review</h1>
      <p className="text-zinc-600 dark:text-zinc-400">
        Upload a contract. Get the 12 clauses that matter, with the exact
        sentence each came from.
      </p>
      <Suspense fallback={<p className="text-zinc-500">Checking database...</p>}>
        <DatabaseStatus />
      </Suspense>
      <Suspense fallback={null}>
        <AccountBar />
      </Suspense>
    </main>
  );
}
