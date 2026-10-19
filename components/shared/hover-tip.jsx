"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function HoverTipProvider({ children }) {
  return <TooltipProvider delayDuration={300}>{children}</TooltipProvider>;
}

export function HoverTip({ label, children, side = "top" }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side={side} className="font-medium">
        {label}
      </TooltipContent>
    </Tooltip>
  );
}
