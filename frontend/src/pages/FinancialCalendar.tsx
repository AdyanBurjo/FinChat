import { useEffect, useState, useCallback } from "react";
import {
  Calendar as CalendarIcon, ChevronLeft, ChevronRight,
  Flame, TrendingDown, TrendingUp, HandCoins, CheckCircle2,
  X, AlertTriangle, Layers, Zap
} from "lucide-react";
import api from "../services/api";
import type { CalendarResponse, CalendarDayData } from "../types";

const MONTH_NAMES = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

const DAY_NAMES = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(dateStr: string) {
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    return `${parts[2]} ${MONTH_NAMES[Number(parts[1]) - 1]} ${parts[0]}`;
  }
  return dateStr;
}

export default function FinancialCalendar() {
  const [data, setData] = useState<CalendarResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);

  // Selected date modal / preview
  const [selectedDay, setSelectedDay] = useState<CalendarDayData | null>(null);

  const fetchCalendar = useCallback(async (year: number, month: number) => {
    setLoading(true);
    try {
      const res = await api.get<CalendarResponse>("/calendar", {
        params: { year, month },
      });
      setData(res.data);
    } catch (err) {
      console.error("Gagal memuat kalender finansial:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCalendar(selectedYear, selectedMonth);
  }, [selectedYear, selectedMonth, fetchCalendar]);

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

  // Heatmap styling based on level 0 - 4
  const getHeatmapStyle = (level: number, isPeak: boolean) => {
    if (isPeak) {
      return {
        background: "rgba(255,80,128,0.22)",
        borderColor: "rgba(255,80,128,0.8)",
        boxShadow: "0 0 16px rgba(255,80,128,0.3)",
      };
    }
    switch (level) {
      case 4:
        return {
          background: "rgba(255,80,128,0.18)",
          borderColor: "rgba(255,80,128,0.5)",
          boxShadow: "0 0 10px rgba(255,80,128,0.2)",
        };
      case 3:
        return {
          background: "rgba(255,204,0,0.14)",
          borderColor: "rgba(255,204,0,0.4)",
        };
      case 2:
        return {
          background: "rgba(57,255,20,0.12)",
          borderColor: "rgba(57,255,20,0.3)",
        };
      case 1:
        return {
          background: "rgba(57,255,20,0.05)",
          borderColor: "rgba(57,255,20,0.15)",
        };
      default:
        return {
          background: "rgba(255,255,255,0.02)",
          borderColor: "rgba(255,255,255,0.06)",
        };
    }
  };

  return (
    <div className="page">
      {/* Header */}
      <div
        className="animate-fade-in-up"
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: "32px",
          flexWrap: "wrap",
          gap: "16px",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
            <CalendarIcon size={22} color="var(--neon-green)" />
            <h1 className="section-title" style={{ margin: 0 }}>
              Financial <span className="neon-text">Calendar</span>
            </h1>
          </div>
          <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>
            Spending Heatmap pengeluaran harian & jadwal jatuh tempo tagihan
          </p>
        </div>

        {/* Month Selector */}
        <div
          className="glass"
          style={{
            display: "flex",
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
            <CalendarIcon size={13} color="var(--neon-green)" />
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

      {/* Summary Stat Cards */}
      {data && (
        <div
          className="animate-fade-in-up delay-1"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
            gap: "16px",
            marginBottom: "28px",
          }}
        >
          {/* Peak Spending Day (Hari Terboros) */}
          <div className="glass stat-card" style={{ border: "1px solid rgba(255,80,128,0.25)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
              <span style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-muted)", textTransform: "uppercase" }}>
                Hari Paling Boros
              </span>
              <div
                style={{
                  width: "34px",
                  height: "34px",
                  borderRadius: "10px",
                  background: "rgba(255,80,128,0.1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Flame size={18} color="#ff5080" />
              </div>
            </div>
            <p style={{ fontSize: "22px", fontWeight: "800", color: "#ff5080" }}>
              {data.summary.peak_day ? formatRupiah(data.summary.peak_day.amount) : "Rp 0"}
            </p>
            <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "6px" }}>
              {data.summary.peak_day
                ? `Puncak belanja pada tanggal ${data.summary.peak_day.day} ${MONTH_NAMES[selectedMonth - 1]}`
                : "Belum ada pengeluaran"}
            </p>
          </div>

          {/* Total Pengeluaran Bulan Ini */}
          <div className="glass stat-card" style={{ border: "1px solid rgba(0,245,255,0.25)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
              <span style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-muted)", textTransform: "uppercase" }}>
                Total Pengeluaran Bulan Ini
              </span>
              <div
                style={{
                  width: "34px",
                  height: "34px",
                  borderRadius: "10px",
                  background: "rgba(0,245,255,0.1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <TrendingDown size={18} color="var(--neon-cyan)" />
              </div>
            </div>
            <p style={{ fontSize: "22px", fontWeight: "800", color: "var(--neon-cyan)" }}>
              {formatRupiah(data.summary.total_expense)}
            </p>
            <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "6px" }}>
              Pemasukan: <span style={{ color: "var(--neon-green)", fontWeight: "600" }}>{formatRupiah(data.summary.total_income)}</span>
            </p>
          </div>

          {/* Agenda & Jatuh Tempo */}
          <div className="glass stat-card" style={{ border: "1px solid rgba(255,204,0,0.25)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
              <span style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-muted)", textTransform: "uppercase" }}>
                Agenda & Jatuh Tempo
              </span>
              <div
                style={{
                  width: "34px",
                  height: "34px",
                  borderRadius: "10px",
                  background: "rgba(255,204,0,0.1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <HandCoins size={18} color="#ffcc00" />
              </div>
            </div>
            <p style={{ fontSize: "22px", fontWeight: "800", color: "#ffcc00" }}>
              {data.summary.total_events} Jadwal Aktif
            </p>
            <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "6px" }}>
              Jatuh tempo hutang & piutang bulan ini
            </p>
          </div>
        </div>
      )}

      {/* Heatmap Legend Bar */}
      <div
        className="glass animate-fade-in-up delay-2"
        style={{
          padding: "12px 20px",
          marginBottom: "18px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "12px",
          fontSize: "12px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--text-secondary)" }}>
          <Layers size={14} color="var(--neon-green)" />
          <span style={{ fontWeight: "600" }}>Intensitas Pengeluaran (Heatmap):</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "14px", flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ width: "12px", height: "12px", borderRadius: "3px", background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)" }} />
            <span style={{ color: "var(--text-muted)" }}>Rp 0 (Hemat)</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ width: "12px", height: "12px", borderRadius: "3px", background: "rgba(57,255,20,0.2)", border: "1px solid rgba(57,255,20,0.4)" }} />
            <span style={{ color: "var(--text-muted)" }}>Rendah</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ width: "12px", height: "12px", borderRadius: "3px", background: "rgba(255,204,0,0.3)", border: "1px solid rgba(255,204,0,0.5)" }} />
            <span style={{ color: "var(--text-muted)" }}>Sedang</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ width: "12px", height: "12px", borderRadius: "3px", background: "rgba(255,80,128,0.4)", border: "1px solid rgba(255,80,128,0.6)" }} />
            <span style={{ color: "var(--text-muted)" }}>Tinggi (Boros)</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ width: "12px", height: "12px", borderRadius: "3px", background: "rgba(255,80,128,0.7)", border: "1px solid #ff5080", boxShadow: "0 0 6px #ff5080" }} />
            <span style={{ color: "#ff5080", fontWeight: "700" }}>Paling Boros (Peak)</span>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="glass animate-fade-in-up delay-3" style={{ padding: "20px", overflowX: "auto" }}>
        {loading ? (
          <div style={{ padding: "64px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div className="spinner" />
          </div>
        ) : !data ? (
          <p style={{ textAlign: "center", color: "var(--text-muted)", padding: "32px 0" }}>
            Gagal memuat kalender.
          </p>
        ) : (
          <div>
            {/* Days of week header */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(7, minmax(110px, 1fr))",
                gap: "8px",
                marginBottom: "8px",
                textAlign: "center",
              }}
            >
              {DAY_NAMES.map((d, idx) => (
                <div
                  key={d}
                  style={{
                    fontSize: "12px",
                    fontWeight: "700",
                    color: idx === 0 || idx === 6 ? "#ff5080" : "var(--text-muted)",
                    padding: "8px 0",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                  }}
                >
                  {d}
                </div>
              ))}
            </div>

            {/* Grid Days */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(7, minmax(110px, 1fr))",
                gap: "8px",
              }}
            >
              {/* Empty offset padding cells before start day */}
              {Array.from({ length: data.meta.start_day_of_week }).map((_, i) => (
                <div
                  key={`empty-${i}`}
                  style={{
                    minHeight: "95px",
                    borderRadius: "10px",
                    background: "rgba(255,255,255,0.01)",
                    border: "1px dashed rgba(255,255,255,0.03)",
                  }}
                />
              ))}

              {/* Real Month Days */}
              {data.calendar_days.map((dayInfo) => {
                const isPeak =
                  data.summary.peak_day !== null &&
                  data.summary.peak_day.day === dayInfo.day &&
                  dayInfo.expense > 0;
                const heatmapStyle = getHeatmapStyle(dayInfo.heatmap_level, isPeak);
                const isToday =
                  selectedYear === new Date().getFullYear() &&
                  selectedMonth === new Date().getMonth() + 1 &&
                  dayInfo.day === new Date().getDate();

                return (
                  <div
                    key={dayInfo.date}
                    onClick={() => setSelectedDay(dayInfo)}
                    style={{
                      minHeight: "95px",
                      borderRadius: "12px",
                      padding: "8px 10px",
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                      position: "relative",
                      border: "1px solid",
                      ...heatmapStyle,
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
                      (e.currentTarget as HTMLElement).style.borderColor = "var(--neon-green)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
                      (e.currentTarget as HTMLElement).style.borderColor = heatmapStyle.borderColor;
                    }}
                  >
                    {/* Top Row: Date number & Today tag / flame */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span
                        style={{
                          fontSize: "13px",
                          fontWeight: "800",
                          color: isToday
                            ? "#000"
                            : isPeak
                              ? "#ff5080"
                              : "var(--text-primary)",
                          background: isToday ? "var(--neon-green)" : "transparent",
                          width: isToday ? "22px" : "auto",
                          height: isToday ? "22px" : "auto",
                          borderRadius: isToday ? "50%" : "0",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {dayInfo.day}
                      </span>

                      {isPeak && <Flame size={14} color="#ff5080" />}
                    </div>

                    {/* Middle: Event badges (hutang / piutang / tagihan rutin) */}
                    {dayInfo.has_events && (
                      <div style={{ display: "flex", flexDirection: "column", gap: "2px", margin: "4px 0" }}>
                        {dayInfo.events.slice(0, 2).map((ev, i) => {
                          let badgeBg = "rgba(0,245,255,0.2)";
                          let badgeColor = "var(--neon-cyan)";
                          let badgeText = ev.title;

                          if (ev.type === "debt") {
                            badgeBg = "rgba(255,80,128,0.25)";
                            badgeColor = "#ff80a0";
                            badgeText = `💳 Hutang: ${ev.person_name || ev.title}`;
                          } else if (ev.type === "receivable") {
                            badgeBg = "rgba(0,245,255,0.25)";
                            badgeColor = "var(--neon-cyan)";
                            badgeText = `🤝 Piutang: ${ev.person_name || ev.title}`;
                          } else if (ev.type === "recurring") {
                            badgeBg = "rgba(191,0,255,0.25)";
                            badgeColor = "#d680ff";
                            badgeText = `⚡ ${ev.title}`;
                          } else if (ev.type === "salary") {
                            badgeBg = "rgba(57,255,20,0.25)";
                            badgeColor = "var(--neon-green)";
                            badgeText = `💰 ${ev.title}`;
                          }

                          return (
                            <span
                              key={i}
                              title={`${ev.title} (${formatRupiah(ev.amount)})`}
                              style={{
                                fontSize: "9px",
                                fontWeight: "700",
                                padding: "1px 5px",
                                borderRadius: "4px",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                background: badgeBg,
                                color: badgeColor,
                                border: `1px solid ${badgeColor}40`,
                              }}
                            >
                              {badgeText}
                            </span>
                          );
                        })}
                      </div>
                    )}

                    {/* Bottom: Expense & Income tags */}
                    <div style={{ marginTop: "auto", paddingTop: "4px" }}>
                      {dayInfo.expense > 0 && (
                        <p
                          style={{
                            fontSize: "11px",
                            fontWeight: "700",
                            color: isPeak ? "#ff5080" : "#ff80a0",
                            margin: 0,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          −{formatRupiah(dayInfo.expense)}
                        </p>
                      )}

                      {dayInfo.income > 0 && (
                        <p
                          style={{
                            fontSize: "11px",
                            fontWeight: "700",
                            color: "var(--neon-green)",
                            margin: 0,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          +{formatRupiah(dayInfo.income)}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Day Details Modal */}
      {selectedDay && (
        <div
          className="animate-fade-in"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            background: "rgba(5,5,8,0.85)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
          }}
        >
          <div
            className="glass-neon"
            style={{ width: "100%", maxWidth: "480px", padding: "26px", borderRadius: "18px" }}
          >
            {/* Modal Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <CalendarIcon size={18} color="var(--neon-green)" />
                <h2 style={{ fontSize: "16px", fontWeight: "700", margin: 0 }}>
                  Detail Tanggal: <span className="neon-text">{formatDate(selectedDay.date)}</span>
                </h2>
              </div>
              <button onClick={() => setSelectedDay(null)} className="btn-ghost" style={{ padding: "6px" }}>
                <X size={18} />
              </button>
            </div>

            {/* Quick summary numbers for this day */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "10px",
                marginBottom: "20px",
              }}
            >
              <div
                style={{
                  padding: "12px",
                  borderRadius: "10px",
                  background: "rgba(255,80,128,0.06)",
                  border: "1px solid rgba(255,80,128,0.25)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                  <TrendingDown size={14} color="#ff5080" />
                  <span style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: "600" }}>
                    Total Pengeluaran
                  </span>
                </div>
                <p style={{ fontSize: "16px", fontWeight: "800", color: "#ff5080", margin: 0 }}>
                  {formatRupiah(selectedDay.expense)}
                </p>
              </div>

              <div
                style={{
                  padding: "12px",
                  borderRadius: "10px",
                  background: "rgba(57,255,20,0.06)",
                  border: "1px solid rgba(57,255,20,0.25)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                  <TrendingUp size={14} color="var(--neon-green)" />
                  <span style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: "600" }}>
                    Total Pemasukan
                  </span>
                </div>
                <p style={{ fontSize: "16px", fontWeight: "800", color: "var(--neon-green)", margin: 0 }}>
                  {formatRupiah(selectedDay.income)}
                </p>
              </div>
            </div>

            {/* Event Markers Section */}
            {selectedDay.has_events && (
              <div style={{ marginBottom: "20px" }}>
                <p style={{ fontSize: "12px", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "8px" }}>
                  Agenda & Jatuh Tempo Pada Hari Ini:
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {selectedDay.events.map((ev, i) => {
                    let borderCol = "rgba(0,245,255,0.3)";
                    let bgCol = "rgba(0,245,255,0.08)";
                    let textCol = "var(--neon-cyan)";

                    if (ev.type === "debt") {
                      borderCol = "rgba(255,80,128,0.3)";
                      bgCol = "rgba(255,80,128,0.08)";
                      textCol = "#ff5080";
                    } else if (ev.type === "recurring") {
                      borderCol = "rgba(191,0,255,0.3)";
                      bgCol = "rgba(191,0,255,0.08)";
                      textCol = "#d680ff";
                    } else if (ev.type === "salary") {
                      borderCol = "rgba(57,255,20,0.3)";
                      bgCol = "rgba(57,255,20,0.08)";
                      textCol = "var(--neon-green)";
                    }

                    return (
                      <div
                        key={i}
                        style={{
                          padding: "10px 12px",
                          borderRadius: "8px",
                          background: bgCol,
                          border: `1px solid ${borderCol}`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          fontSize: "12px",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          {ev.type === "debt" ? (
                            <AlertTriangle size={15} color="#ff5080" />
                          ) : ev.type === "recurring" ? (
                            <Zap size={15} color="#d680ff" />
                          ) : (
                            <CheckCircle2 size={15} color={textCol} />
                          )}
                          <div>
                            <span style={{ color: "var(--text-primary)", fontWeight: "600" }}>{ev.title}</span>
                            {ev.category && (
                              <span style={{ color: "var(--text-muted)", fontSize: "11px", marginLeft: "6px" }}>
                                ({ev.category})
                              </span>
                            )}
                          </div>
                        </div>
                        <span style={{ fontWeight: "700", color: textCol }}>
                          {formatRupiah(ev.amount)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Transactions Breakdown on that day */}
            <div>
              <p style={{ fontSize: "12px", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "8px" }}>
                Transaksi Tercatat ({selectedDay.transactions_count}):
              </p>

              {selectedDay.transactions.length === 0 ? (
                <p style={{ color: "var(--text-muted)", fontSize: "13px", fontStyle: "italic" }}>
                  Tidak ada transaksi kas pada tanggal ini.
                </p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "180px", overflowY: "auto" }}>
                  {selectedDay.transactions.map((t) => (
                    <div
                      key={t.id}
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
                      <div>
                        <p style={{ fontWeight: "600", color: "var(--text-primary)", margin: 0 }}>
                          {t.description || "Tanpa Keterangan"}
                        </p>
                        <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                          {t.category?.name || "Lainnya"} {t.wallet ? `• ${t.wallet.name}` : ""}
                        </span>
                      </div>

                      <span
                        style={{
                          fontWeight: "700",
                          color: t.type === "income" ? "var(--neon-green)" : "#ff5080",
                        }}
                      >
                        {t.type === "income" ? "+" : "−"}
                        {formatRupiah(Number(t.amount))}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

