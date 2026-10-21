"use client";

import { Globe, MapPin, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FileDropzone } from "@/components/ui/file-dropzone";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { getSocialIcon } from "@/components/shared/social-links";

export function SettingRow({ title, description, control }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <div className="min-w-0">
        <Label>{title}</Label>
        {description ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {control}
    </div>
  );
}

export function SponsorDesignPreview({
  title,
  settings,
  previewClassName = "aspect-video",
}) {
  const modeEnabled = Boolean(settings.enabled);
  const width = modeEnabled ? (settings.contentWidth ?? 58) : 100;
  const height = modeEnabled ? (settings.contentHeight ?? 58) : 100;
  const top = modeEnabled ? (settings.y ?? 50) : 50;
  const left = modeEnabled ? (settings.x ?? 50) : 50;

  return (
    <div className="space-y-3">
      <div className="text-sm font-medium">{title}</div>
      <div
        className={`relative ${previewClassName} overflow-hidden rounded-xl border border-border bg-black`}
      >
        {modeEnabled && settings.backgroundUrl ? (
          <img
            src={settings.backgroundUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.12),_transparent_45%),linear-gradient(135deg,_rgba(255,255,255,0.08),_transparent)]" />
        )}

        <div
          className="absolute rounded-lg border-2 border-dashed border-primary bg-primary/15"
          style={{
            width: `${width}%`,
            height: `${height}%`,
            left: `${left}%`,
            top: `${top}%`,
            transform: "translate(-50%, -50%)",
          }}
        >
          <div className="flex h-full items-center justify-center text-center text-xs font-medium text-primary">
            Área da mídia
          </div>
        </div>
      </div>
    </div>
  );
}

export function DesignAdjustmentDrop({
  profileLabel,
  previewClassName,
  settings,
  onChange,
  onModeChange,
  onUpload,
  onRestore,
}) {
  const contentWidth = settings.contentWidth ?? 58;
  const contentHeight = settings.contentHeight ?? 58;

  return (
    <div className="rounded-xl border border-border p-4">
      <div className="mb-6 flex flex-col gap-3 border-b border-border/70 pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="font-medium">Modelo para {profileLabel}</div>
          <div className="text-sm text-muted-foreground">
            Este fundo e esta área de mídia são aplicados a todos os patrocínios
            do telão público.
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onRestore}
          className="shrink-0"
        >
          <RotateCcw className="mr-2 h-4 w-4" />
          Restaurar área
        </Button>
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(24rem,0.9fr)] lg:items-start">
        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-muted/20 p-4">
            <SettingRow
              title="Ativar Modo com Fundo"
              description="Ativa uma imagem de fundo e libera o ajuste da área da mídia. Desativado, o conteúdo ocupa a tela completa."
              control={
                <Switch
                  checked={settings.enabled}
                  onCheckedChange={onModeChange}
                />
              }
            />
          </div>

          {settings.enabled ? (
            <div className="animate-in space-y-4 fade-in slide-in-from-top-3 duration-300">
              <div className="space-y-4 rounded-lg border border-border p-4">
                <div>
                  <Label>Fundo do telão</Label>
                  <p className="text-sm text-muted-foreground">
                    Use uma URL pública ou envie uma imagem. O resultado aparece
                    somente no preview.
                  </p>
                </div>
                <div className="space-y-5">
                  <div className="space-y-2">
                    <Label>Imagem de fundo</Label>
                    <Input
                      placeholder="https://exemplo.com/arte-fundo.png"
                      value={settings.backgroundUrl || ""}
                      onChange={(event) =>
                        onChange("backgroundUrl", event.target.value)
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Upload da imagem</Label>
                    <FileDropzone
                      accept="image/*"
                      onFileSelect={onUpload}
                      title="Arraste uma imagem ou clique para enviar"
                      description="PNG, JPG, WebP ou SVG"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-5 rounded-lg border border-border p-4">
                <div>
                  <Label>Área da mídia</Label>
                  <p className="text-sm text-muted-foreground">
                    Ajuste tamanho e posição do patrocinador sobre o fundo.
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <Label>Largura · laterais</Label>
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {contentWidth}%
                    </span>
                  </div>
                  <Slider
                    value={[contentWidth]}
                    onValueChange={([value]) => onChange("contentWidth", value)}
                    min={10}
                    max={100}
                    step={1}
                    disabled={!settings.enabled}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <Label>Altura · cima/baixo</Label>
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {contentHeight}%
                    </span>
                  </div>
                  <Slider
                    value={[contentHeight]}
                    onValueChange={([value]) =>
                      onChange("contentHeight", value)
                    }
                    min={10}
                    max={100}
                    step={1}
                    disabled={!settings.enabled}
                  />
                </div>
                <div className="grid grid-cols-1 gap-5 border-t border-border/70 pt-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Posição horizontal ({settings.x ?? 50}%)</Label>
                    <Slider
                      value={[settings.x ?? 50]}
                      onValueChange={([value]) => onChange("x", value)}
                      min={0}
                      max={100}
                      step={1}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Posição vertical ({settings.y ?? 50}%)</Label>
                    <Slider
                      value={[settings.y ?? 50]}
                      onValueChange={([value]) => onChange("y", value)}
                      min={0}
                      max={100}
                      step={1}
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="animate-in rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground fade-in slide-in-from-bottom-2 duration-300">
              Modo sem fundo ativo: a mídia ocupa toda a área do telão.
            </div>
          )}
        </div>

        <div className="lg:sticky lg:top-6">
          <SponsorDesignPreview
            title={`Prévia ${profileLabel}`}
            settings={settings}
            previewClassName={previewClassName}
          />
        </div>
      </div>
    </div>
  );
}

const socialLabelMap = {
  instagram: "Instagram",
  facebook: "Facebook",
  youtube: "YouTube",
  whatsapp: "WhatsApp",
  website: "Site",
};

function getVisibleSocialLinks(socialLinks = {}) {
  const fixedLinks = Object.entries(socialLinks)
    .filter(([key]) => key !== "extra")
    .map(([key, url]) => ({
      key,
      label: socialLabelMap[key] || key,
      url: String(url || "").trim(),
    }))
    .filter(({ url }) => url);

  const extraLinks = Array.isArray(socialLinks.extra) ? socialLinks.extra : [];

  return [
    ...fixedLinks,
    ...extraLinks
      .map((item, index) => ({
        key: `extra-${index}`,
        label: String(item?.label || "Link").trim(),
        url: String(item?.url || "").trim(),
      }))
      .filter(({ url }) => url),
  ];
}

export function BrandPreview({
  parishName,
  parishLogoUrl,
  parishCoverUrl = "",
  parishCity = "",
  socialLinks = {},
}) {
  const visibleSocialLinks = getVisibleSocialLinks(socialLinks);

  return (
    <div className="rounded-2xl border border-border bg-card/50 p-4">
      <div className="text-sm font-medium">Prévia da marca</div>
      <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="relative h-40 bg-muted sm:h-52">
          {parishCoverUrl ? (
            <img
              src={parishCoverUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="h-full w-full bg-muted" />
          )}
          {parishCoverUrl ? (
            <div className="absolute inset-0 bg-black/20" />
          ) : null}
        </div>
        <div className="relative p-5 sm:p-6">
          <div className="absolute -top-12 flex h-24 w-24 items-center justify-center overflow-hidden rounded-xl border-4 border-card bg-card sm:-top-14 sm:h-28 sm:w-28">
            <img
              src={parishLogoUrl || "/brand/virtus-playcast-mark.png"}
              alt=""
              className="h-full w-full object-cover"
            />
          </div>
          <div className="mt-11 flex flex-col gap-4 sm:mt-14 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0 text-left">
              <div className="truncate text-2xl font-bold sm:text-3xl">
                {parishName || "Nome da paróquia"}
              </div>
              {parishCity ? (
                <div className="mt-2 flex items-center gap-2 truncate text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4 shrink-0" />
                  {parishCity}
                </div>
              ) : null}
            </div>
            {visibleSocialLinks.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {visibleSocialLinks.map(({ key, label }) => {
                  const Icon = getSocialIcon(label) || Globe;

                  return (
                    <span
                      key={key}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-muted/40 text-muted-foreground"
                    >
                      <Icon className="h-4 w-4" />
                      <span className="sr-only">{label || "Link"}</span>
                    </span>
                  );
                })}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
