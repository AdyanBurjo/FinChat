import { useState } from "react";
import { MessageCircle, Send, CheckCircle, XCircle, Sparkles, AlertCircle, X } from "lucide-react";
import api from "../services/api";

interface ParsedTransaction {
  type: "income" | "expense";
  amount: number;
  category_id: number | null;
  category: string | null;
  description: string;
  transaction_date: string;
}

const formatRupiah = (value: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);

const examples = [
  "tadi makan ayam 25rb",
  "beli bensin 50ribu",
  "gaji bulan ini 5jt",
  "bayar listrik 250.000",
];

export default function Chat() {
  const [message, setMessage] = useState("");
  const [parsed, setParsed] = useState<ParsedTransaction | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const handleParse = async () => {
    if (!message.trim()) return;
    setLoading(true);
    setParsed(null);
    setSuccessMsg("");
    try {
      const response = await api.post("/chat/parse", { message });
      setParsed(response.data.data);
    } catch (error: any) {
      setErrorMsg(error.response?.data?.message || "Gagal memproses pesan.");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!parsed) return;
    setSaving(true);
    try {
      await api.post("/chat/confirm", parsed);
      setSuccessMsg(`Transaksi berhasil disimpan! ${parsed.type === "income" ? "💰" : "💸"}`);
      setParsed(null);
      setMessage("");
    } catch (error: any) {
      setErrorMsg(error.response?.data?.message || "Gagal menyimpan transaksi.");
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleParse();
    }
  };

  return (
    <div className="page" style={{ maxWidth: "720px" }}>

      {/* Header */}
      <div className="animate-fade-in-up" style={{ marginBottom: "32px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
          <div style={{
            width: "40px", height: "40px", borderRadius: "12px",
            background: "linear-gradient(135deg, rgba(0,245,255,0.2), rgba(0,245,255,0.05))",
            border: "1px solid rgba(0,245,255,0.35)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 0 20px rgba(0,245,255,0.15)",
          }}>
            <MessageCircle size={20} color="var(--neon-cyan)" />
          </div>
          <h1 className="section-title">
            Fin<span className="neon-text-cyan">Chat</span> <span style={{ fontSize: "16px", color: "var(--text-muted)", fontWeight: "400" }}>AI</span>
          </h1>
        </div>
        <p style={{ fontSize: "14px", color: "var(--text-secondary)", paddingLeft: "52px" }}>
          Catat transaksi dengan bahasa natural — tulis apa adanya, AI yang pahami
        </p>
      </div>

      {/* Success message */}
      {successMsg && (
        <div className="animate-fade-in" style={{
          marginBottom: "20px", padding: "14px 18px", borderRadius: "12px",
          background: "rgba(57,255,20,0.08)", border: "1px solid rgba(57,255,20,0.25)",
          color: "var(--neon-green)", fontSize: "14px", fontWeight: "500",
          display: "flex", alignItems: "center", gap: "8px",
        }}>
          <CheckCircle size={16} />
          {successMsg}
        </div>
      )}

      {/* Input Card */}
      <div className="glass-neon animate-fade-in-up delay-1" style={{ padding: "24px", marginBottom: "20px" }}>

        {/* Examples */}
        <div style={{ marginBottom: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "10px" }}>
            <Sparkles size={13} color="var(--text-muted)" />
            <span style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: "500", letterSpacing: "0.04em", textTransform: "uppercase" }}>Contoh</span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {examples.map((ex) => (
              <button
                key={ex}
                onClick={() => setMessage(ex)}
                style={{
                  padding: "5px 12px", borderRadius: "99px", fontSize: "12px", fontWeight: "500",
                  background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)",
                  color: "var(--text-secondary)", cursor: "pointer", transition: "all 0.2s",
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(0,245,255,0.35)"; (e.currentTarget as HTMLElement).style.color = "var(--neon-cyan)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)"; }}
              >
                {ex}
              </button>
            ))}
          </div>
        </div>

        {/* Textarea */}
        <div style={{ position: "relative" }}>
          <textarea
            id="chat-input"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Tulis transaksimu... (Enter untuk proses)"
            rows={3}
            className="input-neon"
            style={{ resize: "none", paddingBottom: "48px" }}
          />
          <button
            id="chat-send"
            onClick={handleParse}
            disabled={loading || !message.trim()}
            className="btn-neon"
            style={{
              position: "absolute", bottom: "10px", right: "10px",
              padding: "8px 18px", fontSize: "13px",
            }}
          >
            {loading ? (
              <><div className="spinner" style={{ width: "14px", height: "14px", borderWidth: "2px" }} />Memproses...</>
            ) : (
              <><Send size={14} />Proses</>
            )}
          </button>
        </div>

      </div>

      {/* Parsed Result */}
      {parsed && (
        <div className="glass animate-fade-in-up" style={{ padding: "24px", border: "1px solid rgba(0,245,255,0.2)" }}>

          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "20px" }}>
            <Sparkles size={16} color="var(--neon-cyan)" />
            <span style={{ fontSize: "14px", fontWeight: "600", color: "var(--neon-cyan)" }}>
              AI nangkepnya begini:
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "24px" }}>

            {/* Type */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderRadius: "10px", background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)" }}>
              <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>Jenis</span>
              <span className={`badge ${parsed.type === "income" ? "badge-income" : "badge-expense"}`}>
                {parsed.type === "income" ? "Pemasukan" : "Pengeluaran"}
              </span>
            </div>

            {/* Amount */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderRadius: "10px", background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)" }}>
              <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>Nominal</span>
              <span style={{
                fontWeight: "800", fontSize: "18px",
                color: parsed.type === "income" ? "var(--neon-green)" : "#ff5080",
                textShadow: parsed.type === "income" ? "0 0 10px rgba(57,255,20,0.5)" : "0 0 10px rgba(255,0,80,0.4)",
              }}>
                {formatRupiah(parsed.amount)}
              </span>
            </div>

            {/* Category */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderRadius: "10px", background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)" }}>
              <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>Kategori</span>
              <span style={{ fontWeight: "600", fontSize: "14px", color: parsed.category ? "var(--text-primary)" : "var(--text-muted)", fontStyle: parsed.category ? "normal" : "italic" }}>
                {parsed.category || "Belum ditentukan"}
              </span>
            </div>

            {/* Date */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderRadius: "10px", background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)" }}>
              <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>Tanggal</span>
              <span style={{ fontWeight: "600", fontSize: "14px" }}>{parsed.transaction_date}</span>
            </div>

          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            <button
              id="chat-confirm"
              onClick={handleConfirm}
              disabled={saving}
              className="btn-neon"
              style={{ flex: 1 }}
            >
              {saving ? (
                <><div className="spinner" style={{ width: "14px", height: "14px", borderWidth: "2px" }} />Menyimpan...</>
              ) : (
                <><CheckCircle size={15} />Simpan Transaksi</>
              )}
            </button>
            <button
              id="chat-cancel"
              onClick={() => { setParsed(null); setMessage(""); }}
              className="btn-ghost"
            >
              <XCircle size={15} />
              Batal
            </button>
          </div>

        </div>
      )}

      {errorMsg && (
        <div style={{ position: "fixed", bottom: "24px", right: "24px", zIndex: 9999 }} className="animate-fade-in-up">
          <div className="glass" style={{ border: "1px solid rgba(255,0,80,0.3)", padding: "16px", display: "flex", alignItems: "center", gap: "12px", background: "rgba(20,5,10,0.9)" }}>
            <AlertCircle size={20} color="#ff5080" />
            <span style={{ fontSize: "14px", color: "#ff5080" }}>{errorMsg}</span>
            <button onClick={() => setErrorMsg("")} style={{ background: "transparent", border: "none", color: "var(--text-secondary)", cursor: "pointer", marginLeft: "12px" }}>
              <X size={16} />
            </button>
          </div>
        </div>
      )}

    </div>
  );
}