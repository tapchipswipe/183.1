"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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
  const [storeType, setStoreType] = useState<(typeof STORE_TYPES)[number]["value"]>("retail");

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-white/5 p-6">
        <h1 className="text-xl font-semibold">Onboarding</h1>
        <p className="mt-2 text-sm text-white/70">
          Select your business type to tailor AI insights.
        </p>

        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {STORE_TYPES.map((t) => (
            <button
              key={t.value}
              onClick={() => setStoreType(t.value)}
              className={`rounded-xl border px-4 py-3 text-left transition-colors ${
                storeType === t.value ? "border-white/30 bg-white/10" : "border-white/10 hover:bg-white/10"
              }`}
            >
              <div className="font-medium">{t.label}</div>
              <div className="text-xs text-white/60">{t.value}</div>
            </button>
          ))}
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            className="rounded-xl border border-white/10 px-4 py-2 text-sm hover:bg-white/10"
            onClick={() => router.push("/dashboard")}
          >
            Skip
          </button>
          <button
            className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-black hover:bg-emerald-400"
            onClick={() => {
              localStorage.setItem("one82_store_type", storeType);
              router.push("/dashboard");
            }}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}

