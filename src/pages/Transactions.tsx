import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { DataTable, type Column } from "@/components/DataTable";
import { EntityFormSheet, type FormField } from "@/components/EntityFormSheet";
import { Badge } from "@/components/ui/badge";

interface TransactionRow {
  id: string;
  processor: string;
  external_transaction_id: string;
  occurred_at: string;
  amount: number;
  currency: string;
  status: string | null;
  description: string | null;
}

const fields: FormField[] = [
  { key: "processor", label: "Processor", required: true },
  { key: "external_transaction_id", label: "External ID" },
  { key: "occurred_at", label: "Date", type: "date", required: true },
  { key: "amount", label: "Amount", type: "number", required: true },
  { key: "currency", label: "Currency" },
  { key: "status", label: "Status" },
  { key: "description", label: "Description" },
];

function statusClass(status: string | null) {
  const s = (status ?? "").toLowerCase();
  if (s === "completed") return "border-green-300 text-green-700";
  if (s === "pending") return "border-amber-300 text-amber-700";
  if (s === "failed" || s === "cancelled") return "border-red-300 text-red-700";
  return "";
}

export default function Transactions() {
  const { merchant } = useAuth();
  const merchantId = merchant?.id;

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [values, setValues] = useState<Record<string, string>>({
    processor: "manual",
    external_transaction_id: "",
    occurred_at: new Date().toISOString().slice(0, 10),
    amount: "",
    currency: "USD",
    status: "completed",
    description: "",
  });

  const { data = [], isLoading, refetch } = useQuery({
    queryKey: ["transactions", merchantId],
    enabled: !!merchantId,
    queryFn: async () => {
      if (!merchantId) return [];
      const { data, error } = await supabase
        .from("transactions")
        .select("id, processor, external_transaction_id, occurred_at, amount, currency, status, description")
        .eq("merchant_id", merchantId)
        .order("occurred_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as TransactionRow[];
    },
  });

  const columns: Column<TransactionRow>[] = useMemo(
    () => [
      {
        key: "processor",
        label: "Processor",
        render: (r) => (
          <Badge variant="outline" className="capitalize">
            {r.processor}
          </Badge>
        ),
      },
      { key: "external_transaction_id", label: "External ID" },
      { key: "description", label: "Description" },
      {
        key: "amount",
        label: "Amount",
        render: (r) => `${r.currency ?? "USD"} ${Number(r.amount ?? 0).toFixed(2)}`,
      },
      {
        key: "status",
        label: "Status",
        render: (r) => (
          <Badge variant="outline" className={`capitalize ${statusClass(r.status)}`}>
            {r.status ?? "unknown"}
          </Badge>
        ),
      },
      {
        key: "occurred_at",
        label: "Date",
        render: (r) =>
          r.occurred_at ? new Date(r.occurred_at).toLocaleString() : "—",
      },
    ],
    []
  );

  const resetForm = () => {
    setEditingId(null);
    setValues({
      processor: "manual",
      external_transaction_id: "",
      occurred_at: new Date().toISOString().slice(0, 10),
      amount: "",
      currency: "USD",
      status: "completed",
      description: "",
    });
  };

  const openCreate = () => {
    resetForm();
    setOpen(true);
  };

  const openEdit = (row: TransactionRow) => {
    setEditingId(row.id);
    setValues({
      processor: row.processor ?? "manual",
      external_transaction_id: row.external_transaction_id ?? "",
      occurred_at: row.occurred_at ? new Date(row.occurred_at).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
      amount: row.amount == null ? "" : String(row.amount),
      currency: row.currency ?? "USD",
      status: row.status ?? "completed",
      description: row.description ?? "",
    });
    setOpen(true);
  };

  const save = async () => {
    if (!merchantId) return;
    setSaving(true);
    const occurredAtIso = values.occurred_at
      ? new Date(values.occurred_at).toISOString()
      : new Date().toISOString();
    const extId =
      values.external_transaction_id.trim() ||
      `manual_${new Date().toISOString().replace(/\\D/g, "")}`;

    const payload = {
      amount: values.amount ? Number(values.amount) : 0,
      currency: values.currency.trim() || "USD",
      status: values.status.trim() || "completed",
      description: values.description.trim() || null,
      occurred_at: occurredAtIso,
      processor: values.processor.trim() || "manual",
      external_transaction_id: extId,
    };

    if (editingId) {
      await supabase.from("transactions").update(payload).eq("id", editingId);
    } else {
      await supabase.from("transactions").insert({ ...payload, merchant_id: merchantId });
    }
    setSaving(false);
    setOpen(false);
    resetForm();
    refetch();
  };

  const remove = async () => {
    if (!editingId) return;
    await supabase.from("transactions").delete().eq("id", editingId);
    setOpen(false);
    resetForm();
    refetch();
  };

  return (
    <div className="space-y-3">
      <h1 className="text-sm font-semibold">Transactions</h1>
      <DataTable
        data={data}
        columns={columns}
        loading={isLoading}
        addLabel="Transaction"
        onAdd={openCreate}
        onRowClick={openEdit}
      />
      <EntityFormSheet
        open={open}
        onOpenChange={setOpen}
        title={editingId ? "Edit Transaction" : "Add Transaction"}
        fields={fields}
        values={values}
        onChange={(key, value) => setValues((prev) => ({ ...prev, [key]: value }))}
        onSubmit={save}
        loading={saving}
        onDelete={editingId ? remove : undefined}
      />
    </div>
  );
}
