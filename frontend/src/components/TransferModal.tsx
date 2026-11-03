import { useState } from "react";
import type { FormEvent } from "react";
import { ArrowRight, Info } from "lucide-react";
import { Modal } from "./ui/Modal";
import api from "../services/api";
import type { Wallet } from "../types";

interface TransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  wallets: Wallet[];
}

export default function TransferModal({ isOpen, onClose, onSuccess, wallets }: TransferModalProps) {
  const [fromWalletId, setFromWalletId] = useState("");
  const [toWalletId, setToWalletId] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const formatRupiah = (val: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val);

  const selectedSourceWallet = wallets.find((w) => w.id.toString() === fromWalletId);
  const selectedDestWallet = wallets.find((w) => w.id.toString() === toWalletId);
  const toWallets = wallets.filter((w) => w.id.toString() !== fromWalletId);

  // Compute admin fee preview
  const numAmount = Number(amount) || 0;
  const adminFee = Number(selectedDestWallet?.transfer_fee ?? 0);
  const feeType = selectedDestWallet?.transfer_fee_type ?? "sender";

  const sourceDebit = adminFee > 0 && feeType === "sender"
    ? numAmount + adminFee
    : numAmount;
  const destCredit = adminFee > 0 && feeType === "receiver"
    ? numAmount - adminFee
    : numAmount;
  const hasAdminFee = adminFee > 0 && numAmount > 0;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!fromWalletId || !toWalletId) {
      setError("Pilih dompet asal dan tujuan.");
      return;
    }
    if (fromWalletId === toWalletId) {
      setError("Dompet asal dan tujuan tidak boleh sama.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await api.post("/wallets/transfer", {
        from_wallet_id: Number(fromWalletId),
        to_wallet_id: Number(toWalletId),
        amount: Number(amount),
        description: description || null,
        transaction_date: date,
      });
      setFromWalletId("");
      setToWalletId("");
      setAmount("");
      setDescription("");
      setDate(new Date().toISOString().split("T")[0]);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || "Gagal memproses transfer.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setError("");
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Transfer Antar Dompet">
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "8px" }}>
        {error && (
          <div
            style={{
              padding: "10px 14px", borderRadius: "10px",
              background: "rgba(255,0,80,0.08)", border: "1px solid rgba(255,0,80,0.25)",
              color: "#ff5080", fontSize: "13px",
            }}
          >
            {error}
          </div>
        )}

        {/* From → To */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
          <div style={{ flex: 1 }}>
            <label className="label">Dari Dompet</label>
            <select
              className="input-neon"
              value={fromWalletId}
              onChange={(e) => {
                setFromWalletId(e.target.value);
                if (e.target.value === toWalletId) setToWalletId("");
              }}
              required
            >
              <option value="">— Pilih —</option>
              {wallets.map((w) => (
                <option key={w.id} value={w.id} style={{ background: "#0d0d12" }}>
                  {w.name} {w.balance !== undefined ? `(${formatRupiah(w.balance)})` : ""}
                </option>
              ))}
            </select>
            {selectedSourceWallet && (
              <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>
                Saldo tersedia:{" "}
                <span style={{ color: selectedSourceWallet.color || "var(--neon-green)", fontWeight: "600" }}>
                  {formatRupiah(selectedSourceWallet.balance || 0)}
                </span>
              </p>
            )}
          </div>

          <div style={{ paddingTop: "26px", color: "var(--neon-cyan)", flexShrink: 0 }}>
            <ArrowRight size={20} />
          </div>

          <div style={{ flex: 1 }}>
            <label className="label">Ke Dompet</label>
            <select
              className="input-neon"
              value={toWalletId}
              onChange={(e) => setToWalletId(e.target.value)}
              required
            >
              <option value="">— Pilih —</option>
              {toWallets.map((w) => (
                <option key={w.id} value={w.id} style={{ background: "#0d0d12" }}>
                  {w.name} {w.balance !== undefined ? `(${formatRupiah(w.balance)})` : ""}
                </option>
              ))}
            </select>
            {selectedDestWallet && (
              <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>
                {adminFee > 0 ? (
                  <span style={{ color: "#ffcc00" }}>
                    Admin: {formatRupiah(adminFee)} ({feeType === "sender" ? "ditanggung pengirim" : "dipotong dari penerima"})
                  </span>
                ) : (
                  <>Saldo saat ini: <span style={{ color: "var(--text-secondary)", fontWeight: "600" }}>{formatRupiah(selectedDestWallet.balance || 0)}</span></>
                )}
              </p>
            )}
          </div>
        </div>

        {/* Amount */}
        <div>
          <label className="label">Jumlah Transfer (Rp)</label>
          <input
            type="number"
            min="1"
            className="input-neon"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="100000"
            required
          />
        </div>

        {/* Admin fee breakdown preview */}
        {hasAdminFee && (
          <div
            style={{
              padding: "14px 16px",
              borderRadius: "12px",
              background: "rgba(255,204,0,0.06)",
              border: "1px solid rgba(255,204,0,0.25)",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "2px" }}>
              <Info size={13} color="#ffcc00" />
              <span style={{ fontSize: "12px", fontWeight: "700", color: "#ffcc00" }}>Rincian Biaya Admin</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
                <span style={{ color: "var(--text-muted)" }}>Jumlah transfer</span>
                <span style={{ color: "var(--text-secondary)" }}>{formatRupiah(numAmount)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
                <span style={{ color: "var(--text-muted)" }}>
                  Biaya admin ({feeType === "sender" ? "dibayar pengirim" : "dipotong penerima"})
                </span>
                <span style={{ color: "#ffcc00" }}>+ {formatRupiah(adminFee)}</span>
              </div>
              <div
                style={{
                  borderTop: "1px solid rgba(255,255,255,0.08)",
                  paddingTop: "6px",
                  marginTop: "2px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
                  <span style={{ fontWeight: "600", color: "var(--text-secondary)" }}>Keluar dari {selectedSourceWallet?.name ?? "dompet asal"}</span>
                  <span style={{ fontWeight: "800", color: "#ff5080" }}>- {formatRupiah(sourceDebit)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
                  <span style={{ fontWeight: "600", color: "var(--text-secondary)" }}>Masuk ke {selectedDestWallet?.name ?? "tujuan"}</span>
                  <span style={{ fontWeight: "800", color: "var(--neon-green)" }}>+ {formatRupiah(destCredit)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Description */}
        <div>
          <label className="label">Keterangan (Opsional)</label>
          <input
            type="text"
            className="input-neon"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Misal: pindah dana darurat"
          />
        </div>

        {/* Date */}
        <div>
          <label className="label">Tanggal</label>
          <input
            type="date"
            className="input-neon"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>

        {/* Buttons */}
        <div style={{ display: "flex", gap: "10px", paddingTop: "4px" }}>
          <button type="submit" className="btn-neon" disabled={loading} style={{ flex: 1 }}>
            {loading ? (
              <>
                <div className="spinner" style={{ width: "14px", height: "14px", borderWidth: "2px" }} />
                Memproses...
              </>
            ) : (
              <>
                <ArrowRight size={15} />
                Proses Transfer{hasAdminFee ? ` (${formatRupiah(sourceDebit)})` : ""}
              </>
            )}
          </button>
          <button type="button" className="btn-ghost" onClick={handleClose}>
            Batal
          </button>
        </div>
      </form>
    </Modal>
  );
}
