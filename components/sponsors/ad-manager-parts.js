"use client";

import { useEffect, useRef, useState } from "react";
import {
  Image as ImageIcon,
  Maximize2,
  Minus,
  Move,
  Plus,
  RotateCcw,
  Trash2,
  Video,
  Zap,
} from "lucide-react";
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
            loading="lazy"
            decoding="async"
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
        loading="lazy"
        decoding="async"
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

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function ImageCropCanvas({ ad, setAd }) {
  const frameRef = useRef(null);
  const dragRef = useRef(null);
  const [imageRatio, setImageRatio] = useState(16 / 9);
  const crop = ad.imageCrop || {};
  const zoom = clamp(Number(crop.zoom) || 1, 1, 3);
  const cropX = clamp(Number(crop.x ?? 50), 0, 100);
  const cropY = clamp(Number(crop.y ?? 50), 0, 100);
  const aspect = crop.aspect || "source";
  const frameAspect =
    { square: 1, landscape: 16 / 9, portrait: 9 / 16 }[aspect] ||
    imageRatio;

  const updateCrop = (updates) => {
    setAd((current) => ({
      ...current,
      imageCrop: { ...current.imageCrop, ...updates },
    }));
  };

  const handleWheel = (event) => {
    event.preventDefault();
    const direction = event.deltaY < 0 ? 1 : -1;
    const nextZoom = clamp(zoom + direction * 0.1, 1, 3);
    updateCrop({ zoom: Number(nextZoom.toFixed(2)) });
  };

  const handlePointerDown = (event) => {
    const frame = frameRef.current;
    if (!frame) return;

    event.currentTarget.setPointerCapture?.(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      cropX,
      cropY,
      width: Math.max(1, frame.clientWidth),
      height: Math.max(1, frame.clientHeight),
    };
  };

  const handlePointerMove = (event) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const nextX = clamp(
      drag.cropX - ((event.clientX - drag.startX) / drag.width) * (100 / zoom),
      0,
      100,
    );
    const nextY = clamp(
      drag.cropY - ((event.clientY - drag.startY) / drag.height) * (100 / zoom),
      0,
      100,
    );
    updateCrop({ x: Math.round(nextX), y: Math.round(nextY) });
  };

  const stopDragging = (event) => {
    if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3 rounded-lg border border-primary/15 bg-primary/5 p-3">
        <Move className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <p className="text-sm text-muted-foreground">
          Arraste a imagem para definir o enquadramento. Você também pode usar a
          roda do mouse ou os controles abaixo para aproximar.
        </p>
      </div>
      <div
        ref={frameRef}
        className="relative w-full cursor-grab touch-none select-none overflow-hidden rounded-lg border border-border bg-muted shadow-inner active:cursor-grabbing"
        style={{ aspectRatio: frameAspect }}
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={stopDragging}
        onPointerCancel={stopDragging}
        role="application"
        aria-label="Editor de recorte da imagem"
      >
        <img
          src={ad.src}
          alt="Prévia do recorte da imagem"
          draggable={false}
          className="pointer-events-none absolute inset-0 h-full w-full object-cover"
          style={{
            objectPosition: `${cropX}% ${cropY}%`,
            transform: zoom === 1 ? undefined : `scale(${zoom})`,
            transformOrigin: `${cropX}% ${cropY}%`,
          }}
          onLoad={(event) => {
            const { naturalWidth, naturalHeight } = event.currentTarget;
            if (naturalWidth && naturalHeight)
              setImageRatio(naturalWidth / naturalHeight);
          }}
        />
        <div className="pointer-events-none absolute inset-0 border-2 border-primary/70" />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,transparent_33.2%,hsl(var(--border)/0.55)_33.5%,transparent_33.8%,transparent_66.2%,hsl(var(--border)/0.55)_66.5%,transparent_66.8%),linear-gradient(to_bottom,transparent_33.2%,hsl(var(--border)/0.55)_33.5%,transparent_33.8%,transparent_66.2%,hsl(var(--border)/0.55)_66.5%,transparent_66.8%)]" />
        <div className="pointer-events-none absolute bottom-2 right-2 rounded bg-background/85 px-2 py-1 text-xs font-medium tabular-nums text-foreground shadow-sm">
          {zoom.toFixed(2)}×
        </div>
      </div>
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
  const hasPendingImage = hasPendingMedia && ad.mediaType === "image";
  const [activeTab, setActiveTab] = useState("data");

  useEffect(() => {
    if (hasPendingImage) setActiveTab("adjustment");
    else if (activeTab === "adjustment") setActiveTab("media");
  }, [activeTab, hasPendingImage]);

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
    <Tabs value={activeTab} onValueChange={setActiveTab} className="py-4">
      <TabsList
        className={`grid w-full ${hasPendingImage ? "grid-cols-3" : "grid-cols-2"}`}
      >
        <TabsTrigger value="data">Dados</TabsTrigger>
        <TabsTrigger value="media">Mídia e prévia</TabsTrigger>
        {hasPendingImage ? (
          <TabsTrigger value="adjustment">Ajustar imagem</TabsTrigger>
        ) : null}
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
          <Label>URL da mídia</Label>
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
              Arquivo anexado. Clique em Salvar para enviar esta mídia e
              vinculá-la ao patrocínio.
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
            A duração é definida em Configurações &gt; Telão, de acordo com o
            tipo de mídia.
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
                Preparando mídia… {Math.round(progress)}%
              </p>
            </div>
          ) : null}
        </div>

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
                      className="bg-destructive text-destructive-foreground hover:bg-destructive-hover"
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

      {hasPendingImage ? (
        <TabsContent value="adjustment" className="mt-5 space-y-5">
          <div className="space-y-2">
            <Label>Formato de exibição</Label>
            <Select
              value={ad.imageCrop?.aspect || "source"}
              onValueChange={(aspect) =>
                setAd((prev) => ({
                  ...prev,
                  imageCrop: { ...prev.imageCrop, aspect },
                }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="source">Proporção original</SelectItem>
                <SelectItem value="landscape">Paisagem 16:9</SelectItem>
                <SelectItem value="square">Quadrado 1:1</SelectItem>
                <SelectItem value="portrait">Retrato 9:16</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Escolha o formato antes de posicionar os elementos importantes.
            </p>
          </div>
          <ImageCropCanvas ad={ad} setAd={setAd} />
          <div className="rounded-lg border border-border bg-muted/20 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <Label htmlFor="image-zoom">Zoom</Label>
              <span className="rounded-md bg-background px-2 py-1 text-xs font-semibold tabular-nums text-muted-foreground">
                {(Number(ad.imageCrop?.zoom) || 1).toFixed(2)}×
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="Diminuir zoom"
                onClick={() =>
                  setAd((prev) => ({
                    ...prev,
                    imageCrop: {
                      ...prev.imageCrop,
                      zoom: Number(
                        clamp((Number(prev.imageCrop?.zoom) || 1) - 0.1, 1, 3).toFixed(2),
                      ),
                    },
                  }))
                }
              >
                <Minus />
              </Button>
              <Slider
                id="image-zoom"
                min={1}
                max={3}
                step={0.01}
                value={[clamp(Number(ad.imageCrop?.zoom) || 1, 1, 3)]}
                onValueChange={([zoom]) =>
                  setAd((prev) => ({
                    ...prev,
                    imageCrop: { ...prev.imageCrop, zoom: Number(zoom.toFixed(2)) },
                  }))
                }
                aria-label="Zoom da imagem"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="Aumentar zoom"
                onClick={() =>
                  setAd((prev) => ({
                    ...prev,
                    imageCrop: {
                      ...prev.imageCrop,
                      zoom: Number(
                        clamp((Number(prev.imageCrop?.zoom) || 1) + 0.1, 1, 3).toFixed(2),
                      ),
                    },
                  }))
                }
              >
                <Plus />
              </Button>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="mt-3 w-full text-muted-foreground"
              onClick={() =>
                setAd((prev) => ({
                  ...prev,
                  imageCrop: {
                    ...prev.imageCrop,
                    zoom: 1,
                    x: 50,
                    y: 50,
                  },
                }))
              }
            >
              <RotateCcw />
              Centralizar e restaurar zoom
            </Button>
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
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Maximize2 className="h-3.5 w-3.5" />
              A prévia mostra exatamente o enquadramento. O arquivo final será
              recortado e salvo em WebP ao confirmar.
            </p>
          </div>
        </TabsContent>
      ) : null}
    </Tabs>
  );
}
