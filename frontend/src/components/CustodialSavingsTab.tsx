import { useState, useEffect } from "react";
import api from "../services/api";
import type { CustodialSaving, CustodialSavingsResponse, Wallet } from "../types";
import { ConfirmModal } from "./ui/ConfirmModal";
import {
  Landmark,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  History,
  X,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertCircle,
  Building,
  User,
  ShieldCheck,
  CalendarCheck,
  Wallet as WalletIcon,
} from "lucide-react";

interface Props {
  wallets: Wallet[];
}

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

const ICON_MAP: Record<string, any> = {
  Landmark,
  Building,
  User,
  ShieldCheck,
};

const COLOR_PALETTE = [
  "#00f5ff",
  "#39ff14",
  "#bf00ff",
  "#ff0050",
  "#ffcc00",
  "#ff00aa",
  "#00e5ff",
];

const ICON_OPTIONS = [
  { value: "Landmark", label: "Bank / Lembaga" },
  { value: "Building", label: "Gedung / Institusi" },
  { value: "User", label: "Perorangan" },
  { value: "ShieldCheck", label: "Terpercaya" },
];

export default function CustodialSavingsTab({ wallets }: Props) {
  const [data, setData] = useState<CustodialSavingsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  const [editingItem, setEditingItem] = useState<CustodialSaving | null>(null);
  const [selectedItem, setSelectedItem] = useState<CustodialSaving | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [alertModal, setAlertModal] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Create / Edit form
  const [form, setForm] = useState({
    name: "",
    holder_name: "",
    monthly_amount: "",
    color: "#00f5ff",
    icon: "Landmark",
    notes: "",
    // Optional initial deposit
    initial_amount: "",
    wallet_id: "",
    transaction_date: new Date().toISOString().split("T")[0],
  });

  // Deposit / Withdraw form
  const [actionForm, setActionForm] = useState({
    amount: "",
    wallet_id: "",
    transaction_date: new Date().toISOString().split("T")[0],
    notes: "",
  });

  /* ─── Data Fetch ─────────────────────────────────────────── */
  const fetchCustodial = async () => {
    try {
      setLoading(true);
      const res = await api.get<CustodialSavingsResponse>("/custodial-savings");
      setData(res.data);
    } catch (err: any) {
      console.error("Gagal load simpanan:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustodial();
  }, []);

  /* ─── Form Handlers ─────────────────────────────────────── */
  const handleOpenFormModal = (item?: CustodialSaving) => {
    if (item) {
      setEditingItem(item);
      setForm({
        name: item.name,
        holder_name: item.holder_name,
        monthly_amount: String(item.monthly_amount),
        color: item.color || "#00f5ff",
        icon: item.icon || "Landmark",
        notes: item.notes || "",
        initial_amount: "",
        wallet_id: "",
        transaction_date: new Date().toISOString().split("T")[0],
      });
    } else {
      setEditingItem(null);
      setForm({
        name: "",
        holder_name: "",
        monthly_amount: "",
        color: "#00f5ff",
        icon: "Landmark",
        notes: "",
        initial_amount: "",
        wallet_id: wallets[0]?.id ? String(wallets[0].id) : "",
        transaction_date: new Date().toISOString().split("T")[0],
      });
    }
    setIsFormModalOpen(true);
  };

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload: any = {
        name: form.name,
        holder_name: form.holder_name,
        monthly_amount: Number(form.monthly_amount),
        color: form.color,
        icon: form.icon,
        notes: form.notes || null,
      };

      if (!editingItem && form.initial_amount && Number(form.initial_amount) > 0) {
        payload.initial_amount = Number(form.initial_amount);
        payload.wallet_id = form.wallet_id ? Number(form.wallet_id) : null;
        payload.transaction_date = form.transaction_date;
      }

      if (editingItem) {
        await api.put(`/custodial-savings/${editingItem.id}`, payload);
      } else {
        await api.post("/custodial-savings", payload);
      }

      setIsFormModalOpen(false);
      fetchCustodial();
    } catch (err: any) {
      setAlertModal(err?.response?.data?.message || "Gagal menyimpan data");
    } finally {
      setSubmitting(false);
    }
  };

  /* ─── Deposit Handler ──────────────────────────────────── */
  const handleOpenDeposit = (item: CustodialSaving) => {
    setSelectedItem(item);
    setActionForm({
      amount: String(item.monthly_amount), // pre-fill with monthly amount
      wallet_id: wallets[0]?.id ? String(wallets[0].id) : "",
      transaction_date: new Date().toISOString().split("T")[0],
      notes: "",
    });
    setIsDepositModalOpen(true);
  };

  const handleSubmitDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;
    setSubmitting(true);
    try {
      await api.post(`/custodial-savings/${selectedItem.id}/deposit`, {
        amount: Number(actionForm.amount),
        wallet_id: actionForm.wallet_id ? Number(actionForm.wallet_id) : null,
        transaction_date: actionForm.transaction_date,
        notes: actionForm.notes || null,
      });
      setIsDepositModalOpen(false);
      fetchCustodial();
    } catch (err: any) {
      setAlertModal(err?.response?.data?.message || "Gagal mencatat setoran");
    } finally {
      setSubmitting(false);
    }
  };

  /* ─── Withdraw Handler ─────────────────────────────────── */
  const handleOpenWithdraw = (item: CustodialSaving) => {
    setSelectedItem(item);
    setActionForm({
      amount: "",
      wallet_id: wallets[0]?.id ? String(wallets[0].id) : "",
      transaction_date: new Date().toISOString().split("T")[0],
      notes: "",
    });
    setIsWithdrawModalOpen(true);
  };

  const handleSubmitWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;
    setSubmitting(true);
    try {
      await api.post(`/custodial-savings/${selectedItem.id}/withdraw`, {
        amount: Number(actionForm.amount),
        wallet_id: actionForm.wallet_id ? Number(actionForm.wallet_id) : null,
        transaction_date: actionForm.transaction_date,
        notes: actionForm.notes || null,
      });
      setIsWithdrawModalOpen(false);
      fetchCustodial();
    } catch (err: any) {
      setAlertModal(err?.response?.data?.message || "Gagal mencatat penarikan");
    } finally {
      setSubmitting(false);
    }
  };

  /* ─── Delete Handler ─────────────────────────────────── */
  const handleConfirmDelete = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`/custodial-savings/${deleteId}`);
      setDeleteId(null);
      fetchCustodial();
    } catch (err: any) {
      setAlertModal(err?.response?.data?.message || "Gagal menghapus simpanan");
    }
  };

  /* ─── Render ─────────────────────────────────────────── */
  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "60px 0", color: "var(--text-muted)" }}>
        Memuat data simpanan...
      </div>
    );
  }

  const savings = data?.savings ?? [];
  const summary = data?.summary;
  const activeSavings = savings.filter((s) => s.status === "active");

  return (
    <div>
      {/* ── Stat Cards ─────────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: "14px",
          marginBottom: "28px",
        }}
      >
        {/* Total Tersimpan */}
        <div className="glass" style={{ padding: "18px", borderRadius: "14px" }}>
          <p style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Total Tersimpan
          </p>
          <p style={{ fontSize: "20px", fontWeight: "800", color: "var(--neon-cyan)" }}>
            {formatRupiah(summary?.total_active_amount ?? 0)}
          </p>
        </div>

        {/* Setoran Rutin / Bulan */}
        <div className="glass" style={{ padding: "18px", borderRadius: "14px" }}>
          <p style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Setor Rutin / Bln
          </p>
          <p style={{ fontSize: "20px", fontWeight: "800", color: "var(--neon-green)" }}>
            {formatRupiah(activeSavings.reduce((sum, s) => sum + Number(s.monthly_amount), 0))}
          </p>
        </div>

        {/* Bulan Ini */}
        <div className="glass" style={{ padding: "18px", borderRadius: "14px" }}>
          <p style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Setor Bulan Ini
          </p>
          <p style={{ fontSize: "20px", fontWeight: "800", color: "#bf00ff" }}>
            {summary?.paid_this_month_count ?? 0} / {summary?.active_count ?? 0}
          </p>
        </div>

        {/* Total Ditarik */}
        <div className="glass" style={{ padding: "18px", borderRadius: "14px" }}>
          <p style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Total Ditarik
          </p>
          <p style={{ fontSize: "20px", fontWeight: "800", color: "var(--text-secondary)" }}>
            {formatRupiah(summary?.total_withdrawn_amount ?? 0)}
          </p>
        </div>
      </div>

      {/* ── Header + Tambah Button ─────────────── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h3 style={{ fontSize: "16px", fontWeight: "700" }}>Daftar Simpanan</h3>
        <button
          onClick={() => handleOpenFormModal()}
          className="btn-neon"
          style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", padding: "8px 16px" }}
        >
          <Plus size={16} />
          Tambah Simpanan
        </button>
      </div>

      {/* ── Empty State ───────────────────────── */}
      {savings.length === 0 ? (
        <div
          className="glass"
          style={{ padding: "60px 20px", borderRadius: "16px", textAlign: "center" }}
        >
          <Landmark size={40} color="var(--text-muted)" style={{ margin: "0 auto 16px" }} />
          <p style={{ fontWeight: "700", fontSize: "16px", marginBottom: "8px" }}>Belum ada simpanan</p>
          <p style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "20px" }}>
            Catat simpanan rutin ke bank, orang, atau institusi
          </p>
          <button onClick={() => handleOpenFormModal()} className="btn-neon">
            <Plus size={15} /> Tambah Simpanan Pertama
          </button>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "16px" }}>
          {savings.map((item) => {
            const IconComp = ICON_MAP[item.icon] ?? Landmark;
            const paidThisMonth = item.is_this_month_paid;

            return (
              <div
                key={item.id}
                className="glass"
                style={{ borderRadius: "16px", overflow: "hidden", position: "relative" }}
              >
                {/* Color accent bar */}
                <div style={{ height: "4px", background: item.color, borderRadius: "16px 16px 0 0" }} />

                <div style={{ padding: "18px" }}>
                  {/* Header */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "14px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <div
                        style={{
                          width: "38px",
                          height: "38px",
                          borderRadius: "10px",
                          background: `${item.color}20`,
                          border: `1px solid ${item.color}40`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <IconComp size={18} color={item.color} />
                      </div>
                      <div>
                        <p style={{ fontWeight: "700", fontSize: "15px", lineHeight: 1.2 }}>{item.name}</p>
                        <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>{item.holder_name}</p>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div style={{ display: "flex", gap: "6px" }}>
                      <button
                        onClick={() => handleOpenFormModal(item)}
                        title="Edit"
                        style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: "4px" }}
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => setDeleteId(item.id)}
                        title="Hapus"
                        style={{ background: "transparent", border: "none", cursor: "pointer", color: "rgba(255,80,80,0.7)", padding: "4px" }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Amounts */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "14px" }}>
                    <div style={{ padding: "10px 12px", borderRadius: "10px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                      <p style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "4px" }}>
                        Setoran Rutin
                      </p>
                      <p style={{ fontSize: "14px", fontWeight: "800", color: item.color }}>
                        {formatRupiah(Number(item.monthly_amount))}
                        <span style={{ fontSize: "10px", fontWeight: "400", color: "var(--text-muted)", marginLeft: "2px" }}>/bln</span>
                      </p>
                    </div>
                    <div style={{ padding: "10px 12px", borderRadius: "10px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                      <p style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "4px" }}>
                        Total Tersimpan
                      </p>
                      <p style={{ fontSize: "14px", fontWeight: "800", color: "var(--neon-cyan)" }}>
                        {formatRupiah(Number(item.total_amount))}
                      </p>
                    </div>
                  </div>

                  {/* Status bulan ini */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "8px 12px",
                      borderRadius: "10px",
                      background: paidThisMonth ? "rgba(57,255,20,0.07)" : "rgba(255,200,0,0.07)",
                      border: `1px solid ${paidThisMonth ? "rgba(57,255,20,0.25)" : "rgba(255,200,0,0.25)"}`,
                      marginBottom: "14px",
                    }}
                  >
                    {paidThisMonth ? (
                      <CheckCircle2 size={15} color="#39ff14" />
                    ) : (
                      <AlertCircle size={15} color="#ffcc00" />
                    )}
                    <span
                      style={{
                        fontSize: "12px",
                        fontWeight: "600",
                        color: paidThisMonth ? "#39ff14" : "#ffcc00",
                      }}
                    >
                      {paidThisMonth ? "Sudah setor bulan ini ✓" : "Belum setor bulan ini"}
                    </span>
                  </div>

                  {/* Action buttons row */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
                    <button
                      onClick={() => handleOpenDeposit(item)}
                      style={{
                        padding: "8px 6px",
                        borderRadius: "9px",
                        border: `1px solid ${item.color}50`,
                        background: `${item.color}10`,
                        color: item.color,
                        cursor: "pointer",
                        fontSize: "12px",
                        fontWeight: "600",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "5px",
                      }}
                    >
                      <ArrowUpRight size={13} />
                      Setor
                    </button>
                    <button
                      onClick={() => handleOpenWithdraw(item)}
                      disabled={Number(item.total_amount) <= 0}
                      style={{
                        padding: "8px 6px",
                        borderRadius: "9px",
                        border: "1px solid rgba(0,245,255,0.3)",
                        background: "rgba(0,245,255,0.06)",
                        color: Number(item.total_amount) <= 0 ? "var(--text-muted)" : "var(--neon-cyan)",
                        cursor: Number(item.total_amount) <= 0 ? "not-allowed" : "pointer",
                        fontSize: "12px",
                        fontWeight: "600",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "5px",
                        opacity: Number(item.total_amount) <= 0 ? 0.5 : 1,
                      }}
                    >
                      <ArrowDownLeft size={13} />
                      Tarik
                    </button>
                    <button
                      onClick={() => {
                        setSelectedItem(item);
                        setIsHistoryModalOpen(true);
                      }}
                      style={{
                        padding: "8px 6px",
                        borderRadius: "9px",
                        border: "1px solid rgba(255,255,255,0.1)",
                        background: "rgba(255,255,255,0.04)",
                        color: "var(--text-secondary)",
                        cursor: "pointer",
                        fontSize: "12px",
                        fontWeight: "600",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "5px",
                      }}
                    >
                      <History size={13} />
                      Riwayat
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          MODALS
      ══════════════════════════════════════════════════════════════ */}

      {/* ── Create / Edit Modal ──────────────────────────────────── */}
      {isFormModalOpen && (
        <div
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 1000, padding: "20px",
          }}
        >
          <div
            className="glass-neon"
            style={{ width: "100%", maxWidth: "520px", maxHeight: "85vh", overflowY: "auto", padding: "28px", borderRadius: "18px" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "22px" }}>
              <h3 style={{ fontSize: "18px", fontWeight: "700", display: "flex", alignItems: "center", gap: "8px" }}>
                <Landmark size={20} color="var(--neon-cyan)" />
                {editingItem ? "Edit Simpanan" : "Tambah Simpanan Baru"}
              </h3>
              <button onClick={() => setIsFormModalOpen(false)} style={{ background: "transparent", border: "none", color: "var(--text-secondary)", cursor: "pointer" }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveForm} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {/* Nama Simpanan */}
              <div>
                <label style={{ fontSize: "12px", color: "var(--text-muted)", display: "block", marginBottom: "6px" }}>
                  Nama Simpanan *
                </label>
                <input
                  type="text"
                  className="input-neon"
                  placeholder="cth: Tabungan Arisan RT"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>

              {/* Pemegang / Tujuan */}
              <div>
                <label style={{ fontSize: "12px", color: "var(--text-muted)", display: "block", marginBottom: "6px" }}>
                  Disimpan di / Pemegang *
                </label>
                <input
                  type="text"
                  className="input-neon"
                  placeholder="cth: BRI, Pak Budi, Koperasi Sejahtera"
                  value={form.holder_name}
                  onChange={(e) => setForm({ ...form, holder_name: e.target.value })}
                  required
                />
              </div>

              {/* Nominal Setoran Rutin */}
              <div>
                <label style={{ fontSize: "12px", color: "var(--text-muted)", display: "block", marginBottom: "6px" }}>
                  Nominal Setoran per Bulan (Rp) *
                </label>
                <input
                  type="number"
                  className="input-neon"
                  placeholder="cth: 100000"
                  min={1}
                  value={form.monthly_amount}
                  onChange={(e) => setForm({ ...form, monthly_amount: e.target.value })}
                  required
                />
                <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>
                  Jumlah ini akan jadi patokan setoran rutin tiap bulan
                </p>
              </div>

              {/* Ikon + Warna */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ fontSize: "12px", color: "var(--text-muted)", display: "block", marginBottom: "6px" }}>Ikon</label>
                  <select
                    className="input-neon"
                    value={form.icon}
                    onChange={(e) => setForm({ ...form, icon: e.target.value })}
                  >
                    {ICON_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: "12px", color: "var(--text-muted)", display: "block", marginBottom: "6px" }}>Warna Aksen</label>
                  <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", paddingTop: "6px" }}>
                    {COLOR_PALETTE.map((c) => (
                      <div
                        key={c}
                        onClick={() => setForm({ ...form, color: c })}
                        style={{
                          width: "22px", height: "22px", borderRadius: "50%", background: c,
                          cursor: "pointer",
                          boxShadow: form.color === c ? `0 0 0 3px rgba(255,255,255,0.7)` : "none",
                          transition: "box-shadow 0.15s",
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Catatan */}
              <div>
                <label style={{ fontSize: "12px", color: "var(--text-muted)", display: "block", marginBottom: "6px" }}>Catatan (Opsional)</label>
                <textarea
                  className="input-neon"
                  rows={2}
                  placeholder="Keterangan tambahan..."
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  style={{ resize: "vertical" }}
                />
              </div>

              {/* Setoran Awal (only when creating) */}
              {!editingItem && (
                <div
                  style={{
                    padding: "16px",
                    borderRadius: "12px",
                    background: "rgba(57,255,20,0.05)",
                    border: "1px solid rgba(57,255,20,0.15)",
                  }}
                >
                  <p style={{ fontSize: "13px", fontWeight: "600", color: "var(--neon-green)", marginBottom: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
                    <WalletIcon size={14} /> Setoran Awal (Opsional)
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    <input
                      type="number"
                      className="input-neon"
                      placeholder="Nominal setoran awal (Rp)"
                      min={0}
                      value={form.initial_amount}
                      onChange={(e) => setForm({ ...form, initial_amount: e.target.value })}
                    />
                    {form.initial_amount && Number(form.initial_amount) > 0 && (
                      <>
                        <select
                          className="input-neon"
                          value={form.wallet_id}
                          onChange={(e) => setForm({ ...form, wallet_id: e.target.value })}
                        >
                          <option value="">-- Tidak perlu potong dompet --</option>
                          {wallets.map((w) => (
                            <option key={w.id} value={w.id}>{w.name}</option>
                          ))}
                        </select>
                        <input
                          type="date"
                          className="input-neon"
                          value={form.transaction_date}
                          onChange={(e) => setForm({ ...form, transaction_date: e.target.value })}
                        />
                      </>
                    )}
                  </div>
                </div>
              )}

              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "4px" }}>
                <button type="button" onClick={() => setIsFormModalOpen(false)} className="btn-ghost">
                  Batal
                </button>
                <button type="submit" className="btn-neon" disabled={submitting}>
                  {submitting ? "Menyimpan..." : editingItem ? "Simpan Perubahan" : "Tambah Simpanan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Deposit (Setor) Modal ──────────────────────────────── */}
      {isDepositModalOpen && selectedItem && (
        <div
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 1000, padding: "20px",
          }}
        >
          <div
            className="glass-neon"
            style={{ width: "100%", maxWidth: "440px", maxHeight: "85vh", overflowY: "auto", padding: "28px", borderRadius: "18px" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <div>
                <h3 style={{ fontSize: "18px", fontWeight: "700", display: "flex", alignItems: "center", gap: "8px" }}>
                  <ArrowUpRight size={20} color="var(--neon-green)" />
                  Catat Setoran
                </h3>
                <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>
                  {selectedItem.name} • {selectedItem.holder_name}
                </p>
              </div>
              <button onClick={() => setIsDepositModalOpen(false)} style={{ background: "transparent", border: "none", color: "var(--text-secondary)", cursor: "pointer" }}>
                <X size={20} />
              </button>
            </div>

            {/* Monthly amount hint */}
            <div
              style={{
                padding: "10px 14px",
                borderRadius: "10px",
                background: `${selectedItem.color}10`,
                border: `1px solid ${selectedItem.color}30`,
                marginBottom: "16px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <CalendarCheck size={14} color={selectedItem.color} />
              <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                Setoran rutin: <strong style={{ color: selectedItem.color }}>{formatRupiah(Number(selectedItem.monthly_amount))}/bln</strong>
                {selectedItem.is_this_month_paid && (
                  <span style={{ color: "#39ff14", marginLeft: "8px" }}>✓ Sudah setor bulan ini</span>
                )}
              </span>
            </div>

            <form onSubmit={handleSubmitDeposit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label style={{ fontSize: "12px", color: "var(--text-muted)", display: "block", marginBottom: "6px" }}>
                  Nominal Setoran (Rp) *
                </label>
                <input
                  type="number"
                  className="input-neon"
                  min={1}
                  value={actionForm.amount}
                  onChange={(e) => setActionForm({ ...actionForm, amount: e.target.value })}
                  required
                />
                <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>
                  Pre-filled dengan nominal rutin, bisa diubah jika perlu
                </p>
              </div>

              <div>
                <label style={{ fontSize: "12px", color: "var(--text-muted)", display: "block", marginBottom: "6px" }}>
                  Potong dari Dompet
                </label>
                <select
                  className="input-neon"
                  value={actionForm.wallet_id}
                  onChange={(e) => setActionForm({ ...actionForm, wallet_id: e.target.value })}
                >
                  <option value="">-- Tidak potong dompet --</option>
                  {wallets.map((w) => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: "12px", color: "var(--text-muted)", display: "block", marginBottom: "6px" }}>
                  Tanggal Setoran *
                </label>
                <input
                  type="date"
                  className="input-neon"
                  value={actionForm.transaction_date}
                  onChange={(e) => setActionForm({ ...actionForm, transaction_date: e.target.value })}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: "12px", color: "var(--text-muted)", display: "block", marginBottom: "6px" }}>Catatan</label>
                <input
                  type="text"
                  className="input-neon"
                  placeholder="Opsional..."
                  value={actionForm.notes}
                  onChange={(e) => setActionForm({ ...actionForm, notes: e.target.value })}
                />
              </div>

              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "4px" }}>
                <button type="button" onClick={() => setIsDepositModalOpen(false)} className="btn-ghost">Batal</button>
                <button type="submit" className="btn-neon" disabled={submitting}>
                  {submitting ? "Mencatat..." : "Catat Setoran"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Withdraw (Tarik Dana) Modal ───────────────────────── */}
      {isWithdrawModalOpen && selectedItem && (
        <div
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 1000, padding: "20px",
          }}
        >
          <div
            className="glass-neon"
            style={{ width: "100%", maxWidth: "440px", maxHeight: "85vh", overflowY: "auto", padding: "28px", borderRadius: "18px" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <div>
                <h3 style={{ fontSize: "18px", fontWeight: "700", display: "flex", alignItems: "center", gap: "8px" }}>
                  <ArrowDownLeft size={20} color="var(--neon-cyan)" />
                  Tarik Dana
                </h3>
                <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>
                  {selectedItem.name} • Saldo: {formatRupiah(Number(selectedItem.total_amount))}
                </p>
              </div>
              <button onClick={() => setIsWithdrawModalOpen(false)} style={{ background: "transparent", border: "none", color: "var(--text-secondary)", cursor: "pointer" }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmitWithdraw} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label style={{ fontSize: "12px", color: "var(--text-muted)", display: "block", marginBottom: "6px" }}>
                  Nominal Penarikan (Rp) *
                </label>
                <input
                  type="number"
                  className="input-neon"
                  min={1}
                  max={Number(selectedItem.total_amount)}
                  placeholder={`Maks: ${formatRupiah(Number(selectedItem.total_amount))}`}
                  value={actionForm.amount}
                  onChange={(e) => setActionForm({ ...actionForm, amount: e.target.value })}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: "12px", color: "var(--text-muted)", display: "block", marginBottom: "6px" }}>
                  Masuk ke Dompet
                </label>
                <select
                  className="input-neon"
                  value={actionForm.wallet_id}
                  onChange={(e) => setActionForm({ ...actionForm, wallet_id: e.target.value })}
                >
                  <option value="">-- Tidak tambah ke dompet --</option>
                  {wallets.map((w) => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: "12px", color: "var(--text-muted)", display: "block", marginBottom: "6px" }}>
                  Tanggal Penarikan *
                </label>
                <input
                  type="date"
                  className="input-neon"
                  value={actionForm.transaction_date}
                  onChange={(e) => setActionForm({ ...actionForm, transaction_date: e.target.value })}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: "12px", color: "var(--text-muted)", display: "block", marginBottom: "6px" }}>Catatan</label>
                <input
                  type="text"
                  className="input-neon"
                  placeholder="Opsional..."
                  value={actionForm.notes}
                  onChange={(e) => setActionForm({ ...actionForm, notes: e.target.value })}
                />
              </div>

              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "4px" }}>
                <button type="button" onClick={() => setIsWithdrawModalOpen(false)} className="btn-ghost">Batal</button>
                <button type="submit" className="btn-neon" disabled={submitting}>
                  {submitting ? "Mencatat..." : "Tarik Dana"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── History Modal ──────────────────────────────────────── */}
      {isHistoryModalOpen && selectedItem && (
        <div
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 1000, padding: "20px",
          }}
        >
          <div
            className="glass-neon"
            style={{ width: "100%", maxWidth: "480px", maxHeight: "85vh", overflowY: "auto", padding: "28px", borderRadius: "18px" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <div>
                <h3 style={{ fontSize: "18px", fontWeight: "700", display: "flex", alignItems: "center", gap: "8px" }}>
                  <History size={20} color="var(--neon-cyan)" />
                  Riwayat Mutasi
                </h3>
                <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>
                  {selectedItem.name} • {selectedItem.holder_name}
                </p>
              </div>
              <button onClick={() => setIsHistoryModalOpen(false)} style={{ background: "transparent", border: "none", color: "var(--text-secondary)", cursor: "pointer" }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {!selectedItem.logs || selectedItem.logs.length === 0 ? (
                <p style={{ textAlign: "center", color: "var(--text-muted)", fontSize: "13px", padding: "32px 0" }}>
                  Belum ada catatan mutasi.
                </p>
              ) : (
                selectedItem.logs.map((log) => {
                  const isDeposit = log.type === "deposit";
                  return (
                    <div
                      key={log.id}
                      style={{
                        padding: "12px 14px", borderRadius: "10px",
                        background: "rgba(255,255,255,0.02)",
                        border: `1px solid ${isDeposit ? "rgba(57,255,20,0.15)" : "rgba(0,245,255,0.15)"}`,
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                      }}
                    >
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          {isDeposit
                            ? <ArrowUpRight size={14} color="var(--neon-green)" />
                            : <ArrowDownLeft size={14} color="var(--neon-cyan)" />
                          }
                          <span style={{ fontSize: "13px", fontWeight: "700", color: isDeposit ? "var(--neon-green)" : "var(--neon-cyan)" }}>
                            {isDeposit ? "Setor" : "Tarik Dana"}
                          </span>
                          {log.wallet && (
                            <span style={{ fontSize: "10px", padding: "2px 6px", borderRadius: "4px", background: "rgba(255,255,255,0.08)", color: "var(--text-secondary)" }}>
                              {log.wallet.name}
                            </span>
                          )}
                        </div>
                        <p style={{ fontSize: "11px", color: "var(--text-muted)", margin: "4px 0 0" }}>
                          {log.transaction_date}{log.notes ? ` • ${log.notes}` : ""}
                        </p>
                      </div>
                      <span style={{ fontSize: "14px", fontWeight: "800", color: isDeposit ? "var(--neon-green)" : "var(--neon-cyan)" }}>
                        {isDeposit ? "+" : "-"}{formatRupiah(Number(log.amount))}
                      </span>
                    </div>
                  );
                })
              )}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "20px" }}>
              <button type="button" onClick={() => setIsHistoryModalOpen(false)} className="btn-ghost">Tutup</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm Modal ────────────────────────────────── */}
      <ConfirmModal
        isOpen={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={handleConfirmDelete}
        title="Hapus Simpanan"
        message="Yakin ingin menghapus pos simpanan ini beserta seluruh riwayat mutasinya?"
        confirmText="Hapus"
        cancelText="Batal"
        isDestructive={true}
      />

      {/* ── Alert Modal ────────────────────────────────────────── */}
      {alertModal && (
        <ConfirmModal
          isOpen={true}
          onClose={() => setAlertModal(null)}
          onConfirm={() => setAlertModal(null)}
          title="Pemberitahuan"
          message={alertModal}
          confirmText="Mengerti"
          cancelText="Tutup"
          isDestructive={false}
        />
      )}
    </div>
  );
}
