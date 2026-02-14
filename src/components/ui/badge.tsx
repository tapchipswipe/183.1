import * as React from "react";
import { cn } from "@/lib/utils";

export function Badge({ className, ...props }: React.HTMLAttributes<HTMLSpanElement> & { variant?: "default" | "outline" }) {
  return <span className={cn("inline-flex rounded border px-1.5 py-0.5 text-xs", className)} {...props} />;
}
