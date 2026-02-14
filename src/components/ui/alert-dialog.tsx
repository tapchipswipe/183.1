import * as React from "react";

export const AlertDialog = ({ children }: { children: React.ReactNode }) => <>{children}</>;
export const AlertDialogTrigger = ({ children }: { children: React.ReactNode; asChild?: boolean }) => <>{children}</>;
export const AlertDialogContent = ({ children }: { children: React.ReactNode }) => <>{children}</>;
export const AlertDialogHeader = ({ children }: { children: React.ReactNode }) => <>{children}</>;
export const AlertDialogTitle = ({ children, className }: { children: React.ReactNode; className?: string }) => <h4 className={className}>{children}</h4>;
export const AlertDialogDescription = ({ children, className }: { children: React.ReactNode; className?: string }) => <p className={className}>{children}</p>;
export const AlertDialogFooter = ({ children }: { children: React.ReactNode }) => <div>{children}</div>;
export const AlertDialogCancel = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>((props, ref) => <button ref={ref} type="button" {...props} />);
export const AlertDialogAction = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>((props, ref) => <button ref={ref} type="button" {...props} />);
AlertDialogCancel.displayName = "AlertDialogCancel";
AlertDialogAction.displayName = "AlertDialogAction";
