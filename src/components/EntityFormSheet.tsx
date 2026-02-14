import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2 } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export interface FormField {
  key: string;
  label: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
}

interface EntityFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  fields: FormField[];
  values: Record<string, any>;
  onChange: (key: string, value: any) => void;
  onSubmit: () => void;
  loading?: boolean;
  onDelete?: () => void;
}

export function EntityFormSheet({
  open, onOpenChange, title, fields, values, onChange, onSubmit, loading, onDelete,
}: EntityFormSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-80 sm:w-96">
        <SheetHeader>
          <SheetTitle className="text-sm">{title}</SheetTitle>
        </SheetHeader>
        <form
          onSubmit={(e) => { e.preventDefault(); onSubmit(); }}
          className="mt-4 space-y-3"
        >
          {fields.map((field) => (
            <div key={field.key} className="space-y-1">
              <Label htmlFor={field.key} className="text-xs">{field.label}</Label>
              <Input
                id={field.key}
                type={field.type ?? "text"}
                placeholder={field.placeholder}
                required={field.required}
                value={values[field.key] ?? ""}
                onChange={(e) => onChange(field.key, e.target.value)}
                className="h-8 text-sm"
              />
            </div>
          ))}
          <div className="flex gap-2">
            <Button type="submit" className="h-8 flex-1 text-xs" disabled={loading}>
              {loading ? "Saving..." : "Save"}
            </Button>
            {onDelete && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button type="button" variant="destructive" size="icon" className="h-8 w-8 shrink-0">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-sm">Delete this record?</AlertDialogTitle>
                    <AlertDialogDescription className="text-xs">
                      This action cannot be undone. This will permanently delete the record.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="h-8 text-xs">Cancel</AlertDialogCancel>
                    <AlertDialogAction className="h-8 text-xs" onClick={() => { onDelete(); onOpenChange(false); }}>
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
