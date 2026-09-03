import { useState, useEffect } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Receipt,
  Tags,
  LogOut,
  MessageCircle,
  Zap,
  Menu,
  X,
} from "lucide-react";
import api from "../../services/api";
import { ConfirmModal } from "../ui/ConfirmModal";

export default function DashboardLayout() {
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const navigate = useNavigate();

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) setIsSidebarOpen(false);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout");
    } catch (error) {
      console.error(error);
    } finally {
      localStorage.removeItem("token");
      navigate("/login");
    }
  };

  const navItems = [
    { label: "Dashboard", path: "/", icon: LayoutDashboard },
    { label: "Transaksi", path: "/transactions", icon: Receipt },
    { label: "Kategori", path: "/categories", icon: Tags },
    { label: "FinChat AI", path: "/chat", icon: MessageCircle },
  ];

  const sidebarContent = (
    <>
      {/* Brand */}
      <div style={{ marginBottom: "32px", padding: "0 8px", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
            <div style={{
              width: "32px", height: "32px",
              background: "linear-gradient(135deg, rgba(57,255,20,0.2), rgba(57,255,20,0.05))",
              border: "1px solid rgba(57,255,20,0.4)",
              borderRadius: "8px",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 0 15px rgba(57,255,20,0.2)",
            }}>
              <Zap size={16} color="var(--neon-green)" />
            </div>
            <span style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: "20px",
              fontWeight: "700",
              color: "var(--text-primary)",
              letterSpacing: "-0.02em",
            }}>
              Fin<span className="neon-text">Chat</span>
            </span>
          </div>
          <p style={{ fontSize: "12px", color: "var(--text-muted)", paddingLeft: "42px" }}>
            Personal Finance AI
          </p>
        </div>
        {/* Close button on mobile */}
        {isMobile && (
          <button
            onClick={() => setIsSidebarOpen(false)}
            style={{ background: "transparent", border: "none", color: "var(--text-secondary)", cursor: "pointer", padding: "4px", display: "flex" }}
          >
            <X size={20} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav style={{ display: "flex", flexDirection: "column", gap: "4px", flex: 1 }}>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/"}
              className={({ isActive }) =>
                `nav-item${isActive ? " active" : ""}`
              }
              onClick={() => isMobile && setIsSidebarOpen(false)}
            >
              <Icon size={17} />
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      {/* Logout */}
      <div style={{ marginTop: "auto", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "16px" }}>
        <button
          onClick={() => setIsLogoutModalOpen(true)}
          className="btn-ghost"
          style={{ width: "100%", justifyContent: "flex-start", gap: "10px" }}
        >
          <LogOut size={16} />
          Logout
        </button>
      </div>
    </>
  );

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg-base)" }}>

      {/* Background effects */}
      <div className="bg-grid" />
      <div className="glow-orb glow-orb-1" />
      <div className="glow-orb glow-orb-2" />

      {/* Mobile hamburger topbar */}
      {isMobile && (
        <div style={{
          position: "fixed",
          top: 0, left: 0, right: 0,
          height: "56px",
          zIndex: 20,
          background: "rgba(5,5,8,0.95)",
          backdropFilter: "blur(20px)",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 16px",
        }}>
          <button
            onClick={() => setIsSidebarOpen(true)}
            style={{ background: "transparent", border: "none", color: "var(--text-primary)", cursor: "pointer", display: "flex", padding: "6px" }}
          >
            <Menu size={22} />
          </button>
          <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "18px", fontWeight: "700" }}>
            Fin<span className="neon-text">Chat</span>
          </span>
          <div style={{ width: "34px" }} />
        </div>
      )}

      {/* Mobile overlay */}
      {isMobile && isSidebarOpen && (
        <div
          className="animate-fade-in"
          onClick={() => setIsSidebarOpen(false)}
          style={{
            position: "fixed", inset: 0, zIndex: 30,
            background: "rgba(5,5,8,0.7)",
            backdropFilter: "blur(4px)",
          }}
        />
      )}

      {/* Sidebar */}
      <aside style={{
        width: "240px",
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        padding: "24px 16px",
        borderRight: "1px solid var(--border)",
        background: "rgba(5,5,8,0.95)",
        backdropFilter: "blur(20px)",
        position: isMobile ? "fixed" : "sticky",
        top: 0,
        left: isMobile ? (isSidebarOpen ? "0" : "-260px") : "0",
        height: "100vh",
        zIndex: 40,
        transition: "left 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
      }}>
        {sidebarContent}
      </aside>

      {/* Main */}
      <main style={{
        flex: 1,
        position: "relative",
        zIndex: 1,
        overflowY: "auto",
        paddingTop: isMobile ? "56px" : "0",
      }}>
        <Outlet />
      </main>

      <ConfirmModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={handleLogout}
        title="Keluar Akun"
        message="Apakah kamu yakin ingin keluar dari akun ini? Kamu harus login kembali untuk mengakses data keuanganmu."
        confirmText="Ya, Keluar"
        cancelText="Batal"
        isDestructive={true}
      />
    </div>
  );
}