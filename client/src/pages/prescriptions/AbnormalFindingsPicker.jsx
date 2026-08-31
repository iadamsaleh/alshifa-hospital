import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function formatFinding(param) {
  const range =
    param.normalRangeText ||
    (param.normalRangeMin != null && param.normalRangeMax != null
      ? `${param.normalRangeMin}-${param.normalRangeMax}`
      : null);
  const unitPart = param.unit ? ` ${param.unit}` : "";
  const rangePart = range ? ` (Normal: ${range})` : "";
  return `${param.testName} — ${param.parameterName}: ${param.value}${unitPart}${rangePart}`;
}

function arrowFor(param) {
  if (param.inputType !== "numeric") return "⚠";
  if (param.normalRangeMax != null && Number(param.value) > param.normalRangeMax) return "↑";
  if (param.normalRangeMin != null && Number(param.value) < param.normalRangeMin) return "↓";
  return "⚠";
}

export default function AbnormalFindingsPicker({ patientId, selected, onChange }) {
  const { authFetch } = useAuth();
  const [findings, setFindings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [customText, setCustomText] = useState("");

  useEffect(() => {
    authFetch(`/lab/results/patient/${patientId}`)
      .then((res) => res.json())
      .then((results) => {
        const cutoff = Date.now() - SEVEN_DAYS_MS;
        const recent = results.filter(
          (r) => r.status === "COMPLETED" && new Date(r.createdAt).getTime() >= cutoff
        );
        const items = [];
        for (const r of recent) {
          for (const param of r.results) {
            if (param.isAbnormal) {
              items.push({
                key: `${r.id}-${param.testId}-${param.parameterName}`,
                label: formatFinding(param),
                arrow: arrowFor(param),
              });
            }
          }
        }
        setFindings(items);
      })
      .catch(() => setFindings([]))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId]);

  function toggleFinding(label) {
    if (selected.includes(label)) {
      onChange(selected.filter((s) => s !== label));
    } else {
      onChange([...selected, label]);
    }
  }

  function addCustom() {
    const trimmed = customText.trim();
    if (!trimmed || selected.includes(trimmed)) return;
    onChange([...selected, trimmed]);
    setCustomText("");
  }

  function removeSelected(label) {
    onChange(selected.filter((s) => s !== label));
  }

  function handleKeyDown(e) {
    if (e.key === "Enter") {
      e.preventDefault();
      addCustom();
    }
  }

  // Selected entries that don't match a fetched lab finding were typed in manually.
  const knownLabels = new Set(findings.map((f) => f.label));
  const customSelected = selected.filter((s) => !knownLabels.has(s));

  return (
    <div>
      {loading ? (
        <p className="text-slate-500 text-sm">Loading recent lab results...</p>
      ) : findings.length === 0 ? (
        <p className="text-slate-500 text-sm mb-3">No recent abnormal lab results found.</p>
      ) : (
        <div className="grid gap-1 mb-3">
          {findings.map((f) => (
            <label
              key={f.key}
              className={`flex items-center gap-3 px-3 py-2 rounded border ${
                selected.includes(f.label) ? "border-red-300 bg-red-50" : "border-slate-100 hover:bg-slate-50"
              }`}
            >
              <input type="checkbox" checked={selected.includes(f.label)} onChange={() => toggleFinding(f.label)} />
              <span className="text-sm text-slate-800">
                {f.label} <span className="text-red-600 font-bold">{f.arrow}</span>
              </span>
            </label>
          ))}
        </div>
      )}

      <div className="flex gap-2 mb-2">
        <input
          placeholder="Add a custom finding..."
          value={customText}
          onChange={(e) => setCustomText(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 border border-slate-300 rounded px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={addCustom}
          className="bg-slate-100 hover:bg-slate-200 text-slate-700 rounded px-3 py-2 text-sm font-medium"
        >
          Add
        </button>
      </div>

      {customSelected.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {customSelected.map((s) => (
            <span
              key={s}
              className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-900 text-xs font-medium px-2.5 py-1 rounded-full"
            >
              {s}
              <button
                type="button"
                onClick={() => removeSelected(s)}
                className="text-blue-400 hover:text-blue-700 leading-none"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
