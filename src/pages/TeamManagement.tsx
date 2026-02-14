import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { DataTable, type Column } from "@/components/DataTable";
import { EntityFormSheet, type FormField } from "@/components/EntityFormSheet";
import { Badge } from "@/components/ui/badge";

interface RoleRow {
  id: string;
  user_id: string;
  role: "admin" | "manager" | "viewer";
  company_id: string;
}

interface ProfileRow {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
}

interface MemberRow {
  id: string;
  user_id: string;
  role: string;
  name: string;
  email: string;
}

const fields: FormField[] = [
  { key: "email", label: "Email", type: "email", required: true },
  { key: "role", label: "Role", required: true },
];

export default function TeamManagement() {
  const { userRole } = useAuth();
  const companyId = userRole?.company_id;
  const canManage = userRole?.role === "admin";

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<MemberRow | null>(null);
  const [values, setValues] = useState<Record<string, string>>({ email: "", role: "viewer" });

  const { data = [], isLoading, refetch } = useQuery({
    queryKey: ["team-members", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      if (!companyId) return [] as MemberRow[];

      const [rolesRes, profilesRes] = await Promise.all([
        supabase.from("user_roles").select("id, user_id, role, company_id").eq("company_id", companyId),
        supabase.from("profiles").select("id, user_id, full_name, email").eq("company_id", companyId),
      ]);

      const roles = (rolesRes.data ?? []) as RoleRow[];
      const profiles = (profilesRes.data ?? []) as ProfileRow[];
      const profileByUser = new Map<string, ProfileRow>();
      profiles.forEach((p) => profileByUser.set(p.user_id, p));

      return roles.map((r) => {
        const p = profileByUser.get(r.user_id);
        return {
          id: r.id,
          user_id: r.user_id,
          role: r.role,
          name: p?.full_name || "Unknown",
          email: p?.email || "",
        };
      });
    },
  });

  const columns: Column<MemberRow>[] = useMemo(
    () => [
      { key: "name", label: "Name" },
      { key: "email", label: "Email" },
      {
        key: "role",
        label: "Role",
        render: (r) => (
          <Badge variant="outline" className="capitalize">
            {r.role}
          </Badge>
        ),
      },
    ],
    []
  );

  const invite = async () => {
    if (!companyId || !canManage) return;
    setSaving(true);
    await supabase.from("team_invitations").insert({
      company_id: companyId,
      email: values.email.trim(),
      role: values.role as "admin" | "manager" | "viewer",
      status: "pending",
    });
    setSaving(false);
    setOpen(false);
    setValues({ email: "", role: "viewer" });
  };

  const removeMember = async () => {
    if (!selected || !canManage) return;
    await supabase.from("user_roles").delete().eq("id", selected.id);
    setOpen(false);
    setSelected(null);
    refetch();
  };

  return (
    <div className="space-y-3">
      <h1 className="text-sm font-semibold">Team Management</h1>
      <DataTable
        data={data}
        columns={columns}
        loading={isLoading}
        addLabel="Invite"
        onAdd={canManage ? () => setOpen(true) : undefined}
        onRowClick={(row) => {
          if (!canManage) return;
          setSelected(row);
          setValues({ email: row.email, role: row.role });
          setOpen(true);
        }}
      />
      <EntityFormSheet
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setSelected(null);
        }}
        title={selected ? "Member Role" : "Invite Team Member"}
        fields={fields}
        values={values}
        onChange={(k, v) => setValues((prev) => ({ ...prev, [k]: v }))}
        onSubmit={selected ? async () => {
          await supabase
            .from("user_roles")
            .update({ role: values.role as "admin" | "manager" | "viewer" })
            .eq("id", selected.id);
          setOpen(false);
          setSelected(null);
          refetch();
        } : invite}
        loading={saving}
        onDelete={selected ? removeMember : undefined}
      />
    </div>
  );
}
