import { useState } from "react";
import Modal from "../../components/Modal";
import { useAuth } from "../../context/AuthContext";

const DAYS = [
  { key: "MON", label: "Mon" },
  { key: "TUE", label: "Tue" },
  { key: "WED", label: "Wed" },
  { key: "THU", label: "Thu" },
  { key: "FRI", label: "Fri" },
  { key: "SAT", label: "Sat" },
  { key: "SUN", label: "Sun" },
];

export default function ScheduleFormModal({ doctor, onClose, onSaved }) {
  const { authFetch } = useAuth();
  const existing = doctor.schedule || {};

  const [days, setDays] = useState(new Set(existing.days || []));
  const [start, setStart] = useState(existing.times?.start || "09:00");
  const [end, setEnd] = useState(existing.times?.end || "17:00");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  function toggleDay(key) {
    const next = new Set(days);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setDays(next);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await authFetch(`/doctors/${doctor.id}`, {
        method: "PUT",
        body: JSON.stringify({ schedule: { days: Array.from(days), times: { start, end } } }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save schedule");
      onSaved(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title={`Edit Schedule — ${doctor.name}`} onClose={onClose}>
      <form onSubmit={handleSubmit} className="grid gap-4">
        {error && (
          <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>
        )}

        <div>
          <p className="text-sm font-medium text-slate-700 mb-2">Available Days</p>
          <div className="flex flex-wrap gap-3">
            {DAYS.map((d) => (
              <label key={d.key} className="flex items-center gap-1.5 text-sm">
                <input type="checkbox" checked={days.has(d.key)} onChange={() => toggleDay(d.key)} />
                {d.label}
              </label>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Start Time</label>
            <input
              type="time"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className="border border-slate-300 rounded px-3 py-2 w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">End Time</label>
            <input
              type="time"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
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
            {submitting ? "Saving..." : "Save Schedule"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
