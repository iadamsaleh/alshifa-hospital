import { calculateAge } from "../../utils/age";
import { HOSPITAL_NAME, HOSPITAL_ADDRESS, HOSPITAL_PHONE } from "../../constants/hospital";

function groupByTest(results) {
  const groups = [];
  const byTest = new Map();
  for (const r of results) {
    if (!byTest.has(r.testName)) {
      const group = { testName: r.testName, rows: [] };
      byTest.set(r.testName, group);
      groups.push(group);
    }
    byTest.get(r.testName).rows.push(r);
  }
  return groups;
}

function normalRangeDisplay(r) {
  if (r.normalRangeText) return r.normalRangeText;
  if (r.normalRangeMin != null && r.normalRangeMax != null)
    return `${r.normalRangeMin} – ${r.normalRangeMax}`;
  return "—";
}

function flagCell(r) {
  if (!r.isAbnormal) return null;
  if (r.inputType === "numeric") {
    if (r.normalRangeMax != null && Number(r.value) > r.normalRangeMax)
      return <span style={{ color: "#dc2626", fontWeight: 700 }}>↑ H</span>;
    if (r.normalRangeMin != null && Number(r.value) < r.normalRangeMin)
      return <span style={{ color: "#dc2626", fontWeight: 700 }}>↓ L</span>;
  }
  return <span style={{ color: "#dc2626", fontWeight: 700 }}>Abnormal</span>;
}

export default function LabReportPrintLayout({ patient, referringDoctor, date, results, technicianName }) {
  const reportDate = new Date(date);
  const groups = groupByTest(results);

  return (
    <div className="print-area" style={{ fontFamily: "sans-serif", fontSize: "12px", background: "#fff" }}>

      {/* Header */}
      <div style={{ borderBottom: "2px solid #1e3a5f", paddingBottom: "10px", marginBottom: "12px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <p style={{ fontSize: "18px", fontWeight: 700, color: "#1e3a5f", margin: 0 }}>{HOSPITAL_NAME}</p>
            <p style={{ fontSize: "10px", color: "#64748b", margin: "2px 0 0" }}>{HOSPITAL_ADDRESS}</p>
            <p style={{ fontSize: "10px", color: "#64748b", margin: "1px 0 0" }}>{HOSPITAL_PHONE}</p>
          </div>
          <p style={{ fontSize: "14px", fontWeight: 700, color: "#1e3a5f", margin: 0 }}>Laboratory Report</p>
        </div>
      </div>

      {/* Patient Info */}
      <div style={{
        display: "grid", gridTemplateColumns: "auto 1fr auto 1fr", gap: "3px 16px",
        borderBottom: "1px dashed #cbd5e1", paddingBottom: "8px", marginBottom: "14px", fontSize: "11px"
      }}>
        <span style={{ color: "#64748b" }}>Name</span>
        <span style={{ fontWeight: 600 }}>{patient.name}</span>
        <span style={{ color: "#64748b" }}>Patient ID</span>
        <span style={{ fontWeight: 600 }}>{patient.patientId}</span>
        <span style={{ color: "#64748b" }}>Age / Gender</span>
        <span style={{ fontWeight: 600 }}>{calculateAge(patient.dateOfBirth)} yrs / {patient.gender}</span>
        <span style={{ color: "#64748b" }}>Date</span>
        <span style={{ fontWeight: 600 }}>{reportDate.toLocaleDateString()}</span>
        <span style={{ color: "#64748b" }}>Referring Doctor</span>
        <span style={{ fontWeight: 600, gridColumn: "span 3" }}>{referringDoctor || "—"}</span>
      </div>

      {/* Test Groups */}
      {groups.map((group) => (
        <div key={group.testName} style={{ marginBottom: "16px" }}>
          <p style={{ fontWeight: 700, fontSize: "13px", margin: "0 0 6px",
            borderBottom: "1px solid #e2e8f0", paddingBottom: "4px" }}>
            {group.testName}
          </p>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                {["Parameter", "Result", "Unit", "Normal Range", "Flag"].map((h) => (
                  <th key={h} style={{ border: "1px solid #cbd5e1", padding: "4px 6px", textAlign: "left", fontWeight: 600 }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {group.rows.map((r, i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "#f8fafc" }}>
                  <td style={{ border: "1px solid #cbd5e1", padding: "4px 6px" }}>{r.parameterName}</td>
                  <td style={{
                    border: "1px solid #cbd5e1", padding: "4px 6px",
                    color: r.isAbnormal ? "#dc2626" : "#1e293b",
                    fontWeight: r.isAbnormal ? 700 : 400,
                  }}>
                    {r.value}
                  </td>
                  <td style={{ border: "1px solid #cbd5e1", padding: "4px 6px", color: "#64748b" }}>{r.unit || "—"}</td>
                  <td style={{ border: "1px solid #cbd5e1", padding: "4px 6px", color: "#64748b" }}>{normalRangeDisplay(r)}</td>
                  <td style={{ border: "1px solid #cbd5e1", padding: "4px 6px" }}>{flagCell(r)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

      {/* Technician signature */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "32px", marginBottom: "16px" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ borderTop: "1px solid #94a3b8", paddingTop: "4px", paddingLeft: "48px", paddingRight: "8px" }}>
            <p style={{ fontSize: "11px", color: "#475569", margin: 0 }}>{technicianName || "Lab Technician"}</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: "6px", textAlign: "center" }}>
        <p style={{ fontSize: "10px", color: "#64748b", margin: "0 0 2px" }}>
          Results are valid for 30 days from the date of report.
        </p>
        <p style={{ fontSize: "10px", color: "#94a3b8", margin: 0 }}>
          {HOSPITAL_NAME} — {HOSPITAL_PHONE}
        </p>
      </div>
    </div>
  );
}
