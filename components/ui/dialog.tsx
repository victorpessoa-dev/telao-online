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
    <DialogPrimitive.Overlay {...props}>
      <motion.div
        ref={ref}
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

export const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(function DialogContent({ className, children, ...props }, ref) {
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
          initial: { opacity: 0, scale: 0.96, y: -12 },
          animate: { opacity: 1, scale: 1, y: 0 },
          transition: { duration: 0.2, ease: "easeOut" },
          className: cn(
            "fixed left-1/2 top-1/2 z-50 grid min-h-44 max-h-[calc(100dvh-2rem)] w-[min(42rem,calc(100%-2rem))] -translate-x-1/2 -translate-y-1/2 gap-4 overflow-y-auto overscroll-contain rounded-xl border border-border bg-background p-4 shadow-2xl sm:p-6",
            "scrollbar-thin scrollbar-track-transparent scrollbar-thumb-border hover:scrollbar-thumb-muted-foreground/40",
            className,
          ),
        },
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
