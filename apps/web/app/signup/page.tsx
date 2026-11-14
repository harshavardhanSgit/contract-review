import { SignupForm } from "./signup-form";

export default function SignupPage() {
  return (
    <main className="mx-auto flex max-w-sm flex-1 flex-col gap-6 px-6 py-24">
      <h1 className="text-2xl font-semibold">Create your account</h1>
      <SignupForm />
    </main>
  );
}
