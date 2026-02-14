import * as React from "react";
import { cn } from "@/lib/utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost" | "destructive";
  size?: "default" | "sm" | "icon";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center rounded-md border px-3 py-2 text-sm",
        variant === "default" && "bg-primary text-primary-foreground border-primary",
        variant === "outline" && "bg-background",
        variant === "ghost" && "bg-transparent border-transparent",
        variant === "destructive" && "bg-destructive text-destructive-foreground border-destructive",
        size === "sm" && "h-8 px-2 text-xs",
        size === "icon" && "h-8 w-8 p-0",
        className
      )}
      {...props}
    />
  )
);
Button.displayName = "Button";
