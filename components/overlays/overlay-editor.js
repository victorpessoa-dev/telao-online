"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useStore } from "@/lib/store/store";
import { Button } from "@/components/ui/button";
import { FileDropzone } from "@/components/ui/file-dropzone";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
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
  ArrowLeft,
  Plus,
  Image as ImageIcon,
  Type,
  Trash2,
  Eye,
  EyeOff,
  Copy,
  CopyPlus,
  Layers,
  Move,
  Settings,
  ExternalLink,
  ZoomIn,
  ZoomOut,
  Maximize,
  ChevronUp,
  ChevronDown,
  RotateCcw,
  Palette,
  Grid3X3,
  AlignCenterHorizontal,
  AlignCenterVertical,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { uploadMedia } from "@/services/supabase/upload";
import LoadingState from "@/components/shared/loading-state";
import StaticMediaFrame from "@/components/shared/static-media-frame";
import { resolveSnapPosition } from "@/lib/services/overlay-editor";
import {
  getOverlayAnimationClass,
  getOverlayMediaType,
  getOverlayOutputUrl,
  OVERLAY_ANIMATION_OPTIONS,
} from "@/lib/overlays/animations";

const SAFE_AREA_RATIO = 0.05;

const LITURGICAL_COLORS = {
  bordox: "#7f1d1d",
  azul: "#1d4ed8",
  roxo: "#7e22ce",
  ouro: "#ca8a04",
};

function getLiturgicalColor(value) {
  return LITURGICAL_COLORS[value];
}

function AnimationOptions() {
  return OVERLAY_ANIMATION_OPTIONS.map((animation) => (
    <SelectItem key={animation.value} value={animation.value}>
      {animation.label}
    </SelectItem>
  ));
}

function getSafeAreaBounds(overlay) {
  const insetX = Math.round(overlay.width * SAFE_AREA_RATIO);
  const insetY = Math.round(overlay.height * SAFE_AREA_RATIO);
  return {
    left: insetX,
    top: insetY,
    right: overlay.width - insetX,
    bottom: overlay.height - insetY,
    width: overlay.width - insetX * 2,
    height: overlay.height - insetY * 2,
  };
}

export default function OverlayEditor({ overlayId }) {
  const {
    getOverlay,
    addElement,
    updateElement,
    deleteElement,
    isLoaded,
  } = useStore();
  const router = useRouter();
  const [overlay, setOverlay] = useState(null);
  const [selectedElementId, setSelectedElementId] = useState(null);
  const [zoom, setZoom] = useState(0.5);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [alignmentGuides, setAlignmentGuides] = useState([]);
  const [showGrid, setShowGrid] = useState(true);
  const [, setShowSafeArea] = useState(false);
  const [addImageDialogOpen, setAddImageDialogOpen] = useState(false);
  const [addTextDialogOpen, setAddTextDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [elementPendingDelete, setElementPendingDelete] = useState(null);
  const [newImageUrl, setNewImageUrl] = useState("");
  const [newText, setNewText] = useState("");
  const [newElementOptions, setNewElementOptions] = useState({
    x: 0,
    y: 0,
    zoom: 100,
    visible: true,
  });
  const [alignTargetId, setAlignTargetId] = useState("canvas");
  const canvasRef = useRef(null);
  const dragPositionRef = useRef(null);
  const resizeRef = useRef(null);
  const resizeResultRef = useRef(null);
  const propertyPreviewRef = useRef(null);

  useEffect(() => {
    if (isLoaded) {
      const found = getOverlay(overlayId);
      if (found) {
        setOverlay(found);
      } else {
        toast.error("Overlay não encontrado");
        router.push("/overlay");
      }
    }
  }, [isLoaded, overlayId, getOverlay, router]);

  useEffect(() => {
    const handleUpdate = () => {
      const found = getOverlay(overlayId);
      if (found) {
        setOverlay(found);
      }
    };
    window.addEventListener("streamoverlay_update", handleUpdate);
    return () =>
      window.removeEventListener("streamoverlay_update", handleUpdate);
  }, [overlayId, getOverlay]);

  useEffect(() => {
    if (!selectedElementId || !overlay) return;
    if (!overlay.elements.some((element) => element.id === selectedElementId)) {
      setSelectedElementId(null);
    }
  }, [overlay, selectedElementId]);

  const selectedElement = overlay?.elements.find(
    (el) => el.id === selectedElementId,
  );

  const getDefaultElementOptions = useCallback(
    (defaults = {}) => ({
      x: defaults.x ?? Math.round((overlay?.width || 1920) / 2 - 100),
      y: defaults.y ?? Math.round((overlay?.height || 1080) / 2 - 100),
      zoom: defaults.zoom ?? 100,
      visible: defaults.visible ?? true,
      animationType: defaults.animationType ?? "none",
      liturgicalColorClass: defaults.liturgicalColorClass || "none",
      liturgicalBorderClass: defaults.liturgicalBorderClass || "none",
      tempoMissa: defaults.tempoMissa ?? null,
    }),
    [overlay?.height, overlay?.width],
  );

  const resetNewElementOptions = useCallback(
    (defaults = {}) => {
      setNewElementOptions(getDefaultElementOptions(defaults));
    },
    [getDefaultElementOptions],
  );

  const handleAddImage = async () => {
    if (!newImageUrl.trim()) {
      toast.error("Digite uma URL válida");
      return;
    }

    try {
      const newEl = await addElement(overlayId, {
        type: "image",
        src: newImageUrl,
        mediaType: getOverlayMediaType({ src: newImageUrl }),
        x: newElementOptions.x,
        y: newElementOptions.y,
        width: Math.round(200 * (newElementOptions.zoom / 100)),
        height: Math.round(200 * (newElementOptions.zoom / 100)),
        visible: newElementOptions.visible,
        animationType: newElementOptions.animationType,
        liturgicalBorderClass: newElementOptions.liturgicalBorderClass,
      });
      if (newEl) setSelectedElementId(newEl.id);
      setNewImageUrl("");
      resetNewElementOptions();
      setAddImageDialogOpen(false);
      toast.success("Imagem adicionada");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao adicionar imagem",
      );
    }
  };

  const handleImageUpload = async (file) => {
    if (!file) return;

    try {
      const url = await uploadMedia(file, `overlays/${overlayId}`);
      setNewImageUrl(url);
      toast.success("Upload enviado");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao enviar imagem",
      );
    }
  };

  const handleAddText = async () => {
    if (!newText.trim()) {
      toast.error("Digite um texto");
      return;
    }

    try {
      const newEl = await addElement(overlayId, {
        type: "text",
        text: newText,
        x: newElementOptions.x,
        y: newElementOptions.y,
        width: Math.round(300 * (newElementOptions.zoom / 100)),
        height: Math.round(50 * (newElementOptions.zoom / 100)),
        fontSize: 32,
        fontColor: "#ffffff",
        visible: newElementOptions.visible,
      });
      if (newEl) setSelectedElementId(newEl.id);
      setNewText("");
      resetNewElementOptions({
        x: Math.round((overlay.width || 1920) / 2 - 150),
        y: Math.round((overlay.height || 1080) / 2 - 25),
      });
      setAddTextDialogOpen(false);
      toast.success("Texto adicionado");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao adicionar texto",
      );
    }
  };

  const handleDeleteElement = useCallback(
    async (elementId) => {
      let storageCleanupFailed = false;
      try {
        const result = await deleteElement(overlayId, elementId);
        if (result?.storageErrors?.length) {
          storageCleanupFailed = true;
          toast.warning(
            "Elemento excluído, mas o arquivo não pôde ser removido do armazenamento",
          );
        }
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Erro ao excluir elemento",
        );
        return;
      }
      if (selectedElementId === elementId) {
        setSelectedElementId(null);
      }
      if (!storageCleanupFailed) toast.success("Elemento excluído");
    },
    [deleteElement, overlayId, selectedElementId],
  );

  const requestDeleteElement = useCallback((elementId) => {
    setElementPendingDelete(elementId);
    setDeleteDialogOpen(true);
  }, []);

  const handleDuplicateElement = async () => {
    if (!selectedElement) return;
    try {
      const newEl = await addElement(overlayId, {
        ...selectedElement,
        x: selectedElement.x + 24,
        y: selectedElement.y + 24,
        zIndex: selectedElement.zIndex + 1,
      });
      if (newEl) setSelectedElementId(newEl.id);
      toast.success("Elemento duplicado");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao duplicar elemento",
      );
    }
  };

  const handleElementUpdate = (field, value) => {
    if (selectedElementId) {
      updateElement(overlayId, selectedElementId, { [field]: value });
    }
  };

  const handleMoveLayer = (elementId, direction) => {
    const element = overlay.elements.find((e) => e.id === elementId);
    if (!element) return;
    const newZIndex =
      direction === "up" ? element.zIndex + 1 : Math.max(1, element.zIndex - 1);
    updateElement(overlayId, elementId, { zIndex: newZIndex });
  };

  const handleResetPosition = () => {
    if (selectedElementId) {
      updateElement(overlayId, selectedElementId, {
        x: Math.round(overlay.width / 2 - selectedElement.width / 2),
        y: Math.round(overlay.height / 2 - selectedElement.height / 2),
      });
      toast.success("Posição resetada");
    }
  };

  const handleAlign = (axis) => {
    if (!selectedElement) return;

    const target =
      alignTargetId === "canvas"
        ? { x: 0, y: 0, width: overlay.width, height: overlay.height }
        : overlay.elements.find((element) => element.id === alignTargetId);

    if (!target) return;

    const updates =
      axis === "horizontal"
        ? {
            x: Math.round(
              target.x + target.width / 2 - selectedElement.width / 2,
            ),
          }
        : {
            y: Math.round(
              target.y + target.height / 2 - selectedElement.height / 2,
            ),
          };

    updateElement(overlayId, selectedElement.id, updates);
  };

  const desktopOverlays =
    typeof window !== "undefined" ? window.vPlaycastDesktop?.overlays : null;

  const getOverlayUrl = async () => desktopOverlays?.getUrl(overlayId) || "";

  const copyOverlayUrl = async (background = "") => {
    if (!desktopOverlays) {
      toast.error("Abra o overlay pelo aplicativo V Playcast para gerar o link local.");
      return;
    }

    try {
      const baseUrl = await getOverlayUrl();
      await navigator.clipboard.writeText(getOverlayOutputUrl(baseUrl, background));
      toast.success("URL copiada para a área de transferência");
    } catch {
      toast.error("Não foi possível copiar a URL");
    }
  };

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (
        !selectedElementId ||
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement
      )
        return;

      const step = event.shiftKey ? 10 : 1;
      const selected = overlay?.elements.find(
        (element) => element.id === selectedElementId,
      );
      if (!selected) return;

      if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        requestDeleteElement(selectedElementId);
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        updateElement(overlayId, selectedElementId, { x: selected.x - step });
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        updateElement(overlayId, selectedElementId, { x: selected.x + step });
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        updateElement(overlayId, selectedElementId, { y: selected.y - step });
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        updateElement(overlayId, selectedElementId, { y: selected.y + step });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    overlay?.elements,
    overlayId,
    requestDeleteElement,
    selectedElementId,
    updateElement,
  ]);

  const handleMouseDown = useCallback(
    (e, elementId) => {
      e.stopPropagation();
      setSelectedElementId(elementId);
      setAlignmentGuides([]);
      const element = overlay?.elements.find((el) => el.id === elementId);
      if (element) {
        const rect = e.currentTarget.getBoundingClientRect();
        setDragOffset({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        });
        setIsDragging(true);
      }
    },
    [overlay],
  );

  const handleResizeMouseDown = useCallback((event, element, direction) => {
    event.preventDefault();
    event.stopPropagation();
    setSelectedElementId(element.id);
    setAlignmentGuides([]);
    setIsDragging(false);
    dragPositionRef.current = null;
    setIsResizing(true);
    resizeRef.current = {
      direction,
      elementId: element.id,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startX: element.x,
      startY: element.y,
      startWidth: element.width,
      startHeight: element.height,
      startCropLeft: element.cropLeft || 0,
      startCropRight: element.cropRight || 0,
      startCropTop: element.cropTop || 0,
      startCropBottom: element.cropBottom || 0,
    };
  }, []);

  const handleMouseMove = useCallback(
    (e) => {
      if (isResizing && resizeRef.current) {
        const state = resizeRef.current;
        const safeArea = getSafeAreaBounds(overlay);
        const deltaX = (e.clientX - state.startClientX) / zoom;
        const deltaY = (e.clientY - state.startClientY) / zoom;
        const minSize = 20;

        if (state.direction.length === 1) {
          let result;
          if (state.direction === "w") {
            const originalLeft = state.startX - state.startCropLeft;
            const visibleRight = state.startX + state.startWidth;
            const x = Math.max(
              0,
              originalLeft,
              Math.min(state.startX + deltaX, visibleRight - minSize),
            );
            result = {
              x: Math.round(x),
              width: Math.round(visibleRight - x),
              cropLeft: Math.round(x - originalLeft),
            };
          } else if (state.direction === "e") {
            const originalRight =
              state.startX + state.startWidth + state.startCropRight;
            const right = Math.max(
              state.startX + minSize,
              Math.min(
                state.startX + state.startWidth + deltaX,
                originalRight,
                overlay.width,
              ),
            );
            result = {
              width: Math.round(right - state.startX),
              cropRight: Math.round(originalRight - right),
            };
          } else if (state.direction === "n") {
            const originalTop = state.startY - state.startCropTop;
            const visibleBottom = state.startY + state.startHeight;
            const y = Math.max(
              0,
              originalTop,
              Math.min(state.startY + deltaY, visibleBottom - minSize),
            );
            result = {
              y: Math.round(y),
              height: Math.round(visibleBottom - y),
              cropTop: Math.round(y - originalTop),
            };
          } else {
            const originalBottom =
              state.startY + state.startHeight + state.startCropBottom;
            const bottom = Math.max(
              state.startY + minSize,
              Math.min(
                state.startY + state.startHeight + deltaY,
                originalBottom,
                overlay.height,
              ),
            );
            result = {
              height: Math.round(bottom - state.startY),
              cropBottom: Math.round(originalBottom - bottom),
            };
          }

          resizeResultRef.current = result;
          const visibleX = result.x ?? state.startX;
          const visibleY = result.y ?? state.startY;
          const visibleWidth = result.width ?? state.startWidth;
          const visibleHeight = result.height ?? state.startHeight;
          const threshold = 8 / zoom;
          setShowSafeArea(
            visibleX <= safeArea.left + threshold ||
              visibleY <= safeArea.top + threshold ||
              visibleX + visibleWidth >= safeArea.right - threshold ||
              visibleY + visibleHeight >= safeArea.bottom - threshold,
          );
          setOverlay((current) =>
            current
              ? {
                  ...current,
                  elements: current.elements.map((element) =>
                    element.id === state.elementId
                      ? { ...element, ...result }
                      : element,
                  ),
                }
              : current,
          );
          return;
        }

        let nextX = state.startX;
        let nextY = state.startY;
        let nextWidth = state.startWidth;
        let nextHeight = state.startHeight;

        if (state.direction.includes("e"))
          nextWidth = Math.max(minSize, state.startWidth + deltaX);
        if (state.direction.includes("s"))
          nextHeight = Math.max(minSize, state.startHeight + deltaY);
        if (state.direction.includes("w")) {
          nextWidth = Math.max(minSize, state.startWidth - deltaX);
          nextX = state.startX + state.startWidth - nextWidth;
        }
        if (state.direction.includes("n")) {
          nextHeight = Math.max(minSize, state.startHeight - deltaY);
          nextY = state.startY + state.startHeight - nextHeight;
        }

        if (state.direction.includes("w") && nextX < 0) {
          nextWidth += nextX;
          nextX = 0;
        }
        if (state.direction.includes("n") && nextY < 0) {
          nextHeight += nextY;
          nextY = 0;
        }
        nextWidth = Math.max(
          minSize,
          Math.min(nextWidth, overlay.width - nextX),
        );
        nextHeight = Math.max(
          minSize,
          Math.min(nextHeight, overlay.height - nextY),
        );

        const result = {
          x: Math.round(nextX),
          y: Math.round(nextY),
          width: Math.round(nextWidth),
          height: Math.round(nextHeight),
        };
        resizeResultRef.current = result;
        setShowSafeArea(
          result.x <= safeArea.left + 8 / zoom ||
            result.y <= safeArea.top + 8 / zoom ||
            result.x + result.width >= safeArea.right - 8 / zoom ||
            result.y + result.height >= safeArea.bottom - 8 / zoom,
        );
        setOverlay((current) =>
          current
            ? {
                ...current,
                elements: current.elements.map((element) =>
                  element.id === state.elementId
                    ? { ...element, ...result }
                    : element,
                ),
              }
            : current,
        );
        return;
      }

      if (isDragging && selectedElementId && canvasRef.current) {
        const canvasRect = canvasRef.current.getBoundingClientRect();
        const rawX = Math.round(
          (e.clientX - canvasRect.left - dragOffset.x * zoom) / zoom,
        );
        const rawY = Math.round(
          (e.clientY - canvasRect.top - dragOffset.y * zoom) / zoom,
        );
        const movingElement = overlay?.elements.find(
          (element) => element.id === selectedElementId,
        );
        const result =
          movingElement && overlay
            ? resolveSnapPosition({
                overlay,
                movingElement,
                elements: overlay.elements,
                nextX: rawX,
                nextY: rawY,
                zoom,
              })
            : { x: rawX, y: rawY, guides: [] };

        const boundedPosition =
          movingElement && overlay
            ? (() => {
                return {
                  x: Math.max(
                    0,
                    Math.min(result.x, overlay.width - movingElement.width),
                  ),
                  y: Math.max(
                    0,
                    Math.min(result.y, overlay.height - movingElement.height),
                  ),
                };
              })()
            : { x: result.x, y: result.y };

        dragPositionRef.current = boundedPosition;
        const safeArea = getSafeAreaBounds(overlay);
        const threshold = 8 / zoom;
        setShowSafeArea(
          result.safeAreaMatched ||
            boundedPosition.x <= safeArea.left + threshold ||
            boundedPosition.y <= safeArea.top + threshold ||
            boundedPosition.x + movingElement.width >=
              safeArea.right - threshold ||
            boundedPosition.y + movingElement.height >=
              safeArea.bottom - threshold,
        );
        setAlignmentGuides(result.guides);
        setOverlay((current) => {
          if (!current) return current;
          return {
            ...current,
            elements: current.elements.map((element) =>
              element.id === selectedElementId
                ? { ...element, ...boundedPosition }
                : element,
            ),
          };
        });
      }
    },
    [dragOffset, isDragging, isResizing, overlay, selectedElementId, zoom],
  );

  const handleMouseUp = useCallback(() => {
    if (resizeRef.current && resizeResultRef.current) {
      updateElement(
        overlayId,
        resizeRef.current.elementId,
        resizeResultRef.current,
      );
    }
    resizeRef.current = null;
    resizeResultRef.current = null;
    if (selectedElementId && dragPositionRef.current) {
      updateElement(overlayId, selectedElementId, dragPositionRef.current);
      dragPositionRef.current = null;
    }
    setAlignmentGuides([]);
    setIsDragging(false);
    setIsResizing(false);
    setShowSafeArea(false);
  }, [overlayId, selectedElementId, updateElement]);

  useEffect(() => {
    if (isDragging || isResizing) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging, isResizing, handleMouseMove, handleMouseUp]);

  const commitPropertyPreview = useCallback(() => {
    if (!selectedElementId || !propertyPreviewRef.current) return;
    updateElement(overlayId, selectedElementId, propertyPreviewRef.current);
    propertyPreviewRef.current = null;
  }, [overlayId, selectedElementId, updateElement]);

  const handleZoomPreview = useCallback(
    (value) => {
      if (!selectedElementId) return;
      setOverlay((current) => {
        if (!current) return current;
        const element = current.elements.find(
          (item) => item.id === selectedElementId,
        );
        if (!element) return current;
        const previousZoom = Math.max(10, Number(element.zoom) || 100);
        const ratio = value / previousZoom;
        const width = Math.max(
          20,
          Math.min(
            Math.round(element.width * ratio),
            current.width - element.x,
          ),
        );
        const height = Math.max(
          20,
          Math.min(
            Math.round(element.height * ratio),
            current.height - element.y,
          ),
        );
        const updates = {
          width,
          height,
          zoom: value,
          cropLeft: Math.round((element.cropLeft || 0) * ratio),
          cropRight: Math.round((element.cropRight || 0) * ratio),
          cropTop: Math.round((element.cropTop || 0) * ratio),
          cropBottom: Math.round((element.cropBottom || 0) * ratio),
        };
        propertyPreviewRef.current = updates;
        return {
          ...current,
          elements: current.elements.map((item) =>
            item.id === selectedElementId ? { ...item, ...updates } : item,
          ),
        };
      });
    },
    [selectedElementId],
  );

  const handleCropPreview = useCallback(
    (axis, value) => {
      if (!selectedElementId) return;
      setOverlay((current) => {
        if (!current) return current;
        const element = current.elements.find(
          (item) => item.id === selectedElementId,
        );
        if (!element) return current;

        const updates =
          axis === "horizontal"
            ? (() => {
                const total =
                  element.width +
                  (element.cropLeft || 0) +
                  (element.cropRight || 0);
                const originalLeft = element.x - (element.cropLeft || 0);
                return {
                  x: originalLeft + value,
                  width: total - value * 2,
                  cropLeft: value,
                  cropRight: value,
                };
              })()
            : (() => {
                const total =
                  element.height +
                  (element.cropTop || 0) +
                  (element.cropBottom || 0);
                const originalTop = element.y - (element.cropTop || 0);
                return {
                  y: originalTop + value,
                  height: total - value * 2,
                  cropTop: value,
                  cropBottom: value,
                };
              })();

        propertyPreviewRef.current = updates;
        return {
          ...current,
          elements: current.elements.map((item) =>
            item.id === selectedElementId ? { ...item, ...updates } : item,
          ),
        };
      });
    },
    [selectedElementId],
  );

  if (!isLoaded || !overlay) {
    return <LoadingState fullScreen label="Carregando editor..." />;
  }

  const handleRestoreElementProperties = () => {
    if (!selectedElement) return;
    const width = selectedElement.type === "text" ? 300 : 200;
    const height = selectedElement.type === "text" ? 50 : 200;
    updateElement(overlayId, selectedElement.id, {
      x: Math.round(overlay.width / 2 - width / 2),
      y: Math.round(overlay.height / 2 - height / 2),
      width,
      height,
      zoom: 100,
      cropLeft: 0,
      cropRight: 0,
      cropTop: 0,
      cropBottom: 0,
    });
    propertyPreviewRef.current = null;
    toast.success("Posição, tamanho e recortes restaurados");
  };

  return (
    <div className="flex min-h-dvh min-w-0 flex-col bg-background">
      {/* Toolbar */}
      <header className="sticky top-0 z-30 flex min-h-14 flex-wrap items-center gap-2 border-b border-border bg-card px-3 py-2 sm:gap-4 sm:px-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/overlay">
            <ArrowLeft className="w-5 h-5" />
          </Link>
        </Button>
        <Separator orientation="vertical" className="h-8" />
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-semibold text-foreground">
            {overlay.name}
          </h1>
          <p className="text-xs text-muted-foreground">
            {overlay.width}x{overlay.height} - {overlay.elements.length}{" "}
            elemento(s)
          </p>
        </div>

        <div className="flex w-full items-center gap-2 overflow-x-auto pb-1 sm:w-auto sm:pb-0">
          {/* Add Element Dialogs */}
          <Dialog
            open={addImageDialogOpen}
            onOpenChange={(open) => {
              setAddImageDialogOpen(open);
              if (open) {
                resetNewElementOptions({
                  x: Math.round((overlay.width || 1920) / 2 - 100),
                  y: Math.round((overlay.height || 1080) / 2 - 100),
                });
              }
            }}
          >
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <ImageIcon className="w-4 h-4 mr-2" />
                Imagem
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar Mídia</DialogTitle>
                <DialogDescription>
                  Cole a URL de uma imagem/video ou faça upload de um arquivo
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>URL da imagem</Label>
                  <Input
                    placeholder="https://exemplo.com/imagem.png"
                    value={newImageUrl}
                    onChange={(e) => setNewImageUrl(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddImage()}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Upload da mídia</Label>
                  <FileDropzone
                    accept="image/*,video/*"
                    onFileSelect={handleImageUpload}
                    title="Arraste a mídia ou clique para enviar"
                    description="PNG, JPG, GIF, MP4 ou WebM"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Aceita imagens (PNG, JPG, GIF) e vídeos (MP4, WebM)
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Posição X</Label>
                    <Input
                      type="number"
                      value={newElementOptions.x}
                      onChange={(e) =>
                        setNewElementOptions((prev) => ({
                          ...prev,
                          x: parseInt(e.target.value, 10) || 0,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Posição Y</Label>
                    <Input
                      type="number"
                      value={newElementOptions.y}
                      onChange={(e) =>
                        setNewElementOptions((prev) => ({
                          ...prev,
                          y: parseInt(e.target.value, 10) || 0,
                        }))
                      }
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Zoom inicial ({newElementOptions.zoom}%)</Label>
                  <Slider
                    value={[newElementOptions.zoom]}
                    onValueChange={([value]) =>
                      setNewElementOptions((prev) => ({ ...prev, zoom: value }))
                    }
                    min={10}
                    max={300}
                    step={5}
                  />
                </div>
                <div className="mt-4 pt-4 border-t border-border">
                  <Label className="text-sm text-muted-foreground uppercase tracking-wider">
                    Estilo e Animação
                  </Label>
                  <div className="space-y-3">
                    <div>
                      <Label>Tipo de animação</Label>
                      <Select
                        value={newElementOptions.animationType || "none"}
                        onValueChange={(value) =>
                          setNewElementOptions((prev) => ({
                            ...prev,
                            animationType: value,
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Nenhum" />
                        </SelectTrigger>
                        <SelectContent>
                          <AnimationOptions />
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Bordão litúrgico</Label>
                      <Select
                        value={
                          newElementOptions.liturgicalBorderClass || "none"
                        }
                        onValueChange={(value) =>
                          setNewElementOptions((prev) => ({
                            ...prev,
                            liturgicalBorderClass: value,
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Nenhum" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Nenhum</SelectItem>
                          <SelectItem value="bordox">
                            Bordô litúrgico
                          </SelectItem>
                          <SelectItem value="azul">Azul natalino</SelectItem>
                          <SelectItem value="roxo">Roxo quaresmal</SelectItem>
                          <SelectItem value="ouro">Ouro festivo</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                  <Label>Visível ao criar</Label>
                  <Switch
                    checked={newElementOptions.visible}
                    onCheckedChange={(checked) =>
                      setNewElementOptions((prev) => ({
                        ...prev,
                        visible: checked,
                      }))
                    }
                  />
                </div>
                {newImageUrl && (
                  <div className="aspect-video bg-muted rounded-lg overflow-hidden border">
                    <StaticMediaFrame
                      src={newImageUrl}
                      alt="Preview"
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        e.currentTarget.style.opacity = 0.3;
                      }}
                    />
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setAddImageDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button onClick={handleAddImage}>Adicionar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog
            open={addTextDialogOpen}
            onOpenChange={(open) => {
              setAddTextDialogOpen(open);
              if (open) {
                resetNewElementOptions({
                  x: Math.round((overlay.width || 1920) / 2 - 150),
                  y: Math.round((overlay.height || 1080) / 2 - 25),
                });
              }
            }}
          >
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Type className="w-4 h-4 mr-2" />
                Texto
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar Texto</DialogTitle>
                <DialogDescription>
                  Digite o texto que deseja adicionar ao overlay
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Texto</Label>
                  <Textarea
                    placeholder="Digite seu texto aqui..."
                    value={newText}
                    onChange={(e) => setNewText(e.target.value)}
                    className="min-h-24"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Posição X</Label>
                    <Input
                      type="number"
                      value={newElementOptions.x}
                      onChange={(e) =>
                        setNewElementOptions((prev) => ({
                          ...prev,
                          x: parseInt(e.target.value, 10) || 0,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Posição Y</Label>
                    <Input
                      type="number"
                      value={newElementOptions.y}
                      onChange={(e) =>
                        setNewElementOptions((prev) => ({
                          ...prev,
                          y: parseInt(e.target.value, 10) || 0,
                        }))
                      }
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Zoom inicial ({newElementOptions.zoom}%)</Label>
                  <Slider
                    value={[newElementOptions.zoom]}
                    onValueChange={([value]) =>
                      setNewElementOptions((prev) => ({ ...prev, zoom: value }))
                    }
                    min={10}
                    max={300}
                    step={5}
                  />
                </div>
                <div className="mt-4 pt-4 border-t border-border">
                  <Label className="text-sm text-muted-foreground uppercase tracking-wider">
                    Estilo e Animação
                  </Label>
                  <div className="space-y-3">
                    <div>
                      <Label>Tipo de animação</Label>
                      <Select
                        value={newElementOptions.animationType || "none"}
                        onValueChange={(value) =>
                          setNewElementOptions((prev) => ({
                            ...prev,
                            animationType: value,
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Nenhum" />
                        </SelectTrigger>
                        <SelectContent>
                          <AnimationOptions />
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Bordão litúrgico</Label>
                      <Select
                        value={
                          newElementOptions.liturgicalBorderClass || "none"
                        }
                        onValueChange={(value) =>
                          setNewElementOptions((prev) => ({
                            ...prev,
                            liturgicalBorderClass: value,
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Nenhum" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Nenhum</SelectItem>
                          <SelectItem value="bordox">
                            Bordô litúrgico
                          </SelectItem>
                          <SelectItem value="azul">Azul natalino</SelectItem>
                          <SelectItem value="roxo">Roxo quaresmal</SelectItem>
                          <SelectItem value="ouro">Ouro festivo</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                  <Label>Visível ao criar</Label>
                  <Switch
                    checked={newElementOptions.visible}
                    onCheckedChange={(checked) =>
                      setNewElementOptions((prev) => ({
                        ...prev,
                        visible: checked,
                      }))
                    }
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setAddTextDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button onClick={handleAddText}>Adicionar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Separator orientation="vertical" className="h-8" />

          <Button
            variant="outline"
            size="sm"
            title="Copiar URL com fundo transparente para Browser Source"
            onClick={() => copyOverlayUrl()}
          >
            <Copy className="w-4 h-4 mr-2" />
            URL transparente
          </Button>
          <Button
            variant="outline"
            size="sm"
            title="Copiar URL com fundo verde para chroma key"
            onClick={() => copyOverlayUrl("green")}
          >
            <CopyPlus className="w-4 h-4 mr-2" />
            Chroma verde
          </Button>
          <Button
            variant="default"
            size="sm"
            disabled={!desktopOverlays}
            onClick={async () => {
              const url = await getOverlayUrl();
              if (url) window.open(url, "_blank", "noopener,noreferrer");
            }}
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Visualizar
          </Button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden xl:flex-row">
        {/* Canvas Area */}
        <div className="flex-1 overflow-auto bg-muted/20 p-3 sm:p-4 lg:p-6">
          {/* Zoom Controls */}
          <div className="mb-4 inline-flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg"
              onClick={() => setZoom(Math.max(0.1, zoom - 0.1))}
            >
              <ZoomOut className="w-4 h-4" />
            </Button>
            <Slider
              value={[zoom * 100]}
              onValueChange={([v]) => setZoom(v / 100)}
              min={10}
              max={100}
              step={5}
              className="w-32"
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg"
              onClick={() => setZoom(Math.min(1, zoom + 0.1))}
            >
              <ZoomIn className="w-4 h-4" />
            </Button>
            <span className="text-sm text-muted-foreground w-12 text-center">
              {Math.round(zoom * 100)}%
            </span>
            <Separator orientation="vertical" className="h-6" />
            <Button
              variant={showGrid ? "secondary" : "ghost"}
              size="icon"
              className="h-8 w-8 rounded-lg"
              onClick={() => setShowGrid(!showGrid)}
            >
              <Grid3X3 className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg"
              onClick={() =>
                setZoom(
                  Math.min(
                    1,
                    ((window.innerWidth - 400) / overlay.width) * 0.8,
                  ),
                )
              }
            >
              <Maximize className="w-4 h-4" />
            </Button>
          </div>

          {/* Canvas */}
          <div
            ref={canvasRef}
            className="relative bg-black rounded-xl overflow-hidden mx-auto shadow-2xl shadow-black/50 border border-border"
            style={{
              width: overlay.width * zoom,
              height: overlay.height * zoom,
            }}
            onClick={() => {
              setSelectedElementId(null);
              setAlignmentGuides([]);
            }}
          >
            {/* Grid pattern */}
            {showGrid && (
              <div
                className="absolute inset-0 opacity-20 pointer-events-none"
                style={{
                  backgroundImage:
                    "linear-gradient(to right, rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.1) 1px, transparent 1px)",
                  backgroundSize: `${50 * zoom}px ${50 * zoom}px`,
                }}
              />
            )}

            {alignmentGuides.map((guide, index) => (
              <div
                key={`${guide.orientation}-${guide.position}-${index}`}
                className="absolute pointer-events-none z-[999] bg-cyan-400/90 shadow-[0_0_0_1px_rgba(34,211,238,0.28)]"
                style={
                  guide.orientation === "vertical"
                    ? {
                        left: guide.position * zoom,
                        top: guide.start * zoom,
                        width: 1,
                        height: Math.max(1, (guide.end - guide.start) * zoom),
                      }
                    : {
                        left: guide.start * zoom,
                        top: guide.position * zoom,
                        width: Math.max(1, (guide.end - guide.start) * zoom),
                        height: 1,
                      }
                }
              />
            ))}

            {/* Elements */}
            {overlay.elements.map((element) => (
              <div
                key={element.id}
                className={`absolute cursor-move transition-shadow ${
                  selectedElementId === element.id
                    ? "ring-2 ring-primary shadow-lg shadow-primary/30"
                    : "hover:ring-2 hover:ring-primary/50"
                } ${!element.visible ? "opacity-30" : ""} ${getOverlayAnimationClass(element.animationType)}`}
                style={{
                  left: element.x * zoom,
                  top: element.y * zoom,
                  width: element.width * zoom,
                  height: element.height * zoom,
                  zIndex: element.zIndex,
                  borderLeft:
                    element.liturgicalBorderClass &&
                    element.liturgicalBorderClass !== "none"
                      ? `5px solid ${getLiturgicalColor(element.liturgicalBorderClass)}`
                      : undefined,
                }}
                onMouseDown={(e) => handleMouseDown(e, element.id)}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedElementId(element.id);
                }}
              >
                <div className="pointer-events-none absolute inset-0 overflow-hidden">
                  <div
                    className="absolute"
                    style={{
                      left: -(element.cropLeft || 0) * zoom,
                      top: -(element.cropTop || 0) * zoom,
                      width:
                        (element.width +
                          (element.cropLeft || 0) +
                          (element.cropRight || 0)) *
                        zoom,
                      height:
                        (element.height +
                          (element.cropTop || 0) +
                          (element.cropBottom || 0)) *
                        zoom,
                    }}
                  >
                    {element.type === "image" && element.src && (
                      <StaticMediaFrame
                        src={element.src}
                        alt=""
                        className="h-full w-full object-contain"
                        draggable={false}
                      />
                    )}
                    {element.type === "text" && (
                      <div
                        className="flex h-full w-full items-center justify-center text-center"
                        style={{
                          fontSize: element.fontSize * zoom,
                          color: getLiturgicalColor(
                            element.liturgicalColorClass,
                          ),
                          fontFamily: element.fontFamily,
                        }}
                      >
                        {element.text}
                      </div>
                    )}
                  </div>
                </div>

                {/* Selection handles */}
                {selectedElementId === element.id && (
                  <>
                    <button
                      type="button"
                      aria-label="Redimensionar pelo canto superior esquerdo"
                      onMouseDown={(event) =>
                        handleResizeMouseDown(event, element, "nw")
                      }
                      className="absolute -left-1.5 -top-1.5 z-10 h-3 w-3 cursor-nwse-resize rounded-full border-2 border-primary-foreground bg-primary"
                    />
                    <button
                      type="button"
                      aria-label="Redimensionar pelo topo"
                      onMouseDown={(event) =>
                        handleResizeMouseDown(event, element, "n")
                      }
                      className="absolute -top-1.5 left-1/2 z-10 h-3 w-3 -translate-x-1/2 cursor-ns-resize rounded-full border-2 border-primary-foreground bg-primary"
                    />
                    <button
                      type="button"
                      aria-label="Redimensionar pelo canto superior direito"
                      onMouseDown={(event) =>
                        handleResizeMouseDown(event, element, "ne")
                      }
                      className="absolute -right-1.5 -top-1.5 z-10 h-3 w-3 cursor-nesw-resize rounded-full border-2 border-primary-foreground bg-primary"
                    />
                    <button
                      type="button"
                      aria-label="Redimensionar pela direita"
                      onMouseDown={(event) =>
                        handleResizeMouseDown(event, element, "e")
                      }
                      className="absolute -right-1.5 top-1/2 z-10 h-3 w-3 -translate-y-1/2 cursor-ew-resize rounded-full border-2 border-primary-foreground bg-primary"
                    />
                    <button
                      type="button"
                      aria-label="Redimensionar pelo canto inferior direito"
                      onMouseDown={(event) =>
                        handleResizeMouseDown(event, element, "se")
                      }
                      className="absolute -bottom-1.5 -right-1.5 z-10 h-3 w-3 cursor-nwse-resize rounded-full border-2 border-primary-foreground bg-primary"
                    />
                    <button
                      type="button"
                      aria-label="Redimensionar pela base"
                      onMouseDown={(event) =>
                        handleResizeMouseDown(event, element, "s")
                      }
                      className="absolute -bottom-1.5 left-1/2 z-10 h-3 w-3 -translate-x-1/2 cursor-ns-resize rounded-full border-2 border-primary-foreground bg-primary"
                    />
                    <button
                      type="button"
                      aria-label="Redimensionar pelo canto inferior esquerdo"
                      onMouseDown={(event) =>
                        handleResizeMouseDown(event, element, "sw")
                      }
                      className="absolute -bottom-1.5 -left-1.5 z-10 h-3 w-3 cursor-nesw-resize rounded-full border-2 border-primary-foreground bg-primary"
                    />
                    <button
                      type="button"
                      aria-label="Redimensionar pela esquerda"
                      onMouseDown={(event) =>
                        handleResizeMouseDown(event, element, "w")
                      }
                      className="absolute -left-1.5 top-1/2 z-10 h-3 w-3 -translate-y-1/2 cursor-ew-resize rounded-full border-2 border-primary-foreground bg-primary"
                    />
                  </>
                )}
              </div>
            ))}

            {/* Empty state */}
            {overlay.elements.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center p-8">
                  <div className="w-16 h-16 rounded-2xl bg-muted/20 flex items-center justify-center mx-auto mb-4">
                    <Plus className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground">
                    Adicione elementos usando a barra de ferramentas
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <aside className="flex max-h-[45dvh] w-full shrink-0 flex-col border-t border-border bg-card xl:max-h-none xl:w-80 xl:border-l xl:border-t-0">
          <Tabs defaultValue="elements" className="flex-1 flex flex-col">
            <TabsList className="mx-4 mt-4 bg-muted">
              <TabsTrigger value="elements" className="flex-1">
                <Layers className="w-4 h-4 mr-2" />
                Elementos
              </TabsTrigger>
              <TabsTrigger value="properties" className="flex-1">
                <Settings className="w-4 h-4 mr-2" />
                Propriedades
              </TabsTrigger>
            </TabsList>

            {/* Elements Tab */}
            <TabsContent
              value="elements"
              className="flex-1 p-4 overflow-hidden"
            >
              <ScrollArea className="h-full">
                {overlay.elements.length === 0 ? (
                  <div className="text-center py-8">
                    <Layers className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                    <p className="text-sm text-muted-foreground">
                      Nenhum elemento adicionado
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {[...overlay.elements]
                      .sort((a, b) => b.zIndex - a.zIndex)
                      .map((element) => (
                        <div
                          key={element.id}
                          className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all border ${!element.visible ? "opacity-60 " : ""}${
                            selectedElementId === element.id
                              ? "bg-primary/10 border-primary/50 text-foreground"
                              : "bg-muted/50 border-transparent hover:bg-muted hover:border-border"
                          }`}
                          onClick={() => setSelectedElementId(element.id)}
                        >
                          <div className="flex h-12 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border/70 bg-black">
                            {element.type === "image" && element.src ? (
                              <StaticMediaFrame
                                src={element.src}
                                alt=""
                                className="h-full w-full object-contain"
                              />
                            ) : element.type === "text" ? (
                              <div
                                className="flex h-full w-full items-center justify-center overflow-hidden px-1 text-center text-[8px] leading-tight"
                                style={{
                                  color: element.fontColor || "#ffffff",
                                  fontFamily: element.fontFamily,
                                }}
                              >
                                <span className="line-clamp-3">
                                  {element.text || "Texto"}
                                </span>
                              </div>
                            ) : (
                              <ImageIcon className="h-5 w-5 text-muted-foreground" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {element.type === "text"
                                ? element.text
                                : "Imagem"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {element.x}, {element.y} - z:{element.zIndex}
                            </p>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 rounded-lg"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMoveLayer(element.id, "up");
                              }}
                            >
                              <ChevronUp className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 rounded-lg"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMoveLayer(element.id, "down");
                              }}
                            >
                              <ChevronDown className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 rounded-lg"
                              aria-label={
                                element.visible
                                  ? `Ocultar ${element.type === "text" ? "texto" : "imagem"}`
                                  : `Exibir ${element.type === "text" ? "texto" : "imagem"}`
                              }
                              onClick={(e) => {
                                e.stopPropagation();
                                updateElement(overlayId, element.id, {
                                  visible: !element.visible,
                                });
                              }}
                            >
                              {element.visible ? (
                                <Eye className="w-4 h-4" />
                              ) : (
                                <EyeOff className="w-4 h-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 rounded-lg text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={(e) => {
                                e.stopPropagation();
                                requestDeleteElement(element.id);
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            {/* Properties Tab */}
            <TabsContent
              value="properties"
              className="flex-1 p-4 overflow-auto"
            >
              {selectedElement ? (
                <div className="space-y-6">
                  {/* Transform */}
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDuplicateElement}
                    >
                      <CopyPlus className="w-4 h-4 mr-2" />
                      Duplicar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive"
                      onClick={() => requestDeleteElement(selectedElement.id)}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Excluir
                    </Button>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={handleRestoreElementProperties}
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Restaurar propriedades
                  </Button>

                  <Separator />

                  {/* Transform */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                        <Move className="w-3 h-3" /> Posição e tamanho
                      </Label>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs"
                        onClick={handleResetPosition}
                      >
                        <RotateCcw className="w-3 h-3 mr-1" />
                        Centralizar
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">X</Label>
                        <Input
                          type="number"
                          value={selectedElement.x}
                          min={0}
                          max={Math.max(
                            0,
                            overlay.width - selectedElement.width,
                          )}
                          onChange={(e) =>
                            handleElementUpdate(
                              "x",
                              Math.max(
                                0,
                                Math.min(
                                  parseInt(e.target.value) || 0,
                                  overlay.width - selectedElement.width,
                                ),
                              ),
                            )
                          }
                          className="h-9"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Y</Label>
                        <Input
                          type="number"
                          value={selectedElement.y}
                          min={0}
                          max={Math.max(
                            0,
                            overlay.height - selectedElement.height,
                          )}
                          onChange={(e) =>
                            handleElementUpdate(
                              "y",
                              Math.max(
                                0,
                                Math.min(
                                  parseInt(e.target.value) || 0,
                                  overlay.height - selectedElement.height,
                                ),
                              ),
                            )
                          }
                          className="h-9"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Laterais · largura</Label>
                        <Input
                          type="number"
                          value={selectedElement.width}
                          min={20}
                          max={overlay.width - selectedElement.x}
                          onChange={(e) =>
                            handleElementUpdate(
                              "width",
                              Math.max(
                                20,
                                Math.min(
                                  parseInt(e.target.value) || 20,
                                  overlay.width - selectedElement.x,
                                ),
                              ),
                            )
                          }
                          className="h-9"
                        />
                        <Slider
                          aria-label="Recortar margens laterais"
                          value={[
                            Math.round(
                              ((selectedElement.cropLeft || 0) +
                                (selectedElement.cropRight || 0)) /
                                2,
                            ),
                          ]}
                          onValueChange={([value]) =>
                            handleCropPreview("horizontal", value)
                          }
                          onValueCommit={commitPropertyPreview}
                          min={0}
                          max={Math.max(
                            0,
                            Math.floor(
                              (selectedElement.width +
                                (selectedElement.cropLeft || 0) +
                                (selectedElement.cropRight || 0) -
                                20) /
                                2,
                            ),
                          )}
                          step={1}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Cima/baixo · altura</Label>
                        <Input
                          type="number"
                          value={selectedElement.height}
                          min={20}
                          max={overlay.height - selectedElement.y}
                          onChange={(e) =>
                            handleElementUpdate(
                              "height",
                              Math.max(
                                20,
                                Math.min(
                                  parseInt(e.target.value) || 20,
                                  overlay.height - selectedElement.y,
                                ),
                              ),
                            )
                          }
                          className="h-9"
                        />
                        <Slider
                          aria-label="Recortar margens superior e inferior"
                          value={[
                            Math.round(
                              ((selectedElement.cropTop || 0) +
                                (selectedElement.cropBottom || 0)) /
                                2,
                            ),
                          ]}
                          onValueChange={([value]) =>
                            handleCropPreview("vertical", value)
                          }
                          onValueCommit={commitPropertyPreview}
                          min={0}
                          max={Math.max(
                            0,
                            Math.floor(
                              (selectedElement.height +
                                (selectedElement.cropTop || 0) +
                                (selectedElement.cropBottom || 0) -
                                20) /
                                2,
                            ),
                          )}
                          step={1}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                      <ZoomIn className="w-3 h-3" /> Zoom do elemento
                    </Label>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                        <span>
                          Escala o tamanho atual mantendo a proporção.
                        </span>
                        <span className="shrink-0 tabular-nums">
                          {selectedElement.zoom || 100}%
                        </span>
                      </div>
                      <Slider
                        value={[selectedElement.zoom || 100]}
                        onValueChange={([value]) => handleZoomPreview(value)}
                        onValueCommit={commitPropertyPreview}
                        min={10}
                        max={300}
                        step={1}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                      Animação na transmissão
                    </Label>
                    <Select
                      value={selectedElement.animationType || "none"}
                      onValueChange={(value) =>
                        handleElementUpdate("animationType", value)
                      }
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <AnimationOptions />
                      </SelectContent>
                    </Select>
                    <p className="text-xs leading-5 text-muted-foreground">
                      Reproduz ao exibir ou atualizar o elemento ao vivo.
                    </p>
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                      Alinhamento
                    </Label>
                    <Select
                      value={alignTargetId}
                      onValueChange={setAlignTargetId}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="canvas">Tela inteira</SelectItem>
                        {overlay.elements
                          .filter(
                            (element) => element.id !== selectedElement.id,
                          )
                          .map((element) => (
                            <SelectItem key={element.id} value={element.id}>
                              {element.type === "text"
                                ? element.text || "Texto"
                                : "Imagem"}{" "}
                              ({element.x}, {element.y})
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAlign("horizontal")}
                      >
                        <AlignCenterHorizontal className="w-4 h-4 mr-2" />
                        Horizontal
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAlign("vertical")}
                      >
                        <AlignCenterVertical className="w-4 h-4 mr-2" />
                        Vertical
                      </Button>
                    </div>
                  </div>

                  <Separator />

                  {/* Layer */}
                  <div className="space-y-3">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                      <Layers className="w-3 h-3" /> Camada
                    </Label>
                    <div className="flex items-center gap-3">
                      <Input
                        type="number"
                        value={selectedElement.zIndex}
                        onChange={(e) =>
                          handleElementUpdate(
                            "zIndex",
                            parseInt(e.target.value) || 1,
                          )
                        }
                        className="h-9 flex-1"
                      />
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-9 w-9"
                          onClick={() =>
                            handleMoveLayer(selectedElement.id, "down")
                          }
                        >
                          <ChevronDown className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-9 w-9"
                          onClick={() =>
                            handleMoveLayer(selectedElement.id, "up")
                          }
                        >
                          <ChevronUp className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Visibility */}
                  <div className="flex items-center justify-between py-2">
                    <Label className="text-sm">Visível</Label>
                    <Switch
                      checked={selectedElement.visible}
                      onCheckedChange={(checked) =>
                        handleElementUpdate("visible", checked)
                      }
                    />
                  </div>

                  <Separator />

                  {/* Type-specific properties */}
                  {selectedElement.type === "image" && (
                    <div className="space-y-3">
                      <Label className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                        <ImageIcon className="w-3 h-3" /> Imagem
                      </Label>
                      <Input
                        value={selectedElement.src}
                        onChange={(e) =>
                          handleElementUpdate("src", e.target.value)
                        }
                        placeholder="https://..."
                        className="h-9"
                      />
                      {selectedElement.src && (
                        <div className="aspect-video bg-muted rounded-lg overflow-hidden border">
                          <StaticMediaFrame
                            src={selectedElement.src}
                            alt="Preview"
                            className="w-full h-full object-contain"
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {selectedElement.type === "text" && (
                    <div className="space-y-4">
                      <div className="space-y-3">
                        <Label className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                          <Type className="w-3 h-3" /> Texto
                        </Label>
                        <Textarea
                          value={selectedElement.text}
                          onChange={(e) =>
                            handleElementUpdate("text", e.target.value)
                          }
                          className="min-h-20"
                        />
                      </div>

                      <div className="space-y-3">
                        <Label className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                          <Palette className="w-3 h-3" /> Estilo
                        </Label>
                        <div className="space-y-3">
                          <div className="space-y-1.5">
                            <Label className="text-xs">Tamanho da Fonte</Label>
                            <div className="flex items-center gap-3">
                              <Slider
                                value={[selectedElement.fontSize]}
                                onValueChange={([v]) =>
                                  handleElementUpdate("fontSize", v)
                                }
                                min={8}
                                max={200}
                                step={1}
                                className="flex-1"
                              />
                              <Input
                                type="number"
                                value={selectedElement.fontSize}
                                onChange={(e) =>
                                  handleElementUpdate(
                                    "fontSize",
                                    parseInt(e.target.value) || 24,
                                  )
                                }
                                className="h-9 w-20"
                              />
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs">Cor do Texto</Label>
                            <div className="flex gap-2">
                              <input
                                type="color"
                                value={selectedElement.fontColor}
                                onChange={(e) =>
                                  handleElementUpdate(
                                    "fontColor",
                                    e.target.value,
                                  )
                                }
                                className="w-12 h-9 rounded-lg border border-border cursor-pointer bg-transparent"
                              />
                              <Input
                                value={selectedElement.fontColor}
                                onChange={(e) =>
                                  handleElementUpdate(
                                    "fontColor",
                                    e.target.value,
                                  )
                                }
                                className="h-9 flex-1 font-mono text-sm"
                              />
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs">Fonte</Label>
                            <Select
                              value={selectedElement.fontFamily}
                              onValueChange={(value) =>
                                handleElementUpdate("fontFamily", value)
                              }
                            >
                              <SelectTrigger className="h-9">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="sans-serif">
                                  Sans Serif
                                </SelectItem>
                                <SelectItem value="serif">Serif</SelectItem>
                                <SelectItem value="monospace">
                                  Monospace
                                </SelectItem>
                                <SelectItem value="Arial">Arial</SelectItem>
                                <SelectItem value="Verdana">Verdana</SelectItem>
                                <SelectItem value="Georgia">Georgia</SelectItem>
                                <SelectItem value="Impact">Impact</SelectItem>
                                <SelectItem value="Comic Sans MS">
                                  Comic Sans MS
                                </SelectItem>
                                <SelectItem value="Trebuchet MS">
                                  Trebuchet MS
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center py-8">
                  <Settings className="w-12 h-12 text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground">
                    Selecione um elemento para editar suas propriedades
                  </p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </aside>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir elemento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esse elemento será removido do overlay imediatamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setElementPendingDelete(null)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (elementPendingDelete) {
                  handleDeleteElement(elementPendingDelete);
                }
                setElementPendingDelete(null);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
