import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import ProcedureFormModal from "./ProcedureFormModal";
import NursingChargeFormModal from "./NursingChargeFormModal";

const DIAGNOSIS_CATEGORIES = [
  "Infections",
  "Gastroenterology",
  "Cardiac",
  "Metabolic",
  "Respiratory",
  "Other",
];

const DURATION_UNITS = ["Days", "Weeks", "Months"];

export default function SettingsPage() {
  const { authFetch } = useAuth();
  const [medicines, setMedicines] = useState([]);
  const [medicinesLoading, setMedicinesLoading] = useState(true);
  const [medicinesError, setMedicinesError] = useState(null);

  const [procedures, setProcedures] = useState([]);
  const [proceduresLoading, setProceduresLoading] = useState(true);
  const [proceduresError, setProceduresError] = useState(null);
  const [modalProcedure, setModalProcedure] = useState(undefined); // undefined = closed, null = add, object = edit

  const [nursingCharges, setNursingCharges] = useState([]);
  const [nursingChargesLoading, setNursingChargesLoading] = useState(true);
  const [nursingChargesError, setNursingChargesError] = useState(null);
  const [modalNursingCharge, setModalNursingCharge] = useState(undefined);

  const [diagnoses, setDiagnoses] = useState([]);
  const [diagnosesLoading, setDiagnosesLoading] = useState(true);
  const [diagnosesError, setDiagnosesError] = useState(null);
  const [newDiagnosisName, setNewDiagnosisName] = useState("");
  const [newDiagnosisCategory, setNewDiagnosisCategory] = useState(DIAGNOSIS_CATEGORIES[0]);
  const [addingDiagnosis, setAddingDiagnosis] = useState(false);

  async function loadMedicines() {
    setMedicinesLoading(true);
    try {
      const res = await authFetch("/prescription/medicines");
      if (!res.ok) throw new Error("Failed to load medicines");
      setMedicines(await res.json());
      setMedicinesError(null);
    } catch (err) {
      setMedicinesError(err.message);
    } finally {
      setMedicinesLoading(false);
    }
  }

  async function loadProcedures() {
    setProceduresLoading(true);
    try {
      const res = await authFetch("/procedures");
      if (!res.ok) throw new Error("Failed to load procedures");
      setProcedures(await res.json());
      setProceduresError(null);
    } catch (err) {
      setProceduresError(err.message);
    } finally {
      setProceduresLoading(false);
    }
  }

  async function loadDiagnoses() {
    setDiagnosesLoading(true);
    try {
      const res = await authFetch("/diagnoses");
      if (!res.ok) throw new Error("Failed to load diagnoses");
      const data = await res.json();
      setDiagnoses(data.diagnoses);
      setDiagnosesError(null);
    } catch (err) {
      setDiagnosesError(err.message);
    } finally {
      setDiagnosesLoading(false);
    }
  }

  async function loadNursingCharges() {
    setNursingChargesLoading(true);
    try {
      const res = await authFetch("/nursing-charges");
      if (!res.ok) throw new Error("Failed to load nursing charges");
      setNursingCharges(await res.json());
      setNursingChargesError(null);
    } catch (err) {
      setNursingChargesError(err.message);
    } finally {
      setNursingChargesLoading(false);
    }
  }

  useEffect(() => {
    loadMedicines();
    loadProcedures();
    loadNursingCharges();
    loadDiagnoses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleDeleteMedicine(medicine) {
    if (!window.confirm(`Delete "${medicine.name}" from the medicine list?`)) return;
    const res = await authFetch(`/prescription/medicines/${medicine.id}`, { method: "DELETE" });
    if (res.ok) loadMedicines();
  }

  function updateMedicineLocal(medicine, patch) {
    setMedicines((prev) =>
      prev.map((m) => (m.source === medicine.source && m.id === medicine.id ? { ...m, ...patch } : m))
    );
  }

  async function saveMedicineDosage(medicine, patch) {
    const merged = { ...medicine, ...patch };
    await authFetch(`/prescription/medicines/${medicine.id}`, {
      method: "PUT",
      body: JSON.stringify({
        source: medicine.source,
        defaultDose: merged.defaultDose,
        defaultFrequency: merged.defaultFrequency,
        defaultInstructions: merged.defaultInstructions,
        defaultDuration: merged.defaultDuration,
        defaultDurationUnit: merged.defaultDurationUnit,
      }),
    });
  }

  async function handleDeactivateProcedure(procedure) {
    const res = await authFetch(`/procedures/${procedure.id}`, { method: "DELETE" });
    if (res.ok) loadProcedures();
  }

  async function handleReactivateProcedure(procedure) {
    const res = await authFetch(`/procedures/${procedure.id}`, {
      method: "PUT",
      body: JSON.stringify({ isActive: true }),
    });
    if (res.ok) loadProcedures();
  }

  function handleProcedureSaved() {
    setModalProcedure(undefined);
    loadProcedures();
  }

  async function handleDeactivateNursingCharge(charge) {
    const res = await authFetch(`/nursing-charges/${charge.id}`, { method: "DELETE" });
    if (res.ok) loadNursingCharges();
  }

  async function handleReactivateNursingCharge(charge) {
    const res = await authFetch(`/nursing-charges/${charge.id}`, {
      method: "PUT",
      body: JSON.stringify({ isActive: true }),
    });
    if (res.ok) loadNursingCharges();
  }

  async function handleAddDiagnosis(e) {
    e.preventDefault();
    const name = newDiagnosisName.trim();
    if (!name) return;
    setAddingDiagnosis(true);
    try {
      const res = await authFetch("/diagnoses", {
        method: "POST",
        body: JSON.stringify({ name, category: newDiagnosisCategory }),
      });
      if (!res.ok) {
        const data = await res.json();
        setDiagnosesError(data.error || "Failed to add diagnosis");
        return;
      }
      setNewDiagnosisName("");
      loadDiagnoses();
    } finally {
      setAddingDiagnosis(false);
    }
  }

  async function handleDeleteDiagnosis(diagnosis) {
    if (!window.confirm(`Remove "${diagnosis.name}" from common diagnoses?`)) return;
    const res = await authFetch(`/diagnoses/${diagnosis.id}`, { method: "DELETE" });
    if (res.ok) loadDiagnoses();
  }

  function handleNursingChargeSaved() {
    setModalNursingCharge(undefined);
    loadNursingCharges();
  }

  return (
    <div className="p-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-800">Settings</h1>
        <p className="text-slate-500 text-sm">System configuration.</p>
      </header>

      <section className="bg-white rounded-lg shadow overflow-hidden max-w-6xl mb-8">
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-700">Prescription Medicine List</h2>
          <p className="text-xs text-slate-500">
            Medicines available when writing prescriptions — combined from pharmacy inventory and custom entries
            added by doctors. Default dosage values shown here are auto-filled when a doctor selects the medicine.
          </p>
        </div>

        {medicinesError && <p className="text-red-600 text-sm p-4">{medicinesError}</p>}
        {medicinesLoading ? (
          <p className="text-slate-500 text-sm p-4">Loading...</p>
        ) : medicines.length === 0 ? (
          <p className="text-slate-500 text-sm p-4">No medicines yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-slate-500">
                <tr>
                  <th className="px-4 py-2 font-medium">Name</th>
                  <th className="px-4 py-2 font-medium">Source</th>
                  <th className="px-4 py-2 font-medium">Default Dose</th>
                  <th className="px-4 py-2 font-medium">Default Frequency</th>
                  <th className="px-4 py-2 font-medium">Default Instructions</th>
                  <th className="px-4 py-2 font-medium">Default Duration</th>
                  <th className="px-4 py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {medicines.map((m) => (
                  <tr key={`${m.source}-${m.id ?? m.name}`}>
                    <td className="px-4 py-2 text-slate-800 font-medium whitespace-nowrap">{m.name}</td>
                    <td className="px-4 py-2">
                      <span
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${
                          m.source === "pharmacy" ? "bg-blue-100 text-blue-800" : "bg-purple-100 text-purple-800"
                        }`}
                      >
                        {m.source === "pharmacy" ? "Pharmacy" : "Custom"}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="text"
                        defaultValue={m.defaultDose || ""}
                        onBlur={(e) => {
                          const value = e.target.value || null;
                          if (value === (m.defaultDose || null)) return;
                          updateMedicineLocal(m, { defaultDose: value });
                          saveMedicineDosage(m, { defaultDose: value });
                        }}
                        placeholder="e.g. 1 Tablet"
                        className="w-28 border border-slate-300 rounded px-2 py-1 text-sm"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="text"
                        defaultValue={m.defaultFrequency || ""}
                        onBlur={(e) => {
                          const value = e.target.value || null;
                          if (value === (m.defaultFrequency || null)) return;
                          updateMedicineLocal(m, { defaultFrequency: value });
                          saveMedicineDosage(m, { defaultFrequency: value });
                        }}
                        placeholder="e.g. Twice a day"
                        className="w-32 border border-slate-300 rounded px-2 py-1 text-sm"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="text"
                        defaultValue={m.defaultInstructions || ""}
                        onBlur={(e) => {
                          const value = e.target.value || null;
                          if (value === (m.defaultInstructions || null)) return;
                          updateMedicineLocal(m, { defaultInstructions: value });
                          saveMedicineDosage(m, { defaultInstructions: value });
                        }}
                        placeholder="e.g. After meal"
                        className="w-32 border border-slate-300 rounded px-2 py-1 text-sm"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex gap-1">
                        <input
                          type="number"
                          min="0"
                          defaultValue={m.defaultDuration || ""}
                          onBlur={(e) => {
                            const value = e.target.value || null;
                            if (value === (m.defaultDuration || null)) return;
                            updateMedicineLocal(m, { defaultDuration: value });
                            saveMedicineDosage(m, { defaultDuration: value });
                          }}
                          className="w-14 border border-slate-300 rounded px-2 py-1 text-sm"
                        />
                        <select
                          defaultValue={m.defaultDurationUnit || ""}
                          onChange={(e) => {
                            const value = e.target.value || null;
                            updateMedicineLocal(m, { defaultDurationUnit: value });
                            saveMedicineDosage(m, { defaultDurationUnit: value });
                          }}
                          className="border border-slate-300 rounded px-1 py-1 text-sm"
                        >
                          <option value="">—</option>
                          {DURATION_UNITS.map((u) => (
                            <option key={u} value={u}>
                              {u}
                            </option>
                          ))}
                        </select>
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      {m.source === "custom" && (
                        <button
                          type="button"
                          onClick={() => handleDeleteMedicine(m)}
                          className="text-red-600 hover:underline text-xs font-medium"
                        >
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="bg-white rounded-lg shadow overflow-hidden max-w-3xl mb-8">
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-700">Procedures</h2>
            <p className="text-xs text-slate-500">
              Procedure prices used on discharge bills — updates apply immediately to new bills.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setModalProcedure(null)}
            className="bg-blue-950 text-white rounded px-3 py-1.5 text-xs font-medium hover:bg-blue-900"
          >
            + Add Procedure
          </button>
        </div>

        {proceduresError && <p className="text-red-600 text-sm p-4">{proceduresError}</p>}
        {proceduresLoading ? (
          <p className="text-slate-500 text-sm p-4">Loading...</p>
        ) : procedures.length === 0 ? (
          <p className="text-slate-500 text-sm p-4">No procedures yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-slate-500">
              <tr>
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Category</th>
                <th className="px-4 py-2 font-medium">Default Price (PKR)</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {procedures.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-2 text-slate-800 font-medium">{p.name}</td>
                  <td className="px-4 py-2 text-slate-600">{p.category || "—"}</td>
                  <td className="px-4 py-2 text-slate-600">{p.defaultPrice}</td>
                  <td className="px-4 py-2">
                    <span
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                        p.isActive ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {p.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => setModalProcedure(p)}
                        className="text-blue-950 hover:underline text-xs font-medium"
                      >
                        Edit
                      </button>
                      {p.isActive ? (
                        <button
                          type="button"
                          onClick={() => handleDeactivateProcedure(p)}
                          className="text-red-600 hover:underline text-xs font-medium"
                        >
                          Deactivate
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleReactivateProcedure(p)}
                          className="text-slate-500 hover:underline text-xs font-medium"
                        >
                          Reactivate
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="bg-white rounded-lg shadow overflow-hidden max-w-3xl">
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-700">Nursing Charges</h2>
            <p className="text-xs text-slate-500">
              Nursing charge catalog used on discharge bills — DAILY charges are billed per day admitted, ONETIME
              charges are billed once.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setModalNursingCharge(null)}
            className="bg-blue-950 text-white rounded px-3 py-1.5 text-xs font-medium hover:bg-blue-900"
          >
            + Add Nursing Charge
          </button>
        </div>

        {nursingChargesError && <p className="text-red-600 text-sm p-4">{nursingChargesError}</p>}
        {nursingChargesLoading ? (
          <p className="text-slate-500 text-sm p-4">Loading...</p>
        ) : nursingCharges.length === 0 ? (
          <p className="text-slate-500 text-sm p-4">No nursing charges yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-slate-500">
              <tr>
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Type</th>
                <th className="px-4 py-2 font-medium">Default Price (PKR)</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {nursingCharges.map((c) => (
                <tr key={c.id}>
                  <td className="px-4 py-2 text-slate-800 font-medium">{c.name}</td>
                  <td className="px-4 py-2 text-slate-600">{c.type}</td>
                  <td className="px-4 py-2 text-slate-600">{c.defaultPrice}</td>
                  <td className="px-4 py-2">
                    <span
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                        c.isActive ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {c.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => setModalNursingCharge(c)}
                        className="text-blue-950 hover:underline text-xs font-medium"
                      >
                        Edit
                      </button>
                      {c.isActive ? (
                        <button
                          type="button"
                          onClick={() => handleDeactivateNursingCharge(c)}
                          className="text-red-600 hover:underline text-xs font-medium"
                        >
                          Deactivate
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleReactivateNursingCharge(c)}
                          className="text-slate-500 hover:underline text-xs font-medium"
                        >
                          Reactivate
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="bg-white rounded-lg shadow overflow-hidden max-w-3xl mt-8">
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-700">Common Diagnoses</h2>
          <p className="text-xs text-slate-500">
            These appear as quick-select suggestions in the prescription form. Doctors can also type custom diagnoses
            not on this list.
          </p>
        </div>

        <div className="p-4 border-b border-slate-100">
          <form onSubmit={handleAddDiagnosis} className="flex gap-2 items-end flex-wrap">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-500 font-medium">Diagnosis name</label>
              <input
                type="text"
                value={newDiagnosisName}
                onChange={(e) => setNewDiagnosisName(e.target.value)}
                placeholder="e.g. Dengue Fever"
                className="border border-slate-300 rounded px-3 py-1.5 text-sm w-52"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-500 font-medium">Category</label>
              <select
                value={newDiagnosisCategory}
                onChange={(e) => setNewDiagnosisCategory(e.target.value)}
                className="border border-slate-300 rounded px-2 py-1.5 text-sm"
              >
                {DIAGNOSIS_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              disabled={addingDiagnosis || !newDiagnosisName.trim()}
              className="bg-blue-950 text-white rounded px-4 py-1.5 text-sm font-medium hover:bg-blue-900 disabled:opacity-50"
            >
              {addingDiagnosis ? "Adding..." : "+ Add"}
            </button>
          </form>
          {diagnosesError && <p className="text-red-600 text-xs mt-2">{diagnosesError}</p>}
        </div>

        {diagnosesLoading ? (
          <p className="text-slate-500 text-sm p-4">Loading...</p>
        ) : diagnoses.length === 0 ? (
          <p className="text-slate-500 text-sm p-4">No common diagnoses yet.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {DIAGNOSIS_CATEGORIES.filter((cat) => diagnoses.some((d) => d.category === cat)).map((cat) => (
              <div key={cat} className="px-4 py-3">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">{cat}</p>
                <div className="flex flex-wrap gap-2">
                  {diagnoses
                    .filter((d) => d.category === cat)
                    .map((d) => (
                      <span
                        key={d.id}
                        className="inline-flex items-center gap-1 bg-blue-50 text-blue-800 text-xs font-medium px-2.5 py-1 rounded-full"
                      >
                        {d.name}
                        <button
                          type="button"
                          onClick={() => handleDeleteDiagnosis(d)}
                          className="text-blue-400 hover:text-red-600 ml-0.5 leading-none"
                          title={`Remove ${d.name}`}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                </div>
              </div>
            ))}
            {diagnoses.filter((d) => !DIAGNOSIS_CATEGORIES.includes(d.category)).length > 0 && (
              <div className="px-4 py-3">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Uncategorised</p>
                <div className="flex flex-wrap gap-2">
                  {diagnoses
                    .filter((d) => !DIAGNOSIS_CATEGORIES.includes(d.category))
                    .map((d) => (
                      <span
                        key={d.id}
                        className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 text-xs font-medium px-2.5 py-1 rounded-full"
                      >
                        {d.name} ({d.category})
                        <button
                          type="button"
                          onClick={() => handleDeleteDiagnosis(d)}
                          className="text-slate-400 hover:text-red-600 ml-0.5 leading-none"
                          title={`Remove ${d.name}`}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {modalProcedure !== undefined && (
        <ProcedureFormModal
          procedure={modalProcedure}
          onClose={() => setModalProcedure(undefined)}
          onSaved={handleProcedureSaved}
        />
      )}

      {modalNursingCharge !== undefined && (
        <NursingChargeFormModal
          nursingCharge={modalNursingCharge}
          onClose={() => setModalNursingCharge(undefined)}
          onSaved={handleNursingChargeSaved}
        />
      )}
    </div>
  );
}
