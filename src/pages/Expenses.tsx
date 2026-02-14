import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { DataTable, type Column } from "@/components/DataTable";
import { EntityFormSheet, type FormField } from "@/components/EntityFormSheet";
import { Badge } from "@/components/ui/badge";

interface ExpenseRow {
  id: string;
  description: string | null;
  amount: number | null;
  category: string | null;
  expense_date: string | null;
}

const fields: FormField[] = [
  { key: "description", label: "Description", required: true },
  { key: "amount", label: "Amount", type: "number", required: true },
  { key: "category", label: "Category" },
  { key: "expense_date", label: "Date", type: "date" },
];

export default function Expenses() {
  const { userRole } = useAuth();
  const companyId = userRole?.company_id;

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [values, setValues] = useState<Record<string, string>>({
    description: "",
    amount: "",
    category: "operations",
    expense_date: new Date().toISOString().slice(0, 10),
  });

  const { data = [], isLoading, refetch } = useQuery({
    queryKey: ["expenses", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from("expenses")
        .select("id, description, amount, category, expense_date")
        .eq("company_id", companyId)
        .order("expense_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ExpenseRow[];
    },
  });

  const columns: Column<ExpenseRow>[] = useMemo(
    () => [
      { key: "description", label: "Description" },
      {
        key: "category",
        label: "Category",
        render: (r) => (
          <Badge variant="outline" className="capitalize">
            {r.category ?? "uncategorized"}
          </Badge>
        ),
      },
      { key: "amount", label: "Amount", render: (r) => `$${Number(r.amount ?? 0).toFixed(2)}` },
      {
        key: "expense_date",
        label: "Date",
        render: (r) => (r.expense_date ? new Date(r.expense_date).toLocaleDateString() : "—"),
      },
    ],
    []
  );

  const resetForm = () => {
    setEditingId(null);
    setValues({
      description: "",
      amount: "",
      category: "operations",
      expense_date: new Date().toISOString().slice(0, 10),
    });
  };

  const openCreate = () => {
    resetForm();
    setOpen(true);
  };

  const openEdit = (row: ExpenseRow) => {
    setEditingId(row.id);
    setValues({
      description: row.description ?? "",
      amount: row.amount == null ? "" : String(row.amount),
      category: row.category ?? "operations",
      expense_date: row.expense_date ? new Date(row.expense_date).toISOString().slice(0, 10) : "",
    });
    setOpen(true);
  };

  const save = async () => {
    if (!companyId) return;
    setSaving(true);
    const payload = {
      description: values.description.trim() || null,
      amount: values.amount ? Number(values.amount) : 0,
      category: values.category.trim() || "operations",
      expense_date: values.expense_date
        ? new Date(values.expense_date).toISOString()
        : new Date().toISOString(),
    };

    if (editingId) {
      await supabase.from("expenses").update(payload).eq("id", editingId);
    } else {
      await supabase.from("expenses").insert({ ...payload, company_id: companyId });
    }

    setSaving(false);
    setOpen(false);
    resetForm();
    refetch();
  };

  const remove = async () => {
    if (!editingId) return;
    await supabase.from("expenses").delete().eq("id", editingId);
    setOpen(false);
    resetForm();
    refetch();
  };

  return (
    <div className="space-y-3">
      <h1 className="text-sm font-semibold">Expenses</h1>
      <DataTable
        data={data}
        columns={columns}
        loading={isLoading}
        addLabel="Expense"
        onAdd={openCreate}
        onRowClick={openEdit}
      />
      <EntityFormSheet
        open={open}
        onOpenChange={setOpen}
        title={editingId ? "Edit Expense" : "Add Expense"}
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
