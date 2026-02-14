import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { DataTable, type Column } from "@/components/DataTable";
import { EntityFormSheet, type FormField } from "@/components/EntityFormSheet";
import type { MerchantProfile } from "@/lib/processor-types";

const fields: FormField[] = [
  { key: "legal_name", label: "Legal Name", required: true },
  { key: "dba_name", label: "DBA Name" },
  { key: "external_merchant_id", label: "External Merchant ID" },
  { key: "vertical", label: "Vertical" },
  { key: "country", label: "Country" },
  { key: "risk_tier", label: "Risk Tier" },
  { key: "status", label: "Status" },
];

export default function Merchants() {
  const { userRole } = useAuth();
  const companyId = userRole?.company_id;
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [values, setValues] = useState<Record<string, string>>({
    legal_name: "",
    dba_name: "",
    external_merchant_id: "",
    vertical: "",
    country: "",
    risk_tier: "medium",
    status: "active",
  });

  const { data = [], isLoading, refetch } = useQuery({
    queryKey: ["merchant_profiles", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase.from("merchant_profiles").select("*").eq("company_id", companyId).order("created_at", { ascending: false });
      if (error) return [];
      return (data ?? []) as MerchantProfile[];
    },
  });

  const columns: Column<MerchantProfile>[] = useMemo(() => [
    { key: "legal_name", label: "Legal Name" },
    { key: "dba_name", label: "DBA Name" },
    { key: "vertical", label: "Vertical" },
    { key: "risk_tier", label: "Risk Tier" },
    { key: "status", label: "Status" },
  ], []);

  const reset = () => {
    setEditingId(null);
    setValues({
      legal_name: "",
      dba_name: "",
      external_merchant_id: "",
      vertical: "",
      country: "",
      risk_tier: "medium",
      status: "active",
    });
  };

  const openEdit = (row: MerchantProfile) => {
    setEditingId(row.id);
    setValues({
      legal_name: row.legal_name || "",
      dba_name: row.dba_name || "",
      external_merchant_id: row.external_merchant_id || "",
      vertical: row.vertical || "",
      country: row.country || "",
      risk_tier: row.risk_tier || "medium",
      status: row.status || "active",
    });
    setOpen(true);
  };

  const save = async () => {
    if (!companyId) return;
    const payload = {
      legal_name: values.legal_name.trim(),
      dba_name: values.dba_name.trim() || null,
      external_merchant_id: values.external_merchant_id.trim() || null,
      vertical: values.vertical.trim() || null,
      country: values.country.trim() || null,
      risk_tier: values.risk_tier.trim() || null,
      status: values.status.trim() || "active",
    };
    if (editingId) {
      await supabase.from("merchant_profiles").update(payload).eq("id", editingId);
    } else {
      await supabase.from("merchant_profiles").insert({ ...payload, company_id: companyId });
    }
    setOpen(false);
    reset();
    refetch();
  };

  const remove = async () => {
    if (!editingId) return;
    await supabase.from("merchant_profiles").delete().eq("id", editingId);
    setOpen(false);
    reset();
    refetch();
  };

  return (
    <div className="space-y-3">
      <h1 className="text-sm font-semibold">Merchants</h1>
      <DataTable data={data} columns={columns} loading={isLoading} addLabel="Merchant" onAdd={() => { reset(); setOpen(true); }} onRowClick={openEdit} />
      <EntityFormSheet
        open={open}
        onOpenChange={setOpen}
        title={editingId ? "Edit Merchant" : "Add Merchant"}
        fields={fields}
        values={values}
        onChange={(k, v) => setValues((p) => ({ ...p, [k]: v }))}
        onSubmit={save}
        onDelete={editingId ? remove : undefined}
      />
    </div>
  );
}
