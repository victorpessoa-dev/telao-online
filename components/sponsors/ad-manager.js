"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowDownUp,
  ChevronDown,
  ChevronUp,
  Edit2,
  ExternalLink,
  RotateCcw,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/lib/store/store";
import {
  deleteUploadedMedia,
  cropImageForUpload,
  prepareMediaForUpload,
  uploadMedia,
} from "@/services/supabase/upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { HoverTip } from "@/components/shared/hover-tip";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import PaginationControls from "@/components/shared/pagination-controls";
import {
  MediaPreview,
  SponsorForm,
  TypeBadge,
} from "@/components/sponsors/ad-manager-parts";
import {
  AdManagerEmptyState,
  AdManagerToolbar,
} from "@/components/sponsors/ad-manager-toolbar";
import { validatePublicVideoSource } from "@/lib/utils/video-source";
import { flushPendingSponsorLogs } from "@/lib/services/sponsor-log-flush";

const ADMIN_PAGE_SIZE = 10;

function AdManagerSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true">
      <span className="sr-only" role="status">
        Carregando patrocínios...
      </span>
      <div className="rounded-xl border border-border/80 p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <Skeleton className="h-6 w-44" />
            <Skeleton className="h-4 w-72 max-w-full" />
          </div>
          <Skeleton className="h-10 w-36" />
        </div>
      </div>
      <div className="flex flex-col gap-3 border-b border-border/70 pb-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-3 w-28" />
        </div>
        <Skeleton className="h-10 w-full sm:w-80" />
      </div>
      <div className="overflow-hidden rounded-xl border border-border/80">
        {Array.from({ length: 5 }, (_, index) => (
          <div
            key={index}
            className="flex items-center gap-4 border-b border-border/70 p-4 last:border-b-0"
          >
            <Skeleton className="h-14 w-24 shrink-0 rounded-lg" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="hidden h-8 w-24 sm:block" />
            <Skeleton className="h-9 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}

function createEmptyAd(defaultDurations) {
  return {
    name: "",
    type: "NORMAL",
    src: "",
    duration: defaultDurations.IMAGE,
    mediaType: "image",
    sourceType: "link",
    websiteUrl: "",
    imageCrop: { zoom: 1, x: 50, y: 50, aspect: "landscape", backgroundColor: "#050505" },
  };
}

function formatDuration(seconds) {
  const total = Math.max(0, Math.floor(Number(seconds) || 0));
  const minutes = Math.floor(total / 60);
  const rest = total % 60;
  return minutes > 0 ? `${minutes}m ${rest}s` : `${rest}s`;
}

function formatDateTime(value) {
  if (!value) return "Nunca exibido";
  return new Date(value).toLocaleString("pt-BR");
}

function formatDisplayCount(value) {
  const count = Math.max(0, Number(value) || 0);
  return `${count} ${count === 1 ? "exibição" : "exibições"}`;
}

function SortableTableHead({
  column,
  children,
  sort,
  onSort,
  className = "",
}) {
  const isActive = sort.column === column;
  const Icon = isActive
    ? sort.direction === "asc"
      ? ChevronUp
      : ChevronDown
    : ArrowDownUp;

  return (
    <TableHead
      className={className}
      aria-sort={
        isActive ? (sort.direction === "asc" ? "ascending" : "descending") : "none"
      }
    >
      <button
        type="button"
        onClick={() => onSort(column)}
        className="-mx-2 inline-flex items-center gap-1.5 rounded px-2 py-1 text-left transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={`Ordenar por ${String(children).toLocaleLowerCase("pt-BR")}`}
      >
        {children}
        <Icon
          className={`h-3.5 w-3.5 ${isActive ? "text-primary" : "text-muted-foreground/70"}`}
        />
      </button>
    </TableHead>
  );
}

export default function AdManager({
  defaultDurations = { IMAGE: 10, VIDEO: 15 },
  churchSlug = "",
  masterFilterEnabled = false,
  onMasterFilterToggle,
}) {
  const {
    metricAds: ads,
    churchId,
    createAd,
    updateAd,
    deleteAd,
    error,
    isLoaded,
    sponsorSettings,
    updateSponsorSettings,
  } = useStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingAd, setEditingAd] = useState(null);
  const [newAd, setNewAd] = useState(() => createEmptyAd(defaultDurations));
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [mediaFilter, setMediaFilter] = useState("all");
  const [adPendingDelete, setAdPendingDelete] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [savingAd, setSavingAd] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [replacementPending, setReplacementPending] = useState(null);
  const [tableSort, setTableSort] = useState({
    column: "createdAt",
    direction: "desc",
  });
  const officialDisplayWindowRef = useRef(null);
  const orderedAds = useMemo(
    () => {
      const factor = tableSort.direction === "asc" ? 1 : -1;
      return [...ads].sort((left, right) => {
        if (tableSort.column === "name") {
          return (
            String(left.name || "").localeCompare(String(right.name || ""), "pt-BR") *
            factor
          );
        }
        if (tableSort.column === "totalSeconds") {
          return (
            ((Number(left.totalSeconds) || 0) -
              (Number(right.totalSeconds) || 0)) *
            factor
          );
        }
        if (tableSort.column === "active") {
          return (Number(Boolean(left.active)) - Number(Boolean(right.active))) * factor;
        }
        return new Date(right.createdAt || 0) - new Date(left.createdAt || 0);
      });
    },
    [ads, tableSort],
  );

  const filteredAds = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return orderedAds.filter((ad) => {
      const matchesTerm =
        !term ||
        [ad.name, ad.type, ad.websiteUrl]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(term));
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" ? ad.active : !ad.active);
      const matchesType = typeFilter === "all" || ad.type === typeFilter;
      const matchesMedia =
        mediaFilter === "all" || ad.mediaType === mediaFilter;
      return matchesTerm && matchesStatus && matchesType && matchesMedia;
    });
  }, [mediaFilter, orderedAds, searchTerm, statusFilter, typeFilter]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredAds.length / ADMIN_PAGE_SIZE),
  );
  const paginatedAds = useMemo(() => {
    const start = (currentPage - 1) * ADMIN_PAGE_SIZE;
    return filteredAds.slice(start, start + ADMIN_PAGE_SIZE);
  }, [currentPage, filteredAds]);
  const activeSponsorCounts = useMemo(
    () => ({
      NORMAL: ads.filter((ad) => ad.active && ad.type === "NORMAL").length,
      MASTER: ads.filter((ad) => ad.active && ad.type === "MASTER").length,
    }),
    [ads],
  );
  const hasActiveFilters =
    Boolean(searchTerm.trim()) ||
    statusFilter !== "all" ||
    typeFilter !== "all" ||
    mediaFilter !== "all";

  // The store is already scoped by the authenticated church; build public links
  // from its slug instead of retaining the legacy global public routes.
  const publicTelaoPath = churchSlug ? `/${churchSlug}/ads-telao` : "";
  const getReportPath = useCallback(
    (sponsorId) =>
      churchSlug ? `/${churchSlug}/parceiros/${sponsorId}` : "",
    [churchSlug],
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [mediaFilter, searchTerm, statusFilter, tableSort, typeFilter]);

  const handleTableSort = useCallback((column) => {
    setTableSort((current) => {
      if (current.column === column) {
        return {
          column,
          direction: current.direction === "asc" ? "desc" : "asc",
        };
      }

      return {
        column,
        direction: column === "name" ? "asc" : "desc",
      };
    });
  }, []);

  const resetFilters = useCallback(() => {
    setSearchTerm("");
    setStatusFilter("all");
    setTypeFilter("all");
    setMediaFilter("all");
  }, []);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  useEffect(() => {
    if (error) toast.error(error);
  }, [error]);

  useEffect(() => {
    if (!isLoaded || !sponsorSettings.metricsEnabled) return;

    const nextPaused = {
      NORMAL:
        activeSponsorCounts.NORMAL === 0 ||
        Boolean(sponsorSettings.metricsPaused?.NORMAL),
      MASTER:
        activeSponsorCounts.MASTER === 0 ||
        Boolean(sponsorSettings.metricsPaused?.MASTER),
    };
    const nextEnabled =
      activeSponsorCounts.NORMAL > 0 || activeSponsorCounts.MASTER > 0
        ? !(nextPaused.NORMAL && nextPaused.MASTER)
        : false;

    if (
      nextEnabled !== sponsorSettings.metricsEnabled ||
      nextPaused.NORMAL !== Boolean(sponsorSettings.metricsPaused?.NORMAL) ||
      nextPaused.MASTER !== Boolean(sponsorSettings.metricsPaused?.MASTER)
    ) {
      updateSponsorSettings({
        metricsEnabled: nextEnabled,
        metricsPaused: nextPaused,
      }).catch((requestError) => {
        toast.error(
          requestError instanceof Error
            ? requestError.message
            : "Erro ao atualizar contador",
        );
      });
    }
  }, [
    activeSponsorCounts.MASTER,
    activeSponsorCounts.NORMAL,
    isLoaded,
    sponsorSettings.metricsEnabled,
    sponsorSettings.metricsPaused,
    updateSponsorSettings,
  ]);

  const getMediaDuration = useCallback(
    (mediaType) =>
      mediaType === "video" ? defaultDurations.VIDEO : defaultDurations.IMAGE,
    [defaultDurations.IMAGE, defaultDurations.VIDEO],
  );

  const readUpload = useCallback(async (file, setter, onProgress) => {
    if (!file) return;

    try {
      onProgress?.(12);
      const preparedFile = await prepareMediaForUpload(file, onProgress);
      onProgress?.(98);
      const mediaType = preparedFile.type?.startsWith("video/")
        ? "video"
        : "image";
      const previewUrl = URL.createObjectURL(preparedFile);
      setter((prev) => {
        if (prev.pendingPreviewUrl) URL.revokeObjectURL(prev.pendingPreviewUrl);
        return {
          ...prev,
          src: previewUrl,
          pendingFile: preparedFile,
          pendingPreviewUrl: previewUrl,
          sourceType: "pending-upload",
          mediaType,
        };
      });
      onProgress?.(100);
      toast.success(
        mediaType === "video"
          ? "Vídeo preparado. Ele será enviado ao salvar."
          : "Imagem otimizada. Ela será enviada ao salvar.",
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao enviar arquivo",
      );
      throw error;
    }
  }, []);

  const uploadPendingMedia = useCallback(async (ad) => {
    if (!ad.pendingFile) return ad;
    const file =
      ad.mediaType === "image"
        ? await cropImageForUpload(ad.pendingFile, ad.imageCrop)
        : ad.pendingFile;
    const uploadedUrl = await uploadMedia(file, "sponsors", "", {
      alreadyPrepared: true,
    });
    return {
      ...ad,
      src: uploadedUrl,
      pendingFile: undefined,
      pendingPreviewUrl: undefined,
      sourceType: "upload",
      imageCrop: undefined,
    };
  }, []);

  const normalizeAd = useCallback(
    (ad) => ({
      ...ad,
      mediaType: ad.mediaType === "video" ? "video" : "image",
      duration: Math.max(3, Number(getMediaDuration(ad.mediaType)) || 3),
    }),
    [getMediaDuration],
  );

  const openOfficialDisplay = useCallback(
    async (displayWindow = null) => {
      if (!churchSlug) throw new Error("Igreja não identificada para abrir o telão");
      const response = await fetch("/api/telao/official-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: churchSlug }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.session) {
        throw new Error(payload.error || "Não foi possível abrir o telão oficial");
      }
      const fragment = new URLSearchParams({
        displaySession: payload.session.sessionId,
        displayToken: payload.session.token,
      });
      const url = `/${churchSlug}/ads-telao#${fragment.toString()}`;

      if (displayWindow && !displayWindow.closed) {
        displayWindow.opener = null;
        displayWindow.location.replace(url);
        officialDisplayWindowRef.current = displayWindow;
        return;
      }
      officialDisplayWindowRef.current = window.open(url, "_blank", "noopener");
    },
    [churchSlug],
  );

  const updateMetricsEnabled = useCallback(
    async (checked) => {
      // Open immediately while this switch interaction is still a trusted user
      // gesture; awaiting the settings request first would trigger popup blocking.
      const displayWindow = checked ? window.open("", "_blank") : null;
      if (
        checked &&
        activeSponsorCounts.NORMAL === 0 &&
        activeSponsorCounts.MASTER === 0
      ) {
        displayWindow?.close();
        throw new Error(
          "Ative pelo menos um patrocinador NORMAL ou MASTER antes de ligar o contador",
        );
      }

      try {
        if (!checked) {
          // The SQL function accepts logs only while the official session and
          // metrics setting remain active. Persist completed rotations before
          // revoking the session or closing its display window.
          await flushPendingSponsorLogs({
            storage: window.localStorage,
            churchId,
          });
        }
        await updateSponsorSettings({
          metricsEnabled: checked,
          metricsPaused: checked
            ? {
                NORMAL: activeSponsorCounts.NORMAL === 0,
                MASTER: activeSponsorCounts.MASTER === 0,
              }
            : sponsorSettings.metricsPaused,
        });
        if (!checked) {
          officialDisplayWindowRef.current?.close();
          officialDisplayWindowRef.current = null;
        }
        if (checked) await openOfficialDisplay(displayWindow);
      } catch (error) {
        displayWindow?.close();
        throw error;
      }
    },
    [
      activeSponsorCounts.MASTER,
      activeSponsorCounts.NORMAL,
      churchId,
      openOfficialDisplay,
      sponsorSettings.metricsPaused,
      updateSponsorSettings,
    ],
  );

  const updateMetricsPause = useCallback(
    async (kind, paused) => {
      if (!paused && activeSponsorCounts[kind] === 0) {
        throw new Error(`Não há patrocinador ${kind} ativo para contabilizar`);
      }

      const nextPaused = {
        NORMAL:
          activeSponsorCounts.NORMAL === 0 ||
          Boolean(sponsorSettings.metricsPaused?.NORMAL),
        MASTER:
          activeSponsorCounts.MASTER === 0 ||
          Boolean(sponsorSettings.metricsPaused?.MASTER),
        [kind]: paused,
      };

      await updateSponsorSettings({
        metricsEnabled:
          (activeSponsorCounts.NORMAL > 0 || activeSponsorCounts.MASTER > 0) &&
          !(nextPaused.NORMAL && nextPaused.MASTER),
        metricsPaused: nextPaused,
      });
    },
    [activeSponsorCounts, sponsorSettings.metricsPaused, updateSponsorSettings],
  );

  const handleCreateAd = async () => {
    let ad = normalizeAd(newAd);

    if (!ad.name.trim()) {
      toast.error("Digite um nome para o patrocínio");
      return;
    }
    if (!ad.src.trim()) {
      toast.error("Adicione uma imagem, vídeo ou link");
      return;
    }

    if (uploadingMedia) {
      toast.error("Aguarde o upload terminar antes de salvar");
      return;
    }

    setSavingAd(true);
    let uploadedUrl = "";
    try {
      ad = normalizeAd(await uploadPendingMedia(ad));
      uploadedUrl = ad.pendingFile ? "" : ad.sourceType === "upload" ? ad.src : "";
      if (ad.mediaType === "video" && !uploadedUrl)
        await validatePublicVideoSource(ad.src);
      await createAd(ad);
      if (newAd.pendingPreviewUrl) URL.revokeObjectURL(newAd.pendingPreviewUrl);
      toast.success(`Patrocínio "${ad.name}" criado`);
      setDialogOpen(false);
      setNewAd(createEmptyAd(defaultDurations));
    } catch (error) {
      if (uploadedUrl) await deleteUploadedMedia(uploadedUrl).catch(() => {});
      toast.error(
        error instanceof Error ? error.message : "Erro ao criar patrocínio",
      );
    } finally {
      setSavingAd(false);
    }
  };

  const saveEditAd = async () => {
    if (!editingAd) return;
    let ad = normalizeAd(editingAd);

    if (!ad.name.trim()) {
      toast.error("Digite um nome para o patrocínio");
      return;
    }
    if (!ad.src.trim()) {
      toast.error("Adicione uma imagem, vídeo ou link");
      return;
    }

    if (uploadingMedia) {
      toast.error("Aguarde o upload terminar antes de salvar");
      return;
    }

    setSavingAd(true);
    let uploadedUrl = "";
    try {
      ad = normalizeAd(await uploadPendingMedia(ad));
      uploadedUrl = ad.sourceType === "upload" && editingAd.pendingFile ? ad.src : "";
      if (ad.mediaType === "video" && !uploadedUrl)
        await validatePublicVideoSource(ad.src);
      const previousMediaUrl =
        ads.find((item) => item.id === editingAd.id)?.src || "";
      const updatedAd = await updateAd(editingAd.id, ad);
      if (!updatedAd)
        throw new Error("O banco não retornou o patrocínio atualizado");
      if (previousMediaUrl && previousMediaUrl !== updatedAd.src) {
        try {
          await deleteUploadedMedia(previousMediaUrl);
        } catch {
          toast.warning(
            "Patrocínio atualizado, mas o arquivo anterior não pôde ser removido do armazenamento.",
          );
        }
      }
      if (editingAd.pendingPreviewUrl)
        URL.revokeObjectURL(editingAd.pendingPreviewUrl);
      toast.success("Patrocínio atualizado.");
      setEditDialogOpen(false);
      setEditingAd(null);
    } catch (error) {
      if (uploadedUrl) await deleteUploadedMedia(uploadedUrl).catch(() => {});
      toast.error(
        error instanceof Error ? error.message : "Erro ao atualizar o patrocínio.",
      );
    } finally {
      setSavingAd(false);
    }
  };

  const handleEditAd = async () => {
    if (!editingAd) return;
    const previousMediaUrl = ads.find((item) => item.id === editingAd.id)?.src;
    if (previousMediaUrl && editingAd.src !== previousMediaUrl) {
      setReplacementPending({ previousMediaUrl });
      return;
    }
    await saveEditAd();
  };

  const handleDeleteAd = async () => {
    if (!adPendingDelete) return;

    try {
      const result = await deleteAd(adPendingDelete.id);
      if (result?.storageErrors?.length) {
        toast.warning(
          `Patrocínio "${adPendingDelete.name}" excluído, mas um arquivo não pôde ser removido.`,
        );
      } else {
        toast.success(`Patrocínio "${adPendingDelete.name}" excluído.`);
      }
      setAdPendingDelete(null);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao excluir o patrocínio.",
      );
    }
  };

  const copyPublicUrl = useCallback((path) => {
    navigator.clipboard.writeText(`${window.location.origin}${path}`);
    toast.success(`URL ${path} copiada`);
  }, []);

  if (!isLoaded) {
    return <AdManagerSkeleton />;
  }

  return (
    <div className="space-y-5">
      <AdManagerToolbar
        onCopyPublicUrl={copyPublicUrl}
        onOpenOfficialDisplay={() => {
          openOfficialDisplay().catch((requestError) => {
            toast.error(
              requestError instanceof Error
                ? requestError.message
                : "Erro ao abrir telão oficial",
            );
          });
        }}
        publicTelaoPath={publicTelaoPath}
        metricsEnabled={sponsorSettings.metricsEnabled}
        metricsPaused={sponsorSettings.metricsPaused}
        activeCounts={activeSponsorCounts}
        onMetricsToggle={async (checked) => {
          try {
            await updateMetricsEnabled(checked);
            toast.success(
              checked
                ? "Contador de exibições do telão ativado."
                : "Contador de exibições do telão desativado.",
            );
          } catch (error) {
            toast.error(
              error instanceof Error
                ? error.message
                : "Erro ao salvar a configuração.",
            );
          }
        }}
        onMetricsPauseToggle={async (kind, paused) => {
          try {
            await updateMetricsPause(kind, paused);
            toast.success(
              paused ? `Contador ${kind} pausado` : `Contador ${kind} retomado`,
            );
          } catch (error) {
            toast.error(
              error instanceof Error
                ? error.message
                : "Erro ao salvar a configuração.",
            );
          }
        }}
        masterFilterEnabled={masterFilterEnabled}
        onMasterFilterToggle={onMasterFilterToggle}
        onOpenCreateDialog={() => {
          setNewAd(createEmptyAd(defaultDurations));
          setDialogOpen(true);
        }}
      />

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (open) setNewAd(createEmptyAd(defaultDurations));
        }}
      >
        <DialogTrigger asChild>
          <span className="hidden" />
        </DialogTrigger>
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Novo patrocínio</DialogTitle>
            <DialogDescription>
              O patrocínio será exibido em{" "}
              <code>{publicTelaoPath || "/{slug}/ads-telao"}</code> quando
              estiver ativo.
            </DialogDescription>
          </DialogHeader>
          <SponsorForm
            ad={newAd}
            setAd={setNewAd}
            onUpload={readUpload}
            onUploadStateChange={setUploadingMedia}
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={savingAd || uploadingMedia}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCreateAd}
              disabled={savingAd || uploadingMedia}
            >
              {savingAd ? "Salvando..." : "Cadastrar patrocínio"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="flex flex-col gap-3 border-b border-border/70 pb-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-foreground">
            Lista de patrocinadores
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Exibindo {filteredAds.length} de {orderedAds.length}{" "}
            {orderedAds.length === 1 ? "patrocinador" : "patrocinadores"}
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:max-w-4xl sm:flex-row sm:flex-wrap">
          <div className="relative min-w-0 flex-1 sm:min-w-72 sm:flex-[2]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Buscar na lista"
              className="pl-9"
              aria-label="Buscar patrocinador na lista"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-32" aria-label="Filtrar por status">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="active">Ativos</SelectItem>
              <SelectItem value="inactive">Inativos</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full sm:w-32" aria-label="Filtrar por tipo">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              <SelectItem value="NORMAL">Normal</SelectItem>
              <SelectItem value="MASTER">Master</SelectItem>
            </SelectContent>
          </Select>
          <Select value={mediaFilter} onValueChange={setMediaFilter}>
            <SelectTrigger className="w-full sm:w-32" aria-label="Filtrar por mídia">
              <SelectValue placeholder="Mídia" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as mídias</SelectItem>
              <SelectItem value="image">Imagem</SelectItem>
              <SelectItem value="video">Vídeo</SelectItem>
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full sm:w-auto"
            onClick={resetFilters}
            disabled={!hasActiveFilters}
          >
            <RotateCcw className="h-4 w-4" />
            Limpar filtros
          </Button>
        </div>
      </div>

      {filteredAds.length === 0 ? (
        <AdManagerEmptyState
          orderedAdsLength={orderedAds.length}
          filteredAdsLength={filteredAds.length}
          onClearFilters={resetFilters}
        />
      ) : (
        <>
          <div className="hidden rounded-xl border border-border/80 lg:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[110px]">Prévia</TableHead>
                  <SortableTableHead
                    column="name"
                    sort={tableSort}
                    onSort={handleTableSort}
                  >
                    Patrocinador
                  </SortableTableHead>
                  <TableHead className="w-[130px]">Última exibição</TableHead>
                  <SortableTableHead
                    column="totalSeconds"
                    sort={tableSort}
                    onSort={handleTableSort}
                    className="w-[110px]"
                  >
                    Tempo exibido
                  </SortableTableHead>
                  <SortableTableHead
                    column="active"
                    sort={tableSort}
                    onSort={handleTableSort}
                    className="w-[92px] text-center"
                  >
                    Ativo
                  </SortableTableHead>
                  <TableHead className="w-[220px] text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedAds.map((ad) => (
                  <TableRow
                    key={ad.id}
                    className={!ad.active ? "opacity-65" : ""}
                  >
                    <TableCell>
                      <MediaPreview ad={ad} compact />
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium text-foreground">
                          {ad.name}
                        </div>
                        <TypeBadge ad={ad} />
                        <div className="text-xs text-muted-foreground">
                          {formatDuration(getMediaDuration(ad.mediaType))} por
                          exibição · {formatDisplayCount(ad.views)}
                        </div>
                        {ad.websiteUrl ? (
                          <div className="truncate text-xs text-muted-foreground">
                            {ad.websiteUrl}
                          </div>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDateTime(ad.lastDisplayedAt)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDuration(ad.totalSeconds)}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-center">
                        <Switch
                          checked={ad.active}
                          onCheckedChange={async () => {
                            try {
                              await updateAd(ad.id, { active: !ad.active });
                              toast.success(
                                !ad.active
                                  ? "Patrocinador ativado no telão."
                                  : "Patrocinador removido do telão.",
                              );
                            } catch (error) {
                              toast.error(
                                error instanceof Error
                                  ? error.message
                                  : "Erro ao atualizar patrocinador",
                              );
                            }
                          }}
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          onClick={() => {
                            setEditingAd(ad);
                            setEditDialogOpen(true);
                          }}
                        >
                          <Edit2 className="mr-2 h-4 w-4" />
                          Editar
                        </Button>
                        <Button
                          asChild
                          variant="outline"
                          size="sm"
                          className="border-primary/30 text-primary hover:border-primary-hover hover:bg-primary-hover hover:text-primary-foreground"
                        >
                          <Link
                            href={getReportPath(ad.id) || "#"}
                            target="_blank"
                            aria-disabled={!churchSlug}
                          >
                            <ExternalLink className="mr-2 h-4 w-4" />
                            Relatório
                          </Link>
                        </Button>
                        <HoverTip label={`Excluir patrocínio ${ad.name}`}>
                          <Button
                            variant="destructive"
                            size="icon"
                            onClick={() => setAdPendingDelete(ad)}
                            aria-label={`Excluir patrocínio ${ad.name}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </HoverTip>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="space-y-3 lg:hidden">
            {paginatedAds.map((ad) => (
              <div
                key={ad.id}
                className={`rounded-xl border border-border/80 p-4 ${!ad.active ? "opacity-65" : ""}`}
              >
                <div className="flex gap-3">
                  <MediaPreview ad={ad} compact />
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="truncate font-medium text-foreground">
                          {ad.name}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {formatDuration(getMediaDuration(ad.mediaType))} por
                          exibição · {formatDisplayCount(ad.views)}
                        </div>
                      </div>
                      <div className="shrink-0">
                        <TypeBadge ad={ad} />
                      </div>
                    </div>

                    <dl className="grid gap-x-4 gap-y-2 text-xs text-muted-foreground sm:grid-cols-2">
                      <div className="min-w-0">
                          <dt className="font-medium text-foreground/80">Link do telão</dt>
                        <dd className="truncate">
                          {publicTelaoPath || "/{slug}/ads-telao"}
                        </dd>
                      </div>
                      <div className="min-w-0">
                        <dt className="font-medium text-foreground/80">Última exibição</dt>
                        <dd className="truncate">{formatDateTime(ad.lastDisplayedAt)}</dd>
                      </div>
                      <div>
                        <dt className="font-medium text-foreground/80">Tempo exibido</dt>
                        <dd>{formatDuration(ad.totalSeconds)}</dd>
                      </div>
                      {ad.websiteUrl ? (
                        <div className="min-w-0">
                          <dt className="font-medium text-foreground/80">Site</dt>
                          <dd className="truncate">{ad.websiteUrl}</dd>
                        </div>
                      ) : null}
                    </dl>
                  </div>
                </div>

                <div className="mt-4 flex flex-col gap-3 border-t border-border/70 pt-3 sm:flex-row sm:items-center sm:justify-between">
                  <label className="flex w-fit items-center gap-2 text-sm text-muted-foreground">
                    <Switch
                      checked={ad.active}
                      onCheckedChange={async () => {
                        try {
                          await updateAd(ad.id, { active: !ad.active });
                          toast.success(
                            !ad.active
                              ? "Patrocinador ativado no telão."
                              : "Patrocinador removido do telão.",
                          );
                        } catch (error) {
                          toast.error(
                            error instanceof Error
                              ? error.message
                              : "Erro ao atualizar patrocinador",
                          );
                        }
                      }}
                    />
                    Ativo no telão
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      onClick={() => {
                        setEditingAd(ad);
                        setEditDialogOpen(true);
                      }}
                    >
                      <Edit2 className="mr-2 h-4 w-4" />
                      Editar
                    </Button>
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="border-primary/30 text-primary hover:border-primary-hover hover:bg-primary-hover hover:text-primary-foreground"
                    >
                      <Link
                        href={getReportPath(ad.id) || "#"}
                        target="_blank"
                        aria-disabled={!churchSlug}
                      >
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Relatório
                      </Link>
                    </Button>
                    <HoverTip label={`Excluir patrocínio ${ad.name}`}>
                      <Button
                        variant="destructive"
                        size="icon"
                        onClick={() => setAdPendingDelete(ad)}
                        aria-label={`Excluir patrocínio ${ad.name}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </HoverTip>
                  </div>
                  </div>
              </div>
            ))}
          </div>
          <PaginationControls
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredAds.length}
            itemLabel="patrocinadores"
            onPageChange={setCurrentPage}
          />
        </>
      )}

      {/* Keep destructive actions and form state inside controlled dialogs. */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar patrocínio</DialogTitle>
            <DialogDescription>
              Atualize a mídia, o link, o tipo e a duração de exibição.
            </DialogDescription>
          </DialogHeader>
          {editingAd ? (
            <SponsorForm
              ad={editingAd}
              setAd={setEditingAd}
              onUpload={readUpload}
              onUploadStateChange={setUploadingMedia}
              allowMediaRemoval
            />
          ) : null}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
              disabled={savingAd || uploadingMedia}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleEditAd}
              disabled={savingAd || uploadingMedia}
            >
              {savingAd ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(replacementPending)}
        onOpenChange={(open) => !open && setReplacementPending(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Substituir a mídia do patrocínio?</AlertDialogTitle>
            <AlertDialogDescription>
              A nova mídia será enviada e passará a ser exibida no telão. Após
              a atualização ser concluída, o arquivo anterior será removido.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setReplacementPending(null);
                saveEditAd();
              }}
            >
              Substituir mídia
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={Boolean(adPendingDelete)}
        onOpenChange={(open) => !open && setAdPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir patrocínio?</AlertDialogTitle>
            <AlertDialogDescription>
              {adPendingDelete
                ? `O patrocínio "${adPendingDelete.name}" será removido do painel e do telão.`
                : "Confirme a exclusão do patrocínio."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAd}
              className="bg-destructive text-destructive-foreground hover:bg-destructive-hover"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
