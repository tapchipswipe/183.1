import React, { createContext, useContext, useState } from "react";
import { cn } from "@/lib/utils";
import { withAsChild } from "./primitives";

const Ctx = createContext<{ open: boolean; setOpen: (v: boolean) => void } | null>(null);

export function Popover({ open, onOpenChange, children }: any) {
  const [internalOpen, setInternalOpen] = useState(false);
  const actualOpen = open ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  return <Ctx.Provider value={{ open: actualOpen, setOpen }}><div className="relative">{children}</div></Ctx.Provider>;
}

export function PopoverTrigger({ asChild, children }: any) {
  const ctx = useContext(Ctx);
  return withAsChild(asChild, children, <button type="button" />, { onClick: () => ctx?.setOpen(!ctx.open) });
}

export function PopoverContent({ className, children }: any) {
  const ctx = useContext(Ctx);
  if (!ctx?.open) return null;
  return <div className={cn("absolute right-0 z-50 mt-1 rounded border bg-background p-2", className)}>{children}</div>;
}
