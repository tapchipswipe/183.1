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
  category: string | null;
  price: number | null;
  quantity: number | null;
  description: string | null;
}

const fields: FormField[] = [
  { key: "name", label: "Name", required: true },
  { key: "sku", label: "SKU" },
  { key: "category", label: "Category" },
  { key: "price", label: "Price", type: "number" },
  { key: "quantity", label: "Quantity", type: "number" },
  { key: "description", label: "Description" },
];

export default function Products() {
  const { userRole } = useAuth();
  const companyId = userRole?.company_id;

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [values, setValues] = useState<Record<string, string>>({
    name: "",
    sku: "",
    category: "",
    price: "",
    quantity: "",
    description: "",
  });

  const { data = [], isLoading, refetch } = useQuery({
    queryKey: ["products", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from("products")
        .select("id, name, sku, category, price, quantity, description")
        .eq("company_id", companyId)
        .order("name");
      if (error) throw error;
      return (data ?? []) as ProductRow[];
    },
  });

  const columns: Column<ProductRow>[] = useMemo(
    () => [
      { key: "name", label: "Name" },
      { key: "sku", label: "SKU" },
      { key: "category", label: "Category" },
      { key: "price", label: "Price", render: (r) => `$${Number(r.price ?? 0).toFixed(2)}` },
      { key: "quantity", label: "Stock" },
    ],
    []
  );

  const resetForm = () => {
    setEditingId(null);
    setValues({
      name: "",
      sku: "",
      category: "",
      price: "",
      quantity: "",
      description: "",
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
      category: row.category ?? "",
      price: row.price == null ? "" : String(row.price),
      quantity: row.quantity == null ? "" : String(row.quantity),
      description: row.description ?? "",
    });
    setOpen(true);
  };

  const save = async () => {
    if (!companyId) return;
    setSaving(true);
    const payload = {
      name: values.name.trim(),
      sku: values.sku.trim() || null,
      category: values.category.trim() || null,
      description: values.description.trim() || null,
      price: values.price ? Number(values.price) : 0,
      quantity: values.quantity ? Number(values.quantity) : 0,
    };

    if (editingId) {
      await supabase.from("products").update(payload).eq("id", editingId);
    } else {
      await supabase.from("products").insert({ ...payload, company_id: companyId });
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
