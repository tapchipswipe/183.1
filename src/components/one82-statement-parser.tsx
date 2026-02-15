/**
 * One82 Statement Parser (UI-only placeholder).
 *
 * This component is intentionally dependency-free: it does not import server SDKs
 * and does not attempt to call OpenAI directly from the browser.
 *
 * Next step (when desired): wire `analyzeStatement()` to a Supabase Edge Function
 * that performs OCR/Vision + extraction securely with server-side secrets.
 */

import { useState } from "react";
import { Upload, FileText, CheckCircle } from "lucide-react";

// ===== TYPES =====
interface StatementResult {
  transactions: number;
  volume: string;
  fees: string;
  feeRate: string;
  aiSummary: string;
  confidence: number;
}

// ===== MAIN COMPONENT =====
export function StatementUploader() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "processing" | "complete">("idle");
  const [results, setResults] = useState<StatementResult | null>(null);

  const analyzeStatement = async (f: File): Promise<StatementResult> => {
    // Placeholder extraction: we do not parse the statement client-side.
    // Return deterministic mock output so the UI is usable while backend work lands.
    const kb = Math.round((f.size / 1024) * 10) / 10;
    return {
      transactions: 0,
      volume: "0.00",
      fees: "0.00",
      feeRate: "0.00",
      aiSummary: `Statement received (${kb} KB). Connect the statement analyzer Edge Function to extract transactions.`,
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
    <div className="max-w-2xl mx-auto p-8 bg-gradient-to-br from-slate-50 to-blue-50 rounded-3xl shadow-2xl border border-blue-100">
      {/* Header */}
      <div className="text-center mb-10">
        <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl">
          <FileText className="h-12 w-12 text-white" />
        </div>
        <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-3">
          Merchant Statement Analyzer
        </h1>
        <p className="text-xl text-gray-600 max-w-md mx-auto">
          AI automatically extracts transactions and generates insights
        </p>
      </div>

      {/* Upload Area */}
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
          className={`block p-12 border-3 border-dashed rounded-2xl text-center cursor-pointer transition-all ${
            file 
              ? 'border-green-400 bg-green-50 shadow-lg' 
              : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50 hover:shadow-xl'
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
                <p className="text-xl font-semibold text-gray-800">Drop your statement here</p>
                <p className="text-gray-500">PDF or image • Works with all processors</p>
              </div>
            </div>
          )}
        </label>

        {/* Analyze Button */}
        {file && status !== "processing" && (
          <button
            onClick={handleUpload}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-5 px-8 rounded-2xl font-bold text-lg shadow-xl hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-200"
          >
            Analyze Statement
          </button>
        )}
      </div>

      {/* Results */}
      {status === "processing" && (
        <div className="mt-8 p-8 bg-blue-50 border-2 border-blue-200 rounded-2xl text-center">
          <p className="text-xl font-semibold text-blue-800">AI is analyzing your statement...</p>
          <p className="text-blue-600 mt-2">Preparing results</p>
        </div>
      )}

      {results && (
        <div className="mt-8 p-8 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-3xl shadow-2xl">
          <div className="flex items-start gap-4 mb-6">
            <CheckCircle className="h-12 w-12 text-green-500 mt-1 flex-shrink-0" />
            <div>
              <h3 className="text-2xl font-bold text-green-900 mb-2">Analysis Complete!</h3>
              <p className="text-green-800 text-lg">{results.aiSummary}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white p-4 rounded-xl shadow-sm text-center">
              <p className="text-sm text-gray-600">Transactions</p>
              <p className="text-2xl font-bold text-gray-900">{results.transactions.toLocaleString()}</p>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm text-center">
              <p className="text-sm text-gray-600">Volume</p>
              <p className="text-2xl font-bold text-blue-600">${results.volume}</p>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm text-center">
              <p className="text-sm text-gray-600">Fees</p>
              <p className="text-2xl font-bold text-red-600">${results.fees}</p>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm text-center">
              <p className="text-sm text-gray-600">Fee Rate</p>
              <p className="text-2xl font-bold text-orange-600">{results.feeRate}%</p>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-2xl shadow-lg border-l-4 border-green-500">
            <p className="font-semibold text-sm text-green-900 uppercase tracking-wide mb-2">
              Confidence: {(results.confidence * 100).toFixed(0)}%
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export default StatementUploader
