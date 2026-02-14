import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { DataTable, type Column } from "@/components/DataTable";
import { EntityFormSheet, type FormField } from "@/components/EntityFormSheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface PurchaseOrderRow {
  id: string;
  supplier_id: string | null;
  status: string | null;
  total_amount: number | null;
  notes: string | null;
  order_date: string | null;
  received_date: string | null;
}

interface Supplier {
  id: string;
  name: string;
}

const fields: FormField[] = [
  { key: "supplier_id", label: "Supplier ID", required: true },
  { key: "status", label: "Status" },
  { key: "total_amount", label: "Total Amount", type: "number" },
  { key: "notes", label: "Notes" },
  { key: "order_date", label: "Order Date", type: "date" },
  { key: "received_date", label: "Received Date", type: "date" },
];

export default function PurchaseOrders() {
  const { userRole } = useAuth();
  const companyId = userRole?.company_id;

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [values, setValues] = useState<Record<string, string>>({
    supplier_id: "",
    status: "draft",
    total_amount: "",
    notes: "",
    order_date: new Date().toISOString().slice(0, 10),
    received_date: "",
  });

  const { data = [], isLoading, refetch } = useQuery({
    queryKey: ["purchase-orders", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from("purchase_orders")
        .select("id, supplier_id, status, total_amount, notes, order_date, received_date")
        .eq("company_id", companyId)
        .order("order_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as PurchaseOrderRow[];
    },
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ["purchase-order-suppliers", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from("suppliers")
        .select("id, name")
        .eq("company_id", companyId)
        .order("name");
      if (error) throw error;
      return (data ?? []) as Supplier[];
    },
  });

  const supplierNameById = useMemo(() => {
    const map = new Map<string, string>();
    suppliers.forEach((s) => map.set(s.id, s.name));
    return map;
  }, [suppliers]);

  const markReceived = async (row: PurchaseOrderRow) => {
    if (!row.id || row.status === "received") return;

    await supabase
      .from("purchase_orders")
      .update({ status: "received", received_date: new Date().toISOString() })
      .eq("id", row.id);

    const { data: items } = await supabase
      .from("purchase_order_items")
      .select("product_id, quantity")
      .eq("purchase_order_id", row.id)
      .eq("company_id", companyId ?? "");

    if (items?.length) {
      await Promise.all(
        items.map(async (item: { product_id: string; quantity: number }) => {
          const { data: product } = await supabase
            .from("products")
            .select("quantity")
            .eq("id", item.product_id)
            .single();

          const nextQty = Number(product?.quantity ?? 0) + Number(item.quantity ?? 0);
          await supabase.from("products").update({ quantity: nextQty }).eq("id", item.product_id);
        })
      );
    }

    refetch();
  };

  const columns: Column<PurchaseOrderRow>[] = useMemo(
    () => [
      {
        key: "supplier_id",
        label: "Supplier",
        render: (r) => supplierNameById.get(r.supplier_id ?? "") ?? r.supplier_id ?? "—",
      },
      {
        key: "status",
        label: "Status",
        render: (r) => (
          <Badge variant="outline" className="capitalize">
            {r.status ?? "draft"}
          </Badge>
        ),
      },
      { key: "total_amount", label: "Total", render: (r) => `$${Number(r.total_amount ?? 0).toFixed(2)}` },
      {
        key: "order_date",
        label: "Ordered",
        render: (r) => (r.order_date ? new Date(r.order_date).toLocaleDateString() : "—"),
      },
      {
        key: "received_date",
        label: "Received",
        render: (r) => (r.received_date ? new Date(r.received_date).toLocaleDateString() : "—"),
      },
      {
        key: "actions",
        label: "Actions",
        render: (r) =>
          r.status === "received" ? (
            <span className="text-xs text-muted-foreground">Done</span>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                markReceived(r);
              }}
            >
              Mark Received
            </Button>
          ),
      },
    ],
    [supplierNameById]
  );

  const resetForm = () => {
    setEditingId(null);
    setValues({
      supplier_id: "",
      status: "draft",
      total_amount: "",
      notes: "",
      order_date: new Date().toISOString().slice(0, 10),
      received_date: "",
    });
  };

  const openCreate = () => {
    resetForm();
    setOpen(true);
  };

  const openEdit = (row: PurchaseOrderRow) => {
    setEditingId(row.id);
    setValues({
      supplier_id: row.supplier_id ?? "",
      status: row.status ?? "draft",
      total_amount: row.total_amount == null ? "" : String(row.total_amount),
      notes: row.notes ?? "",
      order_date: row.order_date ? new Date(row.order_date).toISOString().slice(0, 10) : "",
      received_date: row.received_date ? new Date(row.received_date).toISOString().slice(0, 10) : "",
    });
    setOpen(true);
  };

  const save = async () => {
    if (!companyId) return;
    setSaving(true);
    const payload = {
      supplier_id: values.supplier_id.trim() || null,
      status: values.status.trim() || "draft",
      total_amount: values.total_amount ? Number(values.total_amount) : 0,
      notes: values.notes.trim() || null,
      order_date: values.order_date ? new Date(values.order_date).toISOString() : new Date().toISOString(),
      received_date: values.received_date ? new Date(values.received_date).toISOString() : null,
    };

    if (editingId) {
      await supabase.from("purchase_orders").update(payload).eq("id", editingId);
    } else {
      await supabase.from("purchase_orders").insert({ ...payload, company_id: companyId });
    }

    setSaving(false);
    setOpen(false);
    resetForm();
    refetch();
  };

  const remove = async () => {
    if (!editingId) return;
    await supabase.from("purchase_orders").delete().eq("id", editingId);
    setOpen(false);
    resetForm();
    refetch();
  };

  return (
    <div className="space-y-3">
      <h1 className="text-sm font-semibold">Purchase Orders</h1>
      <DataTable
        data={data}
        columns={columns}
        loading={isLoading}
        addLabel="Order"
        onAdd={openCreate}
        onRowClick={openEdit}
      />
      <EntityFormSheet
        open={open}
        onOpenChange={setOpen}
        title={editingId ? "Edit Purchase Order" : "Add Purchase Order"}
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
