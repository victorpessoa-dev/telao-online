import { createSupabaseBrowserClient } from "@/services/supabase/browser";

/**
 * Resets all sponsor display statistics for a given church.
 * This is a destructive operation that zeros out accumulated display data.
 *
 * Protections enforced within the RPC:
 * - Admin permission check
 * - Counting mode must be disabled (metricsEnabled = false)
 * - No active display sessions
 * - No MASTER mode active (adsFilterMaster = false)
 * - No NORMAL mode active (metricsPaused.NORMAL = true)
 * - No ALL mode active (adsFilterMaster = false and metricsPaused.NORMAL = true)
 * - No recent impressions (within last minute)
 * - No pending metrics transactions
 *
 * @param {object} supabase - Supabase server client
 * @param {string} churchId - Church UUID
 * @returns {Promise<string>} Success message or error
 */
export async function resetSponsorDisplayStatistics(supabase, churchId) {
  const { data, error } = await supabase
    .rpc("public.reset_sponsor_display_statistics", {
      church_id_arg: churchId,
    })
    .single();

  if (error) {
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    throw new Error(errorMessage);
  }

  return data;
}