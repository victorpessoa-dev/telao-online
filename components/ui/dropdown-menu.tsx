import * as React from "react";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { CheckIcon, ChevronRightIcon, CircleIcon } from "lucide-react";

import { cn } from "@/lib/utils/cn";

export function DropdownMenu(
  props: React.ComponentProps<typeof DropdownMenuPrimitive.Root>,
) {
  return React.createElement(DropdownMenuPrimitive.Root, props);
}

export function DropdownMenuPortal(
  props: React.ComponentProps<typeof DropdownMenuPrimitive.Portal>,
) {
  return React.createElement(DropdownMenuPrimitive.Portal, props);
}

export function DropdownMenuTrigger(
  props: React.ComponentProps<typeof DropdownMenuPrimitive.Trigger>,
) {
  return React.createElement(DropdownMenuPrimitive.Trigger, props);
}

export function DropdownMenuContent({
  className,
  sideOffset = 4,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Content>) {
  return React.createElement(
    DropdownMenuPrimitive.Portal,
    null,
    React.createElement(DropdownMenuPrimitive.Content, {
      ...props,
      sideOffset,
      className: cn(
        "bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 min-w-[8rem] overflow-hidden rounded-md border p-1 shadow-md",
        className,
      ),
    }),
  );
}

export function DropdownMenuGroup(
  props: React.ComponentProps<typeof DropdownMenuPrimitive.Group>,
) {
  return React.createElement(DropdownMenuPrimitive.Group, props);
}

export function DropdownMenuItem({
  className,
  inset,
  variant = "default",
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Item> & {
  inset?: boolean;
  variant?: "default" | "destructive";
}) {
  const itemProps = {
    ...props,
    "data-inset": inset ? "" : undefined,
    "data-variant": variant,
    className: cn(
      "focus:bg-accent focus:text-accent-foreground data-[variant=destructive]:text-destructive data-[variant=destructive]:focus:bg-destructive/10 dark:data-[variant=destructive]:focus:bg-destructive/20 data-[variant=destructive]:focus:text-destructive relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[inset]:pl-8",
      className,
    ),
  } as React.ComponentProps<typeof DropdownMenuPrimitive.Item> & {
    "data-inset"?: string;
    "data-variant"?: string;
  };

  return React.createElement(DropdownMenuPrimitive.Item, itemProps);
}

export function DropdownMenuCheckboxItem({
  className,
  children,
  checked,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.CheckboxItem>) {
  return React.createElement(
    DropdownMenuPrimitive.CheckboxItem,
    {
      ...props,
      checked,
      className: cn(
        "focus:bg-accent focus:text-accent-foreground relative flex cursor-default select-none items-center gap-2 rounded-sm py-1.5 pr-2 pl-8 text-sm outline-hidden data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        className,
      ),
    },
    React.createElement(
      "span",
      {
        className:
          "pointer-events-none absolute left-2 flex size-3.5 items-center justify-center",
      },
      React.createElement(
        DropdownMenuPrimitive.ItemIndicator,
        null,
        React.createElement(CheckIcon, { className: "size-4" }),
      ),
    ),
    children,
  );
}

export function DropdownMenuRadioGroup(
  props: React.ComponentProps<typeof DropdownMenuPrimitive.RadioGroup>,
) {
  return React.createElement(DropdownMenuPrimitive.RadioGroup, props);
}

export function DropdownMenuRadioItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.RadioItem>) {
  return React.createElement(
    DropdownMenuPrimitive.RadioItem,
    {
      ...props,
      className: cn(
        "focus:bg-accent focus:text-accent-foreground relative flex cursor-default select-none items-center gap-2 rounded-sm py-1.5 pr-2 pl-8 text-sm outline-hidden data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        className,
      ),
    },
    React.createElement(
      "span",
      {
        className:
          "pointer-events-none absolute left-2 flex size-3.5 items-center justify-center",
      },
      React.createElement(
        DropdownMenuPrimitive.ItemIndicator,
        null,
        React.createElement(CircleIcon, { className: "size-2 fill-current" }),
      ),
    ),
    children,
  );
}

export function DropdownMenuLabel({
  className,
  inset,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Label> & {
  inset?: boolean;
}) {
  const labelProps = {
    ...props,
    "data-inset": inset ? "" : undefined,
    className: cn(
      "px-2 py-1.5 text-sm font-medium data-[inset]:pl-8",
      className,
    ),
  } as React.ComponentProps<typeof DropdownMenuPrimitive.Label> & {
    "data-inset"?: string;
  };

  return React.createElement(DropdownMenuPrimitive.Label, labelProps);
}

export function DropdownMenuSeparator(
  props: React.ComponentProps<typeof DropdownMenuPrimitive.Separator>,
) {
  return React.createElement(DropdownMenuPrimitive.Separator, {
    ...props,
    className: cn("bg-border -mx-1 my-1 h-px", props.className),
  });
}

export function DropdownMenuShortcut(props: React.ComponentProps<"span">) {
  return React.createElement("span", {
    ...props,
    className: cn(
      "text-muted-foreground ml-auto text-xs tracking-widest",
      props.className,
    ),
  });
}

export function DropdownMenuSub(
  props: React.ComponentProps<typeof DropdownMenuPrimitive.Sub>,
) {
  return React.createElement(DropdownMenuPrimitive.Sub, props);
}

export function DropdownMenuSubTrigger({
  className,
  inset,
  children,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.SubTrigger> & {
  inset?: boolean;
}) {
  const triggerProps = {
    ...props,
    "data-inset": inset ? "" : undefined,
    className: cn(
      "focus:bg-accent focus:text-accent-foreground data-[state=open]:bg-accent data-[state=open]:text-accent-foreground flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden data-[inset]:pl-8",
      className,
    ),
  } as React.ComponentProps<typeof DropdownMenuPrimitive.SubTrigger> & {
    "data-inset"?: string;
  };

  return React.createElement(
    DropdownMenuPrimitive.SubTrigger,
    triggerProps,
    children,
    React.createElement(ChevronRightIcon, { className: "ml-auto size-4" }),
  );
}

export function DropdownMenuSubContent({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.SubContent>) {
  return React.createElement(DropdownMenuPrimitive.SubContent, {
    ...props,
    className: cn(
      "bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 z-50 min-w-[8rem] overflow-hidden rounded-md border p-1 shadow-lg",
      className,
    ),
  });
}
