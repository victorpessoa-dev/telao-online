import * as React from "react";

import { cn } from "@/lib/utils/cn";

export const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(function Card({ className, ...props }, ref) {
  return React.createElement("div", {
    ...props,
    ref,
    className: cn(
      "rounded-xl border border-border/80 bg-card text-card-foreground shadow-[0_1px_2px_oklch(0.18_0.02_250/0.035),0_8px_24px_oklch(0.18_0.02_250/0.025)] transition-[transform,border-color,box-shadow] duration-200 motion-reduce:transition-none",
      className,
    ),
  });
});

export const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(function CardHeader({ className, ...props }, ref) {
  return React.createElement("div", {
    ...props,
    ref,
    className: cn("flex flex-col space-y-1.5 p-6", className),
  });
});

export const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(function CardTitle({ className, ...props }, ref) {
  return React.createElement("h3", {
    ...props,
    ref,
    className: cn("font-semibold leading-none tracking-tight", className),
  });
});

export const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(function CardDescription({ className, ...props }, ref) {
  return React.createElement("p", {
    ...props,
    ref,
    className: cn("text-sm text-muted-foreground", className),
  });
});

export const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(function CardContent({ className, ...props }, ref) {
  return React.createElement("div", {
    ...props,
    ref,
    className: cn("p-6 pt-0", className),
  });
});

export const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(function CardFooter({ className, ...props }, ref) {
  return React.createElement("div", {
    ...props,
    ref,
    className: cn("flex items-center p-6 pt-0", className),
  });
});
