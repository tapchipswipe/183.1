import React, { createContext, useContext } from "react";
import { cn } from "@/lib/utils";

type Ctx = { value?: string; onValueChange?: (value: string) => void };
const SelectContext = createContext<Ctx>({});

export function Select({ value, onValueChange, children }: { value?: string; onValueChange?: (value: string) => void; children: React.ReactNode }) {
  return <SelectContext.Provider value={{ value, onValueChange }}>{children}</SelectContext.Provider>;
}

export function SelectTrigger({ className, children }: any) {
  return <div className={cn("rounded border px-2 py-1", className)}>{children}</div>;
}

export function SelectValue({ placeholder }: { placeholder?: string }) {
  const { value } = useContext(SelectContext);
  return <span>{value || placeholder || "Select"}</span>;
}

export function SelectContent({ className, children }: any) {
  return <div className={cn("mt-1 rounded border bg-background p-1", className)}>{children}</div>;
}

export function SelectItem({ value, className, children }: any) {
  const { onValueChange } = useContext(SelectContext);
  return (
    <button type="button" className={cn("block w-full rounded px-2 py-1 text-left", className)} onClick={() => onValueChange?.(value)}>
      {children}
    </button>
  );
}
