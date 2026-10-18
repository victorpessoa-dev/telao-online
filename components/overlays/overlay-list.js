"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Clock,
  Copy,
  Edit,
  ExternalLink,
  Image as ImageIcon,
  Layers,
  MoreVertical,
  Trash2,
  Type,
} from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/lib/store/store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import LoadingState from "@/components/shared/loading-state";
import StaticMediaFrame from "@/components/shared/static-media-frame";

const OVERLAY_PAGE_SIZE = 34;

const LITURGICAL_COLORS = {
  bordox: "#7f1d1d",
  azul: "#1d4ed8",
  roxo: "#7e22ce",
  ouro: "#ca8a04",
};

function getLiturgicalColor(value) {
  return LITURGICAL_COLORS[value];
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function countElementsByType(elements) {
  const images = elements.filter((element) => element.type === "image").length;
  const texts = elements.filter((element) => element.type === "text").length;
  return { images, texts };
}

function OverlayPreview({ overlay, compact = false }) {
  const scale = Math.min(1, (compact ? 96 : 220) / overlay.width);
  const width = overlay.width * scale;
  const height = overlay.height * scale;

  return (
    <div
      className={`relative overflow-hidden rounded-lg border border-border bg-black/85 ${compact ? "w-24" : "w-[220px]"}`}
      style={{ height }}
    >
      {overlay.elements.length > 0 ? (
        <div
          className="absolute inset-0 origin-top-left"
          style={{
            transform: `scale(${scale})`,
            width: overlay.width,
            height: overlay.height,
          }}
        >
          {overlay.elements
            .filter((element) => element.visible)
            .map((element) => (
              <div
                key={element.id}
                className="absolute"
                style={{
                  left: element.x,
                  top: element.y,
                  width: element.width,
                  height: element.height,
                  zIndex: element.zIndex,
                  borderLeft:
                    element.liturgicalBorderClass &&
                    element.liturgicalBorderClass !== "none"
                      ? `5px solid ${getLiturgicalColor(element.liturgicalBorderClass)}`
                      : undefined,
                }}
              >
                {element.type === "image" && element.src ? (
                  <StaticMediaFrame
                    src={element.src}
                    alt=""
                    className="h-full w-full object-contain"
                  />
                ) : null}
                {element.type === "text" ? (
                  <div
                    className="flex h-full w-full items-center justify-center text-center"
                    style={{
                      fontSize: element.fontSize,
                      color: getLiturgicalColor(element.liturgicalColorClass),
                      fontFamily: element.fontFamily,
                    }}
                  >
                    {element.text}
                  </div>
                ) : null}
              </div>
            ))}
        </div>
      ) : (
        <div className="flex h-full items-center justify-center text-[11px] text-muted-foreground">
          Sem elementos
        </div>
      )}
    </div>
  );
}

export default function OverlayList({ searchQuery = "" }) {
  const { overlays, deleteOverlay, isLoaded } = useStore();
  const [overlayPendingDelete, setOverlayPendingDelete] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  const filteredOverlays = useMemo(
    () =>
      overlays.filter((overlay) =>
        overlay.name.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    [overlays, searchQuery],
  );
  const totalPages = Math.max(
    1,
    Math.ceil(filteredOverlays.length / OVERLAY_PAGE_SIZE),
  );
  const paginatedOverlays = useMemo(
    () =>
      filteredOverlays.slice(
        (currentPage - 1) * OVERLAY_PAGE_SIZE,
        currentPage * OVERLAY_PAGE_SIZE,
      ),
    [currentPage, filteredOverlays],
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const handleDelete = async () => {
    if (!overlayPendingDelete) return;

    try {
      const result = await deleteOverlay(overlayPendingDelete.id);
      if (result?.storageErrors?.length) {
        toast.warning(
          `Overlay "${overlayPendingDelete.name}" excluído, mas um ou mais arquivos não puderam ser removidos`,
        );
      } else {
        toast.success(
          `Overlay "${overlayPendingDelete.name}" excluído com sucesso`,
        );
      }
      setOverlayPendingDelete(null);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao excluir overlay",
      );
    }
  };

  const getOverlayUrl = async (id) => {
    if (window.vPlaycastDesktop?.overlays) {
      return window.vPlaycastDesktop.overlays.getUrl(id);
    }
    return "";
  };

  const copyOverlayUrl = async (id) => {
    const url = await getOverlayUrl(id);
    if (!url) {
      toast.error("Abra o aplicativo V Playcast para copiar o link local do OBS");
      return;
    }

    try {
      await navigator.clipboard.writeText(url);
      toast.success("URL copiada para a área de transferência");
    } catch {
      toast.error("Não foi possível copiar a URL");
    }
  };

  if (!isLoaded) {
    return <LoadingState label="Carregando overlays..." />;
  }

  if (filteredOverlays.length === 0) {
    const hasSearch = searchQuery.trim().length > 0;

    return (
      <div className="flex flex-col items-center justify-center border border-dashed border-border py-16 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-lg bg-muted">
          <Layers className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold text-foreground">
          {hasSearch ? "Nenhum overlay encontrado" : "Nenhum overlay criado"}
        </h3>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          Crie seu primeiro overlay para começar a montar as sobreposições da
          transmissão.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="hidden rounded-xl border border-border/80 lg:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[250px]">Prévia</TableHead>
              <TableHead>Overlay</TableHead>
              <TableHead className="w-[170px]">Dimensão</TableHead>
              <TableHead className="w-[140px]">Elementos</TableHead>
              <TableHead className="w-[150px]">Atualizado</TableHead>
              <TableHead className="w-[220px] text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedOverlays.map((overlay) => {
              const { images, texts } = countElementsByType(overlay.elements);

              return (
                <TableRow key={overlay.id}>
                  <TableCell>
                    <OverlayPreview overlay={overlay} />
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-medium text-foreground">
                        {overlay.name}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {images > 0 ? (
                          <Badge variant="secondary">
                            <ImageIcon className="mr-1 h-3 w-3" />
                            {images}
                          </Badge>
                        ) : null}
                        {texts > 0 ? (
                          <Badge variant="secondary">
                            <Type className="mr-1 h-3 w-3" />
                            {texts}
                          </Badge>
                        ) : null}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {overlay.elements.length} elemento(s) configurado(s)
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {overlay.width}x{overlay.height}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {images} imagem(ns) · {texts} texto(s)
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(overlay.updatedAt)}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/editor/${overlay.id}`}>
                          <Edit className="mr-2 h-4 w-4" />
                          Editar
                        </Link>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!window.vPlaycastDesktop?.overlays}
                        onClick={async () => {
                          const url = await getOverlayUrl(overlay.id);
                          if (url) window.open(url, "_blank", "noopener,noreferrer");
                        }}
                      >
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Visualizar
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="outline"
                            size="icon"
                            aria-label={`Mais ações para ${overlay.name}`}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => copyOverlayUrl(overlay.id)}
                          >
                            <Copy className="mr-2 h-4 w-4" />
                            Copiar URL
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() =>
                              setOverlayPendingDelete({
                                id: overlay.id,
                                name: overlay.name,
                              })
                            }
                            className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Excluir overlay
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <div className="space-y-3 lg:hidden">
        {paginatedOverlays.map((overlay) => {
          const { images, texts } = countElementsByType(overlay.elements);

          return (
            <div key={overlay.id} className="border border-border/80 p-3">
              <div className="flex gap-3">
                <OverlayPreview overlay={overlay} compact />
                <div className="min-w-0 flex-1 space-y-2">
                  <div>
                    <div className="truncate font-medium text-foreground">
                      {overlay.name}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {overlay.width}x{overlay.height} ·{" "}
                      {overlay.elements.length} elemento(s)
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {images > 0 ? (
                      <Badge variant="secondary">
                        <ImageIcon className="mr-1 h-3 w-3" />
                        {images}
                      </Badge>
                    ) : null}
                    {texts > 0 ? (
                      <Badge variant="secondary">
                        <Type className="mr-1 h-3 w-3" />
                        {texts}
                      </Badge>
                    ) : null}
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {formatDate(overlay.updatedAt)}
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/editor/${overlay.id}`}>
                        <Edit className="mr-2 h-4 w-4" />
                        Editar
                      </Link>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!window.vPlaycastDesktop?.overlays}
                      onClick={async () => {
                        const url = await getOverlayUrl(overlay.id);
                        if (url) window.open(url, "_blank", "noopener,noreferrer");
                      }}
                    >
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Visualizar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyOverlayUrl(overlay.id)}
                    >
                      <Copy className="mr-2 h-4 w-4" />
                      URL
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="text-destructive"
                      onClick={() =>
                        setOverlayPendingDelete({
                          id: overlay.id,
                          name: overlay.name,
                        })
                      }
                      aria-label={`Excluir overlay ${overlay.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <PaginationControls
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={filteredOverlays.length}
        itemLabel="overlays"
        onPageChange={setCurrentPage}
      />

      <AlertDialog
        open={Boolean(overlayPendingDelete)}
        onOpenChange={(open) => !open && setOverlayPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir overlay?</AlertDialogTitle>
            <AlertDialogDescription>
              {overlayPendingDelete
                ? `O overlay "${overlayPendingDelete.name}" será removido permanentemente.`
                : "Confirme a exclusão do overlay."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
