/**
 * One82 Statement Parser (UI-only placeholder).
 *
 * This component intentionally does not call OpenAI directly from the browser.
 * Next step: wire this to a Next.js route handler or Supabase Edge Function that
 * performs OCR/Vision + extraction using server-side secrets.
 */

"use client";

import { useState } from "react";
import { Upload, FileText, CheckCircle } from "lucide-react";

interface StatementResult {
  transactions: number;
  volume: string;
  fees: string;
  feeRate: string;
  aiSummary: string;
  confidence: number;
}

export function StatementUploader() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "processing" | "complete">("idle");
  const [results, setResults] = useState<StatementResult | null>(null);

  const analyzeStatement = async (f: File): Promise<StatementResult> => {
    const kb = Math.round((f.size / 1024) * 10) / 10;
    return {
      transactions: 0,
      volume: "0.00",
      fees: "0.00",
      feeRate: "0.00",
      aiSummary: `Statement received (${kb} KB). Connect the statement analyzer backend to extract transactions.`,
      confidence: 0.3,
    };
  };

  const handleUpload = async () => {
    if (!file) return;
    setStatus("processing");
    try {
      const r = await analyzeStatement(file);
      setResults(r);
      setStatus("complete");
    } catch (error) {
      console.error("Statement analysis failed:", error);
      setStatus("idle");
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-8 bg-gradient-to-br from-slate-50 to-blue-50 rounded-3xl shadow-2xl border border-blue-100 text-gray-900">
      <div className="text-center mb-10">
        <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl">
          <FileText className="h-12 w-12 text-white" />
        </div>
        <h1 className="text-3xl font-bold mb-2">Statement Analyzer</h1>
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
                <p className="text-sm text-green-600">Ready to analyze</p>
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
            onClick={handleUpload}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-4 px-6 rounded-2xl font-bold shadow-xl hover:shadow-2xl transition-all duration-200"
          >
            Analyze Statement
          </button>
        )}
      </div>

      {status === "processing" && (
        <div className="mt-8 p-6 bg-blue-50 border border-blue-200 rounded-2xl text-center">
          <p className="font-semibold text-blue-800">Analyzing...</p>
          <p className="text-blue-600 text-sm mt-1">Preparing results</p>
        </div>
      )}

      {results && (
        <div className="mt-8 p-6 bg-white border rounded-2xl">
          <p className="text-sm font-semibold mb-2">Result</p>
          <p className="text-sm text-gray-700">{results.aiSummary}</p>
        </div>
      )}
    </div>
  );
}

export default StatementUploader;

