import type { Wallet } from "../types";

interface WalletSelectorProps {
  wallets: Wallet[];
  selectedWalletId: number | "all";
  onChange: (id: number | "all") => void;
}

export default function WalletSelector({ wallets, selectedWalletId, onChange }: WalletSelectorProps) {
  const selected = selectedWalletId === "all" ? null : wallets.find((w) => w.id === selectedWalletId) ?? null;

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          padding: "4px 10px 4px 6px",
          borderRadius: "12px",
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.1)",
          backdropFilter: "blur(12px)",
          cursor: "pointer",
          position: "relative",
        }}
      >
        {selected ? (
          <span
            style={{
              width: "10px",
              height: "10px",
              borderRadius: "50%",
              background: selected.color,
              boxShadow: `0 0 6px ${selected.color}`,
              flexShrink: 0,
            }}
          />
        ) : (
          <span
            style={{
              width: "10px",
              height: "10px",
              borderRadius: "50%",
              background: "linear-gradient(135deg, var(--neon-green), var(--neon-cyan))",
              flexShrink: 0,
            }}
          />
        )}
        <select
          value={selectedWalletId}
          onChange={(e) => {
            const val = e.target.value;
            onChange(val === "all" ? "all" : Number(val));
          }}
          style={{
            background: "transparent",
            border: "none",
            color: "var(--text-primary)",
            fontSize: "13px",
            fontWeight: "600",
            outline: "none",
            cursor: "pointer",
            fontFamily: "inherit",
            minWidth: "110px",
            paddingRight: "4px",
          }}
        >
          <option value="all" style={{ background: "#0d0d12" }}>
            Semua Dompet
          </option>
          {wallets.map((wallet) => (
            <option key={wallet.id} value={wallet.id} style={{ background: "#0d0d12" }}>
              {wallet.name} ({new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(wallet.balance ?? 0)})
            </option>
          ))}
        </select>
      </div>
    </div>
      );
}
