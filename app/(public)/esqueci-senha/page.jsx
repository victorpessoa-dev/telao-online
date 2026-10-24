import { Suspense } from "react";
import { PasswordResetRequestForm } from "@/components/auth/credential-flow";

export default function ForgotPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <Suspense>
        <PasswordResetRequestForm />
      </Suspense>
    </main>
  );
}
