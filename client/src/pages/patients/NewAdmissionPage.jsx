import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import StepPatientInfo from "./admission/StepPatientInfo";
import StepSelectDoctor from "./admission/StepSelectDoctor";
import StepRoomBed from "./admission/StepRoomBed";
import StepConfirmation from "./admission/StepConfirmation";
import TokenSlip from "./admission/TokenSlip";

const STEPS = ["Patient Info", "Select Doctor", "Room & Bed", "Confirmation"];

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

const EMPTY_ROOM_BED = { roomId: null, bedId: null, roomLabel: "", bedLabel: "" };

export default function NewAdmissionPage() {
  const { authFetch } = useAuth();

  const [step, setStep] = useState(1);
  const [patientData, setPatientData] = useState(EMPTY_PATIENT);
  const [doctor, setDoctor] = useState(null);
  const [roomBed, setRoomBed] = useState(EMPTY_ROOM_BED);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  function resetWizard() {
    setStep(1);
    setPatientData(EMPTY_PATIENT);
    setDoctor(null);
    setRoomBed(EMPTY_ROOM_BED);
    setResult(null);
    setError(null);
  }

  async function handleConfirm() {
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

      const admissionRes = await authFetch("/admissions", {
        method: "POST",
        body: JSON.stringify({
          patientId: patient.id,
          doctorId: doctor.id,
          roomId: roomBed.roomId,
          bedId: roomBed.bedId,
        }),
      });
      const admission = await admissionRes.json();
      if (!admissionRes.ok) throw new Error(admission.error || "Failed to admit patient");

      setResult({ patient: admission.patient, doctor: admission.doctor, admission });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return <TokenSlip result={result} onReset={resetWizard} />;
  }

  return (
    <div className="p-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-800">New Admission</h1>
        <p className="text-slate-500 text-sm">Register and admit a patient at Al-Shifa Diagnostic Centre.</p>
      </header>

      <ol className="flex items-center gap-4 mb-6 text-sm">
        {STEPS.map((label, i) => {
          const n = i + 1;
          const isActive = n === step;
          const isDone = n < step;
          return (
            <li key={label} className="flex items-center gap-2">
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
                  isActive
                    ? "bg-blue-950 text-white"
                    : isDone
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-200 text-slate-500"
                }`}
              >
                {isDone ? "✓" : n}
              </span>
              <span className={isActive ? "text-slate-800 font-medium" : "text-slate-500"}>{label}</span>
              {n < STEPS.length && <span className="text-slate-300 ml-2">—</span>}
            </li>
          );
        })}
      </ol>

      {step === 1 && (
        <StepPatientInfo value={patientData} onChange={setPatientData} onNext={() => setStep(2)} />
      )}
      {step === 2 && (
        <StepSelectDoctor
          value={doctor}
          onChange={setDoctor}
          onBack={() => setStep(1)}
          onNext={() => setStep(3)}
        />
      )}
      {step === 3 && (
        <StepRoomBed
          value={roomBed}
          onChange={setRoomBed}
          onBack={() => setStep(2)}
          onNext={() => setStep(4)}
        />
      )}
      {step === 4 && (
        <StepConfirmation
          patientData={patientData}
          doctor={doctor}
          roomBed={roomBed}
          submitting={submitting}
          error={error}
          onBack={() => setStep(3)}
          onConfirm={handleConfirm}
        />
      )}
    </div>
  );
}
