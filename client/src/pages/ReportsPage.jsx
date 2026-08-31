import { useState } from "react";
import RevenueReport from "./reports/RevenueReport";
import PatientStatsReport from "./reports/PatientStatsReport";
import DoctorReport from "./reports/DoctorReport";
import LabReport from "./reports/LabReport";
import PharmacyReport from "./reports/PharmacyReport";

const TABS = [
  { key: "revenue", label: "Revenue", Component: RevenueReport },
  { key: "patients", label: "Patient Statistics", Component: PatientStatsReport },
  { key: "doctors", label: "Doctor Report", Component: DoctorReport },
  { key: "lab", label: "Lab Report", Component: LabReport },
  { key: "pharmacy", label: "Pharmacy Report", Component: PharmacyReport },
];

export default function ReportsPage() {
  const [tab, setTab] = useState("revenue");
  const Active = TABS.find((t) => t.key === tab)?.Component;

  return (
    <div className="p-8">
      <header className="mb-6 print:hidden">
        <h1 className="text-2xl font-semibold text-slate-800">Reports</h1>
        <p className="text-slate-500 text-sm">Operational and financial reports.</p>
      </header>

      <div className="flex flex-wrap gap-1 mb-6 border-b border-slate-200 print:hidden">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition ${
              tab === t.key
                ? "border-blue-950 text-blue-950"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {Active && <Active />}
    </div>
  );
}
