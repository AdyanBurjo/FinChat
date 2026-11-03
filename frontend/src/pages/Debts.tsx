import { useEffect, useState, useCallback } from "react";
import {
  HandCoins, Plus, Pencil, Trash2, Calendar, CheckCircle2,
  Clock, ChevronDown, ChevronUp, History,
  ArrowDownLeft, ArrowUpRight, X
} from "lucide-react";
import api from "../services/api";
import type { DebtItem, DebtSummary, DebtResponse, Wallet as WalletType } from "../types";
import { ConfirmModal } from "../components/ui/ConfirmModal";

function formatRupiah(value: number | string) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return "—";
  const parts = dateStr.split("T")[0].split("-");
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

export default function Debts() {
  const [debts, setDebts] = useState<DebtItem[]>([]);
  const [summary, setSummary] = useState<DebtSummary>({
    total_debt: 0,
    total_receivable: 0,
    overdue_count: 0,
    upcoming_count: 0,
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"all" | "debt" | "receivable" | "paid">("all");

  // Form states (Add/Edit Debt)
  const [showForm, setShowForm] = useState(false);
  const [editingDebt, setEditingDebt] = useState<DebtItem | null>(null);
  const [formData, setFormData] = useState({
    type: "debt" as "debt" | "receivable",
    person_name: "",
    amount: "",
    due_date: "",
    description: "",
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");

  // Payment states (Cicilan)
  const [payingDebt, setPayingDebt] = useState<DebtItem | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [isFullPayment, setIsFullPayment] = useState(false);
  const [payDate, setPayDate] = useState(new Date().toISOString().split("T")[0]);
  const [payWalletId, setPayWalletId] = useState("");
  const [payNotes, setPayNotes] = useState("");
  const [payLoading, setPayLoading] = useState(false);
  const [payError, setPayError] = useState("");
  const [wallets, setWallets] = useState<WalletType[]>([]);

  // Expanded card for payments history
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // Delete modal state
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [toastMessage, setToastMessage] = useState("");

  const fetchWallets = useCallback(async () => {
    try {
      const response = await api.get("/wallets");
      const list = response.data.wallets || response.data || [];
      setWallets(list);
    } catch (err) {
      console.error("Gagal memuat dompet:", err);
    }
  }, []);

  const fetchDebts = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get<DebtResponse>("/debts");
      setDebts(response.data.debts || []);
      setSummary(response.data.summary);
    } catch (err) {
      console.error("Gagal memuat hutang-piutang:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDebts();
    fetchWallets();
  }, [fetchDebts, fetchWallets]);

  const openAdd = () => {
    setEditingDebt(null);
    setFormData({
      type: "debt",
      person_name: "",
      amount: "",
      due_date: "",
      description: "",
    });
    setFormError("");
    setShowForm(true);
  };

  const openEdit = (item: DebtItem) => {
    setEditingDebt(item);
    setFormData({
      type: item.type,
      person_name: item.person_name,
      amount: item.amount.toString(),
      due_date: item.due_date ? item.due_date.split("T")[0] : "",
      description: item.description || "",
    });
    setFormError("");
    setShowForm(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError("");

    try {
      const payload = {
        type: formData.type,
        person_name: formData.person_name.trim(),
        amount: Number(formData.amount),
        due_date: formData.due_date || null,
        description: formData.description.trim() || null,
      };

      if (editingDebt) {
        await api.put(`/debts/${editingDebt.id}`, payload);
        setToastMessage("Catatan berhasil diperbarui!");
      } else {
        await api.post("/debts", payload);
        setToastMessage("Catatan berhasil ditambahkan!");
      }

      setShowForm(false);
      await fetchDebts();
    } catch (err: any) {
      setFormError(err.response?.data?.message || "Gagal menyimpan data.");
    } finally {
      setFormLoading(false);
    }
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingDebt) return;

    setPayLoading(true);
    setPayError("");

    try {
      await api.post(`/debts/${payingDebt.id}/payments`, {
        amount: Number(payAmount),
        payment_date: payDate,
        wallet_id: payWalletId ? Number(payWalletId) : null,
        notes: payNotes.trim() || null,
      });

      setToastMessage("Pembayaran/cicilan berhasil dicatat & saldo dompet terupdate!");
      setPayingDebt(null);
      setPayAmount("");
      setPayNotes("");
      setPayWalletId("");
      await fetchDebts();
      await fetchWallets();
    } catch (err: any) {
      setPayError(err.response?.data?.message || "Gagal mencatat pembayaran.");
    } finally {
      setPayLoading(false);
    }
  };

  const handleDeleteDebt = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`/debts/${deleteId}`);
      setToastMessage("Catatan berhasil dihapus.");
      setDeleteId(null);
      await fetchDebts();
    } catch (err: any) {
      setToastMessage(err.response?.data?.message || "Gagal menghapus catatan.");
      setDeleteId(null);
    }
  };

  const handleDeletePayment = async (debtId: number, paymentId: number) => {
    try {
      await api.delete(`/debts/${debtId}/payments/${paymentId}`);
      setToastMessage("Riwayat cicilan berhasil dihapus.");
      await fetchDebts();
    } catch (err: any) {
      setToastMessage(err.response?.data?.message || "Gagal menghapus cicilan.");
    }
  };

  // Filter items based on activeTab
  const filteredDebts = debts.filter((d) => {
    if (activeTab === "paid") return d.status === "paid";
    if (activeTab === "debt") return d.type === "debt" && d.status !== "paid";
    if (activeTab === "receivable") return d.type === "receivable" && d.status !== "paid";
    return true; // "all"
  });

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
            <HandCoins size={22} color="var(--neon-green)" />
            <h1 className="section-title" style={{ margin: 0 }}>
              Hutang & <span className="neon-text">Piutang</span>
            </h1>
          </div>
          <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>
            Kelola pinjaman saya & pinjaman orang lain dengan pelacakan cicilan
          </p>
        </div>

        <button className="btn-neon" onClick={openAdd}>
          <Plus size={16} />
          Catat Baru
        </button>
      </div>

      {/* Summary Cards */}
      <div
        className="animate-fade-in-up delay-1"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: "16px",
          marginBottom: "28px",
        }}
      >
        {/* Hutang Saya */}
        <div className="glass stat-card" style={{ border: "1px solid rgba(255,80,128,0.25)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
            <span style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-muted)", textTransform: "uppercase" }}>
              Total Hutang Saya
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
          <p style={{ fontSize: "24px", fontWeight: "800", color: "#ff5080", letterSpacing: "-0.02em" }}>
            {formatRupiah(summary.total_debt)}
          </p>
          <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "6px" }}>
            Harus saya kembalikan
          </p>
        </div>

        {/* Piutang Saya */}
        <div className="glass stat-card" style={{ border: "1px solid rgba(57,255,20,0.25)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
            <span style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-muted)", textTransform: "uppercase" }}>
              Total Piutang Saya
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
              <ArrowUpRight size={18} color="var(--neon-green)" />
            </div>
          </div>
          <p style={{ fontSize: "24px", fontWeight: "800", color: "var(--neon-green)", letterSpacing: "-0.02em" }}>
            {formatRupiah(summary.total_receivable)}
          </p>
          <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "6px" }}>
            Uang saya yang belum dibayar orang
          </p>
        </div>

        {/* Jatuh Tempo Warning */}
        <div className="glass stat-card" style={{ border: "1px solid rgba(255,204,0,0.25)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
            <span style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-muted)", textTransform: "uppercase" }}>
              Jatuh Tempo Mendekati
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
              <Clock size={18} color="#ffcc00" />
            </div>
          </div>
          <p style={{ fontSize: "24px", fontWeight: "800", color: "#ffcc00", letterSpacing: "-0.02em" }}>
            {summary.upcoming_count + summary.overdue_count} Catatan
          </p>
          <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "6px" }}>
            {summary.overdue_count > 0 ? (
              <span style={{ color: "#ff5080", fontWeight: "600" }}>{summary.overdue_count} Lewat Jatuh Tempo!</span>
            ) : (
              "Semua jadwal terkendali"
            )}
          </p>
        </div>
      </div>

      {/* Tabs Filter */}
      <div
        className="animate-fade-in-up delay-2"
        style={{
          display: "flex",
          gap: "8px",
          marginBottom: "20px",
          flexWrap: "wrap",
        }}
      >
        <button
          onClick={() => setActiveTab("all")}
          className={`btn-ghost ${activeTab === "all" ? "active-tab" : ""}`}
          style={{
            borderRadius: "10px",
            padding: "8px 16px",
            fontSize: "13px",
            background: activeTab === "all" ? "rgba(255,255,255,0.1)" : "transparent",
            borderColor: activeTab === "all" ? "var(--neon-green)" : "var(--border)",
            color: activeTab === "all" ? "var(--neon-green)" : "var(--text-secondary)",
          }}
        >
          Semua ({debts.length})
        </button>

        <button
          onClick={() => setActiveTab("debt")}
          className={`btn-ghost ${activeTab === "debt" ? "active-tab" : ""}`}
          style={{
            borderRadius: "10px",
            padding: "8px 16px",
            fontSize: "13px",
            background: activeTab === "debt" ? "rgba(255,80,128,0.1)" : "transparent",
            borderColor: activeTab === "debt" ? "#ff5080" : "var(--border)",
            color: activeTab === "debt" ? "#ff5080" : "var(--text-secondary)",
          }}
        >
          Hutang Saya ({debts.filter((d) => d.type === "debt" && d.status !== "paid").length})
        </button>

        <button
          onClick={() => setActiveTab("receivable")}
          className={`btn-ghost ${activeTab === "receivable" ? "active-tab" : ""}`}
          style={{
            borderRadius: "10px",
            padding: "8px 16px",
            fontSize: "13px",
            background: activeTab === "receivable" ? "rgba(57,255,20,0.1)" : "transparent",
            borderColor: activeTab === "receivable" ? "var(--neon-green)" : "var(--border)",
            color: activeTab === "receivable" ? "var(--neon-green)" : "var(--text-secondary)",
          }}
        >
          Piutang ({debts.filter((d) => d.type === "receivable" && d.status !== "paid").length})
        </button>

        <button
          onClick={() => setActiveTab("paid")}
          className={`btn-ghost ${activeTab === "paid" ? "active-tab" : ""}`}
          style={{
            borderRadius: "10px",
            padding: "8px 16px",
            fontSize: "13px",
            background: activeTab === "paid" ? "rgba(0,245,255,0.1)" : "transparent",
            borderColor: activeTab === "paid" ? "var(--neon-cyan)" : "var(--border)",
            color: activeTab === "paid" ? "var(--neon-cyan)" : "var(--text-secondary)",
          }}
        >
          Lunas ({debts.filter((d) => d.status === "paid").length})
        </button>
      </div>

      {/* Main List */}
      {loading ? (
        <div style={{ padding: "64px", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="spinner" />
        </div>
      ) : filteredDebts.length === 0 ? (
        <div className="glass animate-fade-in-up" style={{ padding: "64px", textAlign: "center" }}>
          <div style={{ fontSize: "40px", marginBottom: "12px", opacity: 0.4 }}>🤝</div>
          <p style={{ color: "var(--text-secondary)", marginBottom: "16px" }}>
            Tidak ada catatan pada tab ini.
          </p>
          <button className="btn-neon" onClick={openAdd}>
            Tambah Catatan Baru
          </button>
        </div>
      ) : (
        <div
          className="animate-fade-in-up delay-3"
          style={{ display: "flex", flexDirection: "column", gap: "16px" }}
        >
          {filteredDebts.map((item) => {
            const isDebt = item.type === "debt";
            const isPaid = item.status === "paid";
            const isPartial = item.status === "partial";
            const pct = item.percentage || 0;
            const remaining = item.remaining ?? (Number(item.amount) - Number(item.paid_amount));
            const isExpanded = expandedId === item.id;

            // Status badge styling
            let statusColor = "#ff5080";
            let statusText = "Belum Lunas";
            if (isPaid) {
              statusColor = "var(--neon-green)";
              statusText = "Lunas (100%)";
            } else if (isPartial) {
              statusColor = "#ffcc00";
              statusText = `Sebagian (${pct}%)`;
            }

            return (
              <div
                key={item.id}
                className="glass"
                style={{
                  padding: "20px",
                  borderRadius: "14px",
                  border: isPaid
                    ? "1px solid rgba(255,255,255,0.08)"
                    : isDebt
                      ? "1px solid rgba(255,80,128,0.25)"
                      : "1px solid rgba(57,255,20,0.25)",
                  transition: "all 0.2s",
                }}
              >
                {/* Header row */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    marginBottom: "12px",
                    flexWrap: "wrap",
                    gap: "10px",
                  }}
                >
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: "700",
                          textTransform: "uppercase",
                          padding: "2px 8px",
                          borderRadius: "6px",
                          background: isDebt ? "rgba(255,80,128,0.15)" : "rgba(57,255,20,0.15)",
                          color: isDebt ? "#ff5080" : "var(--neon-green)",
                          border: `1px solid ${isDebt ? "rgba(255,80,128,0.3)" : "rgba(57,255,20,0.3)"}`,
                        }}
                      >
                        {isDebt ? "Hutang Saya" : "Piutang Saya"}
                      </span>
                      <h3 style={{ fontSize: "16px", fontWeight: "700", color: "var(--text-primary)" }}>
                        {item.person_name}
                      </h3>
                    </div>

                    {item.description && (
                      <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>{item.description}</p>
                    )}
                  </div>

                  {/* Actions */}
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    {!isPaid && (
                      <button
                        onClick={() => {
                          setPayingDebt(item);
                          setPayAmount("");
                          setIsFullPayment(false);
                          setPayError("");
                        }}
                        className="btn-neon"
                        style={{ fontSize: "12px", padding: "6px 12px" }}
                      >
                        Bayar / Cicil
                      </button>
                    )}

                    <button
                      onClick={() => openEdit(item)}
                      title="Edit"
                      className="btn-ghost"
                      style={{ padding: "6px 8px" }}
                    >
                      <Pencil size={13} />
                    </button>

                    <button
                      onClick={() => setDeleteId(item.id)}
                      title="Hapus"
                      className="btn-ghost"
                      style={{ padding: "6px 8px", color: "var(--text-muted)" }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* Progress bar container */}
                <div style={{ marginBottom: "12px" }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "12px",
                      marginBottom: "6px",
                    }}
                  >
                    <span style={{ color: "var(--text-muted)" }}>
                      Pelunasan:{" "}
                      <span style={{ color: statusColor, fontWeight: "700" }}>
                        {formatRupiah(item.paid_amount)} / {formatRupiah(item.amount)}
                      </span>
                    </span>
                    <span style={{ color: statusColor, fontWeight: "700" }}>{statusText}</span>
                  </div>

                  <div
                    style={{
                      height: "8px",
                      borderRadius: "99px",
                      background: "rgba(255,255,255,0.06)",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${pct}%`,
                        borderRadius: "99px",
                        background: isPaid ? "var(--neon-green)" : isDebt ? "#ff5080" : "var(--neon-cyan)",
                        boxShadow: `0 0 10px ${isPaid ? "var(--neon-green)" : isDebt ? "#ff5080" : "var(--neon-cyan)"}`,
                        transition: "width 0.3s ease",
                      }}
                    />
                  </div>
                </div>

                {/* Bottom details */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    fontSize: "12px",
                    color: "var(--text-muted)",
                    flexWrap: "wrap",
                    gap: "8px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                    <div>
                      Sisa Tagihan:{" "}
                      <span style={{ color: remaining > 0 ? "var(--text-primary)" : "var(--neon-green)", fontWeight: "700" }}>
                        {formatRupiah(remaining)}
                      </span>
                    </div>

                    {item.due_date && (
                      <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        <Calendar size={13} />
                        Jatuh Tempo:{" "}
                        <span style={{ color: "var(--text-secondary)", fontWeight: "600" }}>
                          {formatDate(item.due_date)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Toggle Payments History Button */}
                  {item.payments && item.payments.length > 0 && (
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : item.id)}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "var(--text-secondary)",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                        fontSize: "12px",
                        padding: "2px 6px",
                      }}
                    >
                      <History size={13} />
                      Riwayat ({item.payments.length})
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                  )}
                </div>

                {/* Expanded Payment History List */}
                {isExpanded && item.payments && (
                  <div
                    className="animate-fade-in"
                    style={{
                      marginTop: "16px",
                      paddingTop: "16px",
                      borderTop: "1px solid rgba(255,255,255,0.06)",
                    }}
                  >
                    <p style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-muted)", marginBottom: "8px" }}>
                      Riwayat Pembayaran Cicilan:
                    </p>
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      {item.payments.map((p) => (
                        <div
                          key={p.id}
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
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <CheckCircle2 size={14} color="var(--neon-green)" />
                            <div>
                              <span style={{ color: "var(--text-primary)", fontWeight: "600" }}>
                                {formatRupiah(p.amount)}
                              </span>
                              {p.wallet && (
                                <span
                                  style={{
                                    fontSize: "10px",
                                    fontWeight: "600",
                                    padding: "1px 6px",
                                    borderRadius: "4px",
                                    background: `${p.wallet.color || "#00f5ff"}20`,
                                    border: `1px solid ${p.wallet.color || "#00f5ff"}40`,
                                    color: p.wallet.color || "var(--neon-cyan)",
                                    marginLeft: "8px",
                                  }}
                                >
                                  {p.wallet.name}
                                </span>
                              )}
                              {p.notes && (
                                <span style={{ color: "var(--text-muted)", marginLeft: "8px" }}>
                                  ({p.notes})
                                </span>
                              )}
                            </div>
                          </div>

                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <span style={{ color: "var(--text-muted)" }}>{formatDate(p.payment_date)}</span>
                            <button
                              onClick={() => handleDeletePayment(item.id, p.id)}
                              title="Hapus Cicilan"
                              style={{
                                background: "transparent",
                                border: "none",
                                color: "var(--text-muted)",
                                cursor: "pointer",
                              }}
                            >
                              <X size={13} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Add / Edit Form */}
      {showForm && (
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
            style={{ width: "100%", maxWidth: "460px", padding: "28px", borderRadius: "16px" }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
              <h2 style={{ fontSize: "17px", fontWeight: "600" }}>
                {editingDebt ? "Ubah Catatan" : "Catat Hutang / Piutang"}
              </h2>
              <button onClick={() => setShowForm(false)} className="btn-ghost" style={{ padding: "6px" }}>
                <X size={18} />
              </button>
            </div>

            {formError && (
              <div
                style={{
                  padding: "10px 14px",
                  borderRadius: "10px",
                  background: "rgba(255,0,80,0.08)",
                  border: "1px solid rgba(255,0,80,0.25)",
                  color: "#ff5080",
                  fontSize: "13px",
                  marginBottom: "16px",
                }}
              >
                {formError}
              </div>
            )}

            <form onSubmit={handleFormSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {/* Type Toggle */}
              <div>
                <label className="label">Jenis</label>
                <div style={{ display: "flex", gap: "10px" }}>
                  <button
                    type="button"
                    onClick={() => setFormData((f) => ({ ...f, type: "debt" }))}
                    className={`type-btn ${formData.type === "debt" ? "active-expense" : ""}`}
                    style={{ flex: 1 }}
                  >
                    Hutang Saya (Dipinjam)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData((f) => ({ ...f, type: "receivable" }))}
                    className={`type-btn ${formData.type === "receivable" ? "active-income" : ""}`}
                    style={{ flex: 1 }}
                  >
                    Piutang Saya (Dipinjamkan)
                  </button>
                </div>
              </div>

              {/* Person Name */}
              <div>
                <label className="label">Nama Pihak / Orang</label>
                <input
                  type="text"
                  className="input-neon"
                  value={formData.person_name}
                  onChange={(e) => setFormData((f) => ({ ...f, person_name: e.target.value }))}
                  placeholder="Contoh: Budi, Bank Mandiri, Teman Kantor"
                  required
                />
              </div>

              {/* Amount */}
              <div>
                <label className="label">Total Nominal (Rp)</label>
                <input
                  type="number"
                  min="1"
                  className="input-neon"
                  value={formData.amount}
                  onChange={(e) => setFormData((f) => ({ ...f, amount: e.target.value }))}
                  placeholder="1000000"
                  required
                />
              </div>

              {/* Due Date */}
              <div>
                <label className="label">Jatuh Tempo (Opsional)</label>
                <input
                  type="date"
                  className="input-neon"
                  value={formData.due_date}
                  onChange={(e) => setFormData((f) => ({ ...f, due_date: e.target.value }))}
                />
              </div>

              {/* Description */}
              <div>
                <label className="label">Keterangan / Catatan (Opsional)</label>
                <textarea
                  className="input-neon"
                  rows={2}
                  style={{ resize: "none" }}
                  value={formData.description}
                  onChange={(e) => setFormData((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Misal: pinjaman uang jajan / renovasi"
                />
              </div>

              {/* Buttons */}
              <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
                <button type="submit" disabled={formLoading} className="btn-neon" style={{ flex: 1 }}>
                  {formLoading ? "Menyimpan..." : editingDebt ? "Simpan Perubahan" : "Simpan Catatan"}
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="btn-ghost">
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Pay / Cicil */}
      {payingDebt && (
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
            style={{ width: "100%", maxWidth: "420px", padding: "28px", borderRadius: "16px" }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
              <h2 style={{ fontSize: "17px", fontWeight: "600" }}>
                Bayar / Cicil: <span className="neon-text">{payingDebt.person_name}</span>
              </h2>
              <button onClick={() => setPayingDebt(null)} className="btn-ghost" style={{ padding: "6px" }}>
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "16px" }}>
              Sisa yang belum lunas:{" "}
              <strong style={{ color: "var(--neon-cyan)" }}>
                {formatRupiah(payingDebt.remaining ?? (Number(payingDebt.amount) - Number(payingDebt.paid_amount)))}
              </strong>
            </p>

            {payError && (
              <div
                style={{
                  padding: "10px 14px",
                  borderRadius: "10px",
                  background: "rgba(255,0,80,0.08)",
                  border: "1px solid rgba(255,0,80,0.25)",
                  color: "#ff5080",
                  fontSize: "13px",
                  marginBottom: "16px",
                }}
              >
                {payError}
              </div>
            )}

            <form onSubmit={handlePaymentSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                  <label className="label" style={{ margin: 0 }}>
                    Jumlah {isFullPayment ? "Pelunasan" : "Cicilan"} (Rp)
                  </label>
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      cursor: "pointer",
                      fontSize: "12px",
                      color: isFullPayment ? "var(--neon-green)" : "var(--text-muted)",
                      fontWeight: "600",
                      userSelect: "none",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isFullPayment}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setIsFullPayment(checked);
                        const fullRem = payingDebt.remaining ?? (Number(payingDebt.amount) - Number(payingDebt.paid_amount));
                        if (checked) {
                          setPayAmount(fullRem.toString());
                        } else {
                          setPayAmount("");
                        }
                      }}
                      style={{ accentColor: "var(--neon-green)", cursor: "pointer" }}
                    />
                    Langsung Lunas
                  </label>
                </div>

                <input
                  type="number"
                  min="1"
                  max={payingDebt.remaining ?? (Number(payingDebt.amount) - Number(payingDebt.paid_amount))}
                  className="input-neon"
                  value={payAmount}
                  onChange={(e) => {
                    setPayAmount(e.target.value);
                    const fullRem = payingDebt.remaining ?? (Number(payingDebt.amount) - Number(payingDebt.paid_amount));
                    if (Number(e.target.value) === fullRem) {
                      setIsFullPayment(true);
                    } else {
                      setIsFullPayment(false);
                    }
                  }}
                  placeholder="500000"
                  autoFocus
                  required
                />
              </div>

              <div>
                <label className="label">Tanggal Pembayaran</label>
                <input
                  type="date"
                  className="input-neon"
                  value={payDate}
                  onChange={(e) => setPayDate(e.target.value)}
                  required
                />
              </div>

              {/* Wallet Selector */}
              <div>
                <label className="label">
                  {payingDebt.type === "debt" ? "Bayar Pakai Dompet" : "Terima ke Dompet"}
                </label>
                <select
                  className="input-neon"
                  value={payWalletId}
                  onChange={(e) => setPayWalletId(e.target.value)}
                >
                  <option value="" style={{ background: "#0d0d12" }}>
                    — Tanpa Potong/Tambah Dompet —
                  </option>
                  {wallets.map((w) => (
                    <option key={w.id} value={w.id} style={{ background: "#0d0d12" }}>
                      {w.name} {w.balance !== undefined ? `(${formatRupiah(w.balance)})` : ""}
                    </option>
                  ))}
                </select>
                <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>
                  {payWalletId
                    ? payingDebt.type === "debt"
                      ? "Saldo dompet ini akan terpotong secara otomatis."
                      : "Saldo dompet ini akan bertambah secara otomatis."
                    : "Pilihan ini tidak akan mengubah saldo dompet kasmu."}
                </p>
              </div>

              <div>
                <label className="label">Catatan Tambahan (Opsional)</label>
                <input
                  type="text"
                  className="input-neon"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  placeholder="Misal: Cicilan ke-1 / transfer bank"
                />
              </div>

              <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
                <button type="submit" disabled={payLoading} className="btn-neon" style={{ flex: 1 }}>
                  {payLoading ? "Memproses..." : "Konfirmasi Pembayaran"}
                </button>
                <button type="button" onClick={() => setPayingDebt(null)} className="btn-ghost">
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
        onConfirm={handleDeleteDebt}
        title="Hapus Catatan"
        message="Yakin ingin menghapus catatan hutang-piutang ini? Semua riwayat cicilan terkait juga akan terhapus."
        confirmText="Hapus Catatan"
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div style={{ position: "fixed", bottom: "24px", right: "24px", zIndex: 9999 }} className="animate-fade-in-up">
          <div
            className="glass"
            style={{
              border: "1px solid rgba(57,255,20,0.4)",
              padding: "14px 18px",
              display: "flex",
              alignItems: "center",
              gap: "12px",
              background: "rgba(5,20,10,0.95)",
            }}
          >
            <span style={{ fontSize: "14px", color: "var(--neon-green)" }}>{toastMessage}</span>
            <button
              onClick={() => setToastMessage("")}
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

