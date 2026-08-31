import { useState } from "react";
import Modal from "../../components/Modal";
import { useAuth } from "../../context/AuthContext";

const COMMON_CATEGORIES = ["Haematology", "Biochemistry", "Microbiology", "Radiology", "Serology", "Cardiology"];

export default function LabTestFormModal({ test, onClose, onSaved }) {
  const { authFetch } = useAuth();
  const isEdit = Boolean(test);

  const [form, setForm] = useState({
    testName: test?.testName || "",
    testCode: test?.testCode || "",
    category: test?.category || "",
    price: test?.price ?? "",
    description: test?.description || "",
  });
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await authFetch(isEdit ? `/lab/tests/${test.id}` : "/lab/tests", {
        method: isEdit ? "PUT" : "POST",
        body: JSON.stringify({ ...form, price: Number(form.price) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save test");
      onSaved(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title={isEdit ? "Edit Lab Test" : "Add New Lab Test"} onClose={onClose}>
      <form onSubmit={handleSubmit} className="grid gap-3">
        {error && (
          <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>
        )}
        <input
          required
          placeholder="Test name"
          value={form.testName}
          onChange={(e) => setForm({ ...form, testName: e.target.value })}
          className="border border-slate-300 rounded px-3 py-2"
        />
        <input
          required
          placeholder="Test code"
          value={form.testCode}
          onChange={(e) => setForm({ ...form, testCode: e.target.value })}
          className="border border-slate-300 rounded px-3 py-2"
        />
        <input
          list="lab-test-categories"
          placeholder="Category (e.g. Haematology)"
          value={form.category}
          onChange={(e) => setForm({ ...form, category: e.target.value })}
          className="border border-slate-300 rounded px-3 py-2"
        />
        <datalist id="lab-test-categories">
          {COMMON_CATEGORIES.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
        <input
          required
          type="number"
          min="0"
          step="0.01"
          placeholder="Price (PKR)"
          value={form.price}
          onChange={(e) => setForm({ ...form, price: e.target.value })}
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
            {submitting ? "Saving..." : isEdit ? "Save Changes" : "Add Test"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
