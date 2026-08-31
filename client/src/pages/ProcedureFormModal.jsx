import { useState } from "react";
import Modal from "../components/Modal";
import { useAuth } from "../context/AuthContext";

export default function ProcedureFormModal({ procedure, onClose, onSaved }) {
  const { authFetch } = useAuth();
  const isEdit = Boolean(procedure);

  const [form, setForm] = useState({
    name: procedure?.name || "",
    category: procedure?.category || "",
    defaultPrice: procedure?.defaultPrice ?? "",
    description: procedure?.description || "",
  });
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await authFetch(isEdit ? `/procedures/${procedure.id}` : "/procedures", {
        method: isEdit ? "PUT" : "POST",
        body: JSON.stringify({ ...form, defaultPrice: Number(form.defaultPrice) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save procedure");
      onSaved(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title={isEdit ? "Edit Procedure" : "Add New Procedure"} onClose={onClose}>
      <form onSubmit={handleSubmit} className="grid gap-3">
        {error && (
          <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>
        )}
        <input
          required
          placeholder="Procedure name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="border border-slate-300 rounded px-3 py-2"
        />
        <input
          placeholder="Category"
          value={form.category}
          onChange={(e) => setForm({ ...form, category: e.target.value })}
          className="border border-slate-300 rounded px-3 py-2"
        />
        <input
          required
          type="number"
          min="0"
          step="0.01"
          placeholder="Default price (PKR)"
          value={form.defaultPrice}
          onChange={(e) => setForm({ ...form, defaultPrice: e.target.value })}
          className="border border-slate-300 rounded px-3 py-2"
        />
        <textarea
          placeholder="Description (optional)"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          rows={2}
          className="border border-slate-300 rounded px-3 py-2"
        />

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
            {submitting ? "Saving..." : isEdit ? "Save Changes" : "Add Procedure"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
