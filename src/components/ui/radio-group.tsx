import React, { createContext, useContext } from "react";

const RadioCtx = createContext<{ value?: string; onValueChange?: (v: string) => void }>({});

export function RadioGroup({ value, onValueChange, children, className }: any) {
  return <RadioCtx.Provider value={{ value, onValueChange }}><div className={className}>{children}</div></RadioCtx.Provider>;
}

export function RadioGroupItem({ value, id }: { value: string; id?: string }) {
  const ctx = useContext(RadioCtx);
  return <input id={id} type="radio" checked={ctx.value === value} onChange={() => ctx.onValueChange?.(value)} />;
}
