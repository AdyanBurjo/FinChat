import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Zap, User, Mail, Lock, ArrowRight } from "lucide-react";
import api from "../services/api";

export default function Register() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (password !== passwordConfirmation) {
      setError("Konfirmasi password tidak sama.");
      return;
    }
    setLoading(true);
    try {
      const response = await api.post("/auth/register", {
        name, email, password, password_confirmation: passwordConfirmation,
      });
      localStorage.setItem("token", response.data.token);
      navigate("/");
    } catch (error: any) {
      setError(error.response?.data?.message || "Gagal membuat akun.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px",
      position: "relative",
    }}>
      <div className="bg-grid" />
      <div className="glow-orb glow-orb-1" />
      <div className="glow-orb glow-orb-2" />

      <div className="glass-neon animate-fade-in-up" style={{ width: "100%", maxWidth: "420px", padding: "40px", position: "relative", zIndex: 1 }}>

        {/* Brand */}
        <div style={{ textAlign: "center", marginBottom: "36px" }}>
          <div style={{
            width: "56px", height: "56px",
            background: "linear-gradient(135deg, rgba(57,255,20,0.2), rgba(57,255,20,0.05))",
            border: "1px solid rgba(57,255,20,0.4)",
            borderRadius: "16px",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 16px",
            boxShadow: "0 0 25px rgba(57,255,20,0.2)",
          }}>
            <Zap size={24} color="var(--neon-green)" />
          </div>
          <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: "28px", fontWeight: "700", letterSpacing: "-0.02em", marginBottom: "6px" }}>
            Buat Akun <span className="neon-text">Baru</span>
          </h1>
          <p style={{ fontSize: "14px", color: "var(--text-secondary)" }}>
            Mulai kelola keuangan dengan AI
          </p>
        </div>

        {error && (
          <div className="animate-fade-in" style={{
            marginBottom: "20px", padding: "12px 16px", borderRadius: "10px",
            background: "rgba(255,0,80,0.08)", border: "1px solid rgba(255,0,80,0.25)",
            color: "#ff5080", fontSize: "14px",
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

          <div>
            <label className="label">Nama</label>
            <div style={{ position: "relative" }}>
              <User size={16} style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
              <input id="reg-name" type="text" value={name} onChange={(e) => setName(e.target.value)}
                className="input-neon" placeholder="Nama kamu" style={{ paddingLeft: "40px" }} required />
            </div>
          </div>

          <div>
            <label className="label">Email</label>
            <div style={{ position: "relative" }}>
              <Mail size={16} style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
              <input id="reg-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                className="input-neon" placeholder="nama@email.com" style={{ paddingLeft: "40px" }} required />
            </div>
          </div>

          <div>
            <label className="label">Password</label>
            <div style={{ position: "relative" }}>
              <Lock size={16} style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
              <input id="reg-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                className="input-neon" placeholder="Minimal 8 karakter" style={{ paddingLeft: "40px" }} required />
            </div>
          </div>

          <div>
            <label className="label">Konfirmasi Password</label>
            <div style={{ position: "relative" }}>
              <Lock size={16} style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
              <input id="reg-confirm" type="password" value={passwordConfirmation} onChange={(e) => setPasswordConfirmation(e.target.value)}
                className="input-neon" placeholder="Ulangi password" style={{ paddingLeft: "40px" }} required />
            </div>
          </div>

          <button type="submit" id="reg-submit" disabled={loading} className="btn-neon" style={{ width: "100%", marginTop: "8px" }}>
            {loading ? (
              <><div className="spinner" style={{ width: "16px", height: "16px", borderWidth: "2px" }} />Membuat akun...</>
            ) : (
              <>Daftar Sekarang<ArrowRight size={16} /></>
            )}
          </button>

        </form>

        <p style={{ marginTop: "24px", textAlign: "center", fontSize: "14px", color: "var(--text-secondary)" }}>
          Sudah punya akun?{" "}
          <Link to="/login" style={{ color: "var(--neon-green)", fontWeight: "600", textDecoration: "none" }}>
            Masuk
          </Link>
        </p>

      </div>
    </div>
  );
}