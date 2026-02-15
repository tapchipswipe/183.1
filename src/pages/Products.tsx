import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { DataTable, type Column } from "@/components/DataTable";
import { EntityFormSheet, type FormField } from "@/components/EntityFormSheet";

interface ProductRow {
  id: string;
  name: string;
  sku: string | null;
  price: number | null;
  unit_cost: number | null;
  current_quantity: number | null;
  active: boolean;
}

const fields: FormField[] = [
  { key: "name", label: "Name", required: true },
  { key: "sku", label: "SKU" },
  { key: "price", label: "Unit Price", type: "number" },
  { key: "unit_cost", label: "Unit Cost", type: "number" },
  { key: "current_quantity", label: "On Hand", type: "number" },
  { key: "active", label: "Active (true/false)" },
];

export default function Products() {
  const { merchant } = useAuth();
  const merchantId = merchant?.id;

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [values, setValues] = useState<Record<string, string>>({
    name: "",
    sku: "",
    price: "",
    unit_cost: "",
    current_quantity: "",
    active: "true",
  });

  const { data = [], isLoading, refetch } = useQuery({
    queryKey: ["products", merchantId],
    enabled: !!merchantId,
    queryFn: async () => {
      if (!merchantId) return [];
      const { data, error } = await supabase
        .from("products")
        .select("id, name, sku, price, unit_cost, current_quantity, active")
        .eq("merchant_id", merchantId)
        .order("name");
      if (error) throw error;
      return (data ?? []) as ProductRow[];
    },
  });

  const columns: Column<ProductRow>[] = useMemo(
    () => [
      { key: "name", label: "Name" },
      { key: "sku", label: "SKU" },
      { key: "price", label: "Unit Price", render: (r) => `$${Number(r.price ?? 0).toFixed(2)}` },
      { key: "unit_cost", label: "Unit Cost", render: (r) => (r.unit_cost == null ? "—" : `$${Number(r.unit_cost).toFixed(2)}`) },
      { key: "current_quantity", label: "On Hand", render: (r) => String(r.current_quantity ?? 0) },
      { key: "active", label: "Active", render: (r) => (r.active ? "Yes" : "No") },
    ],
    []
  );

  const resetForm = () => {
    setEditingId(null);
    setValues({
      name: "",
      sku: "",
      price: "",
      unit_cost: "",
      current_quantity: "",
      active: "true",
    });
  };

  const openCreate = () => {
    resetForm();
    setOpen(true);
  };

  const openEdit = (row: ProductRow) => {
    setEditingId(row.id);
    setValues({
      name: row.name ?? "",
      sku: row.sku ?? "",
      price: row.price == null ? "" : String(row.price),
      unit_cost: row.unit_cost == null ? "" : String(row.unit_cost),
      current_quantity: row.current_quantity == null ? "" : String(row.current_quantity),
      active: row.active ? "true" : "false",
    });
    setOpen(true);
  };

  const save = async () => {
    if (!merchantId) return;
    setSaving(true);
    const payload = {
      name: values.name.trim(),
      sku: values.sku.trim() || null,
      price: values.price ? Number(values.price) : 0,
      unit_cost: values.unit_cost ? Number(values.unit_cost) : null,
      current_quantity: values.current_quantity ? Number(values.current_quantity) : 0,
      active: (values.active ?? "true").trim().toLowerCase() !== "false",
    };

    if (editingId) {
      await supabase.from("products").update(payload).eq("id", editingId);
    } else {
      await supabase.from("products").insert({ ...payload, merchant_id: merchantId });
    }
    setSaving(false);
    setOpen(false);
    resetForm();
    refetch();
  };

  const remove = async () => {
    if (!editingId) return;
    await supabase.from("products").delete().eq("id", editingId);
    setOpen(false);
    resetForm();
    refetch();
  };

  return (
    <div className="space-y-3">
      <h1 className="text-sm font-semibold">Products</h1>
      <DataTable
        data={data}
        columns={columns}
        loading={isLoading}
        addLabel="Product"
        onAdd={openCreate}
        onRowClick={openEdit}
      />
      <EntityFormSheet
        open={open}
        onOpenChange={setOpen}
        title={editingId ? "Edit Product" : "Add Product"}
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
