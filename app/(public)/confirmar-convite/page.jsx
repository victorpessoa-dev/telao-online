import { Suspense } from "react";
import { SetPasswordForm } from "@/components/auth/credential-flow";

export default function ConfirmInvitePage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <Suspense>
        <SetPasswordForm invitation />
      </Suspense>
    </main>
  );
}
