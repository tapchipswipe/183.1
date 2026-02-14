import * as React from "react";
import { cn } from "@/lib/utils";

export const Sheet = ({ children }: { open?: boolean; onOpenChange?: (open: boolean) => void; children: React.ReactNode }) => <>{children}</>;

export const SheetContent = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("rounded-lg border bg-card p-4", className)} {...props} />
);

export const SheetHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("space-y-1", className)} {...props} />
);

export const SheetTitle = ({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h3 className={cn("font-semibold", className)} {...props} />
);
