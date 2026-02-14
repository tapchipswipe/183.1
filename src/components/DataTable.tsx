import { useState } from "react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Plus, ChevronLeft, ChevronRight, Download } from "lucide-react";

export interface Column<T> {
  key: string;
  label: string;
  render?: (row: T) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  onAdd?: () => void;
  addLabel?: string;
  loading?: boolean;
  onRowClick?: (row: T) => void;
  onDelete?: (row: T) => void;
}

const PAGE_SIZE = 20;

export function DataTable<T extends { id: string }>({
  data, columns, onAdd, addLabel = "Add", loading, onRowClick, onDelete,
}: DataTableProps<T>) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  const filtered = data.filter((row) =>
    columns.some((col) => {
      const val = (row as any)[col.key];
      return val && String(val).toLowerCase().includes(search.toLowerCase());
    })
  );

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const exportCsv = () => {
    const headers = columns.map((c) => c.label);
    const rows = filtered.map((row) =>
      columns.map((col) => {
        const val = (row as any)[col.key];
        const str = val == null ? "" : String(val);
        return str.includes(",") || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str;
      })
    );
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${addLabel.toLowerCase()}-export.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="h-7 pl-7 text-xs"
          />
        </div>
        <Button onClick={exportCsv} variant="outline" size="sm" className="h-7 text-xs" disabled={filtered.length === 0}>
          <Download className="mr-1 h-3 w-3" />
          CSV
        </Button>
        {onAdd && (
          <Button onClick={onAdd} size="sm" className="h-7 text-xs">
            <Plus className="mr-1 h-3 w-3" />
            {addLabel}
          </Button>
        )}
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {columns.map((col) => (
                <TableHead key={col.key} className={`h-8 text-2xs font-medium uppercase tracking-wider ${col.className ?? ""}`}>
                  {col.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {columns.map((col) => (
                    <TableCell key={col.key} className={`py-2 ${col.className ?? ""}`}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : paged.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="py-8 text-center text-xs text-muted-foreground">
                  No data found
                </TableCell>
              </TableRow>
            ) : (
              paged.map((row) => (
                <TableRow
                  key={row.id}
                  className={onRowClick ? "cursor-pointer" : ""}
                  onClick={() => onRowClick?.(row)}
                >
                  {columns.map((col) => (
                    <TableCell key={col.key} className={`py-2 text-xs ${col.className ?? ""}`}>
                      {col.render ? col.render(row) : (row as any)[col.key] ?? "—"}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-2xs text-muted-foreground">
          <span>{filtered.length} results</span>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>
              <ChevronLeft className="h-3 w-3" />
            </Button>
            <span>{page + 1} / {totalPages}</span>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}>
              <ChevronRight className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
