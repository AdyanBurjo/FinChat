import { useEffect, useState, useCallback } from "react";
import {
  Calendar, ChevronLeft, ChevronRight, AlertTriangle, CheckCircle,
  Copy, Edit3, Trash2, X, Plus, PiggyBank, ArrowUpRight
} from "lucide-react";
import api from "../services/api";
import type { BudgetResponse, BudgetItem } from "../types";
import { ConfirmModal } from "../components/ui/ConfirmModal";

const MONTH_NAMES = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function Budgets() {
  const [data, setData] = useState<BudgetResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);

  // Form / modal state
  const [editingItem, setEditingItem] = useState<BudgetItem | null>(null);
  const [amountInput, setAmountInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [copying, setCopying] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const fetchBudgets = useCallback(async (year: number, month: number) => {
    setLoading(true);
    try {
      const response = await api.get("/budgets", { params: { year, month } });
      setData(response.data);
    } catch (err: any) {
      console.error("Gagal mengambil data anggaran:", err);
      setMessage({ text: err.response?.data?.message || "Gagal memuat anggaran.", type: "error" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBudgets(selectedYear, selectedMonth);
  }, [selectedYear, selectedMonth, fetchBudgets]);

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

  const handleOpenEdit = (item: BudgetItem) => {
    setEditingItem(item);
    setAmountInput(item.limit > 0 ? item.limit.toString() : "");
  };

  const handleSaveBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    setSaving(true);
    try {
      await api.post("/budgets", {
        category_id: editingItem.category_id,
        month: selectedMonth,
        year: selectedYear,
        amount: Number(amountInput) || 0,
      });

      setMessage({ text: `Anggaran ${editingItem.category.name} berhasil diperbarui!`, type: "success" });
      setEditingItem(null);
      await fetchBudgets(selectedYear, selectedMonth);
    } catch (err: any) {
      setMessage({ text: err.response?.data?.message || "Gagal menyimpan anggaran.", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleCopyPrevious = async () => {
    setCopying(true);
    try {
      const res = await api.post("/budgets/copy-previous", {
        month: selectedMonth,
        year: selectedYear,
      });
      setMessage({ text: res.data.message || "Anggaran berhasil disalin!", type: "success" });
      await fetchBudgets(selectedYear, selectedMonth);
    } catch (err: any) {
      setMessage({ text: err.response?.data?.message || "Gagal menyalin anggaran bulan lalu.", type: "error" });
    } finally {
      setCopying(false);
    }
  };

  const handleDeleteBudget = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`/budgets/${deleteId}`);
      setMessage({ text: "Batas anggaran berhasil dihapus.", type: "success" });
      setDeleteId(null);
      await fetchBudgets(selectedYear, selectedMonth);
    } catch (err: any) {
      setMessage({ text: err.response?.data?.message || "Gagal menghapus anggaran.", type: "error" });
      setDeleteId(null);
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
          <h1 className="section-title" style={{ marginBottom: "6px" }}>
            Anggaran <span className="neon-text">Bulanan</span>
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>
            Tetapkan batas pengeluaran per kategori & hindari over-budget
          </p>
        </div>

        {/* Action Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <button
            onClick={handleCopyPrevious}
            disabled={copying}
            className="btn-ghost"
            style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px" }}
            title="Salin batas anggaran dari bulan sebelumnya"
          >
            <Copy size={15} />
            {copying ? "Menyalin..." : "Salin Bulan Lalu"}
          </button>

          {/* Month Selector */}
          <div
            className="glass"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0",
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
                transition: "all 0.2s",
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
              <span style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-primary)", whiteSpace: "nowrap" }}>
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
                transition: "all 0.2s",
              }}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
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
          {/* Total Budget Card */}
          <div className="glass stat-card" style={{ border: "1px solid rgba(0,245,255,0.2)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
              <span style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-muted)", textTransform: "uppercase" }}>
                Total Target Anggaran
              </span>
              <div style={{ width: "34px", height: "34px", borderRadius: "10px", background: "rgba(0,245,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <PiggyBank size={18} color="var(--neon-cyan)" />
              </div>
            </div>
            <p style={{ fontSize: "24px", fontWeight: "800", color: "var(--neon-cyan)" }}>
              {formatRupiah(data.summary.total_budget)}
            </p>
            <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "6px" }}>
              Batas pengeluaran gabungan
            </p>
          </div>

          {/* Total Spent Card */}
          <div className="glass stat-card" style={{ border: "1px solid rgba(57,255,20,0.2)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
              <span style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-muted)", textTransform: "uppercase" }}>
                Pengeluaran Terpakai
              </span>
              <div style={{ width: "34px", height: "34px", borderRadius: "10px", background: "rgba(57,255,20,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <ArrowUpRight size={18} color="var(--neon-green)" />
              </div>
            </div>
            <p style={{ fontSize: "24px", fontWeight: "800", color: "var(--neon-green)" }}>
              {formatRupiah(data.summary.total_spent)}
            </p>
            <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "6px" }}>
              {data.summary.overall_percentage}% dari total target
            </p>
          </div>

          {/* Sisa Anggaran */}
          <div className="glass stat-card" style={{ border: "1px solid rgba(255,204,0,0.2)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
              <span style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-muted)", textTransform: "uppercase" }}>
                Sisa Anggaran
              </span>
              <div style={{ width: "34px", height: "34px", borderRadius: "10px", background: "rgba(255,204,0,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <CheckCircle size={18} color="#ffcc00" />
              </div>
            </div>
            <p style={{ fontSize: "24px", fontWeight: "800", color: "#ffcc00" }}>
              {formatRupiah(data.summary.remaining)}
            </p>
            <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "6px" }}>
              {data.summary.alerts_count > 0 ? (
                <span style={{ color: "#ff5080", fontWeight: "600" }}>
                  ⚠️ {data.summary.alerts_count} kategori waspada / over!
                </span>
              ) : (
                "Semua kategori terkendali"
              )}
            </p>
          </div>
        </div>
      )}

      {/* Main Budget Category List */}
      <div className="glass animate-fade-in-up delay-2" style={{ padding: "24px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
          <div>
            <h2 style={{ fontSize: "17px", fontWeight: "600", marginBottom: "4px" }}>
              Batas Pengeluaran per Kategori
            </h2>
            <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>
              Progress terupdate otomatis saat transaksi baru dicatat
            </p>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: "64px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div className="spinner" />
          </div>
        ) : !data || data.budgets.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 0" }}>
            <p style={{ color: "var(--text-muted)", fontSize: "14px" }}>
              Belum ada kategori pengeluaran. Buat kategori terlebih dahulu di menu Kategori.
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {data.budgets.map((item) => {
              const isOver = item.status === "exceeded";
              const isWarning = item.status === "warning";
              const percentDisplay = Math.min(item.percentage, 100);

              let barColor = "var(--neon-green)";
              if (isOver) barColor = "#ff5080";
              else if (isWarning) barColor = "#ffcc00";

              return (
                <div
                  key={item.category_id}
                  style={{
                    padding: "18px 20px",
                    borderRadius: "14px",
                    background: "rgba(255,255,255,0.02)",
                    border: isOver
                      ? "1px solid rgba(255,80,128,0.3)"
                      : isWarning
                      ? "1px solid rgba(255,204,0,0.3)"
                      : "1px solid var(--border)",
                    boxShadow: isOver
                      ? "0 0 15px rgba(255,80,128,0.1)"
                      : isWarning
                      ? "0 0 15px rgba(255,204,0,0.08)"
                      : "none",
                    transition: "all 0.2s",
                  }}
                >
                  {/* Top line: Name, Badges & Actions */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: "10px",
                      flexWrap: "wrap",
                      gap: "8px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span style={{ fontSize: "15px", fontWeight: "700", color: "var(--text-primary)" }}>
                        {item.category.name}
                      </span>

                      {/* Status Badges */}
                      {item.has_budget && (
                        <>
                          {isOver && (
                            <span
                              style={{
                                fontSize: "11px",
                                fontWeight: "700",
                                padding: "2px 8px",
                                borderRadius: "99px",
                                background: "rgba(255,80,128,0.15)",
                                border: "1px solid rgba(255,80,128,0.4)",
                                color: "#ff5080",
                                display: "flex",
                                alignItems: "center",
                                gap: "4px",
                              }}
                            >
                              <AlertTriangle size={12} /> Over Budget ({item.percentage}%)
                            </span>
                          )}
                          {isWarning && (
                            <span
                              style={{
                                fontSize: "11px",
                                fontWeight: "700",
                                padding: "2px 8px",
                                borderRadius: "99px",
                                background: "rgba(255,204,0,0.15)",
                                border: "1px solid rgba(255,204,0,0.4)",
                                color: "#ffcc00",
                                display: "flex",
                                alignItems: "center",
                                gap: "4px",
                              }}
                            >
                              <AlertTriangle size={12} /> Waspada ({item.percentage}%)
                            </span>
                          )}
                          {!isOver && !isWarning && (
                            <span
                              style={{
                                fontSize: "11px",
                                fontWeight: "600",
                                padding: "2px 8px",
                                borderRadius: "99px",
                                background: "rgba(57,255,20,0.1)",
                                border: "1px solid rgba(57,255,20,0.25)",
                                color: "var(--neon-green)",
                              }}
                            >
                              {item.percentage}% Aman
                            </span>
                          )}
                        </>
                      )}

                      {!item.has_budget && (
                        <span
                          style={{
                            fontSize: "11px",
                            padding: "2px 8px",
                            borderRadius: "99px",
                            background: "rgba(255,255,255,0.05)",
                            color: "var(--text-muted)",
                          }}
                        >
                          Belum ada batas
                        </span>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <button
                        onClick={() => handleOpenEdit(item)}
                        title={item.has_budget ? "Ubah Batas" : "Tetapkan Batas"}
                        className="btn-ghost"
                        style={{ padding: "6px 10px", fontSize: "12px", display: "flex", alignItems: "center", gap: "4px" }}
                      >
                        {item.has_budget ? <Edit3 size={13} /> : <Plus size={13} />}
                        {item.has_budget ? "Ubah" : "Set Limit"}
                      </button>

                      {item.has_budget && item.id && (
                        <button
                          onClick={() => setDeleteId(item.id!)}
                          title="Hapus Batas"
                          className="btn-ghost"
                          style={{ padding: "6px 8px", color: "var(--text-muted)" }}
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Progress Bar Container */}
                  <div
                    style={{
                      height: "8px",
                      background: "rgba(255,255,255,0.06)",
                      borderRadius: "99px",
                      overflow: "hidden",
                      position: "relative",
                      marginBottom: "10px",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: item.has_budget ? `${percentDisplay}%` : "0%",
                        background: barColor,
                        boxShadow: `0 0 10px ${barColor}`,
                        borderRadius: "99px",
                        transition: "width 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                      }}
                    />
                  </div>

                  {/* Info Numbers */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      fontSize: "12px",
                      color: "var(--text-muted)",
                      flexWrap: "wrap",
                      gap: "4px",
                    }}
                  >
                    <div>
                      Terpakai:{" "}
                      <span style={{ color: "var(--text-primary)", fontWeight: "600" }}>
                        {formatRupiah(item.spent)}
                      </span>
                    </div>

                    <div>
                      {item.has_budget ? (
                        <>
                          Batas:{" "}
                          <span style={{ color: "var(--text-primary)", fontWeight: "600" }}>
                            {formatRupiah(item.limit)}
                          </span>
                          {" • "}
                          Sisa:{" "}
                          <span style={{ color: item.remaining > 0 ? "var(--neon-green)" : "#ff5080", fontWeight: "600" }}>
                            {formatRupiah(item.remaining)}
                          </span>
                        </>
                      ) : (
                        <span>Klik "Set Limit" untuk membatasi pengeluaran</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit / Set Modal */}
      {editingItem && (
        <div
          className="animate-fade-in"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            background: "rgba(5,5,8,0.8)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
          }}
        >
          <div
            className="glass-neon"
            style={{
              width: "100%",
              maxWidth: "420px",
              padding: "28px",
              borderRadius: "16px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
              <h2 style={{ fontSize: "17px", fontWeight: "600" }}>
                Target Anggaran: <span className="neon-text">{editingItem.category.name}</span>
              </h2>
              <button onClick={() => setEditingItem(null)} className="btn-ghost" style={{ padding: "6px" }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveBudget} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label className="label">
                  Batas Pengeluaran Bulan {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
                </label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                  placeholder="Misal: 1500000"
                  className="input-neon"
                  autoFocus
                  required
                />
                <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "6px" }}>
                  Pengeluaran saat ini: {formatRupiah(editingItem.spent)}
                </p>
              </div>

              <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
                <button type="submit" disabled={saving} className="btn-neon" style={{ flex: 1 }}>
                  {saving ? "Menyimpan..." : "Simpan Anggaran"}
                </button>
                <button type="button" onClick={() => setEditingItem(null)} className="btn-ghost">
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDeleteBudget}
        title="Hapus Batas Anggaran"
        message="Yakin ingin menghapus batas anggaran kategori ini? Riwayat pengeluaran tidak akan terhapus."
        confirmText="Hapus Batas"
      />

      {/* Alert toast notifications */}
      {message && (
        <div style={{ position: "fixed", bottom: "24px", right: "24px", zIndex: 9999 }} className="animate-fade-in-up">
          <div
            className="glass"
            style={{
              border: `1px solid ${message.type === "error" ? "rgba(255,0,80,0.4)" : "rgba(57,255,20,0.4)"}`,
              padding: "14px 18px",
              display: "flex",
              alignItems: "center",
              gap: "12px",
              background: message.type === "error" ? "rgba(20,5,10,0.95)" : "rgba(5,20,10,0.95)",
            }}
          >
            <span style={{ fontSize: "14px", color: message.type === "error" ? "#ff5080" : "var(--neon-green)" }}>
              {message.text}
            </span>
            <button
              onClick={() => setMessage(null)}
              style={{ background: "transparent", border: "none", color: "var(--text-secondary)", cursor: "pointer" }}
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

