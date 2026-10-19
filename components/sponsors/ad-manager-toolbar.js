"use client";

import { Copy, Megaphone, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import EmptyState from "@/components/shared/empty-state";

export function AdManagerToolbar({
  onCopyPublicUrl,
  publicTelaoPath,
  onOpenCreateDialog,
  metricsEnabled,
  metricsPaused,
  activeCounts,
  onMetricsToggle,
  onMetricsPauseToggle,
}) {
  const normalPaused = Boolean(metricsPaused?.NORMAL);
  const masterPaused = Boolean(metricsPaused?.MASTER);
  const normalActiveCount = activeCounts?.NORMAL || 0;
  const masterActiveCount = activeCounts?.MASTER || 0;
  const hasAnyActiveSponsor = normalActiveCount > 0 || masterActiveCount > 0;

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Transparência do evento
          </div>
          <h2 className="mt-1 text-xl font-semibold text-foreground">
            Patrocínios cadastrados
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Cadastre os apoiadores, publique a programação e mantenha o
            registro de exibições disponível para consulta.
          </p>
        </div>

        <Button onClick={onOpenCreateDialog} className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          Novo patrocínio
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3 rounded-xl border border-border/80 bg-card p-3 shadow-[0_1px_2px_oklch(0.18_0.02_250/0.03)] lg:grid-cols-2 lg:items-stretch">
        <div className="rounded-lg border border-border/50 px-3 py-2.5">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
            <div className="min-w-0 flex-1">
              <label
                htmlFor="metrics-enabled"
                className="cursor-pointer text-xs font-medium text-foreground/90"
              >
                Contador do telão
              </label>
              <div className="mt-0.5 text-[11px] text-muted-foreground">
                Registro público de exibições por tipo
              </div>
            </div>
            <Switch
              id="metrics-enabled"
              className="scale-90 opacity-80 transition-opacity hover:opacity-100"
              checked={metricsEnabled}
              disabled={!hasAnyActiveSponsor}
              onCheckedChange={onMetricsToggle}
            />

            <div className="hidden h-5 w-px bg-border sm:block" />

            <label className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <span>
                <span className="font-medium text-foreground/80">NORMAL</span> ·{" "}
                {normalActiveCount}
              </span>
              <Switch
                id="metrics-normal"
                className="scale-75 opacity-70 transition-opacity hover:opacity-100"
                checked={metricsEnabled && !normalPaused}
                disabled={normalActiveCount === 0}
                onCheckedChange={(checked) =>
                  onMetricsPauseToggle("NORMAL", !checked)
                }
              />
            </label>
            <label className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <span>
                <span className="font-medium text-foreground/80">MASTER</span> ·{" "}
                {masterActiveCount}
              </span>
              <Switch
                id="metrics-master"
                className="scale-75 opacity-70 transition-opacity hover:opacity-100"
                checked={metricsEnabled && !masterPaused}
                disabled={masterActiveCount === 0}
                onCheckedChange={(checked) =>
                  onMetricsPauseToggle("MASTER", !checked)
                }
              />
            </label>
          </div>
          {!hasAnyActiveSponsor ? (
            <div className="mt-2 text-[11px] text-destructive/80">
              Ative um patrocinador para ligar o contador.
            </div>
          ) : null}
        </div>

        <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-3 rounded-lg border border-border/50 px-3 py-2.5">
          <div className="min-w-0 flex-1">
            <div className="text-xs font-medium text-foreground/90">LINK</div>
            <div className="mt-0.5 text-[11px] text-muted-foreground">
              Copiar link público do telão
            </div>
          </div>
          <div className="w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onCopyPublicUrl(publicTelaoPath)}
              disabled={!publicTelaoPath}
              className="w-full min-w-40 justify-start"
            >
              <Copy className="mr-2 h-4 w-4" />
              {publicTelaoPath || "Defina o slug da igreja"}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

export function AdManagerEmptyState({
  orderedAdsLength,
  filteredAdsLength,
  onClearSearch,
}) {
  const noResults = orderedAdsLength > 0 && filteredAdsLength === 0;

  return (
    <EmptyState
      icon={orderedAdsLength === 0 ? Megaphone : Search}
      title={
        orderedAdsLength === 0
          ? "Nenhum patrocínio cadastrado"
          : "Nenhum resultado encontrado"
      }
      description={
        orderedAdsLength === 0
          ? "Adicione anúncios para montar a playlist pública do telão."
          : "Tente outro termo para localizar o patrocinador no painel do telão."
      }
      action={
        noResults && onClearSearch ? (
          <Button className="mt-4" variant="outline" onClick={onClearSearch}>
            Limpar busca
          </Button>
        ) : null
      }
    />
  );
}
