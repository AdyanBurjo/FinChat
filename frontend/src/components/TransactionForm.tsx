import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import api from "../services/api";
import type { Category, Transaction } from "../types";

interface TransactionFormProps {
  transaction?: Transaction | null;
  onSuccess: () => void;
  onCancel?: () => void;
}

export default function TransactionForm({ transaction, onSuccess, onCancel }: TransactionFormProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [type, setType] = useState<"income" | "expense">(transaction?.type || "expense");
  const [categoryId, setCategoryId] = useState(transaction?.category_id?.toString() || "");
  const [amount, setAmount] = useState(transaction?.amount || "");
  const [description, setDescription] = useState(transaction?.description || "");
  const [date, setDate] = useState(transaction?.transaction_date || new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await api.get("/categories");
        setCategories(response.data.categories);
      } catch (error) {
        console.error(error);
      }
    };
    fetchCategories();
  }, []);

  const filteredCategories = categories.filter((c) => c.type === type);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const payload = {
        category_id: categoryId ? Number(categoryId) : null,
        type,
        amount: Number(amount),
        description: description || null,
        transaction_date: date,
      };
      if (transaction) {
        await api.put(`/transactions/${transaction.id}`, payload);
      } else {
        await api.post("/transactions", payload);
      }
      onSuccess();
    } catch (error: any) {
      setError(error.response?.data?.message || "Gagal menyimpan transaksi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>

      {error && (
        <div style={{
          padding: "10px 14px", borderRadius: "10px",
          background: "rgba(255,0,80,0.08)", border: "1px solid rgba(255,0,80,0.25)",
          color: "#ff5080", fontSize: "13px",
        }}>
          {error}
        </div>
      )}

      {/* Type Toggle */}
      <div>
        <label className="label">Jenis Transaksi</label>
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            type="button"
            id="type-expense"
            onClick={() => { setType("expense"); setCategoryId(""); }}
            className={`type-btn ${type === "expense" ? "active-expense" : ""}`}
          >
            💸 Pengeluaran
          </button>
          <button
            type="button"
            id="type-income"
            onClick={() => { setType("income"); setCategoryId(""); }}
            className={`type-btn ${type === "income" ? "active-income" : ""}`}
          >
            💰 Pemasukan
          </button>
        </div>
      </div>

      {/* Amount */}
      <div>
        <label className="label">Nominal</label>
        <input
          id="form-amount"
          type="number"
          min="1"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="input-neon"
          placeholder="25000"
          required
        />
      </div>

      {/* Category */}
      <div>
        <label className="label">Kategori</label>
        <select
          id="form-category"
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="input-neon"
        >
          <option value="">— Pilih kategori —</option>
          {filteredCategories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>

      {/* Description */}
      <div>
        <label className="label">Keterangan</label>
        <textarea
          id="form-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="input-neon"
          placeholder="Makan siang bareng teman..."
          rows={3}
          style={{ resize: "none" }}
        />
      </div>

      {/* Date */}
      <div>
        <label className="label">Tanggal</label>
        <input
          id="form-date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="input-neon"
          required
        />
      </div>

      {/* Buttons */}
      <div style={{ display: "flex", gap: "10px", paddingTop: "4px" }}>
        <button
          type="submit"
          id="form-submit"
          disabled={loading}
          className="btn-neon"
          style={{ flex: 1 }}
        >
          {loading ? (
            <><div className="spinner" style={{ width: "14px", height: "14px", borderWidth: "2px" }} />Menyimpan...</>
          ) : transaction ? "Simpan Perubahan" : "Tambah Transaksi"}
        </button>
        {onCancel && (
          <button
            type="button"
            id="form-cancel"
            onClick={onCancel}
            className="btn-ghost"
          >
            Batal
          </button>
        )}
      </div>

    </form>
  );
}