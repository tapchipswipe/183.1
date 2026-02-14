export function useToast() {
  return {
    toast: ({ title, description }: { title?: string; description?: string; variant?: string }) => {
      const message = [title, description].filter(Boolean).join(" - ");
      if (message) {
        console.info(message);
      }
    },
  };
}
