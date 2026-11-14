import { Suspense } from "react";
import { connection } from "next/server";
import { db } from "@/lib/db"

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
    </main>
  );
}
