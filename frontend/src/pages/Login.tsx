import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Zap, Mail, Lock, ArrowRight } from "lucide-react";
import api from "../services/api";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await api.post("/auth/login", { email, password });
      localStorage.setItem("token", response.data.token);
      navigate("/");
    } catch (error: any) {
      setError(error.response?.data?.message || "Email atau password salah.");
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
            Masuk ke <span className="neon-text">FinChat</span>
          </h1>
          <p style={{ fontSize: "14px", color: "var(--text-secondary)" }}>
            Pantau keuangan kamu dengan AI
          </p>
        </div>

        {error && (
          <div className="animate-fade-in" style={{
            marginBottom: "20px",
            padding: "12px 16px",
            borderRadius: "10px",
            background: "rgba(255,0,80,0.08)",
            border: "1px solid rgba(255,0,80,0.25)",
            color: "#ff5080",
            fontSize: "14px",
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

          <div>
            <label className="label">Email</label>
            <div style={{ position: "relative" }}>
              <Mail size={16} style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-neon"
                placeholder="nama@email.com"
                style={{ paddingLeft: "40px" }}
                required
                id="login-email"
              />
            </div>
          </div>

          <div>
            <label className="label">Password</label>
            <div style={{ position: "relative" }}>
              <Lock size={16} style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-neon"
                placeholder="••••••••"
                style={{ paddingLeft: "40px" }}
                required
                id="login-password"
              />
            </div>
          </div>

          <button
            type="submit"
            id="login-submit"
            disabled={loading}
            className="btn-neon"
            style={{ width: "100%", marginTop: "8px" }}
          >
            {loading ? (
              <>
                <div className="spinner" style={{ width: "16px", height: "16px", borderWidth: "2px" }} />
                Memproses...
              </>
            ) : (
              <>
                Masuk
                <ArrowRight size={16} />
              </>
            )}
          </button>

        </form>

        <p style={{ marginTop: "24px", textAlign: "center", fontSize: "14px", color: "var(--text-secondary)" }}>
          Belum punya akun?{" "}
          <Link to="/register" style={{ color: "var(--neon-green)", fontWeight: "600", textDecoration: "none" }}>
            Daftar sekarang
          </Link>
        </p>

      </div>
    </div>
  );
}