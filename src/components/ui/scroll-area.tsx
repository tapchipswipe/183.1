import { cn } from "@/lib/utils";

export function ScrollArea({ className, children }: any) {
  return <div className={cn("overflow-auto", className)}>{children}</div>;
}
