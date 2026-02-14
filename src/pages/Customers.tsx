import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { DataTable, type Column } from "@/components/DataTable";
import { EntityFormSheet, type FormField } from "@/components/EntityFormSheet";
import { CustomerDetailSheet } from "@/components/CustomerDetailSheet";
import { Button } from "@/components/ui/button";

interface CustomerRow {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  city: string | null;
  country: string | null;
  loyalty_points: number | null;
  store_credit: number | null;
}

const fields: FormField[] = [
  { key: "name", label: "Name", required: true },
  { key: "email", label: "Email", type: "email" },
  { key: "phone", label: "Phone" },
  { key: "city", label: "City" },
  { key: "country", label: "Country" },
  { key: "loyalty_points", label: "Loyalty Points", type: "number" },
  { key: "store_credit", label: "Store Credit", type: "number" },
];

export default function Customers() {
  const { userRole } = useAuth();
  const companyId = userRole?.company_id;

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerRow | null>(null);
  const [values, setValues] = useState<Record<string, string>>({
    name: "",
    email: "",
    phone: "",
    city: "",
    country: "",
    loyalty_points: "",
    store_credit: "",
  });

  const { data = [], isLoading, refetch } = useQuery({
    queryKey: ["customers", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from("customers")
        .select("id, name, email, phone, city, country, loyalty_points, store_credit")
        .eq("company_id", companyId)
        .order("name");
      if (error) throw error;
      return (data ?? []) as CustomerRow[];
    },
  });

  const columns: Column<CustomerRow>[] = useMemo(
    () => [
      { key: "name", label: "Name" },
      { key: "email", label: "Email" },
      { key: "phone", label: "Phone" },
      { key: "city", label: "City" },
      {
        key: "store_credit",
        label: "Credit",
        render: (r) => `$${Number(r.store_credit ?? 0).toFixed(2)}`,
      },
      {
        key: "details",
        label: "Details",
        render: (r) => (
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedCustomer(r);
              setDetailOpen(true);
            }}
          >
            View
          </Button>
        ),
      },
    ],
    []
  );

  const resetForm = () => {
    setEditingId(null);
    setValues({
      name: "",
      email: "",
      phone: "",
      city: "",
      country: "",
      loyalty_points: "",
      store_credit: "",
    });
  };

  const openCreate = () => {
    resetForm();
    setOpen(true);
  };

  const openEdit = (row: CustomerRow) => {
    setEditingId(row.id);
    setValues({
      name: row.name ?? "",
      email: row.email ?? "",
      phone: row.phone ?? "",
      city: row.city ?? "",
      country: row.country ?? "",
      loyalty_points: row.loyalty_points == null ? "" : String(row.loyalty_points),
      store_credit: row.store_credit == null ? "" : String(row.store_credit),
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
      city: values.city.trim() || null,
      country: values.country.trim() || null,
      loyalty_points: values.loyalty_points ? Number(values.loyalty_points) : 0,
      store_credit: values.store_credit ? Number(values.store_credit) : 0,
    };

    if (editingId) {
      await supabase.from("customers").update(payload).eq("id", editingId);
    } else {
      await supabase.from("customers").insert({ ...payload, company_id: companyId });
    }
    setSaving(false);
    setOpen(false);
    resetForm();
    refetch();
  };

  const remove = async () => {
    if (!editingId) return;
    await supabase.from("customers").delete().eq("id", editingId);
    setOpen(false);
    resetForm();
    refetch();
  };

  return (
    <div className="space-y-3">
      <h1 className="text-sm font-semibold">Customers</h1>
      <DataTable
        data={data}
        columns={columns}
        loading={isLoading}
        addLabel="Customer"
        onAdd={openCreate}
        onRowClick={openEdit}
      />
      <EntityFormSheet
        open={open}
        onOpenChange={setOpen}
        title={editingId ? "Edit Customer" : "Add Customer"}
        fields={fields}
        values={values}
        onChange={(key, value) => setValues((prev) => ({ ...prev, [key]: value }))}
        onSubmit={save}
        loading={saving}
        onDelete={editingId ? remove : undefined}
      />
      <CustomerDetailSheet
        open={detailOpen}
        onOpenChange={setDetailOpen}
        customer={selectedCustomer}
        companyId={companyId ?? ""}
      />
    </div>
  );
}
