"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../lib/auth/AuthProvider";
import StatementUploader from "../../components/one82-statement-parser";

export default function StatementsPage() {
  const router = useRouter();
  const { loading, user } = useAuth();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  if (loading) return null;

  return (
    <div className="min-h-screen p-6">
      <StatementUploader />
    </div>
  );
}

