import * as React from "react";
import { cn } from "@/lib/utils";

const SelectContext = React.createContext<{
  value?: string;
  setValue: (value: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
} | null>(null);

export function Select({ value, onValueChange, children }: { value?: string; onValueChange?: (value: string) => void; children: React.ReactNode }) {
  const [internalValue, setInternalValue] = React.useState<string | undefined>(value);
  const [open, setOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => setInternalValue(value), [value]);

  React.useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  const setValue = (next: string) => {
    setInternalValue(next);
    onValueChange?.(next);
    setOpen(false);
  };
  return (
    <SelectContext.Provider value={{ value: internalValue, setValue, open, setOpen }}>
      <div ref={containerRef} className="relative">
        {children}
      </div>
    </SelectContext.Provider>
  );
}

export function SelectTrigger({ className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const ctx = React.useContext(SelectContext);
  return (
    <button
      type="button"
      className={cn("w-full rounded-md border px-3 py-2 text-left text-sm", className)}
      onClick={(e) => {
        props.onClick?.(e);
        if (!e.defaultPrevented) {
          ctx?.setOpen(!ctx.open);
        }
      }}
      {...props}
    />
  );
}

export function SelectValue({ placeholder }: { placeholder?: string }) {
  const ctx = React.useContext(SelectContext);
  return <span>{ctx?.value || placeholder || "Select"}</span>;
}

export function SelectContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  const ctx = React.useContext(SelectContext);
  if (!ctx?.open) return null;
  return (
    <div
      className={cn("absolute z-50 mt-1 w-full space-y-1 rounded-md border bg-popover p-1 shadow-sm", className)}
      {...props}
    />
  );
}

export function SelectItem({ value, className, children }: { value: string; className?: string; children: React.ReactNode }) {
  const ctx = React.useContext(SelectContext);
  return (
    <button
      type="button"
      className={cn("block w-full rounded px-2 py-1 text-left text-sm hover:bg-muted", className)}
      onClick={() => ctx?.setValue(value)}
    >
      {children}
    </button>
  );
}
