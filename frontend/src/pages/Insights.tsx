import { useEffect, useState, useCallback } from "react";
import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  Flame,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  AlertTriangle,
  Compass,
  Lightbulb,
  Gem,
  Building2,
  Banknote,
  Smartphone,
  HandCoins,
  ArrowDownLeft,
  PieChart as PieChartIcon,
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import api from "../services/api";
import type { InsightData, NetWorthData } from "../types";

const MONTH_NAMES = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

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

export default function Insights() {
  const [activeTab, setActiveTab] = useState<"insights" | "networth">("insights");

  // Insights State
  const [insightData, setInsightData] = useState<InsightData | null>(null);
  const [insightLoading, setInsightLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);

  // Net Worth State
  const [netWorthData, setNetWorthData] = useState<NetWorthData | null>(null);
  const [netWorthLoading, setNetWorthLoading] = useState(true);

  const fetchInsights = useCallback(async (year: number, month: number) => {
    setInsightLoading(true);
    try {
      const response = await api.get("/insights", { params: { year, month } });
      setInsightData(response.data);
    } catch (error) {
      console.error("Gagal memuat financial insights:", error);
    } finally {
      setInsightLoading(false);
    }
  }, []);

  const fetchNetWorth = useCallback(async () => {
    setNetWorthLoading(true);
    try {
      const res = await api.get("/net-worth");
      setNetWorthData(res.data);
    } catch (err) {
      console.error("Gagal memuat net worth:", err);
    } finally {
      setNetWorthLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInsights(selectedYear, selectedMonth);
  }, [selectedYear, selectedMonth, fetchInsights]);

  useEffect(() => {
    fetchNetWorth();
  }, [fetchNetWorth]);

  const goPrev = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear((y) => y - 1);
    } else {
      setSelectedMonth((m) => m - 1);
    }
  };

  const goNext = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear((y) => y + 1);
    } else {
      setSelectedMonth((m) => m + 1);
    }
  };

  return (
    <div className="page" style={{ paddingBottom: "60px" }}>
      {/* Header */}
      <div
        className="animate-fade-in-up mobile-stack-header"
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: "28px",
          flexWrap: "wrap",
          gap: "16px",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
            {activeTab === "insights" ? (
              <Sparkles size={22} color="var(--neon-green)" />
            ) : (
              <Gem size={22} color="var(--neon-cyan)" />
            )}
            <h1 className="section-title" style={{ margin: 0 }}>
              Financial <span className="neon-text">Insights</span>
            </h1>
          </div>
          <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>
            Analisis cerdas arus kas bulanan serta pelacak total kekayaan bersih (Net Worth)
          </p>
        </div>

        {/* Tab Switcher */}
        <div
          className="glass"
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "4px",
            borderRadius: "14px",
            border: "1px solid var(--border)",
            gap: "4px",
          }}
        >
          <button
            onClick={() => setActiveTab("insights")}
            style={{
              padding: "8px 16px",
              borderRadius: "10px",
              border: "none",
              fontSize: "13px",
              fontWeight: "600",
              cursor: "pointer",
              transition: "all 0.2s",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              background: activeTab === "insights" ? "rgba(57,255,20,0.15)" : "transparent",
              color: activeTab === "insights" ? "var(--neon-green)" : "var(--text-secondary)",
              boxShadow: activeTab === "insights" ? "0 0 15px rgba(57,255,20,0.2)" : "none",
            }}
          >
            <Sparkles size={15} />
            Arus Kas & Analisis
          </button>

          <button
            onClick={() => setActiveTab("networth")}
            style={{
              padding: "8px 16px",
              borderRadius: "10px",
              border: "none",
              fontSize: "13px",
              fontWeight: "600",
              cursor: "pointer",
              transition: "all 0.2s",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              background: activeTab === "networth" ? "rgba(0,245,255,0.15)" : "transparent",
              color: activeTab === "networth" ? "var(--neon-cyan)" : "var(--text-secondary)",
              boxShadow: activeTab === "networth" ? "0 0 15px rgba(0,245,255,0.2)" : "none",
            }}
          >
            <Gem size={15} />
            Net Worth (Kekayaan)
          </button>
        </div>
      </div>

      {/* VIEW: INSIGHTS TAB */}
      {activeTab === "insights" && (
        <div className="animate-fade-in">
          {insightLoading ? (
            <div style={{ minHeight: "50vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ textAlign: "center" }}>
                <div className="spinner" style={{ margin: "0 auto 16px" }} />
                <p style={{ color: "var(--text-muted)", fontSize: "14px" }}>Menganalisis pola keuanganmu...</p>
              </div>
            </div>
          ) : !insightData ? (
            <div style={{ minHeight: "50vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <p style={{ color: "var(--text-muted)" }}>Gagal memuat Financial Insights.</p>
            </div>
          ) : (
            <>
              {/* Month Selector Bar */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  marginBottom: "20px",
                }}
              >
                <div
                  className="glass"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    padding: "4px",
                    borderRadius: "12px",
                    border: "1px solid rgba(57,255,20,0.15)",
                  }}
                >
                  <button
                    onClick={goPrev}
                    style={{
                      width: "34px",
                      height: "34px",
                      borderRadius: "8px",
                      border: "none",
                      background: "transparent",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "var(--text-secondary)",
                    }}
                  >
                    <ChevronLeft size={16} />
                  </button>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "0 12px",
                      minWidth: "150px",
                      justifyContent: "center",
                    }}
                  >
                    <Calendar size={13} color="var(--neon-green)" />
                    <span style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-primary)" }}>
                      {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
                    </span>
                  </div>

                  <button
                    onClick={goNext}
                    style={{
                      width: "34px",
                      height: "34px",
                      borderRadius: "8px",
                      border: "none",
                      background: "transparent",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "var(--text-secondary)",
                    }}
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>

              {/* 3 Main Highlight Cards */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                  gap: "16px",
                  marginBottom: "28px",
                }}
              >
                {/* Card 1: Perubahan vs Bulan Lalu */}
                <div
                  className="glass stat-card"
                  style={{
                    border: insightData.comparison.is_increased
                      ? "1px solid rgba(255,80,128,0.3)"
                      : "1px solid rgba(57,255,20,0.3)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
                    <span style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-muted)", textTransform: "uppercase" }}>
                      Perubahan vs Bulan Lalu
                    </span>
                    <div
                      style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: "10px",
                        background: insightData.comparison.is_increased ? "rgba(255,80,128,0.1)" : "rgba(57,255,20,0.1)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {insightData.comparison.is_increased ? (
                        <TrendingUp size={18} color="#ff5080" />
                      ) : (
                        <TrendingDown size={18} color="var(--neon-green)" />
                      )}
                    </div>
                  </div>
                  <p
                    style={{
                      fontSize: "26px",
                      fontWeight: "800",
                      color: insightData.comparison.is_increased ? "#ff5080" : "var(--neon-green)",
                      letterSpacing: "-0.02em",
                    }}
                  >
                    {insightData.comparison.is_increased ? "+" : ""}
                    {insightData.comparison.percentage_change}%
                  </p>
                  <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "6px" }}>
                    {insightData.comparison.is_increased ? "Pengeluaran naik" : "Pengeluaran lebih hemat"}{" "}
                    <span style={{ color: "var(--text-primary)", fontWeight: "600" }}>
                      {formatRupiah(Math.abs(insightData.comparison.diff_amount))}
                    </span>
                  </p>
                </div>

                {/* Card 2: Kategori Paling Boros */}
                <div className="glass stat-card" style={{ border: "1px solid rgba(255,204,0,0.25)" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
                    <span style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-muted)", textTransform: "uppercase" }}>
                      Kategori Paling Boros
                    </span>
                    <div
                      style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: "10px",
                        background: "rgba(255,204,0,0.1)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Flame size={18} color="#ffcc00" />
                    </div>
                  </div>
                  <p style={{ fontSize: "24px", fontWeight: "800", color: "#ffcc00", letterSpacing: "-0.02em" }}>
                    {insightData.top_spending.most_expensive_category?.name || "Belum Ada"}
                  </p>
                  <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "6px" }}>
                    {insightData.top_spending.most_expensive_category ? (
                      <>
                        <span style={{ color: "var(--text-primary)", fontWeight: "600" }}>
                          {formatRupiah(insightData.top_spending.most_expensive_category.total)}
                        </span>{" "}
                        ({insightData.top_spending.most_expensive_category.percentage}% dari total pengeluaran)
                      </>
                    ) : (
                      "Tidak ada transaksi pengeluaran"
                    )}
                  </p>
                </div>

                {/* Card 3: Estimasi Saldo Akhir Bulan */}
                <div className="glass stat-card" style={{ border: "1px solid rgba(0,245,255,0.25)" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
                    <span style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-muted)", textTransform: "uppercase" }}>
                      {insightData.meta.is_current_month ? "Estimasi Saldo Akhir Bulan" : "Saldo Akhir Bulan"}
                    </span>
                    <div
                      style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: "10px",
                        background: "rgba(0,245,255,0.1)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Compass size={18} color="var(--neon-cyan)" />
                    </div>
                  </div>
                  <p
                    style={{
                      fontSize: "24px",
                      fontWeight: "800",
                      color: insightData.projection.projected_end_balance >= 0 ? "var(--neon-cyan)" : "#ff5080",
                      letterSpacing: "-0.02em",
                    }}
                  >
                    {formatRupiah(insightData.projection.projected_end_balance)}
                  </p>
                  <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "6px" }}>
                    {insightData.meta.is_current_month ? (
                      <>
                        Rata-rata:{" "}
                        <span style={{ color: "var(--text-primary)", fontWeight: "600" }}>
                          {formatRupiah(insightData.projection.daily_average)}/hari
                        </span>
                      </>
                    ) : (
                      "Bulan telah berakhir"
                    )}
                  </p>
                </div>
              </div>

              {/* Grid: Detail Top Spending & Projection & Health */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 360px), 1fr))",
                  gap: "16px",
                  marginBottom: "24px",
                }}
              >
                {/* Top 5 Categories Progress */}
                <div className="glass" style={{ padding: "24px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
                    <div>
                      <h2 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "4px" }}>
                        Komposisi Pengeluaran Terbesar
                      </h2>
                      <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                        Kategori yang paling banyak menyerap anggaran
                      </p>
                    </div>
                  </div>

                  {insightData.top_spending.categories.length === 0 ? (
                    <p style={{ color: "var(--text-muted)", fontSize: "13px", textAlign: "center", padding: "32px 0" }}>
                      Belum ada data pengeluaran di bulan ini.
                    </p>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                      {insightData.top_spending.categories.map((cat, idx) => (
                        <div key={cat.name}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "6px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                              <span style={{ fontSize: "11px", fontWeight: "700", color: "var(--text-muted)" }}>
                                #{idx + 1}
                              </span>
                              <span style={{ fontWeight: "600", color: "var(--text-primary)" }}>{cat.name}</span>
                            </div>
                            <div>
                              <span style={{ fontWeight: "700", color: "var(--text-primary)", marginRight: "6px" }}>
                                {formatRupiah(cat.total)}
                              </span>
                              <span style={{ color: "var(--text-muted)", fontSize: "11px" }}>({cat.percentage}%)</span>
                            </div>
                          </div>
                          <div
                            style={{
                              height: "6px",
                              borderRadius: "99px",
                              background: "rgba(255,255,255,0.06)",
                              overflow: "hidden",
                            }}
                          >
                            <div
                              style={{
                                height: "100%",
                                width: `${cat.percentage}%`,
                                borderRadius: "99px",
                                background:
                                  idx === 0
                                    ? "#ffcc00"
                                    : idx === 1
                                      ? "var(--neon-cyan)"
                                      : "var(--neon-green)",
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Financial Health Score & Spending Projection */}
                <div className="glass" style={{ padding: "24px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
                      <ShieldCheck size={20} color={insightData.health.color} />
                      <div>
                        <h2 style={{ fontSize: "16px", fontWeight: "600" }}>Kesehatan Arus Kas (Cash Flow)</h2>
                        <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                          Rasio tabungan & proyeksi akhir bulan
                        </p>
                      </div>
                    </div>

                    <div
                      style={{
                        padding: "16px",
                        borderRadius: "12px",
                        background: "rgba(255,255,255,0.02)",
                        border: "1px solid var(--border)",
                        marginBottom: "16px",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                        <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>Saving Rate (Rasio Tabungan)</span>
                        <span style={{ fontSize: "15px", fontWeight: "700", color: insightData.health.color }}>
                          {insightData.health.savings_ratio}%
                        </span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>Status Keuangan</span>
                        <span
                          style={{
                            fontSize: "12px",
                            fontWeight: "700",
                            padding: "2px 10px",
                            borderRadius: "99px",
                            background: `${insightData.health.color}15`,
                            color: insightData.health.color,
                            border: `1px solid ${insightData.health.color}40`,
                          }}
                        >
                          {insightData.health.status}
                        </span>
                      </div>
                    </div>

                    {insightData.meta.is_current_month && (
                      <div
                        style={{
                          padding: "16px",
                          borderRadius: "12px",
                          background: "rgba(0,245,255,0.03)",
                          border: "1px solid rgba(0,245,255,0.15)",
                        }}
                      >
                        <p style={{ fontSize: "12px", fontWeight: "600", color: "var(--neon-cyan)", marginBottom: "8px", textTransform: "uppercase" }}>
                          Proyeksi Kecepatan Pengeluaran
                        </p>
                        <div style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "13px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span style={{ color: "var(--text-muted)" }}>Hari Berjalan:</span>
                            <span style={{ fontWeight: "600" }}>{insightData.meta.passed_days} dari {insightData.meta.total_days} hari</span>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span style={{ color: "var(--text-muted)" }}>Rata-rata Harian:</span>
                            <span style={{ fontWeight: "600", color: "#ffcc00" }}>{formatRupiah(insightData.projection.daily_average)}</span>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span style={{ color: "var(--text-muted)" }}>Estimasi Total Pengeluaran:</span>
                            <span style={{ fontWeight: "700", color: "var(--text-primary)" }}>
                              {formatRupiah(insightData.projection.projected_month_expense)}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* AI Smart Tips & Advice Section */}
              {insightData.tips.length > 0 && (
                <div className="glass" style={{ padding: "24px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "18px" }}>
                    <Lightbulb size={20} color="var(--neon-green)" />
                    <h2 style={{ fontSize: "16px", fontWeight: "600" }}>Saran & Observasi Pintar</h2>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "12px" }}>
                    {insightData.tips.map((tip, i) => {
                      const isWarning = tip.type === "warning" || tip.type === "danger";
                      return (
                        <div
                          key={i}
                          style={{
                            padding: "16px",
                            borderRadius: "12px",
                            background: isWarning ? "rgba(255,80,128,0.04)" : "rgba(57,255,20,0.04)",
                            border: isWarning ? "1px solid rgba(255,80,128,0.25)" : "1px solid rgba(57,255,20,0.25)",
                          }}
                        >
                          <p
                            style={{
                              fontSize: "14px",
                              fontWeight: "700",
                              color: isWarning ? "#ff5080" : "var(--neon-green)",
                              marginBottom: "6px",
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
                            }}
                          >
                            {isWarning ? <AlertTriangle size={15} /> : <Sparkles size={15} />}
                            {tip.title}
                          </p>
                          <p style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: "1.5" }}>
                            {tip.desc}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* VIEW: NET WORTH TAB */}
      {activeTab === "networth" && (
        <div className="animate-fade-in">
          {netWorthLoading ? (
            <div style={{ minHeight: "50vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ textAlign: "center" }}>
                <div className="spinner" style={{ margin: "0 auto 16px" }} />
                <p style={{ color: "var(--text-muted)", fontSize: "14px" }}>Menghitung total kekayaan bersih...</p>
              </div>
            </div>
          ) : !netWorthData ? (
            <div style={{ minHeight: "50vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <p style={{ color: "var(--text-muted)" }}>Gagal memuat data Net Worth.</p>
            </div>
          ) : (
            <>
              {/* Main Net Worth Highlight Card */}
              <div
                className="glass-neon"
                style={{
                  padding: "32px 28px",
                  marginBottom: "28px",
                  borderRadius: "20px",
                  background: netWorthData.net_worth >= 0
                    ? "linear-gradient(135deg, rgba(0,245,255,0.08) 0%, rgba(57,255,20,0.04) 100%)"
                    : "linear-gradient(135deg, rgba(255,80,128,0.1) 0%, rgba(20,5,10,0.6) 100%)",
                  border: netWorthData.net_worth >= 0 ? "1px solid rgba(0,245,255,0.3)" : "1px solid rgba(255,80,128,0.3)",
                  boxShadow: netWorthData.net_worth >= 0 ? "0 0 35px rgba(0,245,255,0.15)" : "0 0 35px rgba(255,80,128,0.15)",
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
                      color: netWorthData.net_worth >= 0 ? "var(--neon-cyan)" : "#ff5080",
                      textShadow: netWorthData.net_worth >= 0 ? "0 0 25px rgba(0,245,255,0.6)" : "0 0 25px rgba(255,80,128,0.5)",
                      letterSpacing: "-0.03em",
                      margin: 0,
                    }}
                  >
                    {formatRupiah(netWorthData.net_worth)}
                  </p>
                  <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginTop: "10px" }}>
                    Total Aset ({formatRupiah(netWorthData.summary.total_assets)}) − Total Hutang ({formatRupiah(netWorthData.summary.total_liabilities)})
                  </p>
                </div>

                {/* Health status badge pill */}
                <div
                  style={{
                    padding: "16px 20px",
                    borderRadius: "14px",
                    background: "rgba(0,0,0,0.3)",
                    border: `1px solid ${netWorthData.summary.health_color}40`,
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
                      background: `${netWorthData.summary.health_color}20`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <ShieldCheck size={22} color={netWorthData.summary.health_color} />
                  </div>
                  <div>
                    <span style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: "700" }}>
                      Kesehatan Finansial
                    </span>
                    <p style={{ fontSize: "16px", fontWeight: "800", color: netWorthData.summary.health_color, margin: "2px 0 0" }}>
                      {netWorthData.summary.health_status}
                    </p>
                    <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                      Debt-to-Asset: {netWorthData.summary.debt_to_asset_ratio}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Grid: 2 Summary Cards (Aset vs Liabilitas) */}
              <div
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
                    {formatRupiah(netWorthData.summary.total_assets)}
                  </p>
                  <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "6px" }}>
                    Dompet kas, bank, e-wallet ({formatRupiah(netWorthData.summary.total_wallets)}) + Piutang ({formatRupiah(netWorthData.summary.total_receivables)})
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
                    {formatRupiah(netWorthData.summary.total_liabilities)}
                  </p>
                  <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "6px" }}>
                    {netWorthData.details.debts.length} catatan hutang aktif yang belum lunas
                  </p>
                </div>
              </div>

              {/* Grid: Asset Allocation Distribution & Details */}
              <div
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

                  {netWorthData.asset_breakdown.filter((a) => a.total > 0).length === 0 ? (
                    <p style={{ color: "var(--text-muted)", fontSize: "13px", textAlign: "center", padding: "48px 0" }}>
                      Belum ada aset terdata.
                    </p>
                  ) : (
                    <div>
                      <div style={{ height: "200px" }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={netWorthData.asset_breakdown
                                .filter((a) => a.total > 0)
                                .map((a) => ({
                                  name: a.name,
                                  value: a.total,
                                  color: a.color,
                                }))}
                              dataKey="value"
                              nameKey="name"
                              cx="50%"
                              cy="50%"
                              innerRadius={50}
                              outerRadius={80}
                              paddingAngle={4}
                            >
                              {netWorthData.asset_breakdown
                                .filter((a) => a.total > 0)
                                .map((entry, index) => (
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
                        {netWorthData.asset_breakdown.map((item) => {
                          const pct =
                            netWorthData.summary.total_assets > 0
                              ? ((item.total / netWorthData.summary.total_assets) * 100).toFixed(1)
                              : 0;
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
                      {netWorthData.details.wallets.map((w) => (
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
                          {formatRupiah(netWorthData.summary.total_receivables)}
                        </p>
                        <span style={{ fontSize: "10px", color: "var(--text-secondary)" }}>
                          {netWorthData.details.receivables.length} pihak peminjam
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
                          {formatRupiah(netWorthData.summary.total_liabilities)}
                        </p>
                        <span style={{ fontSize: "10px", color: "var(--text-secondary)" }}>
                          {netWorthData.details.debts.length} kewajiban aktif
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

