import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import ScheduleFormModal from "./ScheduleFormModal";
import DoctorTitleBadge from "../../components/DoctorTitleBadge";

const DAYS = [
  { key: "MON", label: "Mon" },
  { key: "TUE", label: "Tue" },
  { key: "WED", label: "Wed" },
  { key: "THU", label: "Thu" },
  { key: "FRI", label: "Fri" },
  { key: "SAT", label: "Sat" },
  { key: "SUN", label: "Sun" },
];

function DayCell({ schedule, dayKey }) {
  const available = schedule?.days?.includes(dayKey);
  if (!available) {
    return <td className="px-2 py-2 text-center text-slate-300 border border-slate-100">—</td>;
  }
  return (
    <td className="px-2 py-2 text-center text-xs text-emerald-800 bg-emerald-50 border border-slate-100">
      {schedule.times?.start}–{schedule.times?.end}
    </td>
  );
}

export default function SchedulesPage() {
  const { user, authFetch } = useAuth();
  const isAdmin = user.role === "ADMIN";
  const isDoctor = user.role === "DOCTOR";

  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingDoctor, setEditingDoctor] = useState(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      if (isDoctor) {
        if (!user.doctorId) {
          setDoctors([]);
          setError("Your account is not linked to a doctor profile yet. Contact an administrator.");
          return;
        }
        const res = await authFetch(`/doctors/${user.doctorId}/schedule`);
        if (!res.ok) throw new Error("Failed to load schedule");
        setDoctors([await res.json()]);
      } else {
        const res = await authFetch("/doctors?status=all");
        if (!res.ok) throw new Error("Failed to load doctors");
        setDoctors(await res.json());
      }
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

  function handleSaved() {
    setEditingDoctor(null);
    load();
  }

  return (
    <div className="p-8">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">
            {isDoctor ? "My Schedule" : "Doctor Schedules"}
          </h1>
          <p className="text-slate-500 text-sm">
            {isDoctor ? "Your weekly availability." : "Weekly availability across all doctors."}
          </p>
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className="bg-slate-100 hover:bg-slate-200 text-slate-700 rounded px-4 py-2 font-medium text-sm print:hidden"
        >
          Print Schedule
        </button>
      </header>

      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

      {loading ? (
        <p className="text-slate-500 text-sm">Loading...</p>
      ) : doctors.length === 0 ? (
        !error && <p className="text-slate-500 text-sm">No doctors to display.</p>
      ) : (
        <div className="print-area bg-white rounded-lg shadow overflow-x-auto">
          <div className="hidden print:block px-4 pt-4 text-center">
            <h2 className="text-lg font-semibold text-blue-950">Al-Shifa Diagnostic Centre</h2>
            <p className="text-xs text-slate-500 mb-2">Doctor Schedule</p>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-4 py-2 text-left font-medium">Doctor</th>
                {DAYS.map((d) => (
                  <th key={d.key} className="px-2 py-2 font-medium">
                    {d.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {doctors.map((doc) => (
                <tr key={doc.id}>
                  <td
                    className={`px-4 py-2 font-medium text-slate-800 ${
                      isAdmin ? "cursor-pointer hover:underline print:no-underline" : ""
                    }`}
                    onClick={() => isAdmin && setEditingDoctor(doc)}
                  >
                    {doc.name}
                    {doc.title && <DoctorTitleBadge title={doc.title} className="ml-2" />}
                  </td>
                  {DAYS.map((d) => (
                    <DayCell key={d.key} schedule={doc.schedule} dayKey={d.key} />
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editingDoctor && (
        <ScheduleFormModal doctor={editingDoctor} onClose={() => setEditingDoctor(null)} onSaved={handleSaved} />
      )}
    </div>
  );
}
