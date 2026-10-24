import { NextResponse } from "next/server";
import { signOutFlow } from "@/lib/services/auth";
import { createSupabaseServerClient } from "@/services/supabase/server";

export async function POST() {
  try {
    const supabase = await createSupabaseServerClient();
    await signOutFlow(supabase);
  } catch {
    // Logout should be idempotent for the UI even when the session is already gone.
  }

  return NextResponse.json({ ok: true });
}
