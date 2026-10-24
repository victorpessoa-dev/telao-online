import { Suspense } from "react";
import { SetPasswordForm } from "@/components/auth/credential-flow";

export default function ResetPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <Suspense>
        <SetPasswordForm />
      </Suspense>
    </main>
  );
}
