import * as React from "react";
import { cn } from "@/lib/utils";

export const DropdownMenu = ({ children }: { children: React.ReactNode }) => <>{children}</>;
export const DropdownMenuTrigger = ({ children }: { children: React.ReactNode; asChild?: boolean }) => <>{children}</>;
export const DropdownMenuContent = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement> & { align?: string }) => (
  <div className={cn("rounded-md border bg-popover p-1", className)} {...props} />
);
export const DropdownMenuItem = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn("cursor-pointer rounded px-2 py-1 text-sm hover:bg-muted", className)} {...props} />
);
DropdownMenuItem.displayName = "DropdownMenuItem";
