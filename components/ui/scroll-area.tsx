import * as React from "react";
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area";

import { cn } from "@/lib/utils/cn";

export function ScrollArea({
  className,
  children,
  ...props
}: React.ComponentProps<typeof ScrollAreaPrimitive.Root>) {
  return React.createElement(
    ScrollAreaPrimitive.Root,
    { ...props, className: cn("relative", className) },
    React.createElement(
      ScrollAreaPrimitive.Viewport,
      {
        className:
          "focus-visible:ring-ring/50 size-full rounded-[inherit] transition-[color,box-shadow] outline-none focus-visible:ring-[3px] focus-visible:outline-1",
      },
      children,
    ),
    React.createElement(ScrollBar, null),
    React.createElement(ScrollAreaPrimitive.Corner, null),
  );
}

export function ScrollBar({
  className,
  orientation = "vertical",
  ...props
}: React.ComponentProps<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>) {
  return React.createElement(
    ScrollAreaPrimitive.ScrollAreaScrollbar,
    {
      ...props,
      orientation,
      className: cn(
        "flex touch-none select-none p-px transition-colors",
        orientation === "vertical" &&
          "h-full w-2.5 border-l border-l-transparent",
        orientation === "horizontal" &&
          "h-2.5 flex-col border-t border-t-transparent",
        className,
      ),
    },
    React.createElement(ScrollAreaPrimitive.ScrollAreaThumb, {
      className: "bg-border relative flex-1 rounded-full",
    }),
  );
}
