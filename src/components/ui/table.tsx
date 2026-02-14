import React from "react";
import { cn } from "@/lib/utils";

function make(tag: any, base = "") {
  return React.forwardRef<any, any>(({ className, ...props }, ref) =>
    React.createElement(tag, { ref, className: cn(base, className), ...props })
  );
}

export const Table = make("table", "w-full text-sm");
export const TableHeader = make("thead");
export const TableBody = make("tbody");
export const TableRow = make("tr", "border-b");
export const TableHead = make("th", "px-2 py-2 text-left font-medium");
export const TableCell = make("td", "px-2 py-2");
