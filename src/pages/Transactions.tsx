import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { DataTable, type Column } from "@/components/DataTable";
import { EntityFormSheet, type FormField } from "@/components/EntityFormSheet";
import { Badge } from "@/components/ui/badge";

interface TransactionRow {
  id: string;
  type: string;
  amount: number | null;
  currency: string | null;
  status: string | null;
  description: string | null;
  transaction_date: string | null;
}

const fields: FormField[] = [
  { key: "type", label: "Type", required: true },
  { key: "amount", label: "Amount", type: "number", required: true },
  { key: "currency", label: "Currency" },
  { key: "status", label: "Status" },
  { key: "description", label: "Description" },
  { key: "transaction_date", label: "Date", type: "date" },
];

function statusClass(status: string | null) {
  const s = (status ?? "").toLowerCase();
  if (s === "completed") return "border-green-300 text-green-700";
  if (s === "pending") return "border-amber-300 text-amber-700";
  if (s === "failed" || s === "cancelled") return "border-red-300 text-red-700";
  return "";
}

export default function Transactions() {
  const { userRole } = useAuth();
  const companyId = userRole?.company_id;

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [values, setValues] = useState<Record<string, string>>({
    type: "sale",
    amount: "",
    currency: "USD",
    status: "completed",
    description: "",
    transaction_date: new Date().toISOString().slice(0, 10),
  });

  const { data = [], isLoading, refetch } = useQuery({
    queryKey: ["transactions", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from("transactions")
        .select("id, type, amount, currency, status, description, transaction_date")
        .eq("company_id", companyId)
        .order("transaction_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as TransactionRow[];
    },
  });

  const columns: Column<TransactionRow>[] = useMemo(
    () => [
      {
        key: "type",
        label: "Type",
        render: (r) => (
          <Badge variant="outline" className="capitalize">
            {r.type}
          </Badge>
        ),
      },
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
        key: "transaction_date",
        label: "Date",
        render: (r) =>
          r.transaction_date ? new Date(r.transaction_date).toLocaleDateString() : "—",
      },
    ],
    []
  );

  const resetForm = () => {
    setEditingId(null);
    setValues({
      type: "sale",
      amount: "",
      currency: "USD",
      status: "completed",
      description: "",
      transaction_date: new Date().toISOString().slice(0, 10),
    });
  };

  const openCreate = () => {
    resetForm();
    setOpen(true);
  };

  const openEdit = (row: TransactionRow) => {
    setEditingId(row.id);
    setValues({
      type: row.type ?? "sale",
      amount: row.amount == null ? "" : String(row.amount),
      currency: row.currency ?? "USD",
      status: row.status ?? "completed",
      description: row.description ?? "",
      transaction_date: row.transaction_date
        ? new Date(row.transaction_date).toISOString().slice(0, 10)
        : new Date().toISOString().slice(0, 10),
    });
    setOpen(true);
  };

  const save = async () => {
    if (!companyId) return;
    setSaving(true);
    const payload = {
      type: values.type.trim() || "sale",
      amount: values.amount ? Number(values.amount) : 0,
      currency: values.currency.trim() || "USD",
      status: values.status.trim() || "completed",
      description: values.description.trim() || null,
      transaction_date: values.transaction_date
        ? new Date(values.transaction_date).toISOString()
        : new Date().toISOString(),
    };

    if (editingId) {
      await supabase.from("transactions").update(payload).eq("id", editingId);
    } else {
      await supabase.from("transactions").insert({ ...payload, company_id: companyId });
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
