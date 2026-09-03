import { useEffect, useState, useCallback } from "react";
import { Pencil, Plus, Trash2, X, Filter, AlertCircle } from "lucide-react";
import api from "../services/api";
import type { Transaction } from "../types";
import TransactionForm from "../components/TransactionForm";
import { ConfirmModal } from "../components/ui/ConfirmModal";

const MONTH_NAMES = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

// Reusing Category type locally for simplicity
type Category = { id: number; name: string; type: string };

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);
}

function formatDate(dateString: string) {
  if (!dateString) return "—";
  // Strip out time part if it exists (e.g., space or 'T' separator)
  const datePart = dateString.split("T")[0].split(" ")[0];
  const parts = datePart.split("-");
  if (parts.length === 3) {
    const [year, month, day] = parts;
    return `${day}-${month}-${year}`;
  }
  return dateString;
}

export default function Transactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  
  // Modals state
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  // Filters
  const [filterMonth, setFilterMonth] = useState<number | "all">(new Date().getMonth() + 1);
  const [filterYear, setFilterYear] = useState<number | "all">(new Date().getFullYear());
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [categories, setCategories] = useState<Category[]>([]);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (filterMonth !== "all") params.month = filterMonth;
      if (filterYear !== "all") params.year = filterYear;
      if (filterCategory !== "all") params.category_id = filterCategory;

      const response = await api.get("/transactions", { params });
      setTransactions(response.data.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [filterMonth, filterYear, filterCategory]);

  const fetchCategories = async () => {
    try {
      const response = await api.get("/categories");
      setCategories(response.data.categories || []);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const handleDelete = (id: number) => {
    setDeleteId(id);
  };

  const executeDelete = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`/transactions/${deleteId}`);
      await fetchTransactions();
      setDeleteId(null);
    } catch (error: any) {
      setErrorMsg(error.response?.data?.message || "Gagal menghapus transaksi.");
      setDeleteId(null);
    }
  };

  const handleSuccess = async () => {
    setShowForm(false);
    setEditingTransaction(null);
    await fetchTransactions();
  };

  return (
    <div className="page">

      {/* Header */}
      <div className="animate-fade-in-up" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "32px", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h1 className="section-title" style={{ marginBottom: "6px" }}>
            Transaksi <span className="neon-text">Keuangan</span>
          </h1>
          <p style={{ fontSize: "14px", color: "var(--text-secondary)" }}>Kelola semua transaksi kamu</p>
        </div>
        <button
          id="btn-add-transaction"
          onClick={() => { setEditingTransaction(null); setShowForm(true); }}
          className="btn-neon"
        >
          <Plus size={16} />
          Tambah Transaksi
        </button>
      </div>

      {/* Filters */}
      <div className="glass animate-fade-in-up" style={{ padding: "16px", marginBottom: "24px", display: "flex", flexWrap: "wrap", gap: "16px", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--text-secondary)" }}>
          <Filter size={16} />
          <span style={{ fontSize: "14px", fontWeight: "600" }}>Filter:</span>
        </div>
        
        <select 
          className="input-neon" 
          value={filterMonth} 
          onChange={(e) => setFilterMonth(e.target.value === "all" ? "all" : Number(e.target.value))}
          style={{ padding: "8px 12px", width: "auto" }}
        >
          <option value="all">Semua Bulan</option>
          {MONTH_NAMES.map((m, i) => (
            <option key={i} value={i + 1}>{m}</option>
          ))}
        </select>

        <select 
          className="input-neon" 
          value={filterYear} 
          onChange={(e) => setFilterYear(e.target.value === "all" ? "all" : Number(e.target.value))}
          style={{ padding: "8px 12px", width: "auto" }}
        >
          <option value="all">Semua Tahun</option>
          {[...Array(5)].map((_, i) => {
            const year = new Date().getFullYear() - i;
            return <option key={year} value={year}>{year}</option>;
          })}
        </select>

        <select 
          className="input-neon" 
          value={filterCategory} 
          onChange={(e) => setFilterCategory(e.target.value)}
          style={{ padding: "8px 12px", width: "auto" }}
        >
          <option value="all">Semua Kategori</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name} ({c.type === "income" ? "Pemasukan" : "Pengeluaran"})</option>
          ))}
        </select>
      </div>

      {/* Form Panel */}
      {showForm && (
        <div className="glass-neon animate-fade-in-up" style={{ marginBottom: "24px", padding: "28px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
            <h2 style={{ fontSize: "18px", fontWeight: "600" }}>
              {editingTransaction ? "Edit Transaksi" : "Tambah Transaksi Baru"}
            </h2>
            <button
              onClick={() => { setShowForm(false); setEditingTransaction(null); }}
              className="btn-ghost"
              style={{ padding: "8px" }}
            >
              <X size={18} />
            </button>
          </div>
          <div style={{ maxWidth: "500px" }}>
            <TransactionForm
              transaction={editingTransaction}
              onSuccess={handleSuccess}
              onCancel={() => { setShowForm(false); setEditingTransaction(null); }}
            />
          </div>
        </div>
      )}

      {/* Table */}
      <div className="glass animate-fade-in-up delay-1" style={{ overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: "64px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div className="spinner" />
          </div>
        ) : transactions.length === 0 ? (
          <div style={{ padding: "64px", textAlign: "center" }}>
            <div style={{ fontSize: "40px", marginBottom: "12px", opacity: 0.4 }}>💸</div>
            <p style={{ color: "var(--text-secondary)", marginBottom: "16px" }}>Belum ada transaksi.</p>
            <button onClick={() => setShowForm(true)} className="btn-neon" style={{ fontSize: "13px", padding: "10px 20px" }}>
              Tambah transaksi pertama
            </button>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="neon-table">
              <thead>
                <tr>
                  <th>Tanggal</th>
                  <th>Keterangan</th>
                  <th>Kategori</th>
                  <th>Sumber</th>
                  <th>Tipe</th>
                  <th style={{ textAlign: "right" }}>Nominal</th>
                  <th style={{ textAlign: "center" }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((transaction) => (
                  <tr key={transaction.id}>
                    <td style={{ color: "var(--text-secondary)", fontSize: "13px" }}>
                      {formatDate(transaction.transaction_date)}
                    </td>
                    <td style={{ maxWidth: "200px" }}>
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>
                        {transaction.description || "—"}
                      </span>
                    </td>
                    <td>
                      {transaction.category?.name ? (
                        <span style={{ padding: "3px 10px", borderRadius: "99px", fontSize: "12px", fontWeight: "500", background: "rgba(255,255,255,0.06)", border: "1px solid var(--border)" }}>
                          {transaction.category.name}
                        </span>
                      ) : "—"}
                    </td>
                    <td>
                      <span className={transaction.source === "chat" ? "badge badge-chat" : "badge"} style={transaction.source !== "chat" ? { background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)", color: "var(--text-muted)" } : {}}>
                        {transaction.source}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${transaction.type === "income" ? "badge-income" : "badge-expense"}`}>
                        {transaction.type === "income" ? "Pemasukan" : "Pengeluaran"}
                      </span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <span style={{
                        fontWeight: "700", fontSize: "14px",
                        color: transaction.type === "income" ? "var(--neon-green)" : "#ff5080",
                        textShadow: transaction.type === "income" ? "0 0 8px rgba(57,255,20,0.4)" : "0 0 8px rgba(255,0,80,0.3)",
                      }}>
                        {transaction.type === "income" ? "+" : "−"}{formatRupiah(Number(transaction.amount))}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: "flex", justifyContent: "center", gap: "6px" }}>
                        <button
                          onClick={() => { setEditingTransaction(transaction); setShowForm(true); }}
                          title="Edit"
                          style={{
                            width: "32px", height: "32px", borderRadius: "8px", border: "1px solid var(--border)",
                            background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                            color: "var(--text-secondary)", transition: "all 0.2s",
                          }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(57,255,20,0.4)"; (e.currentTarget as HTMLElement).style.color = "var(--neon-green)"; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)"; }}
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(transaction.id)}
                          title="Hapus"
                          style={{
                            width: "32px", height: "32px", borderRadius: "8px", border: "1px solid var(--border)",
                            background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                            color: "var(--text-secondary)", transition: "all 0.2s",
                          }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,0,80,0.4)"; (e.currentTarget as HTMLElement).style.color = "#ff5080"; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)"; }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={executeDelete}
        title="Hapus Transaksi"
        message="Yakin ingin menghapus transaksi ini? Data yang dihapus tidak bisa dikembalikan."
        confirmText="Hapus"
      />
      
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