"use client";

import * as React from "react";
import { Select as SelectPrimitive } from "@base-ui/react/select";
import { cn } from "@/lib/utils";
import { Check, ChevronDown } from "lucide-react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SelectRootProps = SelectPrimitive.Root.Props<any, false>;

function Select({
  value,
  onValueChange,
  children,
  ...props
}: SelectRootProps) {
  return (
    <SelectPrimitive.Root
      value={value}
      onValueChange={onValueChange}
      {...props}
    >
      {children}
    </SelectPrimitive.Root>
  );
}

function SelectTrigger({
  className,
  children,
  ...props
}: SelectPrimitive.Trigger.Props) {
  return (
    <SelectPrimitive.Trigger
      className={cn(
        "flex h-9 w-full items-center justify-between gap-2 rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none transition-colors hover:bg-muted/50 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
        className
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon>
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
}

function SelectValue({
  className,
  placeholder,
  ...props
}: SelectPrimitive.Value.Props & { placeholder?: string }) {
  return (
    <SelectPrimitive.Value
      className={cn("truncate", className)}
      placeholder={placeholder}
      {...props}
    />
  );
}

function SelectContent({
  className,
  children,
  ...props
}: SelectPrimitive.List.Props) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Positioner
        className="z-50"
        sideOffset={4}
        alignOffset={0}
      >
        <SelectPrimitive.Popup
          className="relative z-50 min-w-[var(--anchor-width)] overflow-hidden rounded-lg border bg-popover text-popover-foreground shadow-lg outline-none data-[open]:animate-in data-[closed]:animate-out data-[closed]:fade-out-0 data-[open]:fade-in-0 data-[closed]:zoom-out-95 data-[open]:zoom-in-95"
        >
          <SelectPrimitive.List
            className={cn("max-h-60 overflow-auto p-1", className)}
            {...props}
          >
            {children}
          </SelectPrimitive.List>
        </SelectPrimitive.Popup>
      </SelectPrimitive.Positioner>
    </SelectPrimitive.Portal>
  );
}

function SelectItem({
  className,
  children,
  ...props
}: SelectPrimitive.Item.Props) {
  return (
    <SelectPrimitive.Item
      className={cn(
        "relative flex cursor-pointer select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none hover:bg-muted focus-visible:bg-muted",
        className
      )}
      {...props}
    >
      <SelectPrimitive.ItemIndicator className="absolute right-2">
        <Check className="h-4 w-4" />
      </SelectPrimitive.ItemIndicator>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  );
}

export {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
};
