import * as React from "react";
import { cn } from "@/lib/utils";

const RadioContext = React.createContext<{ value?: string; setValue: (value: string) => void } | null>(null);

export function RadioGroup({ value, onValueChange, className, children }: { value?: string; onValueChange?: (value: string) => void; className?: string; children: React.ReactNode }) {
  const [internalValue, setInternalValue] = React.useState<string | undefined>(value);
  React.useEffect(() => setInternalValue(value), [value]);
  const setValue = (next: string) => {
    setInternalValue(next);
    onValueChange?.(next);
  };
  return (
    <RadioContext.Provider value={{ value: internalValue, setValue }}>
      <div className={cn(className)}>{children}</div>
    </RadioContext.Provider>
  );
}

export const RadioGroupItem = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ value, ...props }, ref) => {
    const ctx = React.useContext(RadioContext);
    const stringValue = typeof value === "string" ? value : String(value ?? "");
    return (
      <input
        ref={ref}
        type="radio"
        checked={ctx?.value === stringValue}
        onChange={() => stringValue && ctx?.setValue(stringValue)}
        value={stringValue}
        {...props}
      />
    );
  }
);
RadioGroupItem.displayName = "RadioGroupItem";
