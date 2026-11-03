import { useState, useEffect } from "react";
import api from "../services/api";
import type { SavingsGoal, SavingsGoalResponse, Wallet } from "../types";
import { ConfirmModal } from "../components/ui/ConfirmModal";
import CustodialSavingsTab from "../components/CustodialSavingsTab";
import {
  Target,
  Plus,
  TrendingUp,
  Sparkles,
  Calendar,
  Wallet as WalletIcon,
  Trash2,
  Edit2,
  ArrowUpRight,
  Flame,
  Award,
  History,
  X,
  Coffee,
  Laptop,
  Car,
  Home,
  Plane,
  ShieldCheck,
  Gift,
  PiggyBank,
  Landmark,
} from "lucide-react";

export default function SavingsGoals() {
  const [activeTab, setActiveTab] = useState<"goals" | "custodial">("goals");
  const [data, setData] = useState<SavingsGoalResponse | null>(null);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null);
  const [selectedGoal, setSelectedGoal] = useState<SavingsGoal | null>(null);
  const [deleteGoalId, setDeleteGoalId] = useState<number | null>(null);
  const [deleteDepositId, setDeleteDepositId] = useState<number | null>(null);
  const [alertModal, setAlertModal] = useState<string | null>(null);

  // Goal Form state
  const [goalForm, setGoalForm] = useState({
    name: "",
    target_amount: "",
    current_amount: "",
    target_date: "",
    wallet_id: "",
    color: "#39ff14",
    icon: "Target",
    notes: "",
  });

  // Deposit Form state
  const [depositForm, setDepositForm] = useState({
    amount: "",
    deposit_date: new Date().toISOString().split("T")[0],
    wallet_id: "",
    notes: "",
  });

  const [submitting, setSubmitting] = useState(false);

  const iconOptions = [
    { name: "Target", icon: Target, label: "Target" },
    { name: "Coffee", icon: Coffee, label: "Kopi / Hobi" },
    { name: "Laptop", icon: Laptop, label: "Gadget" },
    { name: "Plane", icon: Plane, label: "Liburan" },
    { name: "Car", icon: Car, label: "Kendaraan" },
    { name: "Home", icon: Home, label: "Rumah" },
    { name: "ShieldCheck", icon: ShieldCheck, label: "Dana Darurat" },
    { name: "Gift", icon: Gift, label: "Hadiah" },
    { name: "PiggyBank", icon: PiggyBank, label: "Tabungan" },
  ];

  const colorOptions = [
    "#39ff14", // Neon Green
    "#00f5ff", // Neon Cyan
    "#bf00ff", // Neon Purple
    "#ff0099", // Neon Pink
    "#ffcc00", // Neon Amber/Yellow
    "#ff6600", // Neon Orange
    "#00e5ff", // Light Teal
  ];

  const fetchGoals = async () => {
    try {
      setLoading(true);
      setError(null);
      const [resGoals, resWallets] = await Promise.all([
        api.get<SavingsGoalResponse>("/savings-goals"),
        api.get<{ wallets: Wallet[] }>("/wallets"),
      ]);
      setData(resGoals.data);
      setWallets(resWallets.data.wallets || []);
    } catch (err: any) {
      console.error(err);
      setError(err?.response?.data?.message || "Gagal memuat target tabungan");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGoals();
  }, []);

  const formatRupiah = (val: number | string) => {
    const num = Number(val) || 0;
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(num);
  };

  const getGoalIcon = (iconName: string) => {
    switch (iconName) {
      case "Coffee":
        return Coffee;
      case "Laptop":
        return Laptop;
      case "Plane":
        return Plane;
      case "Car":
        return Car;
      case "Home":
        return Home;
      case "ShieldCheck":
        return ShieldCheck;
      case "Gift":
        return Gift;
      case "PiggyBank":
        return PiggyBank;
      default:
        return Target;
    }
  };

  const handleOpenGoalModal = (goal?: SavingsGoal) => {
    if (goal) {
      setEditingGoal(goal);
      setGoalForm({
        name: goal.name,
        target_amount: String(goal.target_amount),
        current_amount: String(goal.current_amount),
        target_date: goal.target_date || "",
        wallet_id: goal.wallet_id ? String(goal.wallet_id) : "",
        color: goal.color || "#39ff14",
        icon: goal.icon || "Target",
        notes: goal.notes || "",
      });
    } else {
      setEditingGoal(null);
      setGoalForm({
        name: "",
        target_amount: "",
        current_amount: "",
        target_date: "",
        wallet_id: "",
        color: "#39ff14",
        icon: "Target",
        notes: "",
      });
    }
    setIsGoalModalOpen(true);
  };

  const handleSaveGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const payload: any = {
        name: goalForm.name,
        target_amount: parseFloat(goalForm.target_amount),
        target_date: goalForm.target_date || null,
        wallet_id: goalForm.wallet_id ? parseInt(goalForm.wallet_id) : null,
        color: goalForm.color,
        icon: goalForm.icon,
        notes: goalForm.notes || null,
      };

      if (!editingGoal && goalForm.current_amount) {
        payload.current_amount = parseFloat(goalForm.current_amount);
      }

      if (editingGoal) {
        await api.put(`/savings-goals/${editingGoal.id}`, payload);
      } else {
        await api.post("/savings-goals", payload);
      }

      setIsGoalModalOpen(false);
      fetchGoals();
    } catch (err: any) {
      setAlertModal(err?.response?.data?.message || "Gagal menyimpan target");
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDeleteGoal = async () => {
    if (!deleteGoalId) return;
    try {
      await api.delete(`/savings-goals/${deleteGoalId}`);
      setDeleteGoalId(null);
      fetchGoals();
    } catch (err: any) {
      setAlertModal("Gagal menghapus target tabungan.");
    }
  };

  const handleOpenDepositModal = (goal: SavingsGoal) => {
    setSelectedGoal(goal);
    const rem = goal.remaining_amount;
    const defaultAmount = goal.required_monthly_savings
      ? Math.min(rem, goal.required_monthly_savings)
      : rem > 0
        ? Math.min(rem, 500000)
        : 100000;

    setDepositForm({
      amount: String(defaultAmount > 0 ? defaultAmount : ""),
      deposit_date: new Date().toISOString().split("T")[0],
      wallet_id: goal.wallet_id ? String(goal.wallet_id) : wallets[0]?.id ? String(wallets[0].id) : "",
      notes: "",
    });
    setIsDepositModalOpen(true);
  };

  const handleSaveDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGoal) return;
    try {
      setSubmitting(true);
      await api.post(`/savings-goals/${selectedGoal.id}/deposit`, {
        amount: parseFloat(depositForm.amount),
        deposit_date: depositForm.deposit_date,
        wallet_id: depositForm.wallet_id ? parseInt(depositForm.wallet_id) : null,
        notes: depositForm.notes || null,
      });

      setIsDepositModalOpen(false);
      fetchGoals();
    } catch (err: any) {
      setAlertModal(err?.response?.data?.message || "Gagal menyimpan setoran tabungan");
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenHistoryModal = (goal: SavingsGoal) => {
    setSelectedGoal(goal);
    setIsHistoryModalOpen(true);
  };

  const handleConfirmDeleteDeposit = async () => {
    if (!selectedGoal || !deleteDepositId) return;
    try {
      await api.delete(`/savings-goals/${selectedGoal.id}/deposits/${deleteDepositId}`);
      setDeleteDepositId(null);
      const res = await api.get<SavingsGoal>(`/savings-goals/${selectedGoal.id}`);
      setSelectedGoal(res.data);
      fetchGoals();
    } catch (err: any) {
      setAlertModal("Gagal menghapus setoran");
    }
  };

  return (
    <div className="page" style={{ paddingBottom: "60px" }}>
      {/* Header */}
      <div
        className="animate-fade-in-up"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "24px",
          flexWrap: "wrap",
          gap: "16px",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
            {activeTab === "goals" ? (
              <PiggyBank size={24} color="var(--neon-green)" />
            ) : (
              <Landmark size={24} color="var(--neon-cyan)" />
            )}
            <h1 className="section-title" style={{ margin: 0 }}>
              Tabungan & <span className="neon-text">Simpanan</span>
            </h1>
          </div>
          <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>
            Kelola alokasi target barang impian serta titipan simpanan dan deposito di luar
          </p>
        </div>

          {/* Tab Switcher */}
        <div
          className="glass"
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "4px",
            borderRadius: "14px",
            border: "1px solid var(--border)",
            gap: "4px",
          }}
        >
        <button
          onClick={() => setActiveTab("goals")}
          style={{
            padding: "8px 16px",
            borderRadius: "10px",
            border: "none",
            fontSize: "13px",
            fontWeight: "600",
            cursor: "pointer",
            transition: "all 0.2s",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            background: activeTab === "goals" ? "rgba(57,255,20,0.15)" : "transparent",
            color: activeTab === "goals" ? "var(--neon-green)" : "var(--text-secondary)",
            boxShadow: activeTab === "goals" ? "0 0 15px rgba(57,255,20,0.2)" : "none",
          }}
        >
          <Target size={15} />
          Target Impian
        </button>

        <button
          onClick={() => setActiveTab("custodial")}
          style={{
            padding: "8px 16px",
            borderRadius: "10px",
            border: "none",
            fontSize: "13px",
            fontWeight: "600",
            cursor: "pointer",
            transition: "all 0.2s",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            background: activeTab === "custodial" ? "rgba(0,245,255,0.15)" : "transparent",
            color: activeTab === "custodial" ? "var(--neon-cyan)" : "var(--text-secondary)",
            boxShadow: activeTab === "custodial" ? "0 0 15px rgba(0,245,255,0.2)" : "none",
          }}
        >
          <Landmark size={15} />
          Simpanan & Deposito
        </button>
      </div>
    </div>

      {/* RENDER TAB 2: SIMPANAN & DEPOSITO */ }
      { activeTab === "custodial" && <CustodialSavingsTab wallets={wallets} /> }

    {/* RENDER TAB 1: TARGET IMPIAN (SAVINGS GOALS) */ }
    {
      activeTab === "goals" && (
        <div className="animate-fade-in">
          {/* Action Row for Goals */}
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "20px" }}>
            <button
              onClick={() => handleOpenGoalModal()}
              className="btn-neon"
              style={{ display: "flex", alignItems: "center", gap: "8px" }}
            >
              <Plus size={16} />
              Buat Target Baru
            </button>
          </div>

          {/* Summary Cards */}
          {data && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                gap: "16px",
                marginBottom: "32px",
              }}
            >
              <div className="glass stat-card balance">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <span style={{ fontSize: "12px", fontWeight: "600", textTransform: "uppercase", color: "var(--text-secondary)", letterSpacing: "0.05em" }}>
                    Total Terkumpul
                  </span>
                  <div style={{ padding: "8px", borderRadius: "10px", background: "rgba(57,255,20,0.1)", color: "var(--neon-green)" }}>
                    <TrendingUp size={18} />
                  </div>
                </div>
                <div style={{ fontSize: "24px", fontWeight: "700", color: "var(--text-primary)", marginBottom: "8px" }}>
                  {formatRupiah(data.summary.total_collected)}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div style={{ flex: 1, height: "6px", background: "rgba(255,255,255,0.06)", borderRadius: "99px", overflow: "hidden" }}>
                    <div
                      style={{
                        height: "100%",
                        width: `${Math.min(100, data.summary.overall_percentage)}%`,
                        background: "var(--neon-green)",
                        boxShadow: "0 0 10px rgba(57,255,20,0.8)",
                        borderRadius: "99px",
                        transition: "width 0.5s ease",
                      }}
                    />
                  </div>
                  <span style={{ fontSize: "12px", fontWeight: "700", color: "var(--neon-green)" }}>
                    {data.summary.overall_percentage}%
                  </span>
                </div>
              </div>

              <div className="glass stat-card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <span style={{ fontSize: "12px", fontWeight: "600", textTransform: "uppercase", color: "var(--text-secondary)", letterSpacing: "0.05em" }}>
                    Total Target
                  </span>
                  <div style={{ padding: "8px", borderRadius: "10px", background: "rgba(0,245,255,0.1)", color: "var(--neon-cyan)" }}>
                    <Target size={18} />
                  </div>
                </div>
                <div style={{ fontSize: "24px", fontWeight: "700", color: "var(--text-primary)", marginBottom: "8px" }}>
                  {formatRupiah(data.summary.total_target)}
                </div>
                <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                  Sisa kekurangan: <span style={{ color: "var(--text-primary)", fontWeight: "600" }}>{formatRupiah(Math.max(0, data.summary.total_target - data.summary.total_collected))}</span>
                </div>
              </div>

              <div className="glass stat-card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <span style={{ fontSize: "12px", fontWeight: "600", textTransform: "uppercase", color: "var(--text-secondary)", letterSpacing: "0.05em" }}>
                    Target Aktif
                  </span>
                  <div style={{ padding: "8px", borderRadius: "10px", background: "rgba(255,204,0,0.1)", color: "#ffcc00" }}>
                    <Flame size={18} />
                  </div>
                </div>
                <div style={{ fontSize: "24px", fontWeight: "700", color: "var(--text-primary)", marginBottom: "8px" }}>
                  {data.summary.active_goals} Target
                </div>
                <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                  Sedang diperjuangkan 🔥
                </div>
              </div>

              <div className="glass stat-card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <span style={{ fontSize: "12px", fontWeight: "600", textTransform: "uppercase", color: "var(--text-secondary)", letterSpacing: "0.05em" }}>
                    Target Tercapai
                  </span>
                  <div style={{ padding: "8px", borderRadius: "10px", background: "rgba(191,0,255,0.1)", color: "#bf00ff" }}>
                    <Award size={18} />
                  </div>
                </div>
                <div style={{ fontSize: "24px", fontWeight: "700", color: "var(--text-primary)", marginBottom: "8px" }}>
                  {data.summary.achieved_goals} Lunas
                </div>
                <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                  Impian yang sudah terbeli 🎉
                </div>
              </div>
            </div>
          )}

          {/* Goals Content */}
          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 0", gap: "16px" }}>
              <div className="spinner" />
              <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>Memuat target tabungan...</p>
            </div>
          ) : error ? (
            <div className="glass" style={{ padding: "32px", textAlign: "center", borderColor: "rgba(255,0,80,0.4)" }}>
              <p style={{ color: "#ff5080", marginBottom: "16px" }}>{error}</p>
              <button onClick={fetchGoals} className="btn-ghost">Coba Lagi</button>
            </div>
          ) : data?.goals.length === 0 ? (
            <div className="glass" style={{ padding: "64px 24px", textAlign: "center", borderRadius: "20px" }}>
              <div
                style={{
                  width: "64px",
                  height: "64px",
                  borderRadius: "16px",
                  background: "rgba(57,255,20,0.1)",
                  border: "1px solid rgba(57,255,20,0.2)",
                  color: "var(--neon-green)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 20px auto",
                }}
              >
                <PiggyBank size={32} />
              </div>
              <h3 style={{ fontSize: "20px", fontWeight: "700", marginBottom: "8px" }}>Belum Ada Target Tabungan</h3>
              <p style={{ color: "var(--text-secondary)", fontSize: "14px", maxWidth: "460px", margin: "0 auto 24px auto", lineHeight: "1.6" }}>
                Mulai tentukan barang impianmu, misalnya beli alat kopi espresso Rp 15 juta. FinChat akan otomatis menghitung estimasi waktu dan menyisihkan dana dari dompetmu!
              </p>
              <button onClick={() => handleOpenGoalModal()} className="btn-neon">
                <Plus size={16} /> Buat Target Tabungan Pertama
              </button>
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
                gap: "20px",
              }}
            >
              {data?.goals.map((goal) => {
                const IconComponent = getGoalIcon(goal.icon);
                const isCompleted = goal.status === "achieved" || goal.percentage >= 100;
                const themeColor = goal.color || "var(--neon-green)";

                return (
                  <div
                    key={goal.id}
                    className="glass"
                    style={{
                      padding: "24px",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      borderTop: `4px solid ${themeColor}`,
                      borderRadius: "18px",
                      position: "relative",
                    }}
                  >
                    <div>
                      {/* Card Header */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                          <div
                            style={{
                              width: "44px",
                              height: "44px",
                              borderRadius: "12px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              background: `${themeColor}20`,
                              color: themeColor,
                              border: `1px solid ${themeColor}40`,
                            }}
                          >
                            <IconComponent size={22} />
                          </div>
                          <div>
                            <h3 style={{ fontSize: "16px", fontWeight: "700", color: "var(--text-primary)", marginBottom: "4px" }}>
                              {goal.name}
                            </h3>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "var(--text-secondary)" }}>
                              {goal.wallet ? (
                                <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                  <WalletIcon size={12} /> {goal.wallet.name}
                                </span>
                              ) : (
                                <span>Dompet Bebas</span>
                              )}
                              {goal.target_date && (
                                <>
                                  <span>•</span>
                                  <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                    <Calendar size={12} />
                                    {new Date(goal.target_date).toLocaleDateString("id-ID", {
                                      day: "numeric",
                                      month: "short",
                                      year: "numeric",
                                    })}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          <button
                            onClick={() => handleOpenGoalModal(goal)}
                            style={{ background: "transparent", border: "none", color: "var(--text-secondary)", cursor: "pointer", padding: "6px" }}
                            title="Edit Target"
                          >
                            <Edit2 size={15} />
                          </button>
                          <button
                            onClick={() => setDeleteGoalId(goal.id)}
                            style={{ background: "transparent", border: "none", color: "var(--text-secondary)", cursor: "pointer", padding: "6px" }}
                            title="Hapus Target"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>

                      {/* Amount Progress */}
                      <div style={{ marginTop: "16px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "8px" }}>
                          <span style={{ fontSize: "22px", fontWeight: "800", color: "var(--text-primary)" }}>
                            {formatRupiah(goal.current_amount)}
                          </span>
                          <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
                            dari {formatRupiah(goal.target_amount)}
                          </span>
                        </div>

                        {/* Bar */}
                        <div style={{ width: "100%", height: "8px", background: "rgba(255,255,255,0.06)", borderRadius: "99px", overflow: "hidden", position: "relative" }}>
                          <div
                            style={{
                              height: "100%",
                              width: `${Math.min(100, goal.percentage)}%`,
                              background: themeColor,
                              boxShadow: `0 0 10px ${themeColor}80`,
                              borderRadius: "99px",
                              transition: "width 0.5s ease",
                            }}
                          />
                        </div>

                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "8px", fontSize: "12px" }}>
                          <span
                            style={{
                              padding: "2px 8px",
                              borderRadius: "6px",
                              background: `${themeColor}20`,
                              color: themeColor,
                              fontWeight: "700",
                              fontSize: "11px",
                            }}
                          >
                            {goal.percentage}% Tercapai
                          </span>
                          <span style={{ color: "var(--text-secondary)" }}>
                            {isCompleted ? "Target Lunas! 🏆" : `Kurang ${formatRupiah(goal.remaining_amount)}`}
                          </span>
                        </div>
                      </div>

                      {/* Notes */}
                      {goal.notes && (
                        <div
                          style={{
                            marginTop: "14px",
                            padding: "8px 12px",
                            borderRadius: "8px",
                            background: "rgba(255,255,255,0.03)",
                            fontSize: "12px",
                            color: "var(--text-secondary)",
                            fontStyle: "italic",
                          }}
                        >
                          "{goal.notes}"
                        </div>
                      )}

                      {/* ETA Projection Badge */}
                      <div
                        style={{
                          marginTop: "16px",
                          padding: "12px",
                          borderRadius: "12px",
                          background: "rgba(255,255,255,0.02)",
                          border: "1px solid var(--border)",
                          display: "flex",
                          flexDirection: "column",
                          gap: "6px",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", fontWeight: "600", color: "var(--text-primary)" }}>
                          <Sparkles size={14} color="#ffcc00" />
                          <span>{goal.eta_text}</span>
                        </div>
                        {goal.required_monthly_savings && !isCompleted && (
                          <div style={{ fontSize: "11px", color: "var(--text-secondary)", paddingLeft: "22px" }}>
                            Rekomendasi setoran: <span style={{ color: "var(--neon-green)", fontWeight: "600" }}>{formatRupiah(goal.required_monthly_savings)}/bulan</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Bottom Actions */}
                    <div style={{ marginTop: "20px", paddingTop: "16px", borderTop: "1px solid var(--border)", display: "flex", alignItems: "center", gap: "10px" }}>
                      <button
                        onClick={() => handleOpenDepositModal(goal)}
                        disabled={isCompleted}
                        className="btn-neon"
                        style={{
                          flex: 1,
                          padding: "10px 16px",
                          fontSize: "13px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "6px",
                          opacity: isCompleted ? 0.4 : 1,
                          cursor: isCompleted ? "not-allowed" : "pointer",
                        }}
                      >
                        <ArrowUpRight size={15} />
                        {isCompleted ? "Sudah Tercapai" : "Nabung Sekarang"}
                      </button>

                      <button
                        onClick={() => handleOpenHistoryModal(goal)}
                        className="btn-ghost"
                        style={{
                          padding: "10px 12px",
                          fontSize: "12px",
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                        }}
                        title="Riwayat Setoran"
                      >
                        <History size={15} />
                        <span>{goal.deposits_count || 0}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )
    }

    {/* MODAL: Tambah / Edit Target */ }
    {
      isGoalModalOpen && (
        <div
          className="animate-fade-in"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
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
            style={{
              width: "100%",
              maxWidth: "480px",
              maxHeight: "85vh",
              overflowY: "auto",
              padding: "28px",
              borderRadius: "18px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h3 style={{ fontSize: "18px", fontWeight: "700", display: "flex", alignItems: "center", gap: "8px" }}>
                <Target size={20} color="var(--neon-green)" />
                {editingGoal ? "Edit Target Tabungan" : "Target Tabungan Baru"}
              </h3>
              <button
                onClick={() => setIsGoalModalOpen(false)}
                style={{ background: "transparent", border: "none", color: "var(--text-secondary)", cursor: "pointer" }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveGoal} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label className="label">Nama Target / Barang Impian *</label>
                <input
                  type="text"
                  required
                  placeholder="Misal: Mesin Espresso, MacBook M3, Liburan Jepang"
                  value={goalForm.name}
                  onChange={(e) => setGoalForm({ ...goalForm, name: e.target.value })}
                  className="input-neon"
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label className="label">Nominal Target (Rp) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="15000000"
                    value={goalForm.target_amount}
                    onChange={(e) => setGoalForm({ ...goalForm, target_amount: e.target.value })}
                    className="input-neon"
                  />
                </div>

                {!editingGoal ? (
                  <div>
                    <label className="label">Saldo Awal (Opsional)</label>
                    <input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={goalForm.current_amount}
                      onChange={(e) => setGoalForm({ ...goalForm, current_amount: e.target.value })}
                      className="input-neon"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="label">Saldo Terkumpul Saat Ini</label>
                    <input
                      type="text"
                      disabled
                      value={formatRupiah(editingGoal.current_amount)}
                      className="input-neon"
                    />
                  </div>
                )}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label className="label">Target Selesai (Opsional)</label>
                  <input
                    type="date"
                    value={goalForm.target_date}
                    onChange={(e) => setGoalForm({ ...goalForm, target_date: e.target.value })}
                    className="input-neon"
                  />
                </div>

                <div>
                  <label className="label">Tautkan ke Dompet (Opsional)</label>
                  <select
                    value={goalForm.wallet_id}
                    onChange={(e) => setGoalForm({ ...goalForm, wallet_id: e.target.value })}
                    className="input-neon"
                  >
                    <option value="">Semua / Dompet Bebas</option>
                    {wallets.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name} ({formatRupiah(w.balance ?? 0)})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Icon Selection */}
              <div>
                <label className="label">Pilih Ikon</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  {iconOptions.map((opt) => {
                    const IconC = opt.icon;
                    const isSelected = goalForm.icon === opt.name;
                    return (
                      <button
                        key={opt.name}
                        type="button"
                        onClick={() => setGoalForm({ ...goalForm, icon: opt.name })}
                        style={{
                          padding: "8px 12px",
                          borderRadius: "10px",
                          border: isSelected ? "1px solid var(--neon-green)" : "1px solid var(--border)",
                          background: isSelected ? "rgba(57,255,20,0.15)" : "rgba(255,255,255,0.03)",
                          color: isSelected ? "var(--neon-green)" : "var(--text-secondary)",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          fontSize: "12px",
                        }}
                      >
                        <IconC size={15} />
                        <span>{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Color Selection */}
              <div>
                <label className="label">Pilihan Warna Aksen</label>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  {colorOptions.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setGoalForm({ ...goalForm, color: c })}
                      style={{
                        width: "28px",
                        height: "28px",
                        borderRadius: "50%",
                        backgroundColor: c,
                        border: goalForm.color === c ? "2px solid #ffffff" : "2px solid transparent",
                        boxShadow: goalForm.color === c ? `0 0 10px ${c}` : "none",
                        cursor: "pointer",
                        transform: goalForm.color === c ? "scale(1.15)" : "scale(1)",
                        transition: "all 0.2s",
                      }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="label">Catatan Tambahan (Opsional)</label>
                <textarea
                  rows={2}
                  placeholder="Misal: Spesifikasi barang, link toko, atau motivasi..."
                  value={goalForm.notes}
                  onChange={(e) => setGoalForm({ ...goalForm, notes: e.target.value })}
                  className="input-neon"
                  style={{ resize: "vertical" }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "8px" }}>
                <button type="button" onClick={() => setIsGoalModalOpen(false)} className="btn-ghost">
                  Batal
                </button>
                <button type="submit" disabled={submitting} className="btn-neon">
                  {submitting ? "Menyimpan..." : editingGoal ? "Update Target" : "Simpan Target"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )
    }

    {/* MODAL: Nabung Sekarang */ }
    {
      isDepositModalOpen && selectedGoal && (
        <div
          className="animate-fade-in"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
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
            style={{
              width: "100%",
              maxWidth: "460px",
              maxHeight: "85vh",
              overflowY: "auto",
              padding: "28px",
              borderRadius: "16px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div>
                <h3 style={{ fontSize: "18px", fontWeight: "700", display: "flex", alignItems: "center", gap: "8px" }}>
                  <ArrowUpRight size={20} color="var(--neon-green)" />
                  Nabung Sekarang
                </h3>
                <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "2px" }}>
                  Target: <span style={{ color: "var(--text-primary)", fontWeight: "600" }}>{selectedGoal.name}</span>
                </div>
              </div>
              <button
                onClick={() => setIsDepositModalOpen(false)}
                style={{ background: "transparent", border: "none", color: "var(--text-secondary)", cursor: "pointer" }}
              >
                <X size={20} />
              </button>
            </div>

            <div
              style={{
                padding: "12px 16px",
                borderRadius: "12px",
                background: "rgba(57,255,20,0.08)",
                border: "1px solid rgba(57,255,20,0.2)",
                fontSize: "13px",
                color: "var(--neon-green)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "20px",
              }}
            >
              <span>Sisa kekurangan:</span>
              <span style={{ fontWeight: "700", fontSize: "15px" }}>{formatRupiah(selectedGoal.remaining_amount)}</span>
            </div>

            <form onSubmit={handleSaveDeposit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label className="label">Nominal Setoran (Rp) *</label>
                <input
                  type="number"
                  required
                  min="1000"
                  placeholder="500000"
                  value={depositForm.amount}
                  onChange={(e) => setDepositForm({ ...depositForm, amount: e.target.value })}
                  className="input-neon"
                  style={{ fontSize: "18px", fontWeight: "700" }}
                />
              </div>

              {/* Quick Pills */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {[100000, 250000, 500000, 1000000].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setDepositForm({ ...depositForm, amount: String(preset) })}
                    style={{
                      padding: "6px 12px",
                      borderRadius: "8px",
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid var(--border)",
                      color: "var(--text-secondary)",
                      fontSize: "11px",
                      fontWeight: "600",
                      cursor: "pointer",
                    }}
                  >
                    +{formatRupiah(preset)}
                  </button>
                ))}
                {selectedGoal.remaining_amount > 0 && (
                  <button
                    type="button"
                    onClick={() => setDepositForm({ ...depositForm, amount: String(selectedGoal.remaining_amount) })}
                    style={{
                      padding: "6px 12px",
                      borderRadius: "8px",
                      background: "rgba(57,255,20,0.15)",
                      border: "1px solid rgba(57,255,20,0.4)",
                      color: "var(--neon-green)",
                      fontSize: "11px",
                      fontWeight: "700",
                      cursor: "pointer",
                    }}
                  >
                    Langsung Lunas ({formatRupiah(selectedGoal.remaining_amount)})
                  </button>
                )}
              </div>

              <div>
                <label className="label">Tanggal Setoran *</label>
                <input
                  type="date"
                  required
                  value={depositForm.deposit_date}
                  onChange={(e) => setDepositForm({ ...depositForm, deposit_date: e.target.value })}
                  className="input-neon"
                />
              </div>

              <div>
                <label className="label">Potong dari Dompet (Opsional)</label>
                <select
                  value={depositForm.wallet_id}
                  onChange={(e) => setDepositForm({ ...depositForm, wallet_id: e.target.value })}
                  className="input-neon"
                >
                  <option value="">Tanpa Dompet (Hanya Catatan Tabungan)</option>
                  {wallets.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} (Saldo: {formatRupiah(w.balance ?? 0)})
                    </option>
                  ))}
                </select>
                <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>
                  *Jika memilih dompet, pengeluaran kategori 'Tabungan' akan otomatis tercatat.
                </p>
              </div>

              <div>
                <label className="label">Catatan (Opsional)</label>
                <input
                  type="text"
                  placeholder="Misal: Sisa bonus, tabungan harian, THR..."
                  value={depositForm.notes}
                  onChange={(e) => setDepositForm({ ...depositForm, notes: e.target.value })}
                  className="input-neon"
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "8px" }}>
                <button type="button" onClick={() => setIsDepositModalOpen(false)} className="btn-ghost">
                  Batal
                </button>
                <button type="submit" disabled={submitting} className="btn-neon">
                  {submitting ? "Menyimpan..." : "Setor Tabungan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )
    }

    {/* MODAL: Riwayat Setoran */ }
    {
      isHistoryModalOpen && selectedGoal && (
        <div
          className="animate-fade-in"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
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
            style={{
              width: "100%",
              maxWidth: "480px",
              maxHeight: "85vh",
              overflowY: "auto",
              padding: "28px",
              borderRadius: "18px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <div>
                <h3 style={{ fontSize: "18px", fontWeight: "700", display: "flex", alignItems: "center", gap: "8px" }}>
                  <History size={20} color="var(--neon-cyan)" />
                  Riwayat Setoran
                </h3>
                <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "2px" }}>
                  Target: <span style={{ color: "var(--text-primary)", fontWeight: "600" }}>{selectedGoal.name}</span>
                </div>
              </div>
              <button
                onClick={() => setIsHistoryModalOpen(false)}
                style={{ background: "transparent", border: "none", color: "var(--text-secondary)", cursor: "pointer" }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ maxHeight: "320px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "10px", paddingRight: "4px" }}>
              {!selectedGoal.deposits || selectedGoal.deposits.length === 0 ? (
                <div style={{ padding: "32px 0", textAlign: "center", color: "var(--text-muted)", fontSize: "13px" }}>
                  Belum ada catatan setoran untuk target ini.
                </div>
              ) : (
                selectedGoal.deposits.map((dep) => (
                  <div
                    key={dep.id}
                    style={{
                      padding: "12px 16px",
                      borderRadius: "12px",
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid var(--border)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontSize: "15px", fontWeight: "700", color: "var(--text-primary)" }}>
                          {formatRupiah(dep.amount)}
                        </span>
                        {dep.wallet && (
                          <span style={{ fontSize: "10px", padding: "2px 6px", borderRadius: "4px", background: "rgba(0,245,255,0.1)", color: "var(--neon-cyan)" }}>
                            {dep.wallet.name}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "2px" }}>
                        {(() => {
                          const datePart = dep.deposit_date.split("T")[0].split(" ")[0];
                          const parts = datePart.split("-");
                          if (parts.length === 3) {
                            const [y, m, d] = parts.map(Number);
                            return new Date(y, m - 1, d).toLocaleDateString("id-ID", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            });
                          }
                          return dep.deposit_date;
                        })()}
                        {dep.notes && <span> • {dep.notes}</span>}
                      </div>
                    </div>

                    <button
                      onClick={() => setDeleteDepositId(dep.id)}
                      style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: "6px" }}
                      title="Hapus Catatan Setoran"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))
              )}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "20px" }}>
              <button type="button" onClick={() => setIsHistoryModalOpen(false)} className="btn-ghost">
                Tutup
              </button>
            </div>
          </div>
        </div>
      )
    }

    {/* Delete Goal Confirm Modal */ }
    <ConfirmModal
      isOpen={deleteGoalId !== null}
      onClose={() => setDeleteGoalId(null)}
      onConfirm={handleConfirmDeleteGoal}
      title="Hapus Target Tabungan"
      message="Yakin ingin menghapus target tabungan ini beserta seluruh riwayat mutasinya?"
      confirmText="Hapus Target"
      cancelText="Batal"
      isDestructive={true}
    />

    {/* Delete Deposit Confirm Modal */ }
    <ConfirmModal
      isOpen={deleteDepositId !== null}
      onClose={() => setDeleteDepositId(null)}
      onConfirm={handleConfirmDeleteDeposit}
      title="Hapus Catatan Setoran"
      message="Hapus catatan setoran ini? Saldo dompet terkait juga akan dikembalikan."
      confirmText="Hapus Setoran"
      cancelText="Batal"
      isDestructive={true}
    />

    {/* Alert Error Modal */ }
    {
      alertModal && (
        <ConfirmModal
          isOpen={true}
          onClose={() => setAlertModal(null)}
          onConfirm={() => setAlertModal(null)}
          title="Pemberitahuan"
          message={alertModal}
          confirmText="Mengerti"
          cancelText="Tutup"
          isDestructive={false}
        />
      )
    }
    </div >
  );
  }

