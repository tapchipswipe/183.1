export function useToast() {
  return {
    toast: ({ title, description, variant }: { title?: string; description?: string; variant?: string }) => {
      const prefix = variant ? `[${variant}] ` : "";
      console.log(`${prefix}${title ?? "Toast"}: ${description ?? ""}`);
    },
  };
}
