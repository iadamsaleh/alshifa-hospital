import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import PatientSearchForm from "../../components/PatientSearchForm";

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

function groupByCategory(tests) {
  const groups = {};
  for (const test of tests) {
    const key = test.category || "Uncategorized";
    if (!groups[key]) groups[key] = [];
    groups[key].push(test);
  }
  return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
}

export default function NewLabInvoicePage() {
  const { authFetch } = useAuth();
  const navigate = useNavigate();

  const [patientData, setPatientData] = useState(EMPTY_PATIENT);
  const [activeAdmission, setActiveAdmission] = useState(null);

  const [allTests, setAllTests] = useState([]);
  const [testSearch, setTestSearch] = useState("");
  const [selected, setSelected] = useState({}); // { [testId]: price }

  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    authFetch("/lab/tests")
      .then((res) => res.json())
      .then(setAllTests)
      .catch(() => setAllTests([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!patientData.existingPatientId) {
      setActiveAdmission(null);
      return;
    }
    authFetch("/admissions/active")
      .then((res) => res.json())
      .then((admissions) => {
        const match = admissions.find((a) => a.patientId === patientData.existingPatientId);
        setActiveAdmission(match || null);
      })
      .catch(() => setActiveAdmission(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientData.existingPatientId]);

  function toggleTest(test) {
    setSelected((prev) => {
      const next = { ...prev };
      if (next[test.id] !== undefined) {
        delete next[test.id];
      } else {
        next[test.id] = test.price;
      }
      return next;
    });
  }

  function updatePrice(testId, price) {
    setSelected((prev) => ({ ...prev, [testId]: price }));
  }

  const filteredTests = useMemo(() => {
    const q = testSearch.trim().toLowerCase();
    if (!q) return allTests;
    return allTests.filter(
      (t) =>
        t.testName.toLowerCase().includes(q) ||
        t.testCode.toLowerCase().includes(q) ||
        (t.category || "").toLowerCase().includes(q)
    );
  }, [allTests, testSearch]);

  const grouped = groupByCategory(filteredTests);
  const total = Object.values(selected).reduce((sum, p) => sum + Number(p || 0), 0);
  const selectedCount = Object.keys(selected).length;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!patientData.name || !patientData.gender || !patientData.dateOfBirth || !patientData.phone) {
      setError("Name, gender, date of birth and phone are required.");
      return;
    }
    if (selectedCount === 0) {
      setError("Select at least one test.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      let patient;
      if (patientData.existingPatientId) {
        patient = { id: patientData.existingPatientId };
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

      const res = await authFetch("/lab/invoices", {
        method: "POST",
        body: JSON.stringify({
          patientId: patient.id,
          admissionId: activeAdmission?.id || undefined,
          tests: Object.entries(selected).map(([testId, price]) => ({
            testId: Number(testId),
            price: Number(price),
          })),
        }),
      });
      const invoice = await res.json();
      if (!res.ok) throw new Error(invoice.error || "Failed to create lab invoice");

      navigate(`/lab/invoices/${invoice.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="p-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-800">New Lab Invoice</h1>
        <p className="text-slate-500 text-sm">Select tests for a patient and generate a lab invoice.</p>
      </header>

      <form onSubmit={handleSubmit} className="grid gap-6 max-w-3xl">
        {error && (
          <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>
        )}

        <section className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-1">Patient Info</h2>
          <p className="text-slate-500 text-sm mb-4">
            Search by name, patient ID or phone to find an existing patient, or register a new one.
          </p>
          <PatientSearchForm value={patientData} onChange={setPatientData} />
          {activeAdmission && (
            <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-3 py-2 mt-3">
              Linked to current admission — Room {activeAdmission.room?.roomNumber || "—"}
              {activeAdmission.bed ? ` (${activeAdmission.bed.bedNumber})` : ""}, {activeAdmission.tokenLabel}
            </p>
          )}
        </section>

        <section className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-800">Select Tests</h2>
            <input
              placeholder="Search tests..."
              value={testSearch}
              onChange={(e) => setTestSearch(e.target.value)}
              className="border border-slate-300 rounded px-3 py-1.5 text-sm"
            />
          </div>

          {grouped.length === 0 ? (
            <p className="text-slate-500 text-sm">No tests match your search.</p>
          ) : (
            <div className="grid gap-4 max-h-96 overflow-y-auto pr-1">
              {grouped.map(([category, items]) => (
                <div key={category}>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">{category}</p>
                  <div className="grid gap-1">
                    {items.map((t) => {
                      const isChecked = selected[t.id] !== undefined;
                      return (
                        <label
                          key={t.id}
                          className={`flex items-center justify-between gap-3 px-3 py-2 rounded border ${
                            isChecked ? "border-blue-950 bg-blue-50" : "border-slate-100 hover:bg-slate-50"
                          }`}
                        >
                          <span className="flex items-center gap-3">
                            <input type="checkbox" checked={isChecked} onChange={() => toggleTest(t)} />
                            <span className="text-sm text-slate-800">
                              {t.testName} <span className="text-xs text-slate-400">({t.testCode})</span>
                            </span>
                          </span>
                          {isChecked ? (
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={selected[t.id]}
                              onChange={(e) => updatePrice(t.id, e.target.value)}
                              className="w-24 border border-slate-300 rounded px-2 py-1 text-sm text-right"
                            />
                          ) : (
                            <span className="text-sm text-slate-500">PKR {t.price}</span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-200">
            <p className="text-sm text-slate-500">{selectedCount} test(s) selected</p>
            <p className="text-lg font-semibold text-blue-950">Total: PKR {total}</p>
          </div>
        </section>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={submitting}
            className="bg-blue-950 text-white rounded px-4 py-2 font-medium hover:bg-blue-900 disabled:opacity-50"
          >
            {submitting ? "Creating..." : "Create Invoice"}
          </button>
        </div>
      </form>
    </div>
  );
}
