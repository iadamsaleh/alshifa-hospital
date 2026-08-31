import { useState } from "react";
import Modal from "../../components/Modal";
import { useAuth } from "../../context/AuthContext";

const COMMON_CATEGORIES = [
  "Analgesic",
  "Antibiotic",
  "Gastrointestinal",
  "Respiratory",
  "Electrolyte",
  "IV Fluid",
];
const COMMON_UNITS = ["Tablet", "Capsule", "Bottle", "Sachet", "Inhaler", "Injection", "Box"];

export default function PharmacyItemFormModal({ item, onClose, onSaved }) {
  const { authFetch } = useAuth();
  const isEdit = Boolean(item);

  const [form, setForm] = useState({
    name: item?.name || "",
    category: item?.category || "",
    unit: item?.unit || "",
    pricePerUnit: item?.pricePerUnit ?? "",
    stockQuantity: item?.stockQuantity ?? 0,
    expiryDate: item?.expiryDate ? item.expiryDate.slice(0, 10) : "",
    supplier: item?.supplier || "",
  });
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await authFetch(isEdit ? `/pharmacy/items/${item.id}` : "/pharmacy/items", {
        method: isEdit ? "PUT" : "POST",
        body: JSON.stringify({
          ...form,
          pricePerUnit: Number(form.pricePerUnit),
          stockQuantity: Number(form.stockQuantity),
          expiryDate: form.expiryDate || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save item");
      onSaved(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title={isEdit ? "Edit Pharmacy Item" : "Add New Pharmacy Item"} onClose={onClose}>
      <form onSubmit={handleSubmit} className="grid gap-3">
        {error && (
          <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>
        )}
        <input
          required
          placeholder="Medicine name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="border border-slate-300 rounded px-3 py-2"
        />
        <div className="grid grid-cols-2 gap-3">
          <input
            list="pharmacy-item-categories"
            placeholder="Category"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            className="border border-slate-300 rounded px-3 py-2"
          />
          <input
            required
            list="pharmacy-item-units"
            placeholder="Unit (e.g. Tablet)"
            value={form.unit}
            onChange={(e) => setForm({ ...form, unit: e.target.value })}
            className="border border-slate-300 rounded px-3 py-2"
          />
        </div>
        <datalist id="pharmacy-item-categories">
          {COMMON_CATEGORIES.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
        <datalist id="pharmacy-item-units">
          {COMMON_UNITS.map((u) => (
            <option key={u} value={u} />
          ))}
        </datalist>
        <div className="grid grid-cols-2 gap-3">
          <input
            required
            type="number"
            min="0"
            step="0.01"
            placeholder="Price per unit (PKR)"
            value={form.pricePerUnit}
            onChange={(e) => setForm({ ...form, pricePerUnit: e.target.value })}
            className="border border-slate-300 rounded px-3 py-2"
          />
          <input
            required
            type="number"
            min="0"
            placeholder="Stock quantity"
            value={form.stockQuantity}
            onChange={(e) => setForm({ ...form, stockQuantity: e.target.value })}
            className="border border-slate-300 rounded px-3 py-2"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Expiry date (optional)</label>
            <input
              type="date"
              value={form.expiryDate}
              onChange={(e) => setForm({ ...form, expiryDate: e.target.value })}
              className="border border-slate-300 rounded px-3 py-2 w-full"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Supplier (optional)</label>
            <input
              value={form.supplier}
              onChange={(e) => setForm({ ...form, supplier: e.target.value })}
              className="border border-slate-300 rounded px-3 py-2 w-full"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-2">
          <button
            type="button"
            onClick={onClose}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 rounded px-4 py-2 font-medium"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="bg-blue-950 text-white rounded px-4 py-2 font-medium hover:bg-blue-900 disabled:opacity-50"
          >
            {submitting ? "Saving..." : isEdit ? "Save Changes" : "Add Item"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
