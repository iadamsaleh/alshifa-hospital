import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import PatientSearchForm from "../../components/PatientSearchForm";
import DoctorTitleBadge from "../../components/DoctorTitleBadge";
import OpdTokenSlip from "./OpdTokenSlip";

const EMPTY_PATIENT = {
  existingPatientId: null,
  patientId: null,
  name: "",
  gender: "Male",
  dateOfBirth: "",
  phone: "",
  address: "",
  bloodGroup: "",
};

export default function NewOpdVisitPage() {
  const { authFetch } = useAuth();

  const [patientData, setPatientData] = useState(EMPTY_PATIENT);
  const [doctors, setDoctors] = useState([]);
  const [doctorId, setDoctorId] = useState("");
  const [chiefComplaint, setChiefComplaint] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    authFetch("/doctors")
      .then((res) => res.json())
      .then(setDoctors)
      .catch(() => setDoctors([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedDoctor = doctors.find((d) => d.id === Number(doctorId));

  function resetForm() {
    setPatientData(EMPTY_PATIENT);
    setDoctorId("");
    setChiefComplaint("");
    setResult(null);
    setError(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!patientData.name || !patientData.gender || !patientData.dateOfBirth || !patientData.phone) {
      setError("Name, gender, date of birth and phone are required.");
      return;
    }
    if (!doctorId) {
      setError("Please select a doctor.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      let patient;
      if (patientData.existingPatientId) {
        patient = { id: patientData.existingPatientId, patientId: patientData.patientId, name: patientData.name };
      } else {
        const res = await authFetch("/patients", {
          method: "POST",
          body: JSON.stringify({
            name: patientData.name,
            gender: patientData.gender,
            dateOfBirth: patientData.dateOfBirth,
            phone: patientData.phone,
            address: patientData.address,
            bloodGroup: patientData.bloodGroup,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to register patient");
        patient = data;
      }

      const res = await authFetch("/opd", {
        method: "POST",
        body: JSON.stringify({
          patientId: patient.id,
          doctorId: Number(doctorId),
          chiefComplaint: chiefComplaint || undefined,
        }),
      });
      const visit = await res.json();
      if (!res.ok) throw new Error(visit.error || "Failed to register OPD visit");

      setResult({ patient: visit.patient, doctor: visit.doctor, visit });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return <OpdTokenSlip result={result} onReset={resetForm} />;
  }

  return (
    <div className="p-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-800">New OPD Visit</h1>
        <p className="text-slate-500 text-sm">Register a walk-in patient for an outpatient checkup.</p>
      </header>

      <form onSubmit={handleSubmit} className="grid gap-6 max-w-lg">
        {error && (
          <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>
        )}

        <section className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-1">Patient Info</h2>
          <p className="text-slate-500 text-sm mb-4">
            Search by name, patient ID or phone to find an existing patient, or register a new one.
          </p>
          <PatientSearchForm value={patientData} onChange={setPatientData} />
        </section>

        <section className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Doctor & Complaint</h2>
          <div className="grid gap-3">
            <select
              required
              value={doctorId}
              onChange={(e) => setDoctorId(e.target.value)}
              className="border border-slate-300 rounded px-3 py-2"
            >
              <option value="">Select doctor...</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                  {d.title ? ` (${d.title})` : ""} — {d.specialization} (Fee: {d.consultationFee})
                </option>
              ))}
            </select>
            {selectedDoctor && (
              <p className="text-xs text-slate-500 flex items-center gap-2">
                Consultation fee: {selectedDoctor.consultationFee}
                {selectedDoctor.title && <DoctorTitleBadge title={selectedDoctor.title} />}
              </p>
            )}
            <textarea
              placeholder="Chief complaint (optional)"
              value={chiefComplaint}
              onChange={(e) => setChiefComplaint(e.target.value)}
              rows={3}
              className="border border-slate-300 rounded px-3 py-2"
            />
          </div>
        </section>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={submitting}
            className="bg-blue-950 text-white rounded px-4 py-2 font-medium hover:bg-blue-900 disabled:opacity-50"
          >
            {submitting ? "Registering..." : "Register Visit"}
          </button>
        </div>
      </form>
    </div>
  );
}
