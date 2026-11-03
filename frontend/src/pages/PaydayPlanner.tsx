import { useState, useEffect } from "react";
import api from "../services/api";
import type { SafeToSpendResponse, PaydayPlannerResponse } from "../types";
import { ConfirmModal } from "../components/ui/ConfirmModal";
import {
  ShieldCheck,
  Zap,
  Calendar,
  Sparkles,
  ShoppingBag,
  TrendingDown,
  ArrowRight,
  PiggyBank,
  CheckCircle2,
  HelpCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

function formatRupiah(value: number | string) {
  const num = Number(value) || 0;
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(num);
}

export default function PaydayPlanner() {
  const [safeData, setSafeData] = useState<SafeToSpendResponse | null>(null);
  const [plannerData, setPlannerData] = useState<PaydayPlannerResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Salary Simulator input
  const [customSalary, setCustomSalary] = useState("");
  const [showBreakdown, setShowBreakdown] = useState(false);

  // Execution modal/form
  const [selectedWalletId, setSelectedWalletId] = useState<string>("");
  const [recordIncome, setRecordIncome] = useState(true);
  const [goalAllocations, setGoalAllocations] = useState<{ [goalId: number]: number }>({});
  const [applying, setApplying] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  const fetchData = async (salaryOverride?: string) => {
    try {
      setLoading(true);
      setError(null);
      const [resSafe, resPlanner] = await Promise.all([
        api.get<SafeToSpendResponse>("/safe-to-spend"),
        api.get<PaydayPlannerResponse>("/payday-planner", {
          params: salaryOverride ? { salary: salaryOverride } : {},
        }),
      ]);

      setSafeData(resSafe.data);
      setPlannerData(resPlanner.data);
      setCustomSalary(String(resPlanner.data.salary_amount));

      // Default wallet
      if (resPlanner.data.wallets.length > 0 && !selectedWalletId) {
        setSelectedWalletId(String(resPlanner.data.wallets[0].id));
      }

      // Initialize goals allocation from recommendation
      const initialAlloc: { [goalId: number]: number } = {};
      if (resPlanner.data.proportions.savings.goals) {
        resPlanner.data.proportions.savings.goals.forEach((g) => {
          initialAlloc[g.id] = g.recommended_amount;
        });
      }
      setGoalAllocations(initialAlloc);
    } catch (err: any) {
      console.error(err);
      setError(err?.response?.data?.message || "Gagal memuat data Safe-to-Spend & Payday Planner");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSimulate = (e: React.FormEvent) => {
    e.preventDefault();
    if (customSalary) {
      fetchData(customSalary);
    }
  };

    const handleApplyAllocation = () => {
      if (!selectedWalletId) {
        setErrorMsg("Pilih dompet penerima gaji terlebih dahulu.");
        return;
      }
      setIsConfirmModalOpen(true);
    };

    const handleConfirmApply = async () => {
      setIsConfirmModalOpen(false);
      try {
        setApplying(true);
        setErrorMsg(null);
        const depositsPayload = Object.entries(goalAllocations).map(([goalId, amount]) => ({
          goal_id: parseInt(goalId),
          amount: Number(amount),
        }));

        const res = await api.post("/payday-planner/apply", {
          salary_amount: parseFloat(customSalary),
          income_wallet_id: parseInt(selectedWalletId),
          record_income: recordIncome,
          savings_deposits: depositsPayload,
        });

        setSuccessMsg(res.data.message || "Alokasi gajian berhasil diterapkan!");
        fetchData(customSalary);
        setTimeout(() => setSuccessMsg(null), 5000);
      } catch (err: any) {
        setErrorMsg(err?.response?.data?.message || "Gagal menerapkan alokasi.");
      } finally {
        setApplying(false);
      }
    };

    return (
      <div className="page animate-fade-in-up" style={{ paddingBottom: "80px" }}>
        {/* Header */}
        <div style={{ marginBottom: "32px" }}>
          <h1 className="section-title" style={{ marginBottom: "6px" }}>
            Safe to Spend & <span className="neon-text">Payday Planner</span>
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>
            Ketahui berapa saldo yang benar-benar bebas dipakai, dan alokasikan gaji secara cerdas begitu masuk rekening.
          </p>
        </div>

        {successMsg && (
          <div
            className="glass-neon"
            style={{
              padding: "16px 20px",
              marginBottom: "24px",
              display: "flex",
              alignItems: "center",
              gap: "12px",
              color: "var(--neon-green)",
            }}
          >
            <CheckCircle2 size={20} />
            <span style={{ fontSize: "14px", fontWeight: "600" }}>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div
            className="glass"
            style={{
              padding: "16px 20px",
              marginBottom: "24px",
              display: "flex",
              alignItems: "center",
              gap: "12px",
              color: "#ff5080",
              borderColor: "rgba(255,80,128,0.4)",
            }}
          >
            <span style={{ fontSize: "14px", fontWeight: "600" }}>{errorMsg}</span>
          </div>
        )}

        {loading && !safeData ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 0", gap: "16px" }}>
            <div className="spinner" />
            <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>Menghitung saldo aman & rekomendasi gajian...</p>
          </div>
        ) : error ? (
          <div className="glass" style={{ padding: "32px", textAlign: "center", borderColor: "rgba(255,0,80,0.4)" }}>
            <p style={{ color: "#ff5080", marginBottom: "16px" }}>{error}</p>
            <button onClick={() => fetchData()} className="btn-ghost">Coba Lagi</button>
          </div>
        ) : (
          <>
            {/* SECTION 1: SAFE TO SPEND REALTIME */}
            {safeData && (
              <div
                className="glass"
                style={{
                  padding: "28px",
                  borderRadius: "20px",
                  marginBottom: "36px",
                  border: `1px solid ${safeData.health_color}40`,
                  boxShadow: `0 0 30px ${safeData.health_color}10`,
                  position: "relative",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px", marginBottom: "24px" }}>
                  <div>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "4px 10px", borderRadius: "99px", background: `${safeData.health_color}15`, color: safeData.health_color, fontSize: "12px", fontWeight: "700", marginBottom: "10px" }}>
                      <ShieldCheck size={14} />
                      <span>{safeData.health_status}</span>
                    </div>
                    <div style={{ fontSize: "13px", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: "600" }}>
                      Safe to Spend (Saldo Bebas Pakai Saat Ini)
                    </div>
                    <div style={{ fontSize: "36px", fontWeight: "900", color: safeData.health_color, marginTop: "4px" }}>
                      {formatRupiah(safeData.safe_to_spend_total)}
                    </div>
                    <p style={{ color: "var(--text-secondary)", fontSize: "13px", marginTop: "4px" }}>
                      Dari total saldo rekening <strong>{formatRupiah(safeData.total_balance)}</strong> setelah dipotong cadangan komitmen <strong>{formatRupiah(safeData.total_reserved)}</strong>.
                    </p>
                  </div>

                  {/* Daily Safe Spend Card */}
                  <div
                    style={{
                      padding: "16px 20px",
                      borderRadius: "16px",
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid var(--border)",
                      minWidth: "220px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#00f5ff", fontSize: "12px", fontWeight: "600", marginBottom: "4px" }}>
                      <Calendar size={14} />
                      <span>Jatah Harian Aman</span>
                    </div>
                    <div style={{ fontSize: "22px", fontWeight: "800", color: "var(--text-primary)" }}>
                      {formatRupiah(safeData.daily_safe_to_spend)} <span style={{ fontSize: "12px", color: "var(--text-secondary)", fontWeight: "400" }}>/hari</span>
                    </div>
                    <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>
                      Tersisa {safeData.days_until_payday} hari menuju gajian ({new Date(safeData.next_payday).toLocaleDateString("id-ID", { day: "numeric", month: "short" })})
                    </div>
                  </div>
                </div>

                {/* Toggle Breakdown Button */}
                <button
                  onClick={() => setShowBreakdown(!showBreakdown)}
                  className="btn-ghost"
                  style={{ fontSize: "12px", padding: "8px 14px", display: "inline-flex", alignItems: "center", gap: "6px" }}
                >
                  <span>{showBreakdown ? "Sembunyikan Rincian Cadangan" : "Lihat Rincian Cadangan Komitmen"}</span>
                  {showBreakdown ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>

                {/* Expandable Breakdown List */}
                {showBreakdown && (
                  <div
                    style={{
                      marginTop: "20px",
                      paddingTop: "20px",
                      borderTop: "1px solid var(--border)",
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                      gap: "16px",
                    }}
                  >
                    {/* Tagihan Rutin */}
                    <div style={{ padding: "14px", borderRadius: "12px", background: "rgba(255,80,128,0.05)", border: "1px solid rgba(255,80,128,0.2)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                        <span style={{ fontSize: "13px", fontWeight: "700", color: "#ff5080", display: "flex", alignItems: "center", gap: "6px" }}>
                          <Zap size={14} /> Tagihan Rutin Sisa Bulan Ini
                        </span>
                        <span style={{ fontSize: "13px", fontWeight: "700", color: "#ff5080" }}>
                          {formatRupiah(safeData.breakdown.remaining_recurring)}
                        </span>
                      </div>
                      {safeData.breakdown.recurring_items.length === 0 ? (
                        <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>Tidak ada tagihan tertunda bulan ini.</div>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                          {safeData.breakdown.recurring_items.map((item, idx) => (
                            <div key={idx} style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "var(--text-secondary)" }}>
                              <span>• {item.name}</span>
                              <span>{formatRupiah(item.amount)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Hutang & Cicilan */}
                    <div style={{ padding: "14px", borderRadius: "12px", background: "rgba(255,204,0,0.05)", border: "1px solid rgba(255,204,0,0.2)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                        <span style={{ fontSize: "13px", fontWeight: "700", color: "#ffcc00", display: "flex", alignItems: "center", gap: "6px" }}>
                          <TrendingDown size={14} /> Cicilan Hutang Jatuh Tempo
                        </span>
                        <span style={{ fontSize: "13px", fontWeight: "700", color: "#ffcc00" }}>
                          {formatRupiah(safeData.breakdown.remaining_debts)}
                        </span>
                      </div>
                      {safeData.breakdown.debt_items.length === 0 ? (
                        <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>Bebas hutang jatuh tempo bulan ini!</div>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                          {safeData.breakdown.debt_items.map((item, idx) => (
                            <div key={idx} style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "var(--text-secondary)" }}>
                              <span>• {item.name}</span>
                              <span>{formatRupiah(item.amount)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Target Tabungan */}
                    <div style={{ padding: "14px", borderRadius: "12px", background: "rgba(57,255,20,0.05)", border: "1px solid rgba(57,255,20,0.2)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                        <span style={{ fontSize: "13px", fontWeight: "700", color: "var(--neon-green)", display: "flex", alignItems: "center", gap: "6px" }}>
                          <PiggyBank size={14} /> Komitmen Target Tabungan
                        </span>
                        <span style={{ fontSize: "13px", fontWeight: "700", color: "var(--neon-green)" }}>
                          {formatRupiah(safeData.breakdown.remaining_savings)}
                        </span>
                      </div>
                      {safeData.breakdown.savings_items.length === 0 ? (
                        <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>Target tabungan bulan ini sudah terpenuhi.</div>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                          {safeData.breakdown.savings_items.map((item, idx) => (
                            <div key={idx} style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "var(--text-secondary)" }}>
                              <span>• {item.name}</span>
                              <span>{formatRupiah(item.amount)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* SECTION 2: PAYDAY PLANNER (ALOKASI GAJIAN) */}
            {plannerData && (
              <div className="glass" style={{ padding: "28px", borderRadius: "20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px", marginBottom: "24px" }}>
                  <div>
                    <h2 style={{ fontSize: "20px", fontWeight: "800", display: "flex", alignItems: "center", gap: "8px" }}>
                      <Sparkles size={20} color="var(--neon-green)" />
                      Payday Planner (Saran Alokasi Gaji Masuk)
                    </h2>
                    <p style={{ color: "var(--text-secondary)", fontSize: "13px", marginTop: "4px" }}>
                      Sumber data: <span style={{ color: "var(--neon-cyan)" }}>{plannerData.source}</span>. FinChat menyarankan porsi ideal sesuai tanggungan riilmu.
                    </p>
                  </div>

                  {/* Salary Simulator Box */}
                  <form onSubmit={handleSimulate} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <input
                      type="number"
                      value={customSalary}
                      onChange={(e) => setCustomSalary(e.target.value)}
                      placeholder="Nominal Gaji"
                      className="input-neon"
                      style={{ width: "160px", padding: "8px 12px", fontSize: "13px" }}
                    />
                    <button type="submit" className="btn-ghost" style={{ padding: "8px 14px", fontSize: "13px" }}>
                      Simulasikan
                    </button>
                  </form>
                </div>

                {/* 4 Pillars Grid */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                    gap: "16px",
                    marginBottom: "28px",
                  }}
                >
                  {/* 1. Needs */}
                  <div className="glass" style={{ padding: "20px", borderRadius: "16px", borderLeft: "4px solid #00f5ff" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                      <span style={{ fontSize: "12px", fontWeight: "700", color: "#00f5ff", textTransform: "uppercase" }}>
                        Kebutuhan Pokok
                      </span>
                      <ShoppingBag size={16} color="#00f5ff" />
                    </div>
                    <div style={{ fontSize: "22px", fontWeight: "800", color: "var(--text-primary)" }}>
                      {formatRupiah(plannerData.proportions.needs.amount)}
                    </div>
                    <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "4px" }}>
                      {plannerData.proportions.needs.percentage}% dari gaji untuk makan, bensin & belanja bulanan.
                    </div>
                  </div>

                  {/* 2. Bills & Cicilan */}
                  <div className="glass" style={{ padding: "20px", borderRadius: "16px", borderLeft: "4px solid #ff5080" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                      <span style={{ fontSize: "12px", fontWeight: "700", color: "#ff5080", textTransform: "uppercase" }}>
                        Tagihan & Cicilan
                      </span>
                      <Zap size={16} color="#ff5080" />
                    </div>
                    <div style={{ fontSize: "22px", fontWeight: "800", color: "var(--text-primary)" }}>
                      {formatRupiah(plannerData.proportions.bills.amount)}
                    </div>
                    <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "4px" }}>
                      {plannerData.proportions.bills.percentage}% disisihkan untuk Wi-Fi, Spotify, cicilan/hutang.
                    </div>
                  </div>

                  {/* 3. Savings */}
                  <div className="glass" style={{ padding: "20px", borderRadius: "16px", borderLeft: "4px solid var(--neon-green)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                      <span style={{ fontSize: "12px", fontWeight: "700", color: "var(--neon-green)", textTransform: "uppercase" }}>
                        Target Tabungan
                      </span>
                      <PiggyBank size={16} color="var(--neon-green)" />
                    </div>
                    <div style={{ fontSize: "22px", fontWeight: "800", color: "var(--text-primary)" }}>
                      {formatRupiah(plannerData.proportions.savings.amount)}
                    </div>
                    <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "4px" }}>
                      {plannerData.proportions.savings.percentage}% untuk impian (alat kopi, darurat, dll).
                    </div>
                  </div>

                  {/* 4. Guilt Free Spending */}
                  <div className="glass" style={{ padding: "20px", borderRadius: "16px", borderLeft: "4px solid #ffcc00" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                      <span style={{ fontSize: "12px", fontWeight: "700", color: "#ffcc00", textTransform: "uppercase" }}>
                        Uang Bebas Pakai
                      </span>
                      <Sparkles size={16} color="#ffcc00" />
                    </div>
                    <div style={{ fontSize: "22px", fontWeight: "800", color: "var(--text-primary)" }}>
                      {formatRupiah(plannerData.proportions.wants.amount)}
                    </div>
                    <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "4px" }}>
                      {plannerData.proportions.wants.percentage}% bebas dipakai nongkrong tanpa rasa bersalah.
                    </div>
                  </div>
                </div>

                {/* Execution / Confirmation Section */}
                <div
                  style={{
                    padding: "20px",
                    borderRadius: "16px",
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid var(--border)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
                    <HelpCircle size={18} color="var(--neon-green)" />
                    <h3 style={{ fontSize: "16px", fontWeight: "700" }}>Konfirmasi & Eksekusi Alokasi Tabungan Otomatis</h3>
                  </div>

                  {plannerData.proportions.savings.goals && plannerData.proportions.savings.goals.length > 0 ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "20px" }}>
                      <p style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
                        FinChat dapat otomatis memotong saldo gaji dan menyetorkan ke target tabungan berikut:
                      </p>
                      {plannerData.proportions.savings.goals.map((goal) => (
                        <div
                          key={goal.id}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            padding: "10px 14px",
                            borderRadius: "10px",
                            background: "rgba(255,255,255,0.03)",
                            border: "1px solid var(--border)",
                          }}
                        >
                          <div>
                            <div style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-primary)" }}>
                              {goal.name}
                            </div>
                            <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                              Sisa kekurangan: {formatRupiah(goal.remaining)}
                            </div>
                          </div>

                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Setoran: Rp</span>
                            <input
                              type="number"
                              value={goalAllocations[goal.id] ?? goal.recommended_amount}
                              onChange={(e) =>
                                setGoalAllocations({
                                  ...goalAllocations,
                                  [goal.id]: Number(e.target.value),
                                })
                              }
                              className="input-neon"
                              style={{ width: "130px", padding: "6px 10px", fontSize: "13px", textAlign: "right" }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "16px" }}>
                      Belum ada target tabungan aktif. Kamu bisa membuatnya di menu Target Tabungan.
                    </p>
                  )}

                  {/* Wallet Destination & Record Income Toggle */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px", alignItems: "center", marginBottom: "20px" }}>
                    <div>
                      <label className="label">Dompet Penerima Gaji</label>
                      <select
                        value={selectedWalletId}
                        onChange={(e) => setSelectedWalletId(e.target.value)}
                        className="input-neon"
                      >
                        {plannerData.wallets.map((w) => (
                          <option key={w.id} value={w.id}>
                            {w.name} (Saldo: {formatRupiah(w.balance ?? 0)})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div style={{ paddingTop: "20px" }}>
                      <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "var(--text-primary)", cursor: "pointer" }}>
                        <input
                          type="checkbox"
                          checked={recordIncome}
                          onChange={(e) => setRecordIncome(e.target.checked)}
                          style={{ accentColor: "var(--neon-green)", width: "16px", height: "16px" }}
                        />
                        <span>Catat nominal gaji sebagai transaksi pemasukan baru</span>
                      </label>
                    </div>
                  </div>

                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <button
                      onClick={handleApplyAllocation}
                      disabled={applying}
                      className="btn-neon"
                      style={{ display: "flex", alignItems: "center", gap: "8px", padding: "12px 24px" }}
                    >
                      <span>{applying ? "Menerapkan Alokasi..." : "Terapkan Alokasi & Amankan Tabungan"}</span>
                      <ArrowRight size={16} />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Confirm Modal */}
        <ConfirmModal
          isOpen={isConfirmModalOpen}
          onClose={() => setIsConfirmModalOpen(false)}
          onConfirm={handleConfirmApply}
          title="Terapkan Alokasi Gajian"
          message={`Yakin ingin menerapkan alokasi gajian sebesar ${formatRupiah(customSalary)}? FinChat akan otomatis menyisihkan dana tabungan ke target terkait.`}
          confirmText="Ya, Terapkan Sekarang"
          cancelText="Batal"
          isDestructive={false}
        />
      </div>
    );
  }
