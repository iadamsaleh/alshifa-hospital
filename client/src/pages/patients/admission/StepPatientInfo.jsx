import { useState } from "react";
import PatientSearchForm from "../../../components/PatientSearchForm";

export default function StepPatientInfo({ value, onChange, onNext }) {
  const [formError, setFormError] = useState(null);

  function handleNext() {
    if (!value.name || !value.gender || !value.dateOfBirth || !value.phone) {
      setFormError("Name, gender, date of birth and phone are required.");
      return;
    }
    setFormError(null);
    onNext();
  }

  return (
    <section className="bg-white rounded-lg shadow p-6 max-w-lg">
      <h2 className="text-lg font-semibold text-slate-800 mb-1">Patient Info</h2>
      <p className="text-slate-500 text-sm mb-4">
        Search by name, patient ID or phone to find an existing patient, or register a new one.
      </p>

      <PatientSearchForm value={value} onChange={onChange} />

      {formError && (
        <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded px-3 py-2 mt-3">{formError}</p>
      )}

      <div className="flex justify-end mt-3">
        <button
          type="button"
          onClick={handleNext}
          className="bg-blue-950 text-white rounded px-4 py-2 font-medium hover:bg-blue-900"
        >
          Next: Select Doctor
        </button>
      </div>
    </section>
  );
}
