import { Modal } from "./Modal";
import { AlertTriangle } from "lucide-react";

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Konfirmasi",
  cancelText = "Batal",
  isDestructive = true,
}: ConfirmModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", paddingTop: "8px" }}>
        
        <div style={{
          width: "56px",
          height: "56px",
          borderRadius: "50%",
          background: isDestructive ? "rgba(255,0,80,0.1)" : "rgba(0,245,255,0.1)",
          border: `1px solid ${isDestructive ? "rgba(255,0,80,0.2)" : "rgba(0,245,255,0.2)"}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: "16px",
          boxShadow: isDestructive ? "0 0 20px rgba(255,0,80,0.15)" : "0 0 20px rgba(0,245,255,0.15)"
        }}>
          <AlertTriangle size={28} color={isDestructive ? "#ff5080" : "var(--neon-cyan)"} />
        </div>
        
        <h3 style={{ fontSize: "18px", fontWeight: "600", marginBottom: "8px" }}>{title}</h3>
        <p style={{ color: "var(--text-secondary)", fontSize: "14px", lineHeight: "1.5", marginBottom: "28px" }}>
          {message}
        </p>

        <div style={{ display: "flex", gap: "12px", width: "100%" }}>
          <button
            onClick={onClose}
            className="btn-ghost"
            style={{ flex: 1, padding: "10px", fontSize: "13px" }}
          >
            {cancelText}
          </button>
          
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={isDestructive ? "" : "btn-neon"}
            style={{
              flex: 1,
              padding: "10px",
              fontSize: "13px",
              fontWeight: "600",
              borderRadius: "12px",
              cursor: "pointer",
              transition: "all 0.2s",
              ...(isDestructive ? {
                background: "rgba(255,0,80,0.15)",
                border: "1px solid rgba(255,0,80,0.5)",
                color: "#ff5080",
                textShadow: "0 0 8px rgba(255,0,80,0.4)"
              } : {})
            }}
            onMouseEnter={e => {
              if (isDestructive) {
                (e.currentTarget as HTMLElement).style.background = "rgba(255,0,80,0.25)";
                (e.currentTarget as HTMLElement).style.boxShadow = "0 0 15px rgba(255,0,80,0.3)";
              }
            }}
            onMouseLeave={e => {
              if (isDestructive) {
                (e.currentTarget as HTMLElement).style.background = "rgba(255,0,80,0.15)";
                (e.currentTarget as HTMLElement).style.boxShadow = "none";
              }
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
}
