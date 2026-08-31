import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

function formatWaiting(createdAt) {
  const ms = Date.now() - new Date(createdAt).getTime();
  const minutes = Math.floor(ms / 60000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

export default function LabTechnicianQueuePage() {
  const { authFetch } = useAuth();
  const navigate = useNavigate();

  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  async function load() {
    try {
      const res = await authFetch("/lab/results/pending");
      if (!res.ok) throw new Error("Failed to load pending results queue");
      setInvoices(await res.json());
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

  return (
    <div className="p-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-800">Lab Results Queue</h1>
        <p className="text-slate-500 text-sm">Lab invoices awaiting result entry.</p>
      </header>

      <section className="bg-white rounded-lg shadow overflow-hidden">
        {error && <p className="text-red-600 text-sm p-4">{error}</p>}
        {loading ? (
          <p className="text-slate-500 text-sm p-4">Loading...</p>
        ) : invoices.length === 0 ? (
          <p className="text-slate-500 text-sm p-4">No pending lab results.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-left">
              <tr>
                <th className="px-4 py-2 font-medium">Patient</th>
                <th className="px-4 py-2 font-medium">Patient ID</th>
                <th className="px-4 py-2 font-medium">Tests Ordered</th>
                <th className="px-4 py-2 font-medium">Invoice Date</th>
                <th className="px-4 py-2 font-medium">Waiting</th>
                <th className="px-4 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invoices.map((inv) => (
                <tr key={inv.id}>
                  <td className="px-4 py-2 text-slate-800 font-medium">{inv.patient.name}</td>
                  <td className="px-4 py-2 text-slate-600">{inv.patient.patientId}</td>
                  <td className="px-4 py-2 text-slate-600">{inv.tests.map((t) => t.testName).join(", ")}</td>
                  <td className="px-4 py-2 text-slate-600">{new Date(inv.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-2 text-slate-600">{formatWaiting(inv.createdAt)}</td>
                  <td className="px-4 py-2">
                    <button
                      type="button"
                      onClick={() => navigate(`/lab/results/enter/${inv.id}`)}
                      className="bg-blue-950 text-white rounded px-3 py-1.5 text-xs font-medium hover:bg-blue-900"
                    >
                      Enter Results
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
