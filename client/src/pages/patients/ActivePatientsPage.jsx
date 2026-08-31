import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

function formatDate(value) {
  return new Date(value).toLocaleDateString();
}

export default function ActivePatientsPage() {
  const { user, authFetch } = useAuth();
  const navigate = useNavigate();
  const canDischarge = user.role === "ADMIN" || user.role === "RECEPTIONIST";

  const [admissions, setAdmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  async function load() {
    try {
      const res = await authFetch("/admissions/active");
      if (!res.ok) throw new Error("Failed to load active patients");
      setAdmissions(await res.json());
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
        <h1 className="text-2xl font-semibold text-slate-800">Active Patients</h1>
        <p className="text-slate-500 text-sm">Currently admitted patients.</p>
      </header>

      <section className="bg-white rounded-lg shadow overflow-hidden">
        {error && <p className="text-red-600 text-sm p-4">{error}</p>}
        {loading ? (
          <p className="text-slate-500 text-sm p-4">Loading...</p>
        ) : admissions.length === 0 ? (
          <p className="text-slate-500 text-sm p-4">No patients currently admitted.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-left">
              <tr>
                <th className="px-4 py-2 font-medium">Token</th>
                <th className="px-4 py-2 font-medium">Patient</th>
                <th className="px-4 py-2 font-medium">Doctor</th>
                <th className="px-4 py-2 font-medium">Room / Bed</th>
                <th className="px-4 py-2 font-medium">Admitted</th>
                {canDischarge && <th className="px-4 py-2 font-medium">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {admissions.map((a) => (
                <tr key={a.id}>
                  <td className="px-4 py-2 text-slate-800 font-medium">{a.tokenLabel}</td>
                  <td className="px-4 py-2 text-slate-800">
                    {a.patient.name} <span className="text-xs text-slate-400">({a.patient.patientId})</span>
                  </td>
                  <td className="px-4 py-2 text-slate-600">{a.doctor.name}</td>
                  <td className="px-4 py-2 text-slate-600">
                    {a.room ? `${a.room.roomNumber}${a.bed ? ` (${a.bed.bedNumber})` : ""}` : "—"}
                  </td>
                  <td className="px-4 py-2 text-slate-600">{formatDate(a.admissionDate)}</td>
                  {canDischarge && (
                    <td className="px-4 py-2">
                      <button
                        type="button"
                        onClick={() => navigate(`/admissions/${a.id}/discharge`)}
                        className="bg-blue-950 text-white rounded px-3 py-1.5 text-xs font-medium hover:bg-blue-900"
                      >
                        Discharge Patient
                      </button>
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
