import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { motion } from "framer-motion";
import { X } from "lucide-react";

import { cn } from "@/lib/utils/cn";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogPortal = DialogPrimitive.Portal;
export const DialogClose = DialogPrimitive.Close;

export const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(function DialogOverlay({ className, ...props }, ref) {
  return (
    <DialogPrimitive.Overlay data-slot="dialog-overlay-root" {...props}>
      <motion.div
        ref={ref}
        data-slot="dialog-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
        className={cn(
          "fixed inset-0 z-50 bg-black/60 backdrop-blur-sm",
          className,
        )}
      />
    </DialogPrimitive.Overlay>
  );
});

type DialogContentProps = React.ComponentPropsWithoutRef<
  typeof DialogPrimitive.Content
> & {
  /** Enables pointer dragging from the dedicated, accessible handle. */
  draggable?: boolean;
};

export const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  DialogContentProps
>(function DialogContent({ className, children, draggable = false, ...props }, ref) {
  const [dragOffset, setDragOffset] = React.useState({ x: 0, y: 0 });
  const panelRef = React.useRef<HTMLDivElement>(null);
  const dragRef = React.useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    offsetX: number;
    offsetY: number;
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  } | null>(null);

  const constrainOffset = React.useCallback(
    (offset: { x: number; y: number }, panel: HTMLElement) => {
      const rect = panel.getBoundingClientRect();
      const edge = 12;
      const minX = offset.x - rect.left + edge;
      const maxX = offset.x + window.innerWidth - rect.right - edge;
      const minY = offset.y - rect.top + edge;
      const maxY = offset.y + window.innerHeight - rect.bottom - edge;

      return {
        x: Math.min(maxX, Math.max(minX, offset.x)),
        y: Math.min(maxY, Math.max(minY, offset.y)),
      };
    },
    [],
  );

  React.useEffect(() => {
    if (!draggable) return;

    const keepPanelVisible = () => {
      const panel = panelRef.current;
      if (!panel) return;
      setDragOffset((offset) => constrainOffset(offset, panel));
    };

    window.addEventListener("resize", keepPanelVisible);
    return () => window.removeEventListener("resize", keepPanelVisible);
  }, [constrainOffset, draggable]);

  const startDragging = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (!draggable || event.button !== 0) return;
    const dialog = event.currentTarget.parentElement;
    if (!dialog) return;
    const rect = dialog.getBoundingClientRect();
    const edge = 12;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      offsetX: dragOffset.x,
      offsetY: dragOffset.y,
      minX: dragOffset.x - rect.left + edge,
      maxX: dragOffset.x + window.innerWidth - rect.right - edge,
      minY: dragOffset.y - rect.top + edge,
      maxY: dragOffset.y + window.innerHeight - rect.bottom - edge,
    };
  };

  const moveDragging = (event: React.PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    setDragOffset({
      x: Math.min(drag.maxX, Math.max(drag.minX, drag.offsetX + event.clientX - drag.startX)),
      y: Math.min(drag.maxY, Math.max(drag.minY, drag.offsetY + event.clientY - drag.startY)),
    });
  };

  const stopDragging = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (dragRef.current?.pointerId === event.pointerId) {
      dragRef.current = null;
    }
  };

  const moveWithKeyboard = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (!draggable) return;

    const step = 24;
    const movement = {
      ArrowLeft: { x: -step, y: 0 },
      ArrowRight: { x: step, y: 0 },
      ArrowUp: { x: 0, y: -step },
      ArrowDown: { x: 0, y: step },
    }[event.key];

    if (event.key === "Home") {
      event.preventDefault();
      setDragOffset({ x: 0, y: 0 });
      return;
    }

    if (!movement) return;

    const panel = event.currentTarget.parentElement;
    if (!panel) return;
    const rect = panel.getBoundingClientRect();
    const edge = 12;
    event.preventDefault();
    setDragOffset((offset) => ({
      x: Math.min(
        offset.x + window.innerWidth - rect.right - edge,
        Math.max(offset.x - rect.left + edge, offset.x + movement.x),
      ),
      y: Math.min(
        offset.y + window.innerHeight - rect.bottom - edge,
        Math.max(offset.y - rect.top + edge, offset.y + movement.y),
      ),
    }));
  };

  return React.createElement(
    DialogPortal,
    null,
    React.createElement(DialogOverlay, null),
    React.createElement(
      DialogPrimitive.Content,
      {
        ...props,
        ref,
      },
      React.createElement(
        motion.div,
        {
          ref: panelRef,
          initial: { opacity: 0, scale: 0.96 },
          animate: { opacity: 1, scale: 1 },
          transition: { duration: 0.2, ease: "easeOut" },
          // Margins preserve the dialog's centered CSS transform while moving
          // it, unlike transform-based motion values which replace it.
          style:
            draggable
              ? { marginLeft: dragOffset.x, marginTop: dragOffset.y }
              : undefined,
          className: cn(
            "fixed left-1/2 top-1/2 z-50 grid min-h-44 min-w-0 max-h-[calc(100dvh-2rem)] max-w-[calc(100vw-2rem)] w-[min(42rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 gap-4 overflow-x-hidden overflow-y-auto overscroll-contain rounded-xl border border-border bg-background p-4 shadow-2xl sm:p-6",
            "scrollbar-thin scrollbar-track-transparent scrollbar-thumb-border hover:scrollbar-thumb-muted-foreground/40",
            className,
          ),
        },
        draggable
          ? React.createElement(
              "button",
              {
                type: "button",
                "data-dialog-drag-handle": "",
                "aria-label": "Mover janela. Use as setas para reposicionar ou Início para centralizar.",
                title: "Arraste para mover. Use as setas para reposicionar ou Início para centralizar.",
                onPointerDown: startDragging,
                onPointerMove: moveDragging,
                onPointerUp: stopDragging,
                onPointerCancel: stopDragging,
                onKeyDown: moveWithKeyboard,
                className:
                  "absolute left-1/2 top-1 z-20 h-11 w-20 -translate-x-1/2 cursor-grab touch-none rounded-full before:absolute before:left-1/2 before:top-1/2 before:h-1 before:w-8 before:-translate-x-1/2 before:-translate-y-1/2 before:rounded-full before:bg-muted-foreground/45 active:cursor-grabbing focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              },
            )
          : null,
        children,
        React.createElement(
          DialogClose,
          {
            className:
              "absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none",
          },
          React.createElement(X, { className: "h-4 w-4" }),
          React.createElement("span", { className: "sr-only" }, "Fechar"),
        ),
      ),
    ),
  );
});

export function DialogHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return React.createElement("div", {
    ...props,
    className: cn(
      "flex flex-col space-y-1.5 text-center sm:text-left",
      className,
    ),
  });
}

export function DialogFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return React.createElement("div", {
    ...props,
    className: cn(
      "flex flex-col-reverse gap-2 xs:flex-row xs:justify-end",
      className,
    ),
  });
}

export const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(function DialogTitle({ className, ...props }, ref) {
  return React.createElement(DialogPrimitive.Title, {
    ...props,
    ref,
    className: cn(
      "text-lg font-semibold leading-none tracking-tight",
      className,
    ),
  });
});

export const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(function DialogDescription({ className, ...props }, ref) {
  return React.createElement(DialogPrimitive.Description, {
    ...props,
    ref,
    className: cn("text-sm text-muted-foreground", className),
  });
});
