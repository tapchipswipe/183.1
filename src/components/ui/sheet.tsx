import React from "react";
import { cn } from "@/lib/utils";

export function Sheet({ open, onOpenChange, children }: { open?: boolean; onOpenChange?: (open: boolean) => void; children: React.ReactNode }) {
  if (open === false) return null;
  return <>{children}</>;
}

export function SheetContent({ className, children }: any) {
  return <div className={cn("fixed right-0 top-0 h-full w-full max-w-md overflow-auto border-l bg-background p-4", className)}>{children}</div>;
}

export function SheetHeader({ className, children }: any) {
  return <div className={cn("mb-3", className)}>{children}</div>;
}

export function SheetTitle({ className, children }: any) {
  return <h2 className={cn("text-base font-semibold", className)}>{children}</h2>;
}
