export default function StepConfirmation({ patientData, doctor, roomBed, submitting, error, onBack, onConfirm }) {
  return (
    <section className="bg-white rounded-lg shadow p-6 max-w-lg">
      <h2 className="text-lg font-semibold text-slate-800 mb-1">Confirmation</h2>
      <p className="text-slate-500 text-sm mb-4">Review the details before admitting the patient.</p>

      {error && (
        <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded px-3 py-2 mb-4">{error}</p>
      )}

      <dl className="grid grid-cols-2 gap-y-2 text-sm mb-4">
        <dt className="text-slate-500">Patient ID</dt>
        <dd className="text-slate-800 font-medium">
          {patientData.existingPatientId ? patientData.patientId : "Generated on confirm"}
        </dd>

        <dt className="text-slate-500">Name</dt>
        <dd className="text-slate-800 font-medium">{patientData.name}</dd>

        <dt className="text-slate-500">Phone</dt>
        <dd className="text-slate-800 font-medium">{patientData.phone}</dd>

        <dt className="text-slate-500">Gender / DOB</dt>
        <dd className="text-slate-800 font-medium">
          {patientData.gender} · {patientData.dateOfBirth}
        </dd>

        <dt className="text-slate-500">Doctor</dt>
        <dd className="text-slate-800 font-medium">
          {doctor.name} ({doctor.specialization})
        </dd>

        <dt className="text-slate-500">Consultation Fee</dt>
        <dd className="text-slate-800 font-medium">{doctor.consultationFee}</dd>

        <dt className="text-slate-500">Room / Bed</dt>
        <dd className="text-slate-800 font-medium">
          {roomBed.roomLabel} — {roomBed.bedLabel}
        </dd>
      </dl>

      <div className="flex justify-between mt-4">
        <button
          type="button"
          onClick={onBack}
          disabled={submitting}
          className="bg-slate-100 hover:bg-slate-200 text-slate-700 rounded px-4 py-2 font-medium disabled:opacity-50"
        >
          Back
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={submitting}
          className="bg-blue-950 text-white rounded px-4 py-2 font-medium hover:bg-blue-900 disabled:opacity-50"
        >
          {submitting ? "Admitting..." : "Confirm & Admit"}
        </button>
      </div>
    </section>
  );
}
