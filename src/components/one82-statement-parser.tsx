/**
 * One82 Statement Uploader (client).
 *
 * Uploads a PDF/image to the server route `/api/statements` which performs AI extraction
 * and inserts transactions into Supabase.
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, FileText, CheckCircle } from "lucide-react";
import { supabase } from "../lib/supabase/client";

interface StatementResult {
  inserted_transactions: number;
  currency: string;
  total_volume: number;
  total_fees: number | null;
  confidence: number | null;
  message: string;
}

export default function StatementUploader() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "processing" | "complete" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<StatementResult | null>(null);

  const upload = async () => {
    setError(null);
    setResult(null);
    if (!file) return;
    setStatus("processing");

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) {
      setStatus("error");
      setError("You must be signed in.");
      return;
    }

    const fd = new FormData();
    fd.set("file", file);

    const res = await fetch("/api/statements", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: fd,
    });

    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      setStatus("error");
      setError(payload?.error ?? "Statement import failed");
      return;
    }

    setResult(payload as StatementResult);
    setStatus("complete");
  };

  return (
    <div className="max-w-2xl mx-auto p-8 bg-gradient-to-br from-slate-50 to-blue-50 rounded-3xl shadow-2xl border border-blue-100 text-gray-900">
      <div className="text-center mb-10">
        <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl">
          <FileText className="h-12 w-12 text-white" />
        </div>
        <h1 className="text-3xl font-bold mb-2">Statement Import</h1>
        <p className="text-sm text-gray-600">Upload a statement and extract transactions into One82.</p>
      </div>

      <div className="space-y-6">
        <input
          type="file"
          accept=".pdf,.png,.jpg,.jpeg"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="hidden"
          id="statement-file"
          disabled={status === "processing"}
        />

        <label
          htmlFor="statement-file"
          className={`block p-12 border-2 border-dashed rounded-2xl text-center cursor-pointer transition-all ${
            file ? "border-green-400 bg-green-50 shadow-lg" : "border-gray-300 hover:border-blue-400 hover:bg-blue-50 hover:shadow-xl"
          } ${status === "processing" ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          {file ? (
            <div className="space-y-2">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
              <div>
                <p className="font-semibold text-green-700">{file.name}</p>
                <p className="text-sm text-green-600">Ready to import</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <Upload className="h-12 w-12 text-gray-400 mx-auto" />
              <div>
                <p className="text-lg font-semibold text-gray-800">Drop your statement here</p>
                <p className="text-gray-500">PDF or image</p>
              </div>
            </div>
          )}
        </label>

        {file && status !== "processing" && (
          <button
            onClick={upload}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-4 px-6 rounded-2xl font-bold shadow-xl hover:shadow-2xl transition-all duration-200"
          >
            Import Statement
          </button>
        )}
      </div>

      {status === "processing" && (
        <div className="mt-8 p-6 bg-blue-50 border border-blue-200 rounded-2xl text-center">
          <p className="font-semibold text-blue-800">Analyzing statement...</p>
          <p className="text-blue-600 text-sm mt-1">Extracting transactions and totals</p>
        </div>
      )}

      {status === "error" && error && (
        <div className="mt-8 p-6 bg-red-50 border border-red-200 rounded-2xl">
          <p className="font-semibold text-red-900">Import failed</p>
          <p className="text-sm text-red-800 mt-1">{error}</p>
        </div>
      )}

      {result && (
        <div className="mt-8 p-6 bg-white border rounded-2xl">
          <p className="text-sm font-semibold mb-2">Import complete</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div className="rounded-xl border p-3">
              <p className="text-xs text-gray-500">Inserted transactions</p>
              <p className="text-xl font-bold">{result.inserted_transactions}</p>
            </div>
            <div className="rounded-xl border p-3">
              <p className="text-xs text-gray-500">Total volume</p>
              <p className="text-xl font-bold">
                {result.currency} {Number(result.total_volume ?? 0).toFixed(2)}
              </p>
            </div>
          </div>
          <p className="mt-3 text-sm text-gray-700">{result.message}</p>
          <div className="mt-4 flex justify-end">
            <button
              className="rounded-xl border px-4 py-2 text-sm hover:bg-gray-50"
              onClick={() => router.push("/dashboard")}
            >
              Back to dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

