import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

function timePending(createdAt) {
  const ms = Date.now() - new Date(createdAt).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem > 0 ? `${hrs}h ${rem}m` : `${hrs}h`;
}

export default function PendingPrescriptionsPage() {
  const { authFetch } = useAuth();
  const navigate = useNavigate();
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  async function load() {
    try {
      const res = await authFetch("/prescription/pending");
      if (!res.ok) throw new Error("Failed to load pending prescriptions");
      setPrescriptions(await res.json());
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="p-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-800">Pending Prescriptions</h1>
        <p className="text-slate-500 text-sm">
          Prescriptions awaiting lab investigation results before they can be finalised.
        </p>
      </header>

      <section className="bg-white rounded-lg shadow overflow-hidden">
        {error && <p className="text-red-600 text-sm p-4">{error}</p>}
        {loading ? (
          <p className="text-slate-500 text-sm p-4">Loading...</p>
        ) : prescriptions.length === 0 ? (
          <p className="text-slate-500 text-sm p-4">No pending prescriptions.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-left">
              <tr>
                <th className="px-4 py-2 font-medium">Patient</th>
                <th className="px-4 py-2 font-medium">Patient ID</th>
                <th className="px-4 py-2 font-medium">OPD Visit Date</th>
                <th className="px-4 py-2 font-medium">Advised Investigations</th>
                <th className="px-4 py-2 font-medium">Time Pending</th>
                <th className="px-4 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {prescriptions.map((p) => {
                const advised = Array.isArray(p.advisedInvestigations) ? p.advisedInvestigations : [];
                return (
                  <tr key={p.id}>
                    <td className="px-4 py-2 text-slate-800 font-medium">{p.patient.name}</td>
                    <td className="px-4 py-2 text-slate-500">{p.patient.patientId}</td>
                    <td className="px-4 py-2 text-slate-600">
                      {new Date(p.opdVisit.visitDate).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex flex-wrap gap-1">
                        {advised.length === 0 ? (
                          <span className="text-slate-400 text-xs">—</span>
                        ) : (
                          advised.map((t, i) => (
                            <span
                              key={i}
                              className="bg-amber-50 border border-amber-200 text-amber-800 text-xs px-2 py-0.5 rounded-full"
                            >
                              {t.testName}
                            </span>
                          ))
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2 text-slate-500 tabular-nums">{timePending(p.createdAt)}</td>
                    <td className="px-4 py-2">
                      <button
                        type="button"
                        onClick={() => navigate(`/prescriptions/review/${p.id}`)}
                        className="bg-blue-950 text-white rounded px-3 py-1.5 text-xs font-medium hover:bg-blue-900"
                      >
                        Review &amp; Complete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
