"use client";

import { useState } from "react";
import { Image as ImageIcon, Trash2, Video, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileDropzone } from "@/components/ui/file-dropzone";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import StaticMediaFrame from "@/components/shared/static-media-frame";
import { useMediaBackgroundColor } from "@/components/sponsors/telao-media";
import { getYouTubeThumbnail } from "@/lib/utils/video-source";

export function MediaPreview({ ad, compact = false }) {
  const previewAspect = {
    square: "aspect-square",
    portrait: "aspect-[9/16] max-w-[18rem]",
    landscape: "aspect-video",
  }[ad?.imageCrop?.aspect] || "aspect-video";
  const sizeClass = compact ? "h-14 w-20" : `${previewAspect} w-full`;
  const detectedBackgroundColor = useMediaBackgroundColor(ad?.src, ad?.mediaType);
  const backgroundColor = ad?.imageCrop?.backgroundColor || detectedBackgroundColor;
  const zoom = Number(ad?.imageCrop?.zoom) || 1;
  const cropX = Number(ad?.imageCrop?.x ?? 50);
  const cropY = Number(ad?.imageCrop?.y ?? 50);
  const mediaStyle = {
    objectPosition: `${cropX}% ${cropY}%`,
    transform: zoom === 1 ? undefined : `scale(${zoom})`,
    transformOrigin: `${cropX}% ${cropY}%`,
  };
  const backgroundStyle = {
    backgroundColor,
    backgroundImage: `radial-gradient(circle at center, color-mix(in srgb, ${backgroundColor} 82%, white 18%), ${backgroundColor})`,
  };

  if (!ad.src) {
    return (
      <div
        className={`flex items-center justify-center rounded-lg bg-muted ${sizeClass}`}
      >
        <ImageIcon className="h-8 w-8 text-muted-foreground/50" />
      </div>
    );
  }

  if (ad.mediaType === "video") {
    const youtubeThumbnail = getYouTubeThumbnail(ad.src);
    return (
      <div
        className={`${sizeClass} shrink-0 overflow-hidden rounded-lg`}
        style={backgroundStyle}
      >
        {youtubeThumbnail ? (
          <img
            src={youtubeThumbnail}
            alt={`Prévia de ${ad.name || "vídeo"}`}
            className="h-full w-full object-cover"
            style={mediaStyle}
          />
        ) : (
          <StaticMediaFrame
            src={ad.src}
            type="video"
            className="h-full w-full object-cover object-center"
          />
        )}
      </div>
    );
  }

  if (ad.mediaType === "image") {
    return (
      <div
        className={`${sizeClass} shrink-0 overflow-hidden rounded-lg`}
        style={backgroundStyle}
      >
        <StaticMediaFrame
          src={ad.src}
          alt={ad.name || "Patrocínio"}
          className="h-full w-full object-cover"
          style={mediaStyle}
        />
      </div>
    );
  }

  return (
    <div
      className={`${sizeClass} shrink-0 overflow-hidden rounded-lg`}
      style={backgroundStyle}
    >
      <img
        src={ad.src}
        alt={ad.name || "Patrocínio"}
        className="h-full w-full object-cover"
        style={mediaStyle}
      />
    </div>
  );
}

export function TypeBadge({ ad }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <Badge
        className={ad.type === "MASTER" ? "bg-yellow-500 text-yellow-950" : ""}
      >
        {ad.type === "MASTER" ? <Zap className="mr-1 h-3 w-3" /> : null}
        {ad.type}
      </Badge>
      <Badge variant="secondary">
        {ad.mediaType === "video" ? (
          <Video className="mr-1 h-3 w-3" />
        ) : (
          <ImageIcon className="mr-1 h-3 w-3" />
        )}
        {ad.mediaType === "video" ? "Vídeo" : "Imagem"}
      </Badge>
    </div>
  );
}

export function SponsorForm({
  ad,
  setAd,
  onUpload,
  onUploadStateChange,
  allowMediaRemoval = false,
}) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadError, setUploadError] = useState("");
  const [removeMediaOpen, setRemoveMediaOpen] = useState(false);
  const hasPendingMedia = ad.sourceType === "pending-upload" && Boolean(ad.src);

  const handleUpload = async (file) => {
    if (!file) return;

    setUploadError("");
    setUploading(true);
    setProgress(5);
    onUploadStateChange?.(true);
    try {
      await onUpload(file, setAd, setProgress);
      setProgress(100);
    } catch (error) {
      setUploadError(
        error instanceof Error ? error.message : "Não foi possível preparar o arquivo",
      );
    } finally {
      setUploading(false);
      onUploadStateChange?.(false);
    }
  };

  return (
    <Tabs defaultValue="data" className="py-4">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="data">Dados</TabsTrigger>
        <TabsTrigger value="media">Mídia e prévia</TabsTrigger>
      </TabsList>

      <TabsContent value="data" className="mt-5 space-y-5">
        <div className="space-y-2">
          <Label>Nome</Label>
          <Input
            value={ad.name}
            onChange={(e) =>
              setAd((prev) => ({ ...prev, name: e.target.value }))
            }
          />
        </div>

        <div className="space-y-2">
          <Label>Site do anunciante</Label>
          <Input
            type="url"
            placeholder="https://loja.com.br ou https://instagram.com/perfil"
            value={ad.websiteUrl || ""}
            onChange={(e) =>
              setAd((prev) => ({ ...prev, websiteUrl: e.target.value }))
            }
          />
        </div>

        <div className="space-y-2">
          <Label>Tipo</Label>
          <Select
            value={ad.type}
            onValueChange={(value) =>
              setAd((prev) => ({
                ...prev,
                type: value,
              }))
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="MASTER">MASTER</SelectItem>
              <SelectItem value="NORMAL">NORMAL</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </TabsContent>

      <TabsContent value="media" className="mt-5 space-y-5">
        <div className="space-y-2">
          <Label>Mídia</Label>
          <Select
            value={ad.mediaType}
            onValueChange={(value) =>
              setAd((prev) => ({ ...prev, mediaType: value }))
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="image">Imagem</SelectItem>
              <SelectItem value="video">Vídeo</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Link da mídia</Label>
          <Input
            placeholder={
              ad.mediaType === "video"
                ? "https://exemplo.com/video.mp4"
                : "https://exemplo.com/imagem.png"
            }
            value={ad.src || ""}
            readOnly={hasPendingMedia}
            onChange={(e) =>
              setAd((prev) => ({
                ...prev,
                src: e.target.value,
                sourceType: "link",
              }))
            }
          />
          {hasPendingMedia ? (
            <p className="text-xs text-muted-foreground">
              Upload anexado. Clique em Salvar para gravar esta mídia no
              patrocínio.
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label>Upload</Label>
          <FileDropzone
            accept={
              "image/gif,image/jpeg,image/png,image/webp,video/webm,video/mp4"
            }
            disabled={uploading}
            onFileSelect={handleUpload}
            title="Arraste a mídia ou clique para enviar"
            description={"Imagens são convertidas para WebP; vídeos aceitam MP4 ou WebM"}
          />
          <p className="text-xs text-muted-foreground">
            A duração é definida em Configurações &gt; Telão, conforme a mídia
            for imagem ou vídeo.
          </p>
          {uploadError ? (
            <p className="text-xs font-medium text-destructive">
              {uploadError}
            </p>
          ) : null}
          {uploading ? (
            <div className="space-y-1.5">
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-[width] duration-200"
                  style={{ width: `${Math.max(5, progress)}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Preparando arquivo… {Math.round(progress)}%
              </p>
            </div>
          ) : null}
        </div>

        {ad.mediaType === "image" && hasPendingMedia ? (
          <div className="space-y-5 rounded-lg border border-border p-4">
            <div>
              <Label>Ajuste da imagem</Label>
              <p className="text-sm text-muted-foreground">
                O arquivo final será recortado e salvo em WebP ao confirmar.
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between gap-3">
                <Label>Zoom</Label>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {Number(ad.imageCrop?.zoom || 1).toFixed(2)}×
                </span>
              </div>
              <Slider
                value={[Number(ad.imageCrop?.zoom || 1)]}
                min={1}
                max={3}
                step={0.05}
                onValueChange={([zoom]) =>
                  setAd((prev) => ({
                    ...prev,
                    imageCrop: { ...prev.imageCrop, zoom },
                  }))
                }
              />
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              {[
                ["x", "Posição horizontal"],
                ["y", "Posição vertical"],
              ].map(([key, label]) => (
                <div key={key} className="space-y-2">
                  <div className="flex justify-between gap-3">
                    <Label>{label}</Label>
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {ad.imageCrop?.[key] ?? 50}%
                    </span>
                  </div>
                  <Slider
                    value={[Number(ad.imageCrop?.[key] ?? 50)]}
                    min={0}
                    max={100}
                    step={1}
                    onValueChange={([value]) =>
                      setAd((prev) => ({
                        ...prev,
                        imageCrop: { ...prev.imageCrop, [key]: value },
                      }))
                    }
                  />
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <Label>Formato do corte</Label>
              <Select
                value={ad.imageCrop?.aspect || "source"}
                onValueChange={(aspect) =>
                  setAd((prev) => ({
                    ...prev,
                    imageCrop: { ...prev.imageCrop, aspect },
                  }))
                }
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="source">Proporção original</SelectItem>
                  <SelectItem value="landscape">Paisagem 16:9</SelectItem>
                  <SelectItem value="square">Quadrado 1:1</SelectItem>
                  <SelectItem value="portrait">Retrato 9:16</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Cor de fundo para transparência</Label>
              <div className="flex items-center gap-3">
                <Input
                  type="color"
                  aria-label="Cor de fundo da imagem transparente"
                  value={ad.imageCrop?.backgroundColor || "#050505"}
                  onChange={(event) =>
                    setAd((prev) => ({
                      ...prev,
                      imageCrop: {
                        ...prev.imageCrop,
                        backgroundColor: event.target.value,
                      },
                    }))
                  }
                  className="h-10 w-14 cursor-pointer p-1"
                />
                <Input
                  value={ad.imageCrop?.backgroundColor || "#050505"}
                  onChange={(event) =>
                    setAd((prev) => ({
                      ...prev,
                      imageCrop: {
                        ...prev.imageCrop,
                        backgroundColor: event.target.value,
                      },
                    }))
                  }
                  className="max-w-32 font-mono uppercase"
                  maxLength={7}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                A paleta é aplicada aos pixels transparentes antes de salvar o WebP.
              </p>
            </div>
          </div>
        ) : null}

        {ad.src ? (
          <div className="space-y-3">
            <MediaPreview ad={ad} />
            {allowMediaRemoval ? (
              <AlertDialog open={removeMediaOpen} onOpenChange={setRemoveMediaOpen}>
                <AlertDialogTrigger asChild>
                  <Button type="button" variant="outline" className="w-full text-destructive hover:text-destructive">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Remover mídia atual
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Remover mídia atual?</AlertDialogTitle>
                    <AlertDialogDescription>
                      A mídia será removida do formulário. Envie uma nova antes
                      de salvar o patrocínio para substituir o arquivo atual.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={() => {
                        setAd((prev) => ({ ...prev, src: "", sourceType: "link" }));
                        setUploadError("");
                      }}
                    >
                      Remover mídia
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : null}
          </div>
        ) : allowMediaRemoval ? (
          <p className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
            Mídia removida. Adicione um novo link ou faça outro upload antes de
            salvar.
          </p>
        ) : null}
      </TabsContent>
    </Tabs>
  );
}
