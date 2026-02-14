import React from "react";
import { cn } from "@/lib/utils";

function make<T extends keyof JSX.IntrinsicElements>(tag: T, base = "") {
  return React.forwardRef<any, any>(({ className, ...props }, ref) =>
    React.createElement(tag, { ref, className: cn(base, className), ...props })
  );
}

export const Card = make("div", "rounded-lg border bg-card");
export const CardHeader = make("div", "p-4");
export const CardTitle = make("h3", "text-base font-semibold");
export const CardDescription = make("p", "text-sm text-muted-foreground");
export const CardContent = make("div", "p-4");
export const CardFooter = make("div", "p-4");
