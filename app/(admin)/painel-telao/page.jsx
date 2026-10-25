"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import PageContainer from "@/components/layout/page-container";
import AdManager from "@/components/sponsors/ad-manager";
import { getTelaoDefaultDurations } from "@/lib/services/settings";
import { useStore } from "@/lib/store/store";
import { createSupabaseBrowserClient } from "@/services/supabase/browser";

/** Administrative route for managing sponsor playback on the display. */
export default function PainelTelaoPage() {
  const { churchId, churchSlug, sponsorSettings, updateSponsorSettings } =
    useStore();
  const [defaultDurations, setDefaultDurations] = useState({
    IMAGE: 10,
    VIDEO: 15,
  });
  useEffect(() => {
    if (!churchId) return;
    getTelaoDefaultDurations(createSupabaseBrowserClient(), churchId)
      .then(setDefaultDurations)
      .catch(() => setDefaultDurations({ IMAGE: 10, VIDEO: 15 }));
  }, [churchId]);

  const updateMasterFilter = async (checked) => {
    try {
      await updateSponsorSettings({
        adsFilterMaster: checked,
        metricsPaused: {
          ...sponsorSettings.metricsPaused,
          // While the telão is Master-only, NORMAL is neither displayed nor
          // counted. Turning the mode off resumes its counter when there are
          // active NORMAL sponsors (the manager preserves the empty case).
          NORMAL: checked,
        },
      });
      toast.success(
        checked
          ? "Modo Master ativado: Normal sem contagem e sem fundo"
          : "Modo Master desativado",
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao salvar configuração",
      );
    }
  };

  return (
    <PageContainer>
      <AdManager
        defaultDurations={defaultDurations}
        churchSlug={churchSlug}
        masterFilterEnabled={Boolean(sponsorSettings.adsFilterMaster)}
        onMasterFilterToggle={updateMasterFilter}
      />
    </PageContainer>
  );
}
