import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { calculateAge } from "../../utils/age";
import { isAbnormalTextValue } from "../../utils/labAbnormal";

function effectiveMax(parameterName, normalRangeMax, gender) {
  if (parameterName === "ESR 1st Hour") {
    return gender === "Male" ? 20 : 30;
  }
  return normalRangeMax;
}

function computeAbnormal(param, value, gender) {
  if (param.inputType === "numeric") {
    if (value === "" || value == null) return false;
    const num = Number(value);
    if (Number.isNaN(num)) return false;
    const max = effectiveMax(param.parameterName, param.normalRangeMax, gender);
    return (param.normalRangeMin != null && num < param.normalRangeMin) || (max != null && num > max);
  }
  return isAbnormalTextValue(value);
}

function ParameterRow({ param, gender, onChange }) {
  const isAbnormal = computeAbnormal(param, param.value, gender);
  const max = effectiveMax(param.parameterName, param.normalRangeMax, gender);
  const arrow =
    isAbnormal && param.inputType === "numeric"
      ? Number(param.value) > max
        ? "↑"
        : "↓"
      : isAbnormal
        ? "⚠"
        : "";

  return (
    <tr className={isAbnormal ? "bg-red-50" : ""}>
      <td className="px-2 py-1.5 text-slate-800">{param.parameterName}</td>
      <td className="px-2 py-1.5">
        {param.inputType === "numeric" ? (
          <input
            type="number"
            step="any"
            value={param.value}
            onChange={(e) => onChange({ value: e.target.value })}
            className={`w-28 border rounded px-2 py-1 text-sm ${
              isAbnormal ? "border-red-400 text-red-700 font-semibold" : "border-slate-300"
            }`}
          />
        ) : param.options ? (
          <select
            value={param.value}
            onChange={(e) => onChange({ value: e.target.value })}
            className={`border rounded px-2 py-1 text-sm ${
              isAbnormal ? "border-red-400 text-red-700 font-semibold" : "border-slate-300"
            }`}
          >
            <option value="">Select...</option>
            {param.options.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        ) : (
          <input
            value={param.value}
            onChange={(e) => onChange({ value: e.target.value })}
            className={`border rounded px-2 py-1 text-sm ${
              isAbnormal ? "border-red-400 text-red-700 font-semibold" : "border-slate-300"
            }`}
          />
        )}
      </td>
      <td className="px-2 py-1.5 text-slate-500">{param.unit || "—"}</td>
      <td className="px-2 py-1.5 text-slate-500">{param.normalRangeText || "—"}</td>
      <td className="px-2 py-1.5">
        {isAbnormal && <span className="text-red-600 font-bold">{arrow}</span>}
      </td>
    </tr>
  );
}

export default function EnterResultsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { authFetch } = useAuth();

  const [invoice, setInvoice] = useState(null);
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([
      authFetch(`/lab/invoices/${id}`).then((res) => {
        if (!res.ok) return res.json().then((d) => Promise.reject(new Error(d.error || "Failed to load")));
        return res.json();
      }),
      authFetch("/lab/templates").then((res) => res.json()),
    ])
      .then(([invoiceData, templates]) => {
        const templatesByCode = Object.fromEntries(templates.map((t) => [t.testCode, t]));
        const initialForm = {};
        for (const test of invoiceData.tests) {
          const template = templatesByCode[test.testCode];
          if (template) {
            initialForm[test.testId] = {
              mode: "structured",
              parameters: template.parameters.map((p) => ({ ...p, value: "" })),
            };
          } else {
            initialForm[test.testId] = { mode: "freetext", value: "" };
          }
        }
        setInvoice(invoiceData);
        setFormData(initialForm);
      })
      .catch((err) => setLoadError(err.message))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function updateParameter(testId, paramIndex, patch) {
    setFormData((prev) => {
      const entry = prev[testId];
      const parameters = [...entry.parameters];
      parameters[paramIndex] = { ...parameters[paramIndex], ...patch };
      return { ...prev, [testId]: { ...entry, parameters } };
    });
  }

  function updateFreeText(testId, value) {
    setFormData((prev) => ({ ...prev, [testId]: { ...prev[testId], value } }));
  }

  if (loading) return <div className="p-8 text-slate-500 text-sm">Loading...</div>;
  if (loadError) return <div className="p-8 text-red-600 text-sm">{loadError}</div>;
  if (!invoice) return null;

  const { patient } = invoice;

  async function handleSave() {
    setSubmitting(true);
    setError(null);
    try {
      const results = [];
      for (const test of invoice.tests) {
        const entry = formData[test.testId];
        if (!entry) continue;
        if (entry.mode === "structured") {
          for (const p of entry.parameters) {
            results.push({
              testId: test.testId,
              testName: test.testName,
              parameterName: p.parameterName,
              value: p.value,
              unit: p.unit,
              normalRangeMin: p.normalRangeMin,
              normalRangeMax: p.normalRangeMax,
              normalRangeText: p.normalRangeText,
              inputType: p.inputType,
              isAbnormal: computeAbnormal(p, p.value, patient.gender),
            });
          }
        } else {
          results.push({
            testId: test.testId,
            testName: test.testName,
            parameterName: "Findings",
            value: entry.value,
            unit: null,
            normalRangeMin: null,
            normalRangeMax: null,
            normalRangeText: null,
            inputType: "text",
            isAbnormal: false,
          });
        }
      }

      const res = await authFetch("/lab/results", {
        method: "POST",
        body: JSON.stringify({ labInvoiceId: invoice.id, results }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save results");
      navigate(`/lab/results/${invoice.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="p-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-800">Enter Lab Results</h1>
      </header>

      {error && (
        <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded px-3 py-2 mb-4 max-w-3xl">
          {error}
        </p>
      )}

      <section className="bg-white rounded-lg shadow p-4 mb-6 max-w-3xl">
        <div className="grid grid-cols-4 gap-y-1 text-sm">
          <p className="text-slate-500">Patient</p>
          <p className="text-slate-800 font-medium col-span-3">
            {patient.name} ({patient.patientId})
          </p>
          <p className="text-slate-500">Age / Gender</p>
          <p className="text-slate-800 font-medium col-span-3">
            {calculateAge(patient.dateOfBirth)} yrs / {patient.gender}
          </p>
        </div>
      </section>

      {invoice.tests.map((test) => {
        const entry = formData[test.testId];
        if (!entry) return null;
        return (
          <section key={test.testId} className="bg-white rounded-lg shadow p-6 mb-6 max-w-3xl">
            <h2 className="text-lg font-semibold text-slate-800 mb-3">{test.testName}</h2>
            {entry.mode === "structured" ? (
              <table className="w-full text-sm">
                <thead className="text-left text-slate-500">
                  <tr>
                    <th className="px-2 py-1.5 font-medium">Parameter</th>
                    <th className="px-2 py-1.5 font-medium">Result</th>
                    <th className="px-2 py-1.5 font-medium">Unit</th>
                    <th className="px-2 py-1.5 font-medium">Normal Range</th>
                    <th className="px-2 py-1.5 font-medium">Flag</th>
                  </tr>
                </thead>
                <tbody>
                  {entry.parameters.map((param, i) => (
                    <ParameterRow
                      key={param.parameterName}
                      param={param}
                      gender={patient.gender}
                      onChange={(patch) => updateParameter(test.testId, i, patch)}
                    />
                  ))}
                </tbody>
              </table>
            ) : (
              <textarea
                value={entry.value}
                onChange={(e) => updateFreeText(test.testId, e.target.value)}
                rows={4}
                placeholder={`Enter findings for ${test.testName}...`}
                className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
              />
            )}
          </section>
        );
      })}

      <div className="max-w-3xl">
        <button
          type="button"
          onClick={handleSave}
          disabled={submitting}
          className="bg-emerald-600 text-white rounded px-4 py-2 font-medium hover:bg-emerald-700 disabled:opacity-50"
        >
          {submitting ? "Saving..." : "Save Results"}
        </button>
      </div>
    </div>
  );
}
