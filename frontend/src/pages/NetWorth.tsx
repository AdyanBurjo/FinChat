import { useEffect, useState, useCallback } from "react";
import {
  Gem, TrendingUp, ShieldCheck,
  Building2, Banknote, Smartphone, HandCoins, ArrowDownLeft,
  PieChart as PieChartIcon
} from "lucide-react";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip
} from "recharts";
import api from "../services/api";
import type { NetWorthData } from "../types";

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

const CustomPieTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  return (
    <div
      style={{
        background: "rgba(10, 10, 16, 0.95)",
        backdropFilter: "blur(12px)",
        border: `1px solid ${item.payload?.color || "rgba(0,245,255,0.4)"}`,
        borderRadius: "12px",
        padding: "10px 14px",
        boxShadow: "0 8px 24px rgba(0, 0, 0, 0.6)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
        <span
          style={{
            width: "8px",
            height: "8px",
            borderRadius: "50%",
            background: item.payload?.color,
            boxShadow: `0 0 6px ${item.payload?.color}`,
          }}
        />
        <span style={{ color: "var(--text-primary)", fontSize: "13px", fontWeight: "600" }}>
          {item.name}
        </span>
      </div>
      <p style={{ color: item.payload?.color || "var(--neon-green)", fontSize: "14px", fontWeight: "700" }}>
        {formatRupiah(Number(item.value))}
      </p>
    </div>
  );
};

export default function NetWorth() {
  const [data, setData] = useState<NetWorthData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchNetWorth = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/net-worth");
      setData(res.data);
    } catch (err) {
      console.error("Gagal memuat net worth:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNetWorth();
  }, [fetchNetWorth]);

  if (loading) {
    return (
      <div style={{ minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div className="spinner" style={{ margin: "0 auto 16px" }} />
          <p style={{ color: "var(--text-muted)", fontSize: "14px" }}>Menghitung total kekayaan bersih...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "var(--text-muted)" }}>Gagal memuat data Net Worth.</p>
      </div>
    );
  }

  const { net_worth, summary, asset_breakdown, details } = data;
  const isPositive = net_worth >= 0;

  // Filter breakdown with value > 0 for pie chart
  const activePieData = asset_breakdown
    .filter((a) => a.total > 0)
    .map((a) => ({
      name: a.name,
      value: a.total,
      color: a.color,
    }));

  return (
    <div className="page">
      {/* Header */}
      <div className="animate-fade-in-up" style={{ marginBottom: "32px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
          <Gem size={22} color="var(--neon-cyan)" />
          <h1 className="section-title" style={{ margin: 0 }}>
            Net Worth <span className="neon-text">Tracker</span>
          </h1>
        </div>
        <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>
          Kalkulasi real-time seluruh aset finansial dikurangi total kewajiban hutang
        </p>
      </div>

      {/* Main Net Worth Highlight Card */}
      <div
        className="glass-neon animate-fade-in-up delay-1"
        style={{
          padding: "32px 28px",
          marginBottom: "28px",
          borderRadius: "20px",
          background: isPositive
            ? "linear-gradient(135deg, rgba(0,245,255,0.08) 0%, rgba(57,255,20,0.04) 100%)"
            : "linear-gradient(135deg, rgba(255,80,128,0.1) 0%, rgba(20,5,10,0.6) 100%)",
          border: isPositive ? "1px solid rgba(0,245,255,0.3)" : "1px solid rgba(255,80,128,0.3)",
          boxShadow: isPositive ? "0 0 35px rgba(0,245,255,0.15)" : "0 0 35px rgba(255,80,128,0.15)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "24px",
        }}
      >
        <div>
          <span
            style={{
              fontSize: "12px",
              fontWeight: "700",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--text-muted)",
              display: "block",
              marginBottom: "8px",
            }}
          >
            Total Kekayaan Bersih (Net Worth)
          </span>
          <p
            style={{
              fontSize: "clamp(32px, 5vw, 46px)",
              fontWeight: "900",
              color: isPositive ? "var(--neon-cyan)" : "#ff5080",
              textShadow: isPositive ? "0 0 25px rgba(0,245,255,0.6)" : "0 0 25px rgba(255,80,128,0.5)",
              letterSpacing: "-0.03em",
              margin: 0,
            }}
          >
            {formatRupiah(net_worth)}
          </p>
          <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginTop: "10px" }}>
            Total Aset ({formatRupiah(summary.total_assets)}) − Total Hutang ({formatRupiah(summary.total_liabilities)})
          </p>
        </div>

        {/* Health status badge pill */}
        <div
          style={{
            padding: "16px 20px",
            borderRadius: "14px",
            background: "rgba(0,0,0,0.3)",
            border: `1px solid ${summary.health_color}40`,
            display: "flex",
            alignItems: "center",
            gap: "14px",
          }}
        >
          <div
            style={{
              width: "42px",
              height: "42px",
              borderRadius: "12px",
              background: `${summary.health_color}20`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ShieldCheck size={22} color={summary.health_color} />
          </div>
          <div>
            <span style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: "700" }}>
              Kesehatan Finansial
            </span>
            <p style={{ fontSize: "16px", fontWeight: "800", color: summary.health_color, margin: "2px 0 0" }}>
              {summary.health_status}
            </p>
            <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
              Debt-to-Asset: {summary.debt_to_asset_ratio}%
            </span>
          </div>
        </div>
      </div>

      {/* Grid: 2 Summary Cards (Aset vs Liabilitas) */}
      <div
        className="animate-fade-in-up delay-2"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "16px",
          marginBottom: "28px",
        }}
      >
        {/* Total Aset */}
        <div className="glass stat-card" style={{ border: "1px solid rgba(57,255,20,0.3)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
            <span style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-muted)", textTransform: "uppercase" }}>
              Total Seluruh Aset
            </span>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                background: "rgba(57,255,20,0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <TrendingUp size={18} color="var(--neon-green)" />
            </div>
          </div>
          <p style={{ fontSize: "26px", fontWeight: "800", color: "var(--neon-green)" }}>
            {formatRupiah(summary.total_assets)}
          </p>
          <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "6px" }}>
            Dompet kas, bank, investasi ({formatRupiah(summary.total_wallets)}) + Piutang ({formatRupiah(summary.total_receivables)})
          </p>
        </div>

        {/* Total Liabilitas (Hutang) */}
        <div className="glass stat-card" style={{ border: "1px solid rgba(255,80,128,0.3)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
            <span style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-muted)", textTransform: "uppercase" }}>
              Total Kewajiban (Hutang)
            </span>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                background: "rgba(255,80,128,0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ArrowDownLeft size={18} color="#ff5080" />
            </div>
          </div>
          <p style={{ fontSize: "26px", fontWeight: "800", color: "#ff5080" }}>
            {formatRupiah(summary.total_liabilities)}
          </p>
          <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "6px" }}>
            {details.debts.length} catatan hutang aktif yang belum lunas
          </p>
        </div>
      </div>

      {/* Grid: Asset Allocation Distribution & Details */}
      <div
        className="animate-fade-in-up delay-3"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 360px), 1fr))",
          gap: "16px",
          marginBottom: "28px",
        }}
      >
        {/* Visual Allocation Chart */}
        <div className="glass" style={{ padding: "24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "20px" }}>
            <PieChartIcon size={18} color="var(--neon-cyan)" />
            <div>
              <h2 style={{ fontSize: "16px", fontWeight: "600" }}>Alokasi & Komposisi Aset</h2>
              <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>Distribusi kekayaan per instrumen</p>
            </div>
          </div>

          {activePieData.length === 0 ? (
            <p style={{ color: "var(--text-muted)", fontSize: "13px", textAlign: "center", padding: "48px 0" }}>
              Belum ada aset terdata.
            </p>
          ) : (
            <div>
              <div style={{ height: "200px" }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={activePieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={4}
                    >
                      {activePieData.map((entry, index) => (
                        <Cell
                          key={index}
                          fill={entry.color}
                          stroke="#0a0a10"
                          strokeWidth={2}
                          style={{ filter: `drop-shadow(0 0 6px ${entry.color}80)` }}
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomPieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Legend List */}
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "16px" }}>
                {asset_breakdown.map((item) => {
                  const pct = summary.total_assets > 0 ? ((item.total / summary.total_assets) * 100).toFixed(1) : 0;
                  return (
                    <div
                      key={item.name}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "8px 12px",
                        borderRadius: "8px",
                        background: "rgba(255,255,255,0.02)",
                        border: "1px solid var(--border)",
                        fontSize: "12px",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span
                          style={{
                            width: "8px",
                            height: "8px",
                            borderRadius: "50%",
                            background: item.color,
                            boxShadow: `0 0 6px ${item.color}`,
                          }}
                        />
                        <span style={{ color: "var(--text-primary)", fontWeight: "600" }}>{item.name}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontWeight: "700", color: "var(--text-primary)" }}>
                          {formatRupiah(item.total)}
                        </span>
                        <span style={{ color: item.color, fontWeight: "700", fontSize: "11px" }}>
                          ({pct}%)
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Wallets & Receivables Detail Breakdown */}
        <div className="glass" style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "20px" }}>
          <div>
            <h2 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "4px" }}>Daftar Dompet & Akun</h2>
            <p style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "12px" }}>
              Saldo aktif di setiap rekening & dompet
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "160px", overflowY: "auto" }}>
              {details.wallets.map((w) => (
                <div
                  key={w.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "8px 12px",
                    borderRadius: "8px",
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid var(--border)",
                    fontSize: "12px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    {w.type === "bank" ? (
                      <Building2 size={14} color={w.color} />
                    ) : w.type === "ewallet" ? (
                      <Smartphone size={14} color={w.color} />
                    ) : (
                      <Banknote size={14} color={w.color} />
                    )}
                    <span style={{ color: "var(--text-primary)", fontWeight: "600" }}>{w.name}</span>
                  </div>
                  <span style={{ fontWeight: "700", color: w.color }}>
                    {formatRupiah(w.balance || 0)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Active Debts & Receivables Snapshot */}
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "16px" }}>
            <h2 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "4px" }}>
              Snapshot Hutang & Piutang
            </h2>
            <p style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "12px" }}>
              Sisa tagihan aktif yang mempengaruhi kekayaan
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <div
                style={{
                  padding: "10px",
                  borderRadius: "10px",
                  background: "rgba(57,255,20,0.03)",
                  border: "1px solid rgba(57,255,20,0.15)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                  <HandCoins size={13} color="var(--neon-green)" />
                  <span style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: "600" }}>
                    Total Piutang
                  </span>
                </div>
                <p style={{ fontSize: "15px", fontWeight: "800", color: "var(--neon-green)", margin: 0 }}>
                  {formatRupiah(summary.total_receivables)}
                </p>
                <span style={{ fontSize: "10px", color: "var(--text-secondary)" }}>
                  {details.receivables.length} pihak peminjam
                </span>
              </div>

              <div
                style={{
                  padding: "10px",
                  borderRadius: "10px",
                  background: "rgba(255,80,128,0.03)",
                  border: "1px solid rgba(255,80,128,0.15)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                  <ArrowDownLeft size={13} color="#ff5080" />
                  <span style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: "600" }}>
                    Total Hutang
                  </span>
                </div>
                <p style={{ fontSize: "15px", fontWeight: "800", color: "#ff5080", margin: 0 }}>
                  {formatRupiah(summary.total_liabilities)}
                </p>
                <span style={{ fontSize: "10px", color: "var(--text-secondary)" }}>
                  {details.debts.length} kewajiban aktif
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

