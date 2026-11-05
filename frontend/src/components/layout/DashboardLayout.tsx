import { useState, useEffect } from "react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Receipt,
  Tags,
  LogOut,
  MessageCircle,
  Zap,
  Menu,
  X,
  Wallet,
  Target,
  Sparkles,
  HandCoins,
  CalendarDays,
  Repeat,
  PiggyBank,
  ShieldCheck,
  ChevronDown,
} from "lucide-react";
import api from "../../services/api";
import { ConfirmModal } from "../ui/ConfirmModal";

interface SingleNavItem {
  type: "link";
  label: string;
  path: string;
  icon: any;
}

interface DropdownNavItem {
  type: "dropdown";
  id: string;
  label: string;
  icon: any;
  items: {
    label: string;
    path: string;
    icon: any;
  }[];
}

type NavGroupItem = SingleNavItem | DropdownNavItem;

export default function DashboardLayout() {
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const location = useLocation();
  const navigate = useNavigate();

  // State dropdown yang terbuka (default buka dropdown yang sedang aktif halaman anaknya)
  const [openDropdowns, setOpenDropdowns] = useState<Record<string, boolean>>({
    planning: true,
    tracking: false,
  });

  const toggleDropdown = (id: string) => {
    setOpenDropdowns((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) setIsSidebarOpen(false);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Otomatis buka dropdown jika user berada di route anak-anaknya
  useEffect(() => {
    const currentPath = location.pathname;
    if (["/budgets", "/savings-goals", "/payday"].includes(currentPath)) {
      setOpenDropdowns((prev) => ({ ...prev, planning: true }));
    } else if (["/debts", "/recurring", "/calendar"].includes(currentPath)) {
      setOpenDropdowns((prev) => ({ ...prev, tracking: true }));
    }
  }, [location.pathname]);

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

  const navGroups: NavGroupItem[] = [
    { type: "link", label: "Dashboard", path: "/", icon: LayoutDashboard },
    { type: "link", label: "Transaksi", path: "/transactions", icon: Receipt },
    { type: "link", label: "Dompet", path: "/wallets", icon: Wallet },
    {
      type: "dropdown",
      id: "planning",
      label: "Perencanaan",
      icon: Target,
      items: [
        { label: "Anggaran", path: "/budgets", icon: Target },
        { label: "Target Tabungan", path: "/savings-goals", icon: PiggyBank },
        { label: "Payday & Safe Spend", path: "/payday", icon: ShieldCheck },
      ],
    },
    {
      type: "dropdown",
      id: "tracking",
      label: "Jadwal & Tagihan",
      icon: CalendarDays,
      items: [
        { label: "Kalender Keuangan", path: "/calendar", icon: CalendarDays },
        { label: "Transaksi Rutin", path: "/recurring", icon: Repeat },
        { label: "Hutang & Piutang", path: "/debts", icon: HandCoins },
      ],
    },
    { type: "link", label: "Insights", path: "/insights", icon: Sparkles },
    { type: "link", label: "Kategori", path: "/categories", icon: Tags },
    { type: "link", label: "FinChat AI", path: "/chat", icon: MessageCircle },
  ];

  const sidebarContent = (
    <>
      {/* Brand */}
      <div style={{ marginBottom: "28px", padding: "0 8px", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
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
      <nav style={{ display: "flex", flexDirection: "column", gap: "4px", flex: 1, overflowY: "auto", paddingRight: "4px" }}>
        {navGroups.map((entry) => {
          if (entry.type === "link") {
            const Icon = entry.icon;
            return (
              <NavLink
                key={entry.path}
                to={entry.path}
                end={entry.path === "/"}
                className={({ isActive }) =>
                  `nav-item${isActive ? " active" : ""}`
                }
                onClick={() => isMobile && setIsSidebarOpen(false)}
              >
                <Icon size={17} />
                {entry.label}
              </NavLink>
            );
          }

          // Dropdown group
          const DropdownIcon = entry.icon;
          const isGroupOpen = !!openDropdowns[entry.id];
          const hasActiveChild = entry.items.some((sub) => location.pathname === sub.path);

          return (
            <div key={entry.id} style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
              <button
                type="button"
                onClick={() => toggleDropdown(entry.id)}
                className={`nav-item ${hasActiveChild ? "active" : ""}`}
                style={{
                  width: "100%",
                  justifyContent: "space-between",
                  cursor: "pointer",
                  background: hasActiveChild ? "rgba(57, 255, 20, 0.05)" : "transparent",
                  borderColor: hasActiveChild ? "rgba(57, 255, 20, 0.15)" : "transparent",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <DropdownIcon size={17} />
                  <span>{entry.label}</span>
                </div>
                <ChevronDown
                  size={15}
                  style={{
                    transform: isGroupOpen ? "rotate(180deg)" : "rotate(0deg)",
                    transition: "transform 0.2s ease",
                    color: hasActiveChild ? "var(--neon-green)" : "var(--text-secondary)",
                  }}
                />
              </button>

              {isGroupOpen && (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "2px",
                    marginLeft: "14px",
                    paddingLeft: "10px",
                    borderLeft: "1px dashed rgba(255, 255, 255, 0.12)",
                    marginTop: "2px",
                    marginBottom: "4px",
                  }}
                >
                  {entry.items.map((sub) => {
                    const SubIcon = sub.icon;
                    return (
                      <NavLink
                        key={sub.path}
                        to={sub.path}
                        className={({ isActive }) =>
                          `nav-item${isActive ? " active" : ""}`
                        }
                        style={{
                          padding: "8px 12px",
                          fontSize: "13px",
                          borderRadius: "10px",
                        }}
                        onClick={() => isMobile && setIsSidebarOpen(false)}
                      >
                        <SubIcon size={15} />
                        {sub.label}
                      </NavLink>
                    );
                  })}
                </div>
              )}
            </div>
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
          zIndex: 40,
          background: "rgba(5,5,8,0.92)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 16px",
        }}>
          <button
            onClick={() => setIsSidebarOpen(true)}
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid var(--border)",
              borderRadius: "10px",
              color: "var(--text-primary)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "38px",
              height: "38px",
            }}
            aria-label="Buka Menu"
          >
            <Menu size={20} />
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{
              width: "26px", height: "26px",
              background: "linear-gradient(135deg, rgba(57,255,20,0.2), rgba(57,255,20,0.05))",
              border: "1px solid rgba(57,255,20,0.4)",
              borderRadius: "7px",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Zap size={14} color="var(--neon-green)" />
            </div>
            <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "17px", fontWeight: "700" }}>
              Fin<span className="neon-text">Chat</span>
            </span>
          </div>

          <button
            onClick={() => setIsLogoutModalOpen(true)}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--text-secondary)",
              cursor: "pointer",
              display: "flex",
              padding: "6px",
            }}
            aria-label="Logout"
          >
            <LogOut size={18} />
          </button>
        </div>
      )}

      {/* Mobile overlay */}
      {isMobile && isSidebarOpen && (
        <div
          className="animate-fade-in"
          onClick={() => setIsSidebarOpen(false)}
          style={{
            position: "fixed", inset: 0, zIndex: 45,
            background: "rgba(5,5,8,0.75)",
            backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)",
          }}
        />
      )}

      {/* Sidebar */}
      <aside style={{
        width: isMobile ? "280px" : "240px",
        maxWidth: "85vw",
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        padding: "24px 16px",
        borderRight: "1px solid var(--border)",
        background: "rgba(5,5,8,0.98)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        position: isMobile ? "fixed" : "sticky",
        top: 0,
        left: isMobile ? (isSidebarOpen ? "0" : "-300px") : "0",
        height: "100vh",
        zIndex: 50,
        boxShadow: isMobile && isSidebarOpen ? "0 0 40px rgba(0,0,0,0.8)" : "none",
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
        overflowX: "hidden",
        paddingTop: isMobile ? "56px" : "0",
        paddingBottom: isMobile ? "68px" : "0",
        minWidth: 0,
      }}>
        <Outlet />
      </main>

      {/* Mobile Bottom Navigation Bar */}
      {isMobile && (
        <nav
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            height: "64px",
            zIndex: 35,
            background: "rgba(8, 8, 13, 0.94)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            borderTop: "1px solid var(--border)",
            display: "grid",
            gridTemplateColumns: "repeat(5, 1fr)",
            alignItems: "center",
            padding: "0 4px",
          }}
        >
          {[
            { label: "Home", path: "/", icon: LayoutDashboard },
            { label: "Transaksi", path: "/transactions", icon: Receipt },
            { label: "FinChat", path: "/chat", icon: MessageCircle, isSpecial: true },
            { label: "Dompet", path: "/wallets", icon: Wallet },
            { label: "Insights", path: "/insights", icon: Sparkles },
          ].map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            if (item.isSpecial) {
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    textDecoration: "none",
                    position: "relative",
                    top: "-8px",
                  }}
                >
                  <div
                    style={{
                      width: "44px",
                      height: "44px",
                      borderRadius: "50%",
                      background: isActive
                        ? "linear-gradient(135deg, #00f5ff, #39ff14)"
                        : "linear-gradient(135deg, rgba(0,245,255,0.25), rgba(57,255,20,0.25))",
                      border: `2px solid ${isActive ? "var(--neon-cyan)" : "rgba(0,245,255,0.4)"}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: isActive
                        ? "0 0 20px rgba(0,245,255,0.5)"
                        : "0 0 10px rgba(0,245,255,0.2)",
                      transition: "all 0.2s",
                    }}
                  >
                    <Icon size={20} color={isActive ? "#050508" : "var(--neon-cyan)"} strokeWidth={2.5} />
                  </div>
                  <span
                    style={{
                      fontSize: "10px",
                      fontWeight: "700",
                      marginTop: "3px",
                      color: isActive ? "var(--neon-cyan)" : "var(--text-secondary)",
                    }}
                  >
                    AI Chat
                  </span>
                </NavLink>
              );
            }

            return (
              <NavLink
                key={item.path}
                to={item.path}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "4px",
                  textDecoration: "none",
                  padding: "6px 0",
                  color: isActive ? "var(--neon-green)" : "var(--text-muted)",
                  transition: "color 0.2s",
                }}
              >
                <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                <span
                  style={{
                    fontSize: "10px",
                    fontWeight: isActive ? "700" : "500",
                    letterSpacing: "-0.01em",
                  }}
                >
                  {item.label}
                </span>
              </NavLink>
            );
          })}
        </nav>
      )}

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