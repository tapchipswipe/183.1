import React from "react";
import { cn } from "@/lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "outline" | "ghost" | "destructive";
  size?: "default" | "sm" | "icon";
};

export function Button({ className, children, ...props }: ButtonProps) {
  return (
    <button className={cn("inline-flex items-center justify-center rounded border px-3 py-1", className)} {...props}>
      {children}
    </button>
  );
}
