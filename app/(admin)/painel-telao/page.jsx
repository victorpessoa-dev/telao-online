"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink, Play } from "lucide-react";
import { toast } from "sonner";
import PageContainer from "@/components/layout/page-container";
import AdManager from "@/components/sponsors/ad-manager";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { getTelaoDefaultDurations } from "@/lib/services/settings";
import { useStore } from "@/lib/store/store";
import { createSupabaseBrowserClient } from "@/services/supabase/browser";

export default function PainelTelaoPage() {
  const { churchId, churchSlug, sponsorSettings, updateSponsorSettings } =
    useStore();
  const [defaultDurations, setDefaultDurations] = useState({
    IMAGE: 10,
    VIDEO: 15,
  });
  const publicTelaoPath = churchSlug ? `/${churchSlug}/ads-telao` : "";

  useEffect(() => {
    if (!churchId) return;
    getTelaoDefaultDurations(createSupabaseBrowserClient(), churchId)
      .then(setDefaultDurations)
      .catch(() => setDefaultDurations({ IMAGE: 10, VIDEO: 15 }));
  }, [churchId]);

  const updateMasterFilter = async (checked) => {
    try {
      await updateSponsorSettings({ adsFilterMaster: checked });
      toast.success(
        checked ? "Filtro Master ativado" : "Filtro Master desativado",
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao salvar configuração",
      );
    }
  };

  return (
    <PageContainer>
      <header className="mb-6 flex flex-col gap-4 border-b border-border/70 pb-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Patrocínios</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gerencie a playlist exibida no telão.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <Switch
              checked={Boolean(sponsorSettings.adsFilterMaster)}
              onCheckedChange={updateMasterFilter}
            />
            Somente Master
          </label>
          <Button asChild disabled={!publicTelaoPath}>
            <Link
              href={publicTelaoPath || "#"}
              target="_blank"
              aria-disabled={!publicTelaoPath}
            >
              <Play className="mr-2 h-4 w-4" />
              Abrir telão
              <ExternalLink className="ml-2 h-4 w-4 opacity-60" />
            </Link>
          </Button>
        </div>
      </header>

      <AdManager defaultDurations={defaultDurations} churchSlug={churchSlug} />
    </PageContainer>
  );
}
