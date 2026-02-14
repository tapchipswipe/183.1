import * as React from "react";
import { cn } from "@/lib/utils";

export const Popover = ({ children }: { open?: boolean; onOpenChange?: (open: boolean) => void; children: React.ReactNode }) => <>{children}</>;
export const PopoverTrigger = ({ children }: { asChild?: boolean; children: React.ReactNode }) => <>{children}</>;
export const PopoverContent = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement> & { align?: string }) => (
  <div className={cn("rounded-md border bg-popover p-2", className)} {...props} />
);
