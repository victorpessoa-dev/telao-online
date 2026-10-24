import * as React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { CheckIcon, ChevronDownIcon, ChevronUpIcon } from "lucide-react";

import { cn } from "@/lib/utils/cn";

export function Select(
  props: React.ComponentProps<typeof SelectPrimitive.Root>,
) {
  return React.createElement(SelectPrimitive.Root, props);
}

export function SelectGroup(
  props: React.ComponentProps<typeof SelectPrimitive.Group>,
) {
  return React.createElement(SelectPrimitive.Group, props);
}

export function SelectValue(
  props: React.ComponentProps<typeof SelectPrimitive.Value>,
) {
  return React.createElement(SelectPrimitive.Value, props);
}

export function SelectTrigger({
  className,
  size = "default",
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Trigger> & {
  size?: "sm" | "default";
}) {
  const triggerProps = {
    ...props,
    "data-size": size,
    className: cn(
      "border-input data-[placeholder]:text-muted-foreground [&_svg:not([class*='text-'])]:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 dark:hover:bg-input/50 flex w-fit items-center justify-between gap-2 rounded-md border bg-transparent px-3 py-2 text-sm whitespace-nowrap shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 data-[size=default]:h-9 data-[size=sm]:h-8 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
      className,
    ),
  } as React.ComponentProps<typeof SelectPrimitive.Trigger> & {
    "data-size"?: "sm" | "default";
  };

  return React.createElement(
    SelectPrimitive.Trigger,
    triggerProps,
    children,
    React.createElement(
      SelectPrimitive.Icon,
      { asChild: true },
      React.createElement(ChevronDownIcon, { className: "size-4 opacity-50" }),
    ),
  );
}

export function SelectContent({
  className,
  children,
  position = "popper",
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Content>) {
  return React.createElement(
    SelectPrimitive.Portal,
    null,
    React.createElement(
      SelectPrimitive.Content,
      {
        ...props,
        position,
        className: cn(
          "bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 relative z-50 min-w-[8rem] overflow-hidden rounded-md border shadow-md",
          position === "popper" &&
            "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
          className,
        ),
      },
      React.createElement(SelectScrollUpButton, null),
      React.createElement(
        SelectPrimitive.Viewport,
        {
          className: cn(
            "p-1",
            position === "popper" &&
              "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)] scroll-my-1",
          ),
        },
        children,
      ),
      React.createElement(SelectScrollDownButton, null),
    ),
  );
}

export function SelectLabel(
  props: React.ComponentProps<typeof SelectPrimitive.Label>,
) {
  return React.createElement(SelectPrimitive.Label, {
    ...props,
    className: cn("text-muted-foreground px-2 py-1.5 text-xs", props.className),
  });
}

export function SelectItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Item>) {
  return React.createElement(
    SelectPrimitive.Item,
    {
      ...props,
      className: cn(
        "focus:bg-accent focus:text-accent-foreground relative flex w-full cursor-default select-none items-center gap-2 rounded-sm py-1.5 pr-8 pl-2 text-sm outline-hidden data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        className,
      ),
    },
    React.createElement(
      "span",
      {
        className: "absolute right-2 flex size-3.5 items-center justify-center",
      },
      React.createElement(
        SelectPrimitive.ItemIndicator,
        null,
        React.createElement(CheckIcon, { className: "size-4" }),
      ),
    ),
    React.createElement(SelectPrimitive.ItemText, null, children),
  );
}

export function SelectSeparator(
  props: React.ComponentProps<typeof SelectPrimitive.Separator>,
) {
  return React.createElement(SelectPrimitive.Separator, {
    ...props,
    className: cn(
      "bg-border pointer-events-none -mx-1 my-1 h-px",
      props.className,
    ),
  });
}

export function SelectScrollUpButton(
  props: React.ComponentProps<typeof SelectPrimitive.ScrollUpButton>,
) {
  return React.createElement(
    SelectPrimitive.ScrollUpButton,
    {
      ...props,
      className: cn(
        "flex cursor-default items-center justify-center py-1",
        props.className,
      ),
    },
    React.createElement(ChevronUpIcon, { className: "size-4" }),
  );
}

export function SelectScrollDownButton(
  props: React.ComponentProps<typeof SelectPrimitive.ScrollDownButton>,
) {
  return React.createElement(
    SelectPrimitive.ScrollDownButton,
    {
      ...props,
      className: cn(
        "flex cursor-default items-center justify-center py-1",
        props.className,
      ),
    },
    React.createElement(ChevronDownIcon, { className: "size-4" }),
  );
}
