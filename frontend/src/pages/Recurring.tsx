import { useEffect, useState, useCallback } from "react";
import {
  RefreshCw, Plus, Pencil, Trash2, Calendar,
  ArrowUpRight, ArrowDownLeft, X,
  PauseCircle, PlayCircle, Zap, ShieldCheck
} from "lucide-react";
import api from "../services/api";
import type {
  RecurringTransaction, RecurringResponse,
  Wallet as WalletType, Category
} from "../types";
import { ConfirmModal } from "../components/ui/ConfirmModal";

function formatRupiah(value: number | string) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

export default function Recurring() {
  const [data, setData] = useState<RecurringResponse | null>(null);
  const [wallets, setWallets] = useState<WalletType[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states (Add/Edit)
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<RecurringTransaction | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    type: "expense" as "income" | "expense",
    amount: "",
    billing_day: "1",
    frequency: "monthly" as "daily" | "weekly" | "monthly" | "yearly",
    wallet_id: "",
    category_id: "",
    start_date: new Date().toISOString().split("T")[0],
    end_date: "",
    notes: "",
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");

  // Quick log modal state
  const [loggingItem, setLoggingItem] = useState<RecurringTransaction | null>(null);
  const [logDate, setLogDate] = useState(new Date().toISOString().split("T")[0]);
  const [logWalletId, setLogWalletId] = useState("");
  const [logLoading, setLogLoading] = useState(false);

  // Delete modal state
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [toastMessage, setToastMessage] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [recRes, walRes, catRes] = await Promise.all([
        api.get<RecurringResponse>("/recurring"),
        api.get("/wallets"),
        api.get("/categories"),
      ]);
      setData(recRes.data);
      setWallets(walRes.data.wallets || walRes.data || []);
      setCategories(catRes.data.categories || catRes.data || []);
    } catch (err) {
      console.error("Gagal memuat recurring transactions:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openAdd = () => {
    setEditingItem(null);
    setFormData({
      name: "",
      type: "expense",
      amount: "",
      billing_day: "1",
      frequency: "monthly",
      wallet_id: "",
      category_id: "",
      start_date: new Date().toISOString().split("T")[0],
      end_date: "",
      notes: "",
    });
    setFormError("");
    setShowForm(true);
  };

  const openEdit = (item: RecurringTransaction) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      type: item.type,
      amount: item.amount.toString(),
      billing_day: item.billing_day.toString(),
      frequency: item.frequency,
      wallet_id: item.wallet_id ? item.wallet_id.toString() : "",
      category_id: item.category_id ? item.category_id.toString() : "",
      start_date: item.start_date.split("T")[0],
      end_date: item.end_date ? item.end_date.split("T")[0] : "",
      notes: item.notes || "",
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
        name: formData.name.trim(),
        type: formData.type,
        amount: Number(formData.amount),
        billing_day: Number(formData.billing_day),
        frequency: formData.frequency,
        wallet_id: formData.wallet_id ? Number(formData.wallet_id) : null,
        category_id: formData.category_id ? Number(formData.category_id) : null,
        start_date: formData.start_date,
        end_date: formData.end_date || null,
        notes: formData.notes.trim() || null,
      };

      if (editingItem) {
        await api.put(`/recurring/${editingItem.id}`, payload);
        setToastMessage("Transaksi rutin berhasil diperbarui!");
      } else {
        await api.post("/recurring", payload);
        setToastMessage("Transaksi rutin baru berhasil ditambahkan!");
      }

      setShowForm(false);
      await fetchData();
    } catch (err: any) {
      setFormError(err.response?.data?.message || "Gagal menyimpan transaksi rutin.");
    } finally {
      setFormLoading(false);
    }
  };

  const handleToggleActive = async (item: RecurringTransaction) => {
    try {
      await api.post(`/recurring/${item.id}/toggle`);
      setToastMessage(item.is_active ? "Transaksi rutin dijeda." : "Transaksi rutin diaktifkan kembali.");
      await fetchData();
    } catch (err: any) {
      setToastMessage(err.response?.data?.message || "Gagal mengubah status.");
    }
  };

  const handleQuickLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loggingItem) return;

    setLogLoading(true);
    try {
      await api.post(`/recurring/${loggingItem.id}/log`, {
        transaction_date: logDate,
        wallet_id: logWalletId ? Number(logWalletId) : loggingItem.wallet_id,
      });

      setToastMessage(`Berhasil mencatat transaksi kas untuk ${loggingItem.name}!`);
      setLoggingItem(null);
    } catch (err: any) {
      setToastMessage(err.response?.data?.message || "Gagal mencatat transaksi kas.");
    } finally {
      setLogLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`/recurring/${deleteId}`);
      setToastMessage("Transaksi rutin berhasil dihapus.");
      setDeleteId(null);
      await fetchData();
    } catch (err: any) {
      setToastMessage(err.response?.data?.message || "Gagal menghapus.");
      setDeleteId(null);
    }
  };

  const filteredCategories = categories.filter((c) => c.type === formData.type);

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
            <RefreshCw size={22} color="var(--neon-green)" />
            <h1 className="section-title" style={{ margin: 0 }}>
              Transaksi <span className="neon-text">Berulang</span>
            </h1>
          </div>
          <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>
            Langganan, tagihan rutin bulanan, & proyeksi otomatis bulan depan
          </p>
        </div>

        <button className="btn-neon" onClick={openAdd}>
          <Plus size={16} />
          Tambah Rutin
        </button>
      </div>

      {/* Summary Projection Cards */}
      {data && (
        <div
          className="animate-fade-in-up delay-1"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: "16px",
            marginBottom: "28px",
          }}
        >
          {/* Card 1: Total Pengeluaran Rutin (Fixed Cost) */}
          <div className="glass stat-card" style={{ border: "1px solid rgba(255,80,128,0.25)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
              <span style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-muted)", textTransform: "uppercase" }}>
                Pengeluaran Rutin / Bulan
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
              {formatRupiah(data.summary.total_monthly_expense)}
            </p>
            <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "6px" }}>
              Fixed cost wajib per bulan (Spotify, Wi-Fi, cicilan)
            </p>
          </div>

          {/* Card 2: Pemasukan Rutin (Salary) */}
          <div className="glass stat-card" style={{ border: "1px solid rgba(57,255,20,0.25)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
              <span style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-muted)", textTransform: "uppercase" }}>
                Pemasukan Rutin / Bulan
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
              {formatRupiah(data.summary.total_monthly_income)}
            </p>
            <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "6px" }}>
              Gaji & pemasukan berkala terjadwal
            </p>
          </div>

          {/* Card 3: Proyeksi Beban Bulan Depan */}
          <div className="glass stat-card" style={{ border: "1px solid rgba(0,245,255,0.25)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
              <span style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-muted)", textTransform: "uppercase" }}>
                Proyeksi Bulan Depan ({data.projection.next_month_name})
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
                <ShieldCheck size={18} color="var(--neon-cyan)" />
              </div>
            </div>
            <p
              style={{
                fontSize: "24px",
                fontWeight: "800",
                color: data.summary.net_commitment >= 0 ? "var(--neon-cyan)" : "#ff5080",
                letterSpacing: "-0.02em",
              }}
            >
              {data.summary.net_commitment >= 0 ? "+" : ""}
              {formatRupiah(data.summary.net_commitment)}
            </p>
            <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "6px" }}>
              Sisa estimasi dana setelah tagihan rutin dibayar
            </p>
          </div>
        </div>
      )}

      {/* Main Recurring List */}
      <div className="glass animate-fade-in-up delay-2" style={{ padding: "24px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
          <div>
            <h2 style={{ fontSize: "17px", fontWeight: "600", marginBottom: "4px" }}>
              Daftar Tagihan & Langganan Rutin
            </h2>
            <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>
              Otomatis tersambung ke Financial Calendar pada tanggal jatuh tempo setiap bulan
            </p>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: "64px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div className="spinner" />
          </div>
        ) : !data || data.recurring_transactions.length === 0 ? (
          <div style={{ padding: "48px 0", textAlign: "center" }}>
            <div style={{ fontSize: "40px", marginBottom: "12px", opacity: 0.4 }}>🔄</div>
            <p style={{ color: "var(--text-secondary)", marginBottom: "16px" }}>
              Belum ada transaksi berulang. Catat langganan Netflix, Spotify, atau tagihan Wi-Fi kamu!
            </p>
            <button className="btn-neon" onClick={openAdd}>
              Tambah Langganan Pertama
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {data.recurring_transactions.map((item) => {
              const isExpense = item.type === "expense";
              return (
                <div
                  key={item.id}
                  style={{
                    padding: "16px 20px",
                    borderRadius: "14px",
                    background: "rgba(255,255,255,0.02)",
                    border: item.is_active ? "1px solid var(--border)" : "1px dashed rgba(255,255,255,0.1)",
                    opacity: item.is_active ? 1 : 0.6,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: "14px",
                    transition: "all 0.2s",
                  }}
                >
                  {/* Left Info */}
                  <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                    <div
                      style={{
                        width: "42px",
                        height: "42px",
                        borderRadius: "12px",
                        background: isExpense ? "rgba(255,80,128,0.1)" : "rgba(57,255,20,0.1)",
                        border: `1px solid ${isExpense ? "rgba(255,80,128,0.3)" : "rgba(57,255,20,0.3)"}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      {isExpense ? <ArrowDownLeft size={20} color="#ff5080" /> : <ArrowUpRight size={20} color="var(--neon-green)" />}
                    </div>

                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                        <span style={{ fontSize: "15px", fontWeight: "700", color: "var(--text-primary)" }}>
                          {item.name}
                        </span>
                        {!item.is_active && (
                          <span
                            style={{
                              fontSize: "10px",
                              fontWeight: "700",
                              padding: "2px 6px",
                              borderRadius: "4px",
                              background: "rgba(255,255,255,0.1)",
                              color: "var(--text-muted)",
                            }}
                          >
                            DIJEDA
                          </span>
                        )}
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "12px", color: "var(--text-muted)" }}>
                        <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          <Calendar size={12} color="var(--neon-cyan)" />
                          Tiap tgl {item.billing_day} ({item.frequency})
                        </span>
                        {item.category && <span>• {item.category.name}</span>}
                        {item.wallet && <span>• Dompet: {item.wallet.name}</span>}
                      </div>
                    </div>
                  </div>

                  {/* Right Actions & Amount */}
                  <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                    <div style={{ textAlign: "right" }}>
                      <p
                        style={{
                          fontSize: "16px",
                          fontWeight: "800",
                          color: isExpense ? "#ff5080" : "var(--neon-green)",
                          margin: 0,
                        }}
                      >
                        {isExpense ? "−" : "+"}{formatRupiah(item.amount)}
                      </p>
                      <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>per bulan</span>
                    </div>

                    {/* Action buttons */}
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      {/* Quick Log button */}
                      <button
                        onClick={() => {
                          setLoggingItem(item);
                          setLogWalletId(item.wallet_id ? item.wallet_id.toString() : "");
                        }}
                        title="Catat transaksi kas bulan ini"
                        className="btn-ghost"
                        style={{
                          padding: "6px 10px",
                          fontSize: "12px",
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                          color: "var(--neon-green)",
                          borderColor: "rgba(57,255,20,0.3)",
                        }}
                      >
                        <Zap size={13} />
                        Catat ke Kas
                      </button>

                      {/* Toggle Active */}
                      <button
                        onClick={() => handleToggleActive(item)}
                        title={item.is_active ? "Jeda langganan" : "Aktifkan langganan"}
                        className="btn-ghost"
                        style={{ padding: "6px 8px" }}
                      >
                        {item.is_active ? <PauseCircle size={15} color="#ffcc00" /> : <PlayCircle size={15} color="var(--neon-green)" />}
                      </button>

                      {/* Edit */}
                      <button
                        onClick={() => openEdit(item)}
                        title="Edit"
                        className="btn-ghost"
                        style={{ padding: "6px 8px" }}
                      >
                        <Pencil size={13} />
                      </button>

                      {/* Delete */}
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
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Add / Edit Recurring Form */}
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
            style={{ width: "100%", maxWidth: "480px", padding: "28px", borderRadius: "18px" }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
              <h2 style={{ fontSize: "17px", fontWeight: "600" }}>
                {editingItem ? "Ubah Transaksi Rutin" : "Tambah Transaksi Rutin"}
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
                    onClick={() => setFormData((f) => ({ ...f, type: "expense" }))}
                    className={`type-btn ${formData.type === "expense" ? "active-expense" : ""}`}
                    style={{ flex: 1 }}
                  >
                    Pengeluaran Rutin
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData((f) => ({ ...f, type: "income" }))}
                    className={`type-btn ${formData.type === "income" ? "active-income" : ""}`}
                    style={{ flex: 1 }}
                  >
                    Pemasukan Rutin (Gaji)
                  </button>
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="label">Nama Langganan / Tagihan</label>
                <input
                  type="text"
                  className="input-neon"
                  value={formData.name}
                  onChange={(e) => setFormData((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Contoh: Netflix, Wi-Fi Indihome, Gaji Kantor"
                  required
                />
              </div>

              {/* Amount & Billing Day Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "12px" }}>
                <div>
                  <label className="label">Nominal (Rp)</label>
                  <input
                    type="number"
                    min="1"
                    className="input-neon"
                    value={formData.amount}
                    onChange={(e) => setFormData((f) => ({ ...f, amount: e.target.value }))}
                    placeholder="186000"
                    required
                  />
                </div>

                <div>
                  <label className="label">Tgl Jatuh Tempo (1-31)</label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    className="input-neon"
                    value={formData.billing_day}
                    onChange={(e) => setFormData((f) => ({ ...f, billing_day: e.target.value }))}
                    placeholder="25"
                    required
                  />
                </div>
              </div>

              {/* Category & Wallet Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label className="label">Kategori</label>
                  <select
                    className="input-neon"
                    value={formData.category_id}
                    onChange={(e) => setFormData((f) => ({ ...f, category_id: e.target.value }))}
                  >
                    <option value="">— Pilih Kategori —</option>
                    {filteredCategories.map((c) => (
                      <option key={c.id} value={c.id} style={{ background: "#0d0d12" }}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label">Dompet Pembayaran</label>
                  <select
                    className="input-neon"
                    value={formData.wallet_id}
                    onChange={(e) => setFormData((f) => ({ ...f, wallet_id: e.target.value }))}
                  >
                    <option value="">— Pilih Dompet —</option>
                    {wallets.map((w) => (
                      <option key={w.id} value={w.id} style={{ background: "#0d0d12" }}>
                        {w.name} {w.balance !== undefined ? `(${formatRupiah(w.balance)})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Start Date */}
              <div>
                <label className="label">Tanggal Mulai Berlaku</label>
                <input
                  type="date"
                  className="input-neon"
                  value={formData.start_date}
                  onChange={(e) => setFormData((f) => ({ ...f, start_date: e.target.value }))}
                  required
                />
              </div>

              {/* Notes */}
              <div>
                <label className="label">Catatan Tambahan (Opsional)</label>
                <input
                  type="text"
                  className="input-neon"
                  value={formData.notes}
                  onChange={(e) => setFormData((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="Misal: Paket family / nomor pelanggan"
                />
              </div>

              {/* Buttons */}
              <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
                <button type="submit" disabled={formLoading} className="btn-neon" style={{ flex: 1 }}>
                  {formLoading ? "Menyimpan..." : editingItem ? "Simpan Perubahan" : "Tambah Rutin"}
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="btn-ghost">
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Quick Log into Actual Transaction */}
      {loggingItem && (
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
            style={{ width: "100%", maxWidth: "420px", padding: "26px", borderRadius: "16px" }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Zap size={18} color="var(--neon-green)" />
                <h2 style={{ fontSize: "16px", fontWeight: "700", margin: 0 }}>
                  Catat Kas: <span className="neon-text">{loggingItem.name}</span>
                </h2>
              </div>
              <button onClick={() => setLoggingItem(null)} className="btn-ghost" style={{ padding: "6px" }}>
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "16px" }}>
              Transaksi sebesar <strong style={{ color: "var(--neon-cyan)" }}>{formatRupiah(loggingItem.amount)}</strong> akan langsung dicatat ke buku kas dan mempengaruhi saldo dompet.
            </p>

            <form onSubmit={handleQuickLog} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label className="label">Tanggal Pembayaran</label>
                <input
                  type="date"
                  className="input-neon"
                  value={logDate}
                  onChange={(e) => setLogDate(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="label">Dompet Kas</label>
                <select
                  className="input-neon"
                  value={logWalletId}
                  onChange={(e) => setLogWalletId(e.target.value)}
                >
                  <option value="">— Tanpa Dompet Kas —</option>
                  {wallets.map((w) => (
                    <option key={w.id} value={w.id} style={{ background: "#0d0d12" }}>
                      {w.name} {w.balance !== undefined ? `(${formatRupiah(w.balance)})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
                <button type="submit" disabled={logLoading} className="btn-neon" style={{ flex: 1 }}>
                  {logLoading ? "Menyimpan..." : "Konfirmasi Catat"}
                </button>
                <button type="button" onClick={() => setLoggingItem(null)} className="btn-ghost">
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
        onConfirm={handleDelete}
        title="Hapus Transaksi Rutin"
        message="Yakin ingin menghapus tagihan rutin ini? Transaksi kas riil yang sudah pernah dicatat sebelumnya tidak akan terhapus."
        confirmText="Hapus"
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

