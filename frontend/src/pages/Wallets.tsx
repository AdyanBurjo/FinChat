import { useEffect, useState, useCallback } from "react";
import {
  Plus, Pencil, Trash2, Star, X, Check,
  Banknote, Building2, Smartphone, TrendingUp, Wallet, ArrowRightLeft,
} from "lucide-react";
import api from "../services/api";
import type { Wallet as WalletType } from "../types";
import TransferModal from "../components/TransferModal";
import { ConfirmModal } from "../components/ui/ConfirmModal";

const COLOR_PRESETS = [
  "#39ff14", "#00f5ff", "#bf00ff", "#ff0099",
  "#ffcc00", "#ff6600", "#00e5ff", "#e040fb",
];

const WALLET_TYPE_LABELS: Record<WalletType["type"], string> = {
  cash: "Uang Tunai",
  bank: "Rekening Bank",
  ewallet: "Dompet Digital",
  investment: "Investasi",
};

function WalletIcon({ type, color, size = 20 }: { type: WalletType["type"]; color: string; size?: number }) {
  const props = { size, color };
  switch (type) {
    case "bank": return <Building2 {...props} />;
    case "ewallet": return <Smartphone {...props} />;
    case "investment": return <TrendingUp {...props} />;
    default: return <Banknote {...props} />;
  }
}

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);
}

interface WalletFormData {
  name: string;
  type: WalletType["type"];
  color: string;
  initial_balance: string;
  is_default: boolean;
  transfer_fee: string;
  transfer_fee_type: "sender" | "receiver";
}

const DEFAULT_FORM: WalletFormData = {
  name: "",
  type: "cash",
  color: "#39ff14",
  initial_balance: "0",
  is_default: false,
  transfer_fee: "0",
  transfer_fee_type: "sender",
};

export default function Wallets() {
  const [wallets, setWallets] = useState<WalletType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingWallet, setEditingWallet] = useState<WalletType | null>(null);
  const [formData, setFormData] = useState<WalletFormData>(DEFAULT_FORM);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [showTransferModal, setShowTransferModal] = useState(false);

  const fetchWallets = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get("/wallets");
      setWallets(response.data.wallets || response.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWallets();
  }, [fetchWallets]);

  const openAdd = () => {
    setEditingWallet(null);
    setFormData(DEFAULT_FORM);
    setFormError("");
    setShowForm(true);
  };

  const openEdit = (wallet: WalletType) => {
    setEditingWallet(wallet);
    setFormData({
      name: wallet.name,
      type: wallet.type,
      color: wallet.color,
      initial_balance: wallet.initial_balance,
      is_default: wallet.is_default,
      transfer_fee: String(wallet.transfer_fee ?? 0),
      transfer_fee_type: wallet.transfer_fee_type ?? "sender",
    });
    setFormError("");
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingWallet(null);
    setFormError("");
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setFormError("Nama dompet wajib diisi.");
      return;
    }
    setFormLoading(true);
    setFormError("");
    try {
      const payload = {
        name: formData.name.trim(),
        type: formData.type,
        color: formData.color,
        icon: formData.type,
        is_default: formData.is_default,
        transfer_fee: Number(formData.transfer_fee) || 0,
        transfer_fee_type: formData.transfer_fee_type,
        ...(editingWallet ? {} : { initial_balance: Number(formData.initial_balance) || 0 }),
      };
      if (editingWallet) {
        await api.put(`/wallets/${editingWallet.id}`, payload);
      } else {
        await api.post("/wallets", payload);
      }
      closeForm();
      await fetchWallets();
    } catch (err: any) {
      setFormError(err.response?.data?.message || "Gagal menyimpan dompet.");
    } finally {
      setFormLoading(false);
    }
  };

  const handleSetDefault = async (wallet: WalletType) => {
    try {
      await api.put(`/wallets/${wallet.id}`, {
        name: wallet.name,
        type: wallet.type,
        color: wallet.color,
        icon: wallet.icon,
        is_default: true,
      });
      await fetchWallets();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || "Gagal mengatur dompet default.");
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`/wallets/${deleteId}`);
      setDeleteId(null);
      await fetchWallets();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || "Gagal menghapus dompet.");
      setDeleteId(null);
    }
  };

  return (
    <div className="page">

      {/* Header */}
      <div className="animate-fade-in-up" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "32px", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h1 className="section-title" style={{ marginBottom: "6px" }}>
            Manajemen <span className="neon-text">Dompet</span>
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>
            Kelola semua sumber keuangan kamu
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          {wallets.length > 1 && (
            <button
              className="btn-ghost"
              onClick={() => setShowTransferModal(true)}
              style={{ display: "flex", alignItems: "center", gap: "6px" }}
            >
              <ArrowRightLeft size={16} />
              Transfer Antar Dompet
            </button>
          )}
          <button className="btn-neon" onClick={openAdd}>
            <Plus size={16} />
            Tambah Dompet
          </button>
        </div>
      </div>

      {/* Inline Form */}
      {showForm && (
        <div className="glass-neon animate-fade-in-up" style={{ marginBottom: "24px", padding: "28px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
            <h2 style={{ fontSize: "18px", fontWeight: "600" }}>
              {editingWallet ? "Edit Dompet" : "Tambah Dompet Baru"}
            </h2>
            <button onClick={closeForm} className="btn-ghost" style={{ padding: "8px" }}>
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleFormSubmit} style={{ maxWidth: "520px", display: "flex", flexDirection: "column", gap: "18px" }}>
            {formError && (
              <div style={{ padding: "10px 14px", borderRadius: "10px", background: "rgba(255,0,80,0.08)", border: "1px solid rgba(255,0,80,0.25)", color: "#ff5080", fontSize: "13px" }}>
                {formError}
              </div>
            )}

            {/* Name */}
            <div>
              <label className="label">Nama Dompet</label>
              <input
                type="text"
                className="input-neon"
                value={formData.name}
                onChange={(e) => setFormData((f) => ({ ...f, name: e.target.value }))}
                placeholder="Contoh: BCA Utama"
                required
              />
            </div>

            {/* Type */}
            <div>
              <label className="label">Tipe Dompet</label>
              <select
                className="input-neon"
                value={formData.type}
                onChange={(e) => setFormData((f) => ({ ...f, type: e.target.value as WalletType["type"] }))}
              >
                <option value="cash" style={{ background: "#0d0d12" }}>Uang Tunai</option>
                <option value="bank" style={{ background: "#0d0d12" }}>Rekening Bank</option>
                <option value="ewallet" style={{ background: "#0d0d12" }}>Dompet Digital</option>
                <option value="investment" style={{ background: "#0d0d12" }}>Investasi</option>
              </select>
            </div>

            {/* Color */}
            <div>
              <label className="label">Warna</label>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                {COLOR_PRESETS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setFormData((f) => ({ ...f, color }))}
                    style={{
                      width: "30px",
                      height: "30px",
                      borderRadius: "50%",
                      background: color,
                      border: formData.color === color ? "3px solid white" : "2px solid transparent",
                      cursor: "pointer",
                      boxShadow: formData.color === color ? `0 0 12px ${color}` : `0 0 6px ${color}60`,
                      transition: "all 0.2s",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    {formData.color === color && <Check size={14} color="#000" strokeWidth={3} />}
                  </button>
                ))}
                <input
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData((f) => ({ ...f, color: e.target.value }))}
                  title="Pilih warna kustom"
                  style={{
                    width: "30px",
                    height: "30px",
                    borderRadius: "50%",
                    border: "2px solid var(--border)",
                    cursor: "pointer",
                    padding: "0",
                    background: "transparent",
                    flexShrink: 0,
                  }}
                />
              </div>
            </div>

            {/* Initial Balance — only for new wallets */}
            {!editingWallet && (
              <div>
                <label className="label">Saldo Awal (Rp)</label>
                <input
                  type="number"
                  min="0"
                  className="input-neon"
                  value={formData.initial_balance}
                  onChange={(e) => setFormData((f) => ({ ...f, initial_balance: e.target.value }))}
                  placeholder="0"
                />
              </div>
            )}

            {/* Default checkbox */}
            <label
              style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", userSelect: "none" }}
            >
              <div
                onClick={() => setFormData((f) => ({ ...f, is_default: !f.is_default }))}
                style={{
                  width: "20px",
                  height: "20px",
                  borderRadius: "6px",
                  border: formData.is_default ? "2px solid var(--neon-green)" : "2px solid var(--border)",
                  background: formData.is_default ? "rgba(57,255,20,0.15)" : "transparent",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.2s",
                  flexShrink: 0,
                  cursor: "pointer",
                }}
              >
                {formData.is_default && <Check size={12} color="var(--neon-green)" strokeWidth={3} />}
              </div>
              <span style={{ fontSize: "14px", color: "var(--text-secondary)" }}>Jadikan dompet default</span>
            </label>

            {/* Admin fee section */}
            <div
              style={{
                padding: "14px 16px",
                borderRadius: "12px",
                background: "rgba(255,204,0,0.04)",
                border: "1px solid rgba(255,204,0,0.15)",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
              }}
            >
              <p style={{ fontSize: "12px", fontWeight: "700", color: "#ffcc00", margin: 0 }}>
                Biaya Admin Transfer (Opsional)
              </p>
              <p style={{ fontSize: "11px", color: "var(--text-muted)", margin: 0, lineHeight: 1.5 }}>
                Dikenakan saat ada transfer <strong>ke</strong> dompet ini.
                Pilih siapa yang menanggung biaya.
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div>
                  <label style={{ fontSize: "11px", color: "var(--text-muted)", display: "block", marginBottom: "5px" }}>
                    Nominal Biaya (Rp)
                  </label>
                  <input
                    type="number"
                    min="0"
                    className="input-neon"
                    value={formData.transfer_fee}
                    onChange={(e) => setFormData((f) => ({ ...f, transfer_fee: e.target.value }))}
                    placeholder="0"
                    style={{ fontSize: "13px" }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "11px", color: "var(--text-muted)", display: "block", marginBottom: "5px" }}>
                    Ditanggung oleh
                  </label>
                  <select
                    className="input-neon"
                    value={formData.transfer_fee_type}
                    onChange={(e) => setFormData((f) => ({ ...f, transfer_fee_type: e.target.value as "sender" | "receiver" }))}
                    style={{ fontSize: "13px" }}
                  >
                    <option value="sender">Pengirim (+ biaya di atas)</option>
                    <option value="receiver">Penerima (dipotong dari saldo)</option>
                  </select>
                </div>
              </div>
              {Number(formData.transfer_fee) > 0 && (
                <p style={{ fontSize: "11px", color: "#ffcc00", margin: 0 }}>
                  {formData.transfer_fee_type === "sender"
                    ? `Contoh: transfer 20.000 → pengirim bayar ${(20000 + Number(formData.transfer_fee)).toLocaleString("id-ID")}, penerima dapat 20.000`
                    : `Contoh: transfer 20.000 → pengirim bayar 20.000, penerima dapat ${(20000 - Number(formData.transfer_fee)).toLocaleString("id-ID")}`
                  }
                </p>
              )}
            </div>

            {/* Buttons */}
            <div style={{ display: "flex", gap: "10px", paddingTop: "4px" }}>
              <button type="submit" className="btn-neon" disabled={formLoading} style={{ flex: 1 }}>
                {formLoading ? (
                  <><div className="spinner" style={{ width: "14px", height: "14px", borderWidth: "2px" }} />Menyimpan...</>
                ) : editingWallet ? "Simpan Perubahan" : "Tambah Dompet"}
              </button>
              <button type="button" className="btn-ghost" onClick={closeForm}>
                Batal
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Wallet Cards */}
      {loading ? (
        <div style={{ padding: "64px", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="spinner" />
        </div>
      ) : wallets.length === 0 ? (
        <div className="glass animate-fade-in-up" style={{ padding: "64px", textAlign: "center" }}>
          <div style={{ fontSize: "48px", marginBottom: "16px", opacity: 0.4 }}>💼</div>
          <p style={{ color: "var(--text-secondary)", marginBottom: "16px", fontSize: "15px" }}>Belum ada dompet.</p>
          <button className="btn-neon" onClick={openAdd} style={{ fontSize: "13px", padding: "10px 20px" }}>
            Tambah Dompet Pertama
          </button>
        </div>
      ) : (
        <div
          className="animate-fade-in-up delay-1"
          style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "16px" }}
        >
          {wallets.map((wallet) => (
            <div
              key={wallet.id}
              className="glass"
              style={{
                padding: "20px",
                border: wallet.is_default
                  ? `1px solid ${wallet.color}50`
                  : "1px solid var(--border)",
                boxShadow: wallet.is_default ? `0 0 20px ${wallet.color}18` : "none",
                transition: "all 0.3s",
                position: "relative",
                overflow: "hidden",
              }}
            >
              {/* Subtle color accent top bar */}
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: "3px",
                  background: wallet.color,
                  boxShadow: `0 0 12px ${wallet.color}`,
                  borderRadius: "16px 16px 0 0",
                }}
              />

              {/* Header */}
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "16px", paddingTop: "4px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div
                    style={{
                      width: "42px",
                      height: "42px",
                      borderRadius: "12px",
                      background: `${wallet.color}20`,
                      border: `1px solid ${wallet.color}40`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: `0 0 12px ${wallet.color}30`,
                    }}
                  >
                    <WalletIcon type={wallet.type} color={wallet.color} size={20} />
                  </div>
                  <div>
                    <p style={{ fontWeight: "700", fontSize: "15px", marginBottom: "3px" }}>{wallet.name}</p>
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: "600",
                        padding: "2px 8px",
                        borderRadius: "99px",
                        background: `${wallet.color}18`,
                        border: `1px solid ${wallet.color}35`,
                        color: wallet.color,
                        letterSpacing: "0.03em",
                        textTransform: "uppercase",
                      }}
                    >
                      {WALLET_TYPE_LABELS[wallet.type]}
                    </span>
                  </div>
                </div>
                {wallet.is_default && (
                  <span
                    style={{
                      fontSize: "10px",
                      fontWeight: "700",
                      padding: "3px 8px",
                      borderRadius: "99px",
                      background: "rgba(57,255,20,0.1)",
                      border: "1px solid rgba(57,255,20,0.3)",
                      color: "var(--neon-green)",
                      letterSpacing: "0.05em",
                      textTransform: "uppercase",
                      flexShrink: 0,
                    }}
                  >
                    Default
                  </span>
                )}
              </div>

              {/* Balance */}
              <div style={{ marginBottom: "16px" }}>
                <p style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: "600" }}>
                  Saldo
                </p>
                <p
                  style={{
                    fontSize: "22px",
                    fontWeight: "800",
                    color: wallet.color,
                    textShadow: `0 0 15px ${wallet.color}60`,
                    letterSpacing: "-0.02em",
                  }}
                >
                  {wallet.balance !== undefined ? formatRupiah(wallet.balance) : "—"}
                </p>
              </div>

              {/* Actions */}
              <div
                style={{
                  display: "flex",
                  gap: "8px",
                  paddingTop: "14px",
                  borderTop: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <button
                  onClick={() => openEdit(wallet)}
                  title="Edit"
                  style={{
                    flex: 1,
                    height: "32px",
                    borderRadius: "8px",
                    border: "1px solid var(--border)",
                    background: "transparent",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "5px",
                    color: "var(--text-secondary)",
                    fontSize: "12px",
                    fontWeight: "500",
                    transition: "all 0.2s",
                    fontFamily: "inherit",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = "rgba(57,255,20,0.4)";
                    (e.currentTarget as HTMLElement).style.color = "var(--neon-green)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
                    (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)";
                  }}
                >
                  <Pencil size={13} /> Edit
                </button>

                {!wallet.is_default && (
                  <button
                    onClick={() => handleSetDefault(wallet)}
                    title="Set Default"
                    style={{
                      flex: 1,
                      height: "32px",
                      borderRadius: "8px",
                      border: "1px solid var(--border)",
                      background: "transparent",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "5px",
                      color: "var(--text-secondary)",
                      fontSize: "12px",
                      fontWeight: "500",
                      transition: "all 0.2s",
                      fontFamily: "inherit",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,204,0,0.4)";
                      (e.currentTarget as HTMLElement).style.color = "#ffcc00";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
                      (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)";
                    }}
                  >
                    <Star size={13} /> Default
                  </button>
                )}

                <button
                  onClick={() => setDeleteId(wallet.id)}
                  title="Hapus"
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "8px",
                    border: "1px solid var(--border)",
                    background: "transparent",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--text-secondary)",
                    transition: "all 0.2s",
                    flexShrink: 0,
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,0,80,0.4)";
                    (e.currentTarget as HTMLElement).style.color = "#ff5080";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
                    (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)";
                  }}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary total */}
      {wallets.length > 0 && (
        <div className="glass animate-fade-in-up delay-2" style={{ marginTop: "24px", padding: "20px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Wallet size={18} color="var(--neon-cyan)" />
            <span style={{ fontSize: "14px", color: "var(--text-secondary)", fontWeight: "600" }}>
              Total Saldo Semua Dompet
            </span>
          </div>
          <span style={{ fontSize: "22px", fontWeight: "800", color: "var(--neon-cyan)", textShadow: "0 0 15px rgba(0,245,255,0.5)", letterSpacing: "-0.02em" }}>
            {formatRupiah(
              wallets.reduce((sum, w) => sum + (typeof w.balance === "number" ? w.balance : 0), 0)
            )}
          </span>
        </div>
      )}

      {/* Delete confirm */}
      <ConfirmModal
        isOpen={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Hapus Dompet"
        message="Yakin ingin menghapus dompet ini? Semua transaksi terkait tidak akan ikut terhapus, namun relasi ke dompet ini akan dilepas."
        confirmText="Hapus"
        isDestructive
      />

      {/* Transfer Modal */}
      <TransferModal
        isOpen={showTransferModal}
        onClose={() => setShowTransferModal(false)}
        onSuccess={fetchWallets}
        wallets={wallets}
      />

      {/* Error toast */}
      {errorMsg && (
        <div style={{ position: "fixed", bottom: "24px", right: "24px", zIndex: 9999 }} className="animate-fade-in-up">
          <div className="glass" style={{ border: "1px solid rgba(255,0,80,0.3)", padding: "16px", display: "flex", alignItems: "center", gap: "12px", background: "rgba(20,5,10,0.9)" }}>
            <span style={{ fontSize: "14px", color: "#ff5080" }}>{errorMsg}</span>
            <button onClick={() => setErrorMsg("")} style={{ background: "transparent", border: "none", color: "var(--text-secondary)", cursor: "pointer" }}>
              <X size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
