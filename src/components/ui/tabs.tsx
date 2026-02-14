import React, { createContext, useContext, useState } from "react";
import { cn } from "@/lib/utils";

const TabsContext = createContext<{ value: string; setValue: (v: string) => void } | null>(null);

export function Tabs({ defaultValue, className, children }: any) {
  const [value, setValue] = useState(defaultValue || "");
  return <div className={cn(className)}><TabsContext.Provider value={{ value, setValue }}>{children}</TabsContext.Provider></div>;
}

export function TabsList({ className, children }: any) {
  return <div className={cn("flex gap-1", className)}>{children}</div>;
}

export function TabsTrigger({ value, className, children }: any) {
  const ctx = useContext(TabsContext);
  const active = ctx?.value === value;
  return (
    <button type="button" onClick={() => ctx?.setValue(value)} className={cn("rounded border px-2 py-1", active && "bg-muted", className)}>
      {children}
    </button>
  );
}

export function TabsContent({ value, className, children }: any) {
  const ctx = useContext(TabsContext);
  if (ctx?.value !== value) return null;
  return <div className={cn(className)}>{children}</div>;
}
