import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { DataTable, type Column } from "@/components/DataTable";
import { EntityFormSheet, type FormField } from "@/components/EntityFormSheet";

interface SupplierRow {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  city: string | null;
  country: string | null;
  address: string | null;
}

const fields: FormField[] = [
  { key: "name", label: "Name", required: true },
  { key: "email", label: "Email", type: "email" },
  { key: "phone", label: "Phone" },
  { key: "address", label: "Address" },
  { key: "city", label: "City" },
  { key: "country", label: "Country" },
];

export default function Suppliers() {
  const { userRole } = useAuth();
  const companyId = userRole?.company_id;

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [values, setValues] = useState<Record<string, string>>({
    name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    country: "",
  });

  const { data = [], isLoading, refetch } = useQuery({
    queryKey: ["suppliers", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from("suppliers")
        .select("id, name, email, phone, city, country, address")
        .eq("company_id", companyId)
        .order("name");
      if (error) throw error;
      return (data ?? []) as SupplierRow[];
    },
  });

  const columns: Column<SupplierRow>[] = useMemo(
    () => [
      { key: "name", label: "Name" },
      { key: "email", label: "Email" },
      { key: "phone", label: "Phone" },
      { key: "city", label: "City" },
      { key: "country", label: "Country" },
    ],
    []
  );

  const resetForm = () => {
    setEditingId(null);
    setValues({
      name: "",
      email: "",
      phone: "",
      address: "",
      city: "",
      country: "",
    });
  };

  const openCreate = () => {
    resetForm();
    setOpen(true);
  };

  const openEdit = (row: SupplierRow) => {
    setEditingId(row.id);
    setValues({
      name: row.name ?? "",
      email: row.email ?? "",
      phone: row.phone ?? "",
      address: row.address ?? "",
      city: row.city ?? "",
      country: row.country ?? "",
    });
    setOpen(true);
  };

  const save = async () => {
    if (!companyId) return;
    setSaving(true);
    const payload = {
      name: values.name.trim(),
      email: values.email.trim() || null,
      phone: values.phone.trim() || null,
      address: values.address.trim() || null,
      city: values.city.trim() || null,
      country: values.country.trim() || null,
    };
    if (editingId) {
      await supabase.from("suppliers").update(payload).eq("id", editingId);
    } else {
      await supabase.from("suppliers").insert({ ...payload, company_id: companyId });
    }
    setSaving(false);
    setOpen(false);
    resetForm();
    refetch();
  };

  const remove = async () => {
    if (!editingId) return;
    await supabase.from("suppliers").delete().eq("id", editingId);
    setOpen(false);
    resetForm();
    refetch();
  };

  return (
    <div className="space-y-3">
      <h1 className="text-sm font-semibold">Suppliers</h1>
      <DataTable
        data={data}
        columns={columns}
        loading={isLoading}
        addLabel="Supplier"
        onAdd={openCreate}
        onRowClick={openEdit}
      />
      <EntityFormSheet
        open={open}
        onOpenChange={setOpen}
        title={editingId ? "Edit Supplier" : "Add Supplier"}
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
