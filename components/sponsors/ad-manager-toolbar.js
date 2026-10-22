"use client";

import { Copy, Megaphone, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import EmptyState from "@/components/shared/empty-state";

export function AdManagerToolbar({
  onCopyPublicUrl,
  onOpenOfficialDisplay,
  publicTelaoPath,
  onOpenCreateDialog,
  metricsEnabled,
  metricsPaused,
  activeCounts,
  onMetricsToggle,
  onMetricsPauseToggle,
  masterFilterEnabled,
  onMasterFilterToggle,
}) {
  const normalPaused = Boolean(metricsPaused?.NORMAL);
  const masterPaused = Boolean(metricsPaused?.MASTER);
  const normalActiveCount = activeCounts?.NORMAL || 0;
  const masterActiveCount = activeCounts?.MASTER || 0;
  const hasAnyActiveSponsor = normalActiveCount > 0 || masterActiveCount > 0;

  return (
    <section className="space-y-4">
      <div className="min-w-0">
        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Transparência do evento
          </div>
          <h2 className="mt-1 text-xl font-semibold text-foreground">
            Patrocínios cadastrados
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Cadastre os apoiadores, publique a programação e mantenha o registro
            de exibições disponível para consulta.
          </p>
        </div>

      </div>

      <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap sm:justify-end">
          <label
            className={`flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-1.5 text-xs transition-colors sm:w-auto sm:justify-start ${
              masterFilterEnabled
                ? "border-primary/35 bg-primary/10 text-primary shadow-sm"
                : "border-border bg-muted/40 text-muted-foreground"
            }`}
          >
            <span className="font-semibold">Somente Master</span>
            <Switch
              checked={Boolean(masterFilterEnabled)}
              onCheckedChange={onMasterFilterToggle}
              aria-label="Exibir somente patrocinadores Master no telão"
            />
          </label>
          <Button onClick={onOpenCreateDialog} className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            Novo patrocínio
          </Button>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 lg:items-stretch">
        <div className="space-y-3 rounded-lg border border-border/50 px-3 py-2.5">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <label
                htmlFor="metrics-enabled"
                className="cursor-pointer text-xs font-medium text-foreground/90"
              >
                Contador de exibição
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
          </div>

          <div className="flex flex-wrap gap-x-5 gap-y-3 border-t border-border/60 pt-3">
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

        <div className="min-w-0 space-y-3 rounded-lg border border-border/50 px-3 py-2.5">
          <div className="min-w-0">
            <div className="text-xs font-medium text-foreground/90">
              Link público do telão
            </div>
            <div className="mt-0.5 text-[11px] text-muted-foreground">
              Use esta rota para compartilhar ou abrir o telão oficial.
            </div>
          </div>
          <div className="flex flex-wrap gap-2 border-t border-border/60 pt-3">
            <div className="w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onCopyPublicUrl(publicTelaoPath)}
              disabled={!publicTelaoPath}
              className="group w-full min-w-0 justify-start border-primary/30 sm:w-80 hover:border-primary-hover hover:bg-primary-hover hover:text-primary-foreground"
            >
              <Copy className="h-4 w-4 shrink-0" />
              <span className="shrink-0">Copiar</span>
              <span className="min-w-0 flex-1 whitespace-nowrap text-[10px] leading-none text-muted-foreground transition-colors group-hover:text-primary-foreground/90">
                {publicTelaoPath || "/{slug}/ads-telao"}
              </span>
            </Button>
            </div>
            <Button
              size="sm"
              onClick={onOpenOfficialDisplay}
              disabled={!metricsEnabled || !publicTelaoPath}
            >
              Abrir telão
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
