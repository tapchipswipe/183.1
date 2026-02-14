import React from "react";
import { PanelLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { withAsChild } from "./primitives";

const Box = ({ className, children }: any) => <div className={cn(className)}>{children}</div>;

export function SidebarProvider({ children }: any) { return <>{children}</>; }
export function Sidebar({ className, children }: any) { return <aside className={cn("w-64 border-r", className)}>{children}</aside>; }
export function SidebarHeader(props: any) { return <Box {...props} />; }
export function SidebarContent(props: any) { return <Box {...props} />; }
export function SidebarFooter(props: any) { return <Box {...props} />; }
export function SidebarGroup(props: any) { return <Box {...props} />; }
export function SidebarGroupLabel(props: any) { return <Box {...props} />; }
export function SidebarGroupContent(props: any) { return <Box {...props} />; }
export function SidebarMenu(props: any) { return <Box {...props} />; }
export function SidebarMenuItem(props: any) { return <Box {...props} />; }
export function SidebarSeparator() { return <hr className="border-sidebar-border" />; }
export function SidebarTrigger({ className }: any) { return <button className={cn("rounded border p-1", className)}><PanelLeft className="h-4 w-4" /></button>; }

export function SidebarMenuButton({ asChild, className, children }: any) {
  return withAsChild(asChild, children, <button />, { className: cn("flex w-full items-center gap-2 rounded px-2 py-1", className) });
}
