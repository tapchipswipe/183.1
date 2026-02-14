import React, { createContext, useContext, useState } from "react";
import { cn } from "@/lib/utils";
import { withAsChild } from "./primitives";

const Ctx = createContext<{ open: boolean; setOpen: (v: boolean) => void } | null>(null);

export function DropdownMenu({ children }: any) {
  const [open, setOpen] = useState(false);
  return <Ctx.Provider value={{ open, setOpen }}><div className="relative">{children}</div></Ctx.Provider>;
}

export function DropdownMenuTrigger({ asChild, children }: any) {
  const ctx = useContext(Ctx);
  return withAsChild(asChild, children, <button type="button" />, { onClick: () => ctx?.setOpen(!ctx.open) });
}

export function DropdownMenuContent({ className, children }: any) {
  const ctx = useContext(Ctx);
  if (!ctx?.open) return null;
  return <div className={cn("absolute right-0 z-50 mt-1 rounded border bg-background p-1", className)}>{children}</div>;
}

export function DropdownMenuItem({ className, children, onClick }: any) {
  return <button type="button" onClick={onClick} className={cn("flex w-full items-center rounded px-2 py-1 text-left", className)}>{children}</button>;
}
