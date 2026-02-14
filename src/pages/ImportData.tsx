import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

function parseCsv(text: string): string[][] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.split(",").map((v) => v.trim()));
}

export default function ImportData() {
  const { userRole } = useAuth();
  const companyId = userRole?.company_id;

  const [entity, setEntity] = useState("products");
  const [csvText, setCsvText] = useState("name,price,quantity\nSample Product,9.99,10");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string>("");

  const handleFile = async (file: File) => {
    const text = await file.text();
    setCsvText(text);
  };

  const importData = async () => {
    if (!companyId) return;
    setBusy(true);
    setResult("");

    try {
      const rows = parseCsv(csvText);
      if (rows.length < 2) {
        setResult("No rows to import.");
        setBusy(false);
        return;
      }
      const headers = rows[0];
      const payload = rows.slice(1).map((row) => {
        const obj: Record<string, string | null> = {};
        headers.forEach((h, i) => {
          obj[h] = row[i] ?? null;
        });
        return { ...obj, company_id: companyId };
      });

      const { error } = await supabase.from(entity).insert(payload as never);
      if (error) throw error;

      setResult(`Imported ${payload.length} row(s) into ${entity}.`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Import failed";
      setResult(message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <h1 className="text-sm font-semibold">Import Data</h1>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">CSV Import</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Entity</label>
            <Select value={entity} onValueChange={setEntity}>
              <SelectTrigger><SelectValue placeholder="Select entity" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="products">products</SelectItem>
                <SelectItem value="customers">customers</SelectItem>
                <SelectItem value="suppliers">suppliers</SelectItem>
                <SelectItem value="expenses">expenses</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="mb-1 block text-xs text-muted-foreground">CSV File</label>
            <Input type="file" accept=".csv,text/csv" onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }} />
          </div>

          <div>
            <label className="mb-1 block text-xs text-muted-foreground">CSV Content</label>
            <textarea
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              className="min-h-40 w-full rounded-md border bg-background p-2 text-xs"
            />
          </div>

          <Button size="sm" onClick={importData} disabled={busy}>{busy ? "Importing..." : "Import"}</Button>

          {result && <p className="text-xs text-muted-foreground">{result}</p>}
        </CardContent>
      </Card>
    </div>
  );
}
