import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import DoctorFormModal from "./DoctorFormModal";
import DoctorTitleBadge from "../../components/DoctorTitleBadge";

export default function DoctorListPage() {
  const { user, authFetch } = useAuth();
  const isAdmin = user.role === "ADMIN";

  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalDoctor, setModalDoctor] = useState(undefined); // undefined = closed, null = add, object = edit

  async function load() {
    setLoading(true);
    try {
      const res = await authFetch("/doctors?status=all");
      if (!res.ok) throw new Error("Failed to load doctors");
      setDoctors(await res.json());
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

  async function toggleActive(doctor) {
    const res = await authFetch(`/doctors/${doctor.id}`, {
      method: "PUT",
      body: JSON.stringify({ isActive: !doctor.isActive }),
    });
    if (res.ok) load();
  }

  function handleSaved() {
    setModalDoctor(undefined);
    load();
  }

  return (
    <div className="p-8">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Doctor List</h1>
          <p className="text-slate-500 text-sm">Browse all doctors at Al-Shifa.</p>
        </div>
        {isAdmin && (
          <button
            type="button"
            onClick={() => setModalDoctor(null)}
            className="bg-blue-950 text-white rounded px-4 py-2 font-medium hover:bg-blue-900"
          >
            + Add New Doctor
          </button>
        )}
      </header>

      <section className="bg-white rounded-lg shadow overflow-hidden">
        {error && <p className="text-red-600 text-sm p-4">{error}</p>}
        {loading ? (
          <p className="text-slate-500 text-sm p-4">Loading...</p>
        ) : doctors.length === 0 ? (
          <p className="text-slate-500 text-sm p-4">No doctors found.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-left">
              <tr>
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Specialization</th>
                <th className="px-4 py-2 font-medium">Phone</th>
                <th className="px-4 py-2 font-medium">Consultation Fee</th>
                <th className="px-4 py-2 font-medium">Status</th>
                {isAdmin && <th className="px-4 py-2 font-medium">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {doctors.map((d) => (
                <tr key={d.id}>
                  <td className="px-4 py-2 text-slate-800 font-medium">
                    {d.name}
                    {d.title && <DoctorTitleBadge title={d.title} className="ml-2" />}
                  </td>
                  <td className="px-4 py-2 text-slate-600">{d.specialization}</td>
                  <td className="px-4 py-2 text-slate-600">{d.phone}</td>
                  <td className="px-4 py-2 text-slate-600">{d.consultationFee}</td>
                  <td className="px-4 py-2">
                    <span
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                        d.isActive ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {d.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-2">
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => setModalDoctor(d)}
                          className="text-blue-950 hover:underline text-xs font-medium"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleActive(d)}
                          className="text-slate-500 hover:underline text-xs font-medium"
                        >
                          {d.isActive ? "Deactivate" : "Reactivate"}
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {modalDoctor !== undefined && (
        <DoctorFormModal doctor={modalDoctor} onClose={() => setModalDoctor(undefined)} onSaved={handleSaved} />
      )}
    </div>
  );
}
