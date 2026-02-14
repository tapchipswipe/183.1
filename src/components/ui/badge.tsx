import { cn } from "@/lib/utils";

export function Badge({ className, children }: any) {
  return <span className={cn("inline-flex rounded border px-1.5 py-0.5 text-xs", className)}>{children}</span>;
}
