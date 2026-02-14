import * as React from "react";
import { cn } from "@/lib/utils";

export const SidebarProvider = ({ children }: { children: React.ReactNode }) => <>{children}</>;

export const Sidebar = ({ className, ...props }: React.HTMLAttributes<HTMLElement>) => (
  <aside className={cn("w-64 border-r bg-sidebar", className)} {...props} />
);

export const SidebarTrigger = ({ className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button type="button" className={cn("rounded border px-2 py-1", className)} {...props}>
    Menu
  </button>
);

export const SidebarHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div className={cn(className)} {...props} />;
export const SidebarContent = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div className={cn(className)} {...props} />;
export const SidebarFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div className={cn(className)} {...props} />;
export const SidebarGroup = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div className={cn(className)} {...props} />;
export const SidebarGroupLabel = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div className={cn(className)} {...props} />;
export const SidebarGroupContent = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div className={cn(className)} {...props} />;
export const SidebarMenu = ({ className, ...props }: React.HTMLAttributes<HTMLUListElement>) => <ul className={cn(className)} {...props} />;
export const SidebarMenuItem = ({ className, ...props }: React.LiHTMLAttributes<HTMLLIElement>) => <li className={cn(className)} {...props} />;

export function SidebarMenuButton({
  asChild,
  className,
  children,
  size,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean; size?: "sm" | "default" }) {
  if (asChild) return <div className={cn(className)}>{children}</div>;
  return (
    <button type="button" className={cn("w-full", className)} {...props}>
      {children}
    </button>
  );
}

export const SidebarSeparator = ({ className, ...props }: React.HTMLAttributes<HTMLHRElement>) => <hr className={cn(className)} {...props} />;
