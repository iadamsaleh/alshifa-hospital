import { useState } from "react";
import Modal from "../../components/Modal";
import { useAuth } from "../../context/AuthContext";

export default function DoctorFormModal({ doctor, onClose, onSaved }) {
  const { authFetch } = useAuth();
  const isEdit = Boolean(doctor);

  const [form, setForm] = useState({
    name: doctor?.name || "",
    specialization: doctor?.specialization || "",
    phone: doctor?.phone || "",
    email: doctor?.email || "",
    consultationFee: doctor?.consultationFee ?? "",
    title: doctor?.title || "",
  });
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await authFetch(isEdit ? `/doctors/${doctor.id}` : "/doctors", {
        method: isEdit ? "PUT" : "POST",
        body: JSON.stringify({ ...form, consultationFee: Number(form.consultationFee) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save doctor");
      onSaved(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title={isEdit ? "Edit Doctor" : "Add New Doctor"} onClose={onClose}>
      <form onSubmit={handleSubmit} className="grid gap-3">
        {error && (
          <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>
        )}
        <input
          required
          placeholder="Full name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="border border-slate-300 rounded px-3 py-2"
        />
        <input
          required
          placeholder="Specialization"
          value={form.specialization}
          onChange={(e) => setForm({ ...form, specialization: e.target.value })}
          className="border border-slate-300 rounded px-3 py-2"
        />
        <input
          required
          placeholder="Phone"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          className="border border-slate-300 rounded px-3 py-2"
        />
        <input
          required
          type="email"
          placeholder="Email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          className="border border-slate-300 rounded px-3 py-2"
        />
        <input
          required
          type="number"
          min="0"
          step="0.01"
          placeholder="Consultation fee"
          value={form.consultationFee}
          onChange={(e) => setForm({ ...form, consultationFee: e.target.value })}
          className="border border-slate-300 rounded px-3 py-2"
        />
        <input
          placeholder="Title / designation (optional, e.g. Head of Hospital)"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
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
            {submitting ? "Saving..." : isEdit ? "Save Changes" : "Add Doctor"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
