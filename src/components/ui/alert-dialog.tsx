import React, { createContext, useContext, useState } from "react";
import { cn } from "@/lib/utils";
import { withAsChild } from "./primitives";

const Ctx = createContext<{ open: boolean; setOpen: (v: boolean) => void } | null>(null);

export function AlertDialog({ children }: any) {
  const [open, setOpen] = useState(false);
  return <Ctx.Provider value={{ open, setOpen }}>{children}</Ctx.Provider>;
}

export function AlertDialogTrigger({ asChild, children }: any) {
  const ctx = useContext(Ctx);
  return withAsChild(asChild, children, <button type="button" />, { onClick: () => ctx?.setOpen(true) });
}

export function AlertDialogContent({ className, children }: any) {
  const ctx = useContext(Ctx);
  if (!ctx?.open) return null;
  return <div className={cn("fixed inset-0 z-50 grid place-items-center bg-black/30 p-4", className)}><div className="w-full max-w-sm rounded border bg-background p-4">{children}</div></div>;
}

export function AlertDialogHeader({ children }: any) { return <div className="mb-2">{children}</div>; }
export function AlertDialogTitle({ className, children }: any) { return <h3 className={cn("text-base font-semibold", className)}>{children}</h3>; }
export function AlertDialogDescription({ className, children }: any) { return <p className={cn("text-sm text-muted-foreground", className)}>{children}</p>; }
export function AlertDialogFooter({ className, children }: any) { return <div className={cn("mt-4 flex justify-end gap-2", className)}>{children}</div>; }

export function AlertDialogCancel({ className, children, ...props }: any) {
  const ctx = useContext(Ctx);
  return <button type="button" className={cn("rounded border px-3 py-1", className)} onClick={() => ctx?.setOpen(false)} {...props}>{children}</button>;
}

export function AlertDialogAction({ className, children, onClick, ...props }: any) {
  const ctx = useContext(Ctx);
  return <button type="button" className={cn("rounded border px-3 py-1", className)} onClick={(e) => { onClick?.(e); ctx?.setOpen(false); }} {...props}>{children}</button>;
}
