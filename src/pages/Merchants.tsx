import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { DataTable, type Column } from "@/components/DataTable";
import { EntityFormSheet, type FormField } from "@/components/EntityFormSheet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

  const { data: scoreRows = [] } = useQuery({
    queryKey: ["merchant-score-trends", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from("merchant_scores")
        .select("merchant_id,score_value,as_of,score_type")
        .eq("company_id", companyId)
        .eq("score_type", "approval_health")
        .order("as_of", { ascending: false })
        .limit(5000);
      if (error) return [];
      return data ?? [];
    },
  });

  const columns: Column<MerchantProfile>[] = useMemo(() => [
    { key: "legal_name", label: "Legal Name" },
    { key: "dba_name", label: "DBA Name" },
    { key: "vertical", label: "Vertical" },
    { key: "risk_tier", label: "Risk Tier" },
    { key: "status", label: "Status" },
  ], []);

  const trendRows = useMemo(() => {
    const nameById = new Map(data.map((merchant) => [merchant.id, merchant.legal_name]));
    const byMerchant = new Map<string, Array<{ score_value: number; as_of: string }>>();
    for (const row of scoreRows as any[]) {
      const key = String(row.merchant_id);
      const prev = byMerchant.get(key) ?? [];
      prev.push({ score_value: Number(row.score_value ?? 0), as_of: String(row.as_of) });
      byMerchant.set(key, prev);
    }

    return Array.from(byMerchant.entries()).map(([merchantId, points], idx) => {
      const ordered = [...points].sort((a, b) => new Date(b.as_of).getTime() - new Date(a.as_of).getTime());
      const latest = ordered[0]?.score_value ?? 0;
      const prev = ordered[1]?.score_value ?? latest;
      const monthRef = ordered.find((x) => new Date(x.as_of).getTime() <= Date.now() - 28 * 24 * 60 * 60 * 1000)?.score_value ?? prev;
      return {
        id: `${merchantId}-${idx}`,
        merchant: nameById.get(merchantId) ?? merchantId.slice(0, 8),
        latest,
        wow_delta: latest - prev,
        mom_delta: latest - monthRef,
      };
    }).sort((a, b) => b.latest - a.latest).slice(0, 50);
  }, [data, scoreRows]);

  const trendColumns: Column<(typeof trendRows)[number]>[] = [
    { key: "merchant", label: "Merchant" },
    { key: "latest", label: "Latest Score", render: (r) => r.latest.toFixed(2) },
    { key: "wow_delta", label: "WoW Delta", render: (r) => r.wow_delta.toFixed(2) },
    { key: "mom_delta", label: "MoM Delta", render: (r) => r.mom_delta.toFixed(2) },
  ];

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
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Merchant Scorecard Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable data={trendRows} columns={trendColumns} />
        </CardContent>
      </Card>
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
