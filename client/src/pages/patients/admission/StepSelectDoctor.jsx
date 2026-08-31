import { useEffect, useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import DoctorTitleBadge from "../../../components/DoctorTitleBadge";

export default function StepSelectDoctor({ value, onChange, onBack, onNext }) {
  const { authFetch } = useAuth();
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    authFetch("/doctors")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load doctors");
        return res.json();
      })
      .then(setDoctors)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className="bg-white rounded-lg shadow p-6 max-w-lg">
      <h2 className="text-lg font-semibold text-slate-800 mb-1">Select Doctor</h2>
      <p className="text-slate-500 text-sm mb-4">Choose the doctor for this admission.</p>

      {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
      {loading ? (
        <p className="text-slate-500 text-sm">Loading doctors...</p>
      ) : doctors.length === 0 ? (
        <p className="text-slate-500 text-sm">No doctors available.</p>
      ) : (
        <div className="grid gap-2">
          {doctors.map((doctor) => (
            <label
              key={doctor.id}
              className={`flex items-center justify-between border rounded px-3 py-2 cursor-pointer transition ${
                value?.id === doctor.id ? "border-blue-950 bg-blue-50" : "border-slate-200 hover:bg-slate-50"
              }`}
            >
              <div className="flex items-center gap-3">
                <input
                  type="radio"
                  name="doctor"
                  checked={value?.id === doctor.id}
                  onChange={() => onChange(doctor)}
                />
                <div>
                  <p className="text-sm font-medium text-slate-800">
                    {doctor.name}
                    {doctor.title && <DoctorTitleBadge title={doctor.title} className="ml-2" />}
                  </p>
                  <p className="text-xs text-slate-500">{doctor.specialization}</p>
                </div>
              </div>
              <p className="text-sm font-semibold text-blue-950">Fee: {doctor.consultationFee}</p>
            </label>
          ))}
        </div>
      )}

      <div className="flex justify-between mt-4">
        <button
          type="button"
          onClick={onBack}
          className="bg-slate-100 hover:bg-slate-200 text-slate-700 rounded px-4 py-2 font-medium"
        >
          Back
        </button>
        <button
          type="button"
          disabled={!value}
          onClick={onNext}
          className="bg-blue-950 text-white rounded px-4 py-2 font-medium hover:bg-blue-900 disabled:opacity-50"
        >
          Next: Room & Bed
        </button>
      </div>
    </section>
  );
}
