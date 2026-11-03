import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  ArrowDown, ArrowUp, Wallet, TrendingDown, TrendingUp, ChevronLeft, ChevronRight, Calendar,
  AlertTriangle, ArrowRight,
} from "lucide-react";
import {
  Bar, BarChart, CartesianGrid, Cell, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import api from "../services/api";
import type { DashboardData, Wallet as WalletType } from "../types";
import WalletSelector from "../components/WalletSelector";

const PIE_COLORS = ["#39ff14", "#00f5ff", "#bf00ff", "#ff0099", "#ffcc00", "#ff6600", "#00e5ff", "#e040fb"];

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);
}
function formatMonth(month: string) {
  const [year, monthNumber] = month.split("-");
  return new Date(Number(year), Number(monthNumber) - 1).toLocaleDateString("id-ID", { month: "short" });
}
function formatDate(dateString: string) {
  if (!dateString) return "—";
  const datePart = dateString.split("T")[0].split(" ")[0];
  const parts = datePart.split("-");
  if (parts.length === 3) {
    const [year, month, day] = parts;
    return `${day}-${month}-${year}`;
  }
  return dateString;
}

const CustomBarTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "rgba(10, 10, 16, 0.95)",
      backdropFilter: "blur(12px)",
      border: "1px solid rgba(255, 255, 255, 0.12)",
      borderRadius: "12px",
      padding: "12px 16px",
      boxShadow: "0 8px 32px rgba(0, 0, 0, 0.6)",
      minWidth: "170px",
    }}>
      <p style={{ color: "var(--text-secondary)", fontSize: "12px", fontWeight: "600", marginBottom: "8px", borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: "4px" }}>
        Bulan {label}
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {payload.map((p: any) => (
          <div key={p.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: p.color, boxShadow: `0 0 6px ${p.color}` }} />
              <span style={{ color: "var(--text-muted)", fontSize: "12px" }}>{p.name}</span>
            </div>
            <span style={{ color: p.color, fontSize: "13px", fontWeight: "700" }}>
              {formatRupiah(p.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

const CustomPieTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  return (
    <div style={{
      background: "rgba(10, 10, 16, 0.95)",
      backdropFilter: "blur(12px)",
      border: `1px solid ${item.payload?.fill || "rgba(0,245,255,0.4)"}`,
      borderRadius: "12px",
      padding: "10px 14px",
      boxShadow: "0 8px 24px rgba(0, 0, 0, 0.6)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
        <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: item.payload?.fill, boxShadow: `0 0 6px ${item.payload?.fill}` }} />
        <span style={{ color: "var(--text-primary)", fontSize: "13px", fontWeight: "600" }}>{item.name}</span>
      </div>
      <p style={{ color: item.payload?.fill || "var(--neon-green)", fontSize: "14px", fontWeight: "700" }}>
        {formatRupiah(Number(item.value))}
      </p>
    </div>
  );
};

const MONTH_NAMES = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [chartRange, setChartRange] = useState<number>(1);
  const [wallets, setWallets] = useState<WalletType[]>([]);
  const [selectedWalletId, setSelectedWalletId] = useState<number | "all">("all");
  const [budgetAlerts, setBudgetAlerts] = useState<any[]>([]);

  const fetchBudgetAlerts = useCallback(async (year: number, month: number) => {
    try {
      const res = await api.get("/budgets/alerts", { params: { year, month } });
      setBudgetAlerts(res.data.alerts || []);
    } catch {
      // Ignore if fail
    }
  }, []);

  const fetchDashboard = useCallback(async (year: number, month: number, range: number, walletId: number | "all") => {
    setLoading(true);
    try {
      const params: any = { year, month, chart_range: range };
      if (walletId !== "all") params.wallet_id = walletId;
      const response = await api.get("/dashboard", { params });
      setData(response.data);
      if (response.data.wallets) {
        setWallets(response.data.wallets);
      }
    } catch (error) {
      console.error("Failed to fetch dashboard:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchWallets = useCallback(async () => {
    try {
      const response = await api.get("/wallets");
      setWallets(response.data.wallets || response.data || []);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    fetchWallets();
  }, [fetchWallets]);

  useEffect(() => {
    fetchDashboard(selectedYear, selectedMonth, chartRange, selectedWalletId);
    fetchBudgetAlerts(selectedYear, selectedMonth);
  }, [selectedYear, selectedMonth, chartRange, selectedWalletId, fetchDashboard, fetchBudgetAlerts]);

  const goPrev = () => {
    if (selectedMonth === 1) { setSelectedMonth(12); setSelectedYear(y => y - 1); }
    else { setSelectedMonth(m => m - 1); }
  };
  const goNext = () => {
    const now = new Date();
    if (selectedYear === now.getFullYear() && selectedMonth === now.getMonth() + 1) return;
    if (selectedMonth === 12) { setSelectedMonth(1); setSelectedYear(y => y + 1); }
    else { setSelectedMonth(m => m + 1); }
  };
  const isCurrentMonth = selectedYear === new Date().getFullYear() && selectedMonth === new Date().getMonth() + 1;

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div className="spinner" style={{ margin: "0 auto 16px" }} />
          <p style={{ color: "var(--text-muted)", fontSize: "14px" }}>Memuat data...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "var(--text-muted)" }}>Gagal memuat dashboard.</p>
      </div>
    );
  }

  // The selected month is always the LAST bar
  const selectedMonthLabel = formatMonth(`${selectedYear}-${String(selectedMonth).padStart(2, "0")}`);

  const monthlyChartData = data.monthly.map((item) => ({
    month: formatMonth(item.month),
    rawMonth: item.month,
    Pemasukan: Number(item.income),
    Pengeluaran: Number(item.expense),
    isSelected: item.month === `${selectedYear}-${String(selectedMonth).padStart(2, "0")}`,
  }));

  const chartSubtitle = (() => {
    if (monthlyChartData.length === 0) return MONTH_NAMES[selectedMonth - 1] + " " + selectedYear;
    const first = monthlyChartData[0].month;
    const last = selectedMonthLabel;
    return first === last ? last + " " + selectedYear : `${first} – ${last} ${selectedYear}`;
  })();

  const categoryChartData = data.expense_by_category.map((item) => ({
    name: item.name,
    value: Number(item.total),
  }));

  const totalExpense = categoryChartData.reduce((acc, curr) => acc + curr.value, 0);

  return (
    <div className="page">

      {/* Header */}
      <div className="animate-fade-in-up" style={{ marginBottom: "32px", display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h1 className="section-title" style={{ marginBottom: "6px" }}>
            Dashboard <span className="neon-text">Keuangan</span>
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>
            Pantau kondisi keuangan kamu secara real-time
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          {/* Wallet Selector */}
          {wallets.length > 0 && (
            <WalletSelector
              wallets={wallets}
              selectedWalletId={selectedWalletId}
              onChange={setSelectedWalletId}
            />
          )}

          {/* Month Filter */}
          <div className="glass" style={{ display: "flex", alignItems: "center", gap: "0", padding: "4px", borderRadius: "12px", border: "1px solid rgba(57,255,20,0.15)" }}>
            <button
              onClick={goPrev}
              style={{ width: "34px", height: "34px", borderRadius: "8px", border: "none", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-secondary)", transition: "all 0.2s" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(57,255,20,0.08)"; (e.currentTarget as HTMLElement).style.color = "var(--neon-green)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)"; }}
            >
              <ChevronLeft size={16} />
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: "6px", padding: "0 12px", minWidth: "150px", justifyContent: "center" }}>
              <Calendar size={13} color="var(--neon-green)" />
              <span style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-primary)", whiteSpace: "nowrap" }}>
                {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
              </span>
              {isCurrentMonth && (
                <span style={{ fontSize: "10px", fontWeight: "600", color: "var(--neon-green)", background: "rgba(57,255,20,0.1)", border: "1px solid rgba(57,255,20,0.25)", borderRadius: "99px", padding: "1px 7px" }}>
                  Ini
                </span>
              )}
            </div>

            <button
              onClick={goNext}
              disabled={isCurrentMonth}
              style={{ width: "34px", height: "34px", borderRadius: "8px", border: "none", background: "transparent", cursor: isCurrentMonth ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: isCurrentMonth ? "var(--text-muted)" : "var(--text-secondary)", transition: "all 0.2s", opacity: isCurrentMonth ? 0.4 : 1 }}
              onMouseEnter={e => { if (!isCurrentMonth) { (e.currentTarget as HTMLElement).style.background = "rgba(57,255,20,0.08)"; (e.currentTarget as HTMLElement).style.color = "var(--neon-green)"; } }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = isCurrentMonth ? "var(--text-muted)" : "var(--text-secondary)"; }}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Budget Warning Banner if alerts exist */}
      {budgetAlerts.length > 0 && (
        <div
          className="animate-fade-in-up"
          style={{
            marginBottom: "20px",
            padding: "14px 18px",
            borderRadius: "14px",
            background: "rgba(255,80,128,0.08)",
            border: "1px solid rgba(255,80,128,0.3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <AlertTriangle size={20} color="#ff5080" />
            <div>
              <p style={{ fontSize: "14px", fontWeight: "700", color: "#ff5080", marginBottom: "2px" }}>
                Peringatan Anggaran Bulan Ini
              </p>
              <p style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                Ada {budgetAlerts.length} kategori yang mendekati atau telah melebihi batas pengeluaran:{" "}
                <span style={{ color: "var(--text-primary)", fontWeight: "600" }}>
                  {budgetAlerts.map((a: any) => `${a.category?.name} (${a.percentage}%)`).join(", ")}
                </span>
              </p>
            </div>
          </div>

          <Link
            to="/budgets"
            className="btn-ghost"
            style={{
              fontSize: "12px",
              padding: "6px 12px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              borderColor: "rgba(255,80,128,0.4)",
              color: "#ff5080",
            }}
          >
            Lihat Anggaran <ArrowRight size={14} />
          </Link>
        </div>
      )}

      {/* Mini Wallet Cards */}
      {wallets.length > 0 && (
        <div
          className="animate-fade-in-up"
          style={{
            display: "flex",
            gap: "12px",
            overflowX: "auto",
            paddingBottom: "8px",
            marginBottom: "20px",
          }}
        >
          {wallets.map((wallet) => {
            const isSelected = selectedWalletId === wallet.id;
            return (
              <div
                key={wallet.id}
                onClick={() => setSelectedWalletId(isSelected ? "all" : wallet.id)}
                className="glass"
                style={{
                  minWidth: "170px",
                  padding: "12px 14px",
                  cursor: "pointer",
                  borderRadius: "14px",
                  border: isSelected
                    ? `1px solid ${wallet.color}`
                    : "1px solid rgba(255,255,255,0.08)",
                  boxShadow: isSelected ? `0 0 14px ${wallet.color}40` : "none",
                  transition: "all 0.2s",
                  background: isSelected ? `${wallet.color}10` : "rgba(10,10,16,0.6)",
                  flexShrink: 0,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                  <span
                    style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      background: wallet.color,
                      boxShadow: `0 0 6px ${wallet.color}`,
                    }}
                  />
                  <span style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)" }}>
                    {wallet.name}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: "15px",
                    fontWeight: "800",
                    color: wallet.color,
                  }}
                >
                  {wallet.balance !== undefined ? formatRupiah(wallet.balance) : "—"}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Stat Cards */}
      <div className="animate-fade-in-up delay-1" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px", marginBottom: "24px" }}>

        {/* Balance */}
        <div className="glass stat-card balance" style={{ border: "1px solid rgba(0,245,255,0.2)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
            <span style={{ fontSize: "12px", fontWeight: "600", letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text-muted)" }}>Saldo</span>
            <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "rgba(0,245,255,0.1)", border: "1px solid rgba(0,245,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Wallet size={18} color="var(--neon-cyan)" />
            </div>
          </div>
          <p style={{ fontSize: "26px", fontWeight: "800", color: "var(--neon-cyan)", textShadow: "0 0 15px rgba(0,245,255,0.5)", letterSpacing: "-0.02em" }}>
            {formatRupiah(data.summary.balance)}
          </p>
          <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "8px" }}>
            {selectedWalletId === "all" ? "Total saldo saat ini" : `Saldo dompet ${wallets.find(w => w.id === selectedWalletId)?.name || ""}`}
          </p>
        </div>

        {/* Income */}
        <div className="glass stat-card income" style={{ border: "1px solid rgba(57,255,20,0.2)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
            <span style={{ fontSize: "12px", fontWeight: "600", letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text-muted)" }}>Total Pemasukan</span>
            <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "rgba(57,255,20,0.1)", border: "1px solid rgba(57,255,20,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <ArrowUp size={18} color="var(--neon-green)" />
            </div>
          </div>
          <p style={{ fontSize: "26px", fontWeight: "800", color: "var(--neon-green)", textShadow: "0 0 15px rgba(57,255,20,0.5)", letterSpacing: "-0.02em" }}>
            {formatRupiah(data.summary.income)}
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: "5px", marginTop: "8px" }}>
            <TrendingUp size={13} color="var(--neon-green)" />
            <span style={{ fontSize: "12px", color: "var(--neon-green)", opacity: 0.7 }}>Pemasukan bulan ini</span>
          </div>
        </div>

        {/* Expense */}
        <div className="glass stat-card expense" style={{ border: "1px solid rgba(255,0,80,0.2)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
            <span style={{ fontSize: "12px", fontWeight: "600", letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text-muted)" }}>Total Pengeluaran</span>
            <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "rgba(255,0,80,0.1)", border: "1px solid rgba(255,0,80,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <ArrowDown size={18} color="#ff5080" />
            </div>
          </div>
          <p style={{ fontSize: "26px", fontWeight: "800", color: "#ff5080", textShadow: "0 0 15px rgba(255,0,80,0.5)", letterSpacing: "-0.02em" }}>
            {formatRupiah(data.summary.expense)}
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: "5px", marginTop: "8px" }}>
            <TrendingDown size={13} color="#ff5080" />
            <span style={{ fontSize: "12px", color: "#ff5080", opacity: 0.7 }}>Pengeluaran bulan ini</span>
          </div>
        </div>

      </div>

      {/* Charts */}
      <div className="animate-fade-in-up delay-2" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 380px), 1fr))", gap: "16px", marginBottom: "24px" }}>

        {/* Monthly Bar Chart */}
        <div className="glass" style={{ padding: "24px" }}>
          <div style={{ marginBottom: "20px" }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "10px", marginBottom: "10px" }}>
              <div>
                <h2 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "4px" }}>Pemasukan vs Pengeluaran</h2>
                <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>{chartSubtitle}</p>
              </div>
              <select
                value={chartRange}
                onChange={(e) => setChartRange(Number(e.target.value))}
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "var(--text-primary)",
                  padding: "4px 8px",
                  borderRadius: "6px",
                  fontSize: "12px",
                  outline: "none",
                  cursor: "pointer",
                  flexShrink: 0,
                }}
              >
                <option value={1} style={{ background: "#0d0d14" }}>Bulan Ini Saja</option>
                <option value={6} style={{ background: "#0d0d14" }}>6 Bulan Terakhir</option>
                <option value={12} style={{ background: "#0d0d14" }}>1 Tahun Terakhir</option>
              </select>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#39ff14", boxShadow: "0 0 6px #39ff14" }} />
                <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>Pemasukan</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#ff5080", boxShadow: "0 0 6px #ff5080" }} />
                <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>Pengeluaran</span>
              </div>
            </div>
          </div>
          <div style={{ height: "280px" }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyChartData} barGap={6}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis
                  dataKey="month"
                  tick={({ x, y, payload, index }) => {
                    const isSelected = index === monthlyChartData.length - 1;
                    return (
                    <text x={x} y={Number(y) + 12} textAnchor="middle" fontSize={12}
                      fill={isSelected ? "#39ff14" : "rgba(240,240,240,0.4)"}
                      fontWeight={isSelected ? "700" : "400"}
                    >
                      {payload.value}
                    </text>
                    );
                  }}
                  axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
                  tickLine={false}
                />
                <YAxis tickFormatter={(v) => `${v / 1000000}jt`} tick={{ fill: "rgba(240,240,240,0.4)", fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomBarTooltip />} cursor={{ fill: "rgba(255, 255, 255, 0.04)", radius: 6 }} />
                <Bar dataKey="Pemasukan" radius={[6, 6, 0, 0]}>
                  {monthlyChartData.map((entry, index) => (
                    <Cell
                      key={index}
                      fill="#39ff14"
                      fillOpacity={entry.isSelected ? 1 : 0.35}
                      style={entry.isSelected ? { filter: "drop-shadow(0 0 6px rgba(57,255,20,0.7))" } : {}}
                    />
                  ))}
                </Bar>
                <Bar dataKey="Pengeluaran" radius={[6, 6, 0, 0]}>
                  {monthlyChartData.map((entry, index) => (
                    <Cell
                      key={index}
                      fill="#ff5080"
                      fillOpacity={entry.isSelected ? 1 : 0.35}
                      style={entry.isSelected ? { filter: "drop-shadow(0 0 6px rgba(255,80,128,0.7))" } : {}}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie Chart with Color Legend */}
        <div className="glass" style={{ padding: "24px", display: "flex", flexDirection: "column" }}>
          <div style={{ marginBottom: "16px" }}>
            <h2 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "4px" }}>Pengeluaran</h2>
            <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>Berdasarkan kategori</p>
          </div>
          {categoryChartData.length === 0 ? (
            <div style={{ flex: 1, minHeight: "220px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <p style={{ color: "var(--text-muted)", fontSize: "13px" }}>Belum ada data.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "space-between" }}>
              <div style={{ height: "180px" }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={categoryChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} innerRadius={45} paddingAngle={4}>
                      {categoryChartData.map((_, index) => (
                        <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} fillOpacity={0.9} stroke="#0d0d14" strokeWidth={2} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomPieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Color Legend with percentage */}
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
                gap: "8px",
                marginTop: "12px",
                paddingTop: "12px",
                borderTop: "1px solid rgba(255,255,255,0.06)",
                maxHeight: "110px",
                overflowY: "auto",
              }}>
                {categoryChartData.map((item, index) => {
                  const color = PIE_COLORS[index % PIE_COLORS.length];
                  const pct = totalExpense > 0 ? ((item.value / totalExpense) * 100).toFixed(0) : 0;
                  return (
                    <div
                      key={item.name}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "4px 8px",
                        borderRadius: "6px",
                        background: "rgba(255,255,255,0.02)",
                        border: "1px solid rgba(255,255,255,0.05)",
                        fontSize: "12px",
                      }}
                    >
                      <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: color, flexShrink: 0, boxShadow: `0 0 6px ${color}` }} />
                      <span style={{ color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                        {item.name}
                      </span>
                      <span style={{ color: color, fontSize: "11px", fontWeight: "700" }}>
                        {pct}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Recent Transactions */}
      <div className="glass animate-fade-in-up delay-3" style={{ padding: "24px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
          <div>
            <h2 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "4px" }}>Transaksi Terbaru</h2>
            <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>5 transaksi terakhir</p>
          </div>
        </div>

        {data.recent_transactions.length === 0 ? (
          <p style={{ textAlign: "center", color: "var(--text-muted)", padding: "32px 0", fontSize: "14px" }}>
            Belum ada transaksi.
          </p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="neon-table">
              <thead>
                <tr>
                  <th>Tanggal</th>
                  <th>Keterangan</th>
                  <th>Kategori</th>
                  <th style={{ textAlign: "right" }}>Nominal</th>
                </tr>
              </thead>
              <tbody>
                {data.recent_transactions.map((transaction) => (
                  <tr key={transaction.id}>
                    <td style={{ color: "var(--text-secondary)", fontSize: "13px" }}>
                      {formatDate(transaction.transaction_date)}
                    </td>
                    <td>{transaction.description || "—"}</td>
                    <td>
                      {transaction.category?.name ? (
                        <span style={{
                          padding: "3px 10px", borderRadius: "99px", fontSize: "12px", fontWeight: "500",
                          background: "rgba(255,255,255,0.06)", border: "1px solid var(--border)",
                        }}>
                          {transaction.category.name}
                        </span>
                      ) : "—"}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <span style={{
                        fontWeight: "700", fontSize: "14px",
                        color: transaction.type === "income" ? "var(--neon-green)" : "#ff5080",
                        textShadow: transaction.type === "income" ? "0 0 8px rgba(57,255,20,0.4)" : "0 0 8px rgba(255,0,80,0.3)",
                      }}>
                        {transaction.type === "income" ? "+" : "−"}
                        {formatRupiah(Number(transaction.amount))}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}