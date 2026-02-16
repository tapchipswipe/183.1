"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../lib/auth/AuthProvider";
import { supabase } from "../../../lib/supabase/client";

const STORE_TYPES = [
  { value: "convenience", label: "Convenience Store" },
  { value: "retail", label: "Retail" },
  { value: "service", label: "Service Business" },
  { value: "restaurant", label: "Restaurant" },
  { value: "ecommerce", label: "E-Commerce" },
  { value: "other", label: "Other" },
] as const;

export default function OnboardingPage() {
  const router = useRouter();
  const { user, merchant, refreshMerchant, loading } = useAuth();
  const [businessName, setBusinessName] = useState("");
  const [storeType, setStoreType] = useState<(typeof STORE_TYPES)[number]["value"]>("retail");
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (merchant) {
      setBusinessName(merchant.business_name ?? "");
      setStoreType((merchant.store_type as any) ?? "retail");
    }
  }, [merchant]);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    setStatus(null);
    try {
      const payload = {
        owner_user_id: user.id,
        business_name: businessName.trim() || "My Business",
        store_type: storeType,
      };
      const { error } = await supabase.from("merchants").upsert(payload, { onConflict: "owner_user_id" });
      if (error) throw error;
      await refreshMerchant();
      router.push("/dashboard");
    } catch (err: any) {
      setStatus(err?.message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-xl rounded-2xl border border-white/10 bg-white/5 p-6">
        <h1 className="text-xl font-semibold">Onboarding</h1>
        <p className="mt-2 text-sm text-white/70">Set up your business workspace for tailored insights.</p>

        <div className="mt-4">
          <label className="block text-xs text-white/70">Business name</label>
          <input
            className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm outline-none focus:border-white/30"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            placeholder="Downtown Coffee"
          />
        </div>

        <div className="mt-4">
          <label className="block text-xs text-white/70">Business type</label>
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {STORE_TYPES.map((t) => (
              <button
                key={t.value}
                onClick={() => setStoreType(t.value)}
                className={`rounded-xl border px-4 py-3 text-left transition-colors ${
                  storeType === t.value ? "border-white/30 bg-white/10" : "border-white/10 hover:bg-white/10"
                }`}
                type="button"
              >
                <div className="font-medium">{t.label}</div>
                <div className="text-xs text-white/60">{t.value}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            className="rounded-xl border border-white/10 px-4 py-2 text-sm hover:bg-white/10"
            onClick={() => router.push("/dashboard")}
            type="button"
          >
            Skip
          </button>
          <button
            className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-black hover:bg-emerald-400 disabled:opacity-50"
            onClick={save}
            disabled={saving}
            type="button"
          >
            {saving ? "Saving..." : "Continue"}
          </button>
        </div>

        {status && <p className="mt-3 text-xs text-red-300">{status}</p>}
      </div>
    </div>
  );
}

