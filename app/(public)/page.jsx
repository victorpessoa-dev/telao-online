import { redirect } from "next/navigation";
import { createSupabasePublicClient } from "@/services/supabase/server";

export const dynamic = "force-dynamic";

/** Redirects the root URL to the only active church or to the public directory. */
export default async function PublicHomePage() {
  let destination = "/igrejas";

  try {
    const supabase = createSupabasePublicClient();
    const { data, error } = await supabase.rpc("get_public_churches");
    if (error) throw error;

    const churches = data || [];
    if (churches.length === 1 && churches[0]?.slug) {
      destination = `/${churches[0].slug}`;
    }
  } catch {
    // The directory remains available when the public data source is offline.
  }

  redirect(destination);
}
