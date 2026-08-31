import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const STATUS_STYLES = {
  WAITING: "bg-amber-100 text-amber-800",
  WITH_DOCTOR: "bg-blue-100 text-blue-800",
  COMPLETE: "bg-emerald-100 text-emerald-800",
};

const STATUS_LABELS = {
  WAITING: "Waiting",
  WITH_DOCTOR: "With Doctor",
  COMPLETE: "Complete",
};

function formatTime(value) {
  return new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function StatCard({ label, value }) {
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-2xl font-semibold text-blue-950 mt-1">{value}</p>
    </div>
  );
}

function LabInvoiceBadge({ invoice, onPay }) {
  const [open, setOpen] = useState(false);
  const [paying, setPaying] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  async function handlePay() {
    setPaying(true);
    try {
      await onPay(invoice.id);
      setOpen(false);
    } finally {
      setPaying(false);
    }
  }

  const tests = Array.isArray(invoice.tests) ? invoice.tests : [];

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 border border-amber-300 rounded-full px-2.5 py-0.5 text-[11px] font-semibold hover:bg-amber-200 transition"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
        Lab Invoice Ready
      </button>

      {open && (
        <div className="absolute left-0 top-7 z-30 w-72 bg-white border border-slate-200 rounded-lg shadow-xl p-3">
          <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">Advised Tests</p>
          <ul className="space-y-1 mb-3">
            {tests.map((t, i) => (
              <li key={i} className="flex justify-between text-sm">
                <span className="text-slate-700">
                  {t.testName}
                  {t.testCode && <span className="text-slate-400 ml-1 text-xs">({t.testCode})</span>}
                </span>
                <span className="text-slate-600 shrink-0 ml-2">Rs.{t.price}</span>
              </li>
            ))}
          </ul>
          <div className="border-t border-slate-100 pt-2 flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-800">Total: Rs.{invoice.totalAmount}</span>
            <button
              type="button"
              onClick={handlePay}
              disabled={paying}
              className="bg-emerald-600 text-white rounded px-3 py-1.5 text-xs font-medium hover:bg-emerald-700 disabled:opacity-50"
            >
              {paying ? "Processing..." : "Collect Payment"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TodaysQueuePage() {
  const { user, authFetch } = useAuth();
  const navigate = useNavigate();
  const canComplete = user.role === "ADMIN" || user.role === "RECEPTIONIST";
  const canPrescribe = user.role === "ADMIN" || user.role === "DOCTOR";
  const canCollectPayment = user.role === "ADMIN" || user.role === "RECEPTIONIST";

  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  async function load() {
    try {
      const res = await authFetch("/opd/today");
      if (!res.ok) throw new Error("Failed to load today's queue");
      setVisits(await res.json());
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function markComplete(id) {
    const res = await authFetch(`/opd/${id}/complete`, { method: "PATCH" });
    if (res.ok) load();
  }

  async function collectPayment(labInvoiceId) {
    const res = await authFetch(`/lab/invoices/${labInvoiceId}/pay`, { method: "PATCH" });
    if (res.ok) load();
  }

  const sortedVisits = useMemo(() => {
    return [...visits].sort((a, b) => {
      const aDone = a.status === "COMPLETE" ? 1 : 0;
      const bDone = b.status === "COMPLETE" ? 1 : 0;
      if (aDone !== bDone) return aDone - bDone;
      return a.tokenNumber - b.tokenNumber;
    });
  }, [visits]);

  const totalCount = visits.length;
  const waitingCount = visits.filter((v) => v.status !== "COMPLETE").length;
  const completeCount = visits.filter((v) => v.status === "COMPLETE").length;

  return (
    <div className="p-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-800">Today's OPD Queue</h1>
        <p className="text-slate-500 text-sm">Walk-in patients registered today, sorted by token number.</p>
      </header>

      <div className="grid grid-cols-3 gap-4 mb-6 max-w-xl">
        <StatCard label="Total Patients Today" value={totalCount} />
        <StatCard label="Waiting" value={waitingCount} />
        <StatCard label="Complete" value={completeCount} />
      </div>

      <section className="bg-white rounded-lg shadow overflow-hidden">
        {error && <p className="text-red-600 text-sm p-4">{error}</p>}
        {loading ? (
          <p className="text-slate-500 text-sm p-4">Loading...</p>
        ) : sortedVisits.length === 0 ? (
          <p className="text-slate-500 text-sm p-4">No walk-in patients registered today.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-left">
              <tr>
                <th className="px-4 py-2 font-medium">Token</th>
                <th className="px-4 py-2 font-medium">Patient</th>
                <th className="px-4 py-2 font-medium">Doctor</th>
                <th className="px-4 py-2 font-medium">Time</th>
                <th className="px-4 py-2 font-medium">Status</th>
                {(canComplete || canPrescribe) && <th className="px-4 py-2 font-medium">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedVisits.map((v) => (
                <tr key={v.id} className={v.status === "COMPLETE" ? "opacity-60" : ""}>
                  <td className="px-4 py-2 text-slate-800 font-medium">{v.tokenLabel}</td>
                  <td className="px-4 py-2 text-slate-800">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span>
                        {v.patient.name} <span className="text-xs text-slate-400">({v.patient.patientId})</span>
                      </span>
                      {canCollectPayment && v.pendingLabInvoice && (
                        <LabInvoiceBadge invoice={v.pendingLabInvoice} onPay={collectPayment} />
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-2 text-slate-600">{v.doctor.name}</td>
                  <td className="px-4 py-2 text-slate-600">{formatTime(v.visitDate)}</td>
                  <td className="px-4 py-2">
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLES[v.status]}`}>
                      {STATUS_LABELS[v.status]}
                    </span>
                  </td>
                  {(canComplete || canPrescribe) && (
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        {canPrescribe && (
                          <button
                            type="button"
                            onClick={() => navigate(`/prescriptions/new/${v.id}`)}
                            className="bg-blue-950 text-white rounded px-3 py-1.5 text-xs font-medium hover:bg-blue-900"
                          >
                            Write Prescription
                          </button>
                        )}
                        {canComplete && v.status !== "COMPLETE" && (
                          <button
                            type="button"
                            onClick={() => markComplete(v.id)}
                            className="bg-emerald-600 text-white rounded px-3 py-1.5 text-xs font-medium hover:bg-emerald-700"
                          >
                            Mark as Done
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
