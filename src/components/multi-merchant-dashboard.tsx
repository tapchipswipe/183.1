// components/multi-merchant-dashboard.tsx - COMPLETE MULTI-MERCHANT + THEME SYSTEM
import { useState, useEffect } from "react";
import { 
  Users, DollarSign, CreditCard, Settings, Sun, Moon, Monitor,
  Plus,
} from "lucide-react";

// ===== MERCHANT TYPE =====
interface Merchant {
  id: string;
  name: string;
  businessType: "retail" | "restaurant" | "convenience";
  revenue: number;
  transactions: number;
  aiInsight: string;
}

// ===== THEME PROVIDER =====
const themes = ['light', 'dark', 'system'] as const
type Theme = typeof themes[number]

// MetricCard component
function MetricCard({
  title, value, change, aiInsight
}: { title: string, value: number, change?: number, aiInsight?: string }) {
  return (
    <div className="bg-white dark:bg-white/10 p-6 rounded-xl border dark:border-white/20 shadow-sm hover:shadow-md transition-all backdrop-blur-sm">
      <div className="flex justify-between mb-2">
        <h3 className="font-semibold">{title}</h3>
        {change && <span className="text-green-600 font-medium">+{change}%</span>}
      </div>
      <div className="text-3xl font-bold text-green-600 mb-3">${value.toLocaleString()}</div>
      {aiInsight && <p className="text-sm opacity-80">{aiInsight}</p>}
    </div>
  )
}

export function MultiMerchantDashboard() {
  const [merchants] = useState<Merchant[]>([
    { id: "1", name: "Downtown Coffee", businessType: "restaurant", revenue: 8473, transactions: 234, aiInsight: "Morning rush up 28%" },
    { id: "2", name: "Main St Retail", businessType: "retail", revenue: 12456, transactions: 389, aiInsight: "Seasonal sales boost" },
    { id: "3", name: "Quick Mart", businessType: "convenience", revenue: 6234, transactions: 156, aiInsight: "Energy drinks trending" },
  ]);
  
  const [selectedMerchant, setSelectedMerchant] = useState(merchants[0]);
  const [theme, setTheme] = useState<Theme>("system");
  const [isDark, setIsDark] = useState(false);

  // Theme system
  useEffect(() => {
    const computed =
      theme === "system"
        ? window.matchMedia("(prefers-color-scheme: dark)").matches
        : theme === "dark";
    setIsDark(computed);
    document.documentElement.classList.toggle("dark", computed);
  }, [theme]);

  const ThemeToggle = () => (
    <div className="flex items-center gap-2 p-2 rounded-xl bg-white/20 backdrop-blur-sm shadow-lg">
      <button onClick={() => setTheme("light")} className={`p-2 rounded-lg ${theme === "light" ? "bg-white shadow-md" : ""}`}>
        <Sun className="h-5 w-5" />
      </button>
      <button onClick={() => setTheme("dark")} className={`p-2 rounded-lg ${theme === "dark" ? "bg-white shadow-md" : ""}`}>
        <Moon className="h-5 w-5" />
      </button>
      <button onClick={() => setTheme("system")} className={`p-2 rounded-lg ${theme === "system" ? "bg-white shadow-md" : ""}`}>
        <Monitor className="h-5 w-5" />
      </button>
    </div>
  )

  return (
    <div className={`min-h-screen transition-all duration-300 ${isDark ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white' : 'bg-gradient-to-br from-indigo-50 via-blue-50 to-purple-50 text-gray-900'}`}>
      {/* Header */}
      <div className="border-b border-white/20 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className={`text-2xl font-bold ${isDark ? 'bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent' : 'text-gray-900'}`}>
              One82 Dashboard
            </h1>
            <Users className="h-6 w-6 opacity-70" />
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <button className="p-2 rounded-xl bg-white/20 hover:bg-white/30 transition-all">
              <Plus className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Merchant Switcher */}
        <div className="flex items-center justify-between mb-12">
          <div>
            <p className={`text-5xl font-black ${isDark ? 'bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent' : 'bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent'}`}>
              {selectedMerchant.name}
            </p>
            <p className="text-xl opacity-80 mt-2 capitalize">{selectedMerchant.businessType}</p>
          </div>
          <div className="flex bg-white/20 backdrop-blur-sm rounded-2xl p-1 shadow-xl">
            {merchants.map((merchant, i) => (
              <button
                key={merchant.id}
                onClick={() => setSelectedMerchant(merchant)}
                className={`flex items-center gap-3 px-6 py-3 rounded-xl transition-all font-semibold ${
                  selectedMerchant.id === merchant.id
                    ? 'bg-white shadow-md text-gray-900'
                    : 'hover:bg-white/50'
                }`}
              >
                <DollarSign className="h-5 w-5" />
                {merchant.name}
                {i < merchants.length - 1 && <div className="w-px h-6 bg-white/30" />}
              </button>
            ))}
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          <MetricCard
            title="Revenue Today"
            value={selectedMerchant.revenue}
            change={23}
            aiInsight={selectedMerchant.aiInsight}
          />
          <MetricCard
            title="Transactions"
            value={selectedMerchant.transactions}
            change={15}
            aiInsight="Higher than average weekend volume"
          />
          <MetricCard
            title="Avg Order Value"
            value={38.42}
            change={4.2}
            aiInsight="Bundling working well"
          />
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className={`p-8 rounded-2xl border ${isDark ? 'bg-white/10 backdrop-blur-sm border-white/20' : 'bg-white shadow-lg border-gray-200'}`}>
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Upload Statement
            </h3>
            <p className="text-sm opacity-80 mb-6">AI Vision extracts transactions instantly</p>
            <button className="w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white py-3 px-6 rounded-xl font-semibold hover:from-blue-600 hover:to-purple-600 transition-all shadow-lg">
              Analyze Now
            </button>
          </div>
          <div className={`p-8 rounded-2xl border ${isDark ? 'bg-white/10 backdrop-blur-sm border-white/20' : 'bg-white shadow-lg border-gray-200'}`}>
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Settings className="h-5 w-5" />
              AI Insights
            </h3>
            <p className="text-sm opacity-80 mb-6">Customized for {selectedMerchant.businessType}</p>
            <button className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white py-3 px-6 rounded-xl font-semibold hover:from-emerald-600 hover:to-teal-600 transition-all shadow-lg">
              Generate Report
            </button>
          </div>
          <div className={`p-8 rounded-2xl border ${isDark ? 'bg-white/10 backdrop-blur-sm border-white/20' : 'bg-white shadow-lg border-gray-200'}`}>
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Users className="h-5 w-5" />
              Add Client
            </h3>
            <p className="text-sm opacity-80 mb-6">Invite new merchants</p>
            <button className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white py-3 px-6 rounded-xl font-semibold hover:from-orange-600 hover:to-red-600 transition-all shadow-lg">
              + New Merchant
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default MultiMerchantDashboard
