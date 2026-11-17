import Link from "next/link";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="mx-auto flex max-w-sm flex-1 flex-col gap-6 px-6 py-24">
      <h1 className="text-2xl font-semibold">Log in</h1>
      <LoginForm />
      <p className="text-sm">
        No account?{" "}
        <Link href="/signup" className="underline">
          Create one
        </Link>
      </p>
    </main>
  );
}
