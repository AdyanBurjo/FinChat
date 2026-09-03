import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Plus, Trash2, Tags, AlertCircle, X } from "lucide-react";
import api from "../services/api";
import type { Category } from "../types";
import { ConfirmModal } from "../components/ui/ConfirmModal";

export default function Categories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState("");
  const [type, setType] = useState<"income" | "expense">("expense");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  
  // Modals state
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const fetchCategories = async () => {
    try {
      const response = await api.get("/categories");
      setCategories(response.data.categories);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCategories(); }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    setError("");
    try {
      await api.post("/categories", { name: name.trim(), type });
      setName("");
      await fetchCategories();
    } catch (error: any) {
      setError(error.response?.data?.message || "Gagal menambahkan kategori.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (id: number) => {
    setDeleteId(id);
  };

  const executeDelete = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`/categories/${deleteId}`);
      await fetchCategories();
      setDeleteId(null);
    } catch (error: any) {
      setErrorMsg(error.response?.data?.message || "Gagal menghapus kategori. Pastikan kategori ini tidak digunakan di transaksi.");
      setDeleteId(null);
    }
  };

  const expenseCategories = categories.filter((c) => c.type === "expense");
  const incomeCategories = categories.filter((c) => c.type === "income");

  const CategoryList = ({ list, type: listType }: { list: Category[], type: string }) => (
    <div className="glass animate-fade-in-up delay-2" style={{ padding: "24px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
        <div style={{
          width: "32px", height: "32px", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center",
          background: listType === "income" ? "rgba(57,255,20,0.1)" : "rgba(255,0,80,0.1)",
          border: `1px solid ${listType === "income" ? "rgba(57,255,20,0.3)" : "rgba(255,0,80,0.3)"}`,
        }}>
          <Tags size={15} color={listType === "income" ? "var(--neon-green)" : "#ff5080"} />
        </div>
        <h2 style={{ fontSize: "16px", fontWeight: "600" }}>
          {listType === "income" ? "Pemasukan" : "Pengeluaran"}
          <span style={{ marginLeft: "8px", fontSize: "12px", color: "var(--text-muted)", fontWeight: "400" }}>
            ({list.length})
          </span>
        </h2>
      </div>

      {list.length === 0 ? (
        <p style={{ color: "var(--text-muted)", fontSize: "13px", fontStyle: "italic" }}>
          Belum ada kategori {listType === "income" ? "pemasukan" : "pengeluaran"}.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {list.map((category) => (
            <div
              key={category.id}
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "10px 14px", borderRadius: "10px",
                background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = listType === "income" ? "rgba(57,255,20,0.2)" : "rgba(255,0,80,0.2)")}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
            >
              <span style={{ fontSize: "14px", fontWeight: "500" }}>{category.name}</span>
              <button
                onClick={() => handleDelete(category.id)}
                title="Hapus"
                style={{
                  width: "28px", height: "28px", borderRadius: "6px", border: "1px solid var(--border)",
                  background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                  color: "var(--text-muted)", transition: "all 0.2s",
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,0,80,0.4)"; (e.currentTarget as HTMLElement).style.color = "#ff5080"; (e.currentTarget as HTMLElement).style.background = "rgba(255,0,80,0.08)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLElement).style.color = "var(--text-muted)"; (e.currentTarget as HTMLElement).style.background = "transparent"; }}
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="page">

      {/* Header */}
      <div className="animate-fade-in-up" style={{ marginBottom: "32px" }}>
        <h1 className="section-title" style={{ marginBottom: "6px" }}>
          Kelola <span className="neon-text">Kategori</span>
        </h1>
        <p style={{ fontSize: "14px", color: "var(--text-secondary)" }}>Atur kategori pemasukan dan pengeluaran kamu</p>
      </div>

      {/* Add Form */}
      <div className="glass-neon animate-fade-in-up delay-1" style={{ padding: "24px", marginBottom: "24px" }}>
        <h2 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "16px" }}>Tambah Kategori Baru</h2>

        {error && (
          <div className="animate-fade-in" style={{
            marginBottom: "16px", padding: "10px 14px", borderRadius: "10px",
            background: "rgba(255,0,80,0.08)", border: "1px solid rgba(255,0,80,0.25)",
            color: "#ff5080", fontSize: "13px",
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>

          <input
            id="cat-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Contoh: Makanan, Transportasi..."
            className="input-neon"
            style={{ flex: 1, minWidth: "200px" }}
            required
          />

          <select
            id="cat-type"
            value={type}
            onChange={(e) => setType(e.target.value as "income" | "expense")}
            className="input-neon"
            style={{ width: "160px" }}
          >
            <option value="expense">Pengeluaran</option>
            <option value="income">Pemasukan</option>
          </select>

          <button type="submit" id="cat-submit" disabled={submitting} className="btn-neon" style={{ whiteSpace: "nowrap" }}>
            {submitting ? (
              <><div className="spinner" style={{ width: "14px", height: "14px", borderWidth: "2px" }} />Menambahkan...</>
            ) : (
              <><Plus size={15} />Tambah</>
            )}
          </button>

        </form>
      </div>

      {/* Category Lists */}
      {loading ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "64px" }}>
          <div className="spinner" />
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "16px" }}>
          <CategoryList list={expenseCategories} type="expense" />
          <CategoryList list={incomeCategories} type="income" />
        </div>
      )}

      <ConfirmModal
        isOpen={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={executeDelete}
        title="Hapus Kategori"
        message="Yakin ingin menghapus kategori ini? Pastikan kategori ini tidak sedang digunakan pada transaksi manapun."
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