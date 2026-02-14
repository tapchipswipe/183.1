import React from "react";

export function withAsChild(
  asChild: boolean | undefined,
  children: React.ReactNode,
  fallback: React.ReactElement,
  extraProps: Record<string, any> = {}
) {
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<any>, {
      ...(children as any).props,
      ...extraProps,
    });
  }
  return React.cloneElement(fallback, extraProps, children);
}
