import { calculateAge } from "../../utils/age";
import { HOSPITAL_NAME, HOSPITAL_ADDRESS, HOSPITAL_PHONE } from "../../constants/hospital";
import { parseComments } from "../../utils/prescriptionComments";
import { DOSE_OPTIONS, FREQUENCY_OPTIONS, INSTRUCTIONS_OPTIONS, findUrdu, normalizeFrequency } from "./bilingualOptions";

// ── Bilingual helper ──────────────────────────────────────────────────────────
function urduFor(en) {
  const normalized = normalizeFrequency(en);
  return (
    findUrdu(DOSE_OPTIONS, normalized) ||
    findUrdu(FREQUENCY_OPTIONS, normalized) ||
    findUrdu(INSTRUCTIONS_OPTIONS, normalized) ||
    ""
  );
}

function BilingualCell({ en }) {
  const ur = urduFor(en);
  if (!en) return <span className="text-slate-400">—</span>;
  if (!ur) return <>{en}</>;
  return (
    <span>
      {en}
      <span className="urdu-text block text-[10px] leading-tight mt-0.5">{ur}</span>
    </span>
  );
}

// ── Investigation findings parser ─────────────────────────────────────────────
// Stored strings look like: "RFTs — Potassium: 2.1 mEq/L (Normal: 3.5-5.0)"
function parseFindings(investigations) {
  const groups = new Map(); // testName → [{ paramName, value, unit, arrow }]
  for (const str of investigations) {
    const sepIdx = str.indexOf(" — ");
    if (sepIdx === -1) {
      const key = "Findings";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push({ paramName: str, value: "", unit: "", arrow: "" });
      continue;
    }
    const testName = str.slice(0, sepIdx);
    const rest = str.slice(sepIdx + 3);

    const normalMatch = rest.match(/\s*\(Normal:\s*(.+?)\)$/);
    const rangeStr = normalMatch ? normalMatch[1].trim() : null;
    const withoutRange = normalMatch ? rest.slice(0, normalMatch.index) : rest;

    const colonIdx = withoutRange.indexOf(": ");
    if (colonIdx === -1) {
      if (!groups.has(testName)) groups.set(testName, []);
      groups.get(testName).push({ paramName: withoutRange, value: "", unit: "", arrow: "⚠" });
      continue;
    }

    const paramName = withoutRange.slice(0, colonIdx).trim();
    const valueWithUnit = withoutRange.slice(colonIdx + 2).trim();
    const tokens = valueWithUnit.split(/\s+/);
    const value = tokens[0] || "";
    const unit = tokens.slice(1).join(" ");

    let arrow = "⚠";
    const numVal = parseFloat(value);
    if (!isNaN(numVal) && rangeStr) {
      const dashM = rangeStr.match(/^(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)$/);
      if (dashM) {
        const min = parseFloat(dashM[1]);
        const max = parseFloat(dashM[2]);
        arrow = numVal < min ? "↓" : numVal > max ? "↑" : "↑"; // these are already abnormal
      }
    }

    if (!groups.has(testName)) groups.set(testName, []);
    groups.get(testName).push({ paramName, value, unit, arrow });
  }
  return groups;
}

// ── Dose unit label (for "Total: X" line) ────────────────────────────────────
function doseUnitLabel(dose) {
  if (!dose) return "units";
  const d = dose.toLowerCase();
  if (d.includes("tablet")) return "tablets";
  if (d.includes("teaspoon")) return "doses";
  if (d.includes("injection")) return "injections";
  if (d.includes("capsule")) return "capsules";
  return "units";
}

// ── Left column box ───────────────────────────────────────────────────────────
function LeftBox({ title, children }) {
  return (
    <div className="border border-slate-200 rounded mb-3 overflow-hidden">
      <div className="bg-slate-50 border-b border-slate-200 px-3 py-1.5">
        <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wide">{title}</p>
      </div>
      <div className="px-3 py-2">{children}</div>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function PrescriptionPrintLayout({
  patient, doctor, medicines, investigations, diagnoses, comments, date, status,
}) {
  const visitDate = new Date(date);
  const { notes, advice } = parseComments(comments);
  const isPending = status === "PENDING_INVESTIGATIONS";
  const diagList = Array.isArray(diagnoses) ? diagnoses : [];
  const findingGroups = parseFindings(investigations || []);
  const hasLeft = notes || findingGroups.size > 0 || diagList.length > 0 || advice;

  return (
    <div className="print-area bg-white relative" style={{ fontFamily: "sans-serif", fontSize: "12px" }}>

      {/* PENDING watermark */}
      {isPending && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center z-10"
          style={{ transform: "rotate(-35deg)" }}>
          <span style={{ fontSize: "80px", fontWeight: 900, color: "rgba(220,38,38,0.15)", letterSpacing: "0.2em" }}>
            PENDING
          </span>
        </div>
      )}

      {/* ── HEADER ── */}
      <div style={{ borderBottom: "2px solid #1e3a5f", paddingBottom: "10px", marginBottom: "12px" }}>
        <div style={{ textAlign: "center", marginBottom: "4px" }}>
          <p style={{ fontSize: "18px", fontWeight: 700, color: "#1e3a5f", margin: 0 }}>{HOSPITAL_NAME}</p>
          <p style={{ fontSize: "10px", color: "#64748b", margin: "2px 0 0" }}>{HOSPITAL_ADDRESS}</p>
          <p style={{ fontSize: "10px", color: "#64748b", margin: "1px 0 0" }}>{HOSPITAL_PHONE}</p>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "4px" }}>
          <div style={{ textAlign: "right" }}>
            <p style={{ fontWeight: 600, margin: 0 }}>{doctor.name}</p>
            <p style={{ fontSize: "10px", color: "#64748b", margin: "1px 0 0" }}>{doctor.specialization}</p>
          </div>
        </div>
      </div>

      {/* ── PATIENT INFO ROW ── */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "2px 16px",
        borderBottom: "1px dashed #cbd5e1", paddingBottom: "8px", marginBottom: "12px", fontSize: "11px"
      }}>
        <span style={{ color: "#64748b" }}>Name</span>
        <span style={{ fontWeight: 600, gridColumn: "span 3" }}>{patient.name}</span>
        <span style={{ color: "#64748b" }}>Age / Gender</span>
        <span style={{ fontWeight: 600 }}>{calculateAge(patient.dateOfBirth)} yrs / {patient.gender}</span>
        <span style={{ color: "#64748b" }}>Patient ID</span>
        <span style={{ fontWeight: 600 }}>{patient.patientId}</span>
        <span style={{ color: "#64748b" }}>Date</span>
        <span style={{ fontWeight: 600, gridColumn: "span 3" }}>{visitDate.toLocaleDateString()}</span>
      </div>

      {/* ── BODY: two-column ── */}
      <div style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>

        {/* LEFT COLUMN — 40% */}
        {hasLeft && (
          <div style={{ width: "40%", flexShrink: 0 }}>

            {notes && (
              <LeftBox title="Clinical Notes">
                <p style={{ whiteSpace: "pre-wrap", margin: 0, fontSize: "11px", color: "#334155" }}>{notes}</p>
              </LeftBox>
            )}

            {findingGroups.size > 0 && (
              <LeftBox title="Investigation Findings">
                {Array.from(findingGroups.entries()).map(([testName, params]) => (
                  <div key={testName} className="mb-2 last:mb-0">
                    <p style={{ fontWeight: 700, margin: "0 0 2px", fontSize: "11px" }}>{testName}</p>
                    {params.map((p, i) => (
                      <p key={i} style={{ margin: "0 0 1px", fontSize: "11px", color: "#dc2626" }}>
                        {p.paramName}{p.value ? `: ${p.value}${p.unit ? " " + p.unit : ""} ` : ""}
                        {p.arrow && <span style={{ fontWeight: 700 }}>{p.arrow}</span>}
                      </p>
                    ))}
                  </div>
                ))}
              </LeftBox>
            )}

            {diagList.length > 0 && (
              <LeftBox title="Diagnosis">
                <p style={{ margin: 0, fontSize: "11px", color: "#334155" }}>
                  {diagList.join(", ")}
                </p>
              </LeftBox>
            )}

            {advice && (
              <LeftBox title="Advice & Restrictions">
                <p style={{ whiteSpace: "pre-wrap", margin: 0, fontSize: "11px", color: "#334155" }}>{advice}</p>
              </LeftBox>
            )}
          </div>
        )}

        {/* RIGHT COLUMN — 60% (or full width if no left content) */}
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: "28px", fontFamily: "serif", color: "#1e3a5f", margin: "0 0 6px", lineHeight: 1 }}>℞</p>

          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                {["Medicine", "Dose", "Frequency", "Duration", "Instructions"].map((h) => (
                  <th key={h} style={{ border: "1px solid #cbd5e1", padding: "4px 6px", textAlign: "left", fontWeight: 600 }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {medicines.map((m, i) => (
                <>
                  <tr key={`${i}-row`} style={{ background: i % 2 === 0 ? "#fff" : "#f8fafc" }}>
                    <td style={{ border: "1px solid #cbd5e1", padding: "4px 6px", fontWeight: 600 }}>{m.name}</td>
                    <td style={{ border: "1px solid #cbd5e1", padding: "4px 6px" }}>
                      <BilingualCell en={m.dose} />
                    </td>
                    <td style={{ border: "1px solid #cbd5e1", padding: "4px 6px" }}>
                      <BilingualCell en={m.frequency} />
                    </td>
                    <td style={{ border: "1px solid #cbd5e1", padding: "4px 6px", whiteSpace: "nowrap" }}>
                      {m.duration} {m.durationUnit}
                    </td>
                    <td style={{ border: "1px solid #cbd5e1", padding: "4px 6px" }}>
                      {m.instructions ? <BilingualCell en={m.instructions} /> : <span style={{ color: "#94a3b8" }}>—</span>}
                    </td>
                  </tr>
                  {m.totalQuantity && (
                    <tr key={`${i}-qty`}>
                      <td colSpan={5} style={{ border: "1px solid #cbd5e1", padding: "2px 6px 4px",
                        borderTop: "none", background: i % 2 === 0 ? "#fff" : "#f8fafc" }}>
                        <span style={{ fontSize: "10px", color: "#64748b" }}>
                          Total: {m.totalQuantity} {doseUnitLabel(m.dose)}
                        </span>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── FOOTER ── */}
      <div style={{ borderTop: "1px solid #cbd5e1", marginTop: "20px", paddingTop: "8px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div style={{ fontSize: "10px", color: "#64748b" }}>{HOSPITAL_PHONE}</div>
          <div style={{ fontSize: "10px", color: "#64748b", textAlign: "center" }}>Follow up as advised</div>
          <div style={{ textAlign: "right" }}>
            <div style={{ borderTop: "1px solid #94a3b8", paddingTop: "2px", paddingLeft: "40px", paddingRight: "4px" }}>
              <p style={{ fontSize: "10px", color: "#475569", margin: 0 }}>Dr. {doctor.name}</p>
            </div>
          </div>
        </div>
        <p style={{ textAlign: "center", fontSize: "10px", color: "#94a3b8", marginTop: "6px", borderTop: "1px solid #e2e8f0", paddingTop: "4px" }}>
          {HOSPITAL_NAME} — Thank you for your visit
        </p>
      </div>
    </div>
  );
}
