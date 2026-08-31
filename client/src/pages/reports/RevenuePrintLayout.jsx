import { HOSPITAL_NAME, HOSPITAL_ADDRESS, HOSPITAL_PHONE } from "../../constants/hospital";

export default function RevenuePrintLayout({ dateFrom, dateTo, data }) {
  return (
    <div className="print-area max-w-4xl mx-auto bg-white rounded-lg shadow p-8">
      <div className="flex items-start justify-between border-b-2 border-blue-950 pb-4 mb-4">
        <div>
          <h1 className="text-xl font-semibold text-blue-950">{HOSPITAL_NAME}</h1>
          <p className="text-xs text-slate-500">{HOSPITAL_ADDRESS}</p>
          <p className="text-xs text-slate-500">{HOSPITAL_PHONE}</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold text-slate-800">Revenue Report</p>
          <p className="text-xs text-slate-500">
            {new Date(dateFrom).toLocaleDateString()} — {new Date(dateTo).toLocaleDateString()}
          </p>
        </div>
      </div>

      <table className="w-full text-sm border border-slate-300 mb-6">
        <thead className="bg-slate-50 text-left">
          <tr>
            <th className="px-2 py-1.5 border border-slate-300 font-medium">Revenue Stream</th>
            <th className="px-2 py-1.5 border border-slate-300 font-medium text-right">Amount (PKR)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="px-2 py-1.5 border border-slate-300">Lab Revenue</td>
            <td className="px-2 py-1.5 border border-slate-300 text-right">{data.totals.lab.toLocaleString()}</td>
          </tr>
          <tr>
            <td className="px-2 py-1.5 border border-slate-300">Pharmacy Revenue</td>
            <td className="px-2 py-1.5 border border-slate-300 text-right">
              {data.totals.pharmacy.toLocaleString()}
            </td>
          </tr>
          <tr>
            <td className="px-2 py-1.5 border border-slate-300">OPD Revenue</td>
            <td className="px-2 py-1.5 border border-slate-300 text-right">{data.totals.opd.toLocaleString()}</td>
          </tr>
          <tr>
            <td className="px-2 py-1.5 border border-slate-300">Admission / Room Revenue</td>
            <td className="px-2 py-1.5 border border-slate-300 text-right">
              {data.totals.admission.toLocaleString()}
            </td>
          </tr>
          <tr>
            <td className="px-2 py-2 border border-slate-300 font-bold">Total Revenue</td>
            <td className="px-2 py-2 border border-slate-300 text-right font-bold text-blue-950">
              {data.totals.total.toLocaleString()}
            </td>
          </tr>
        </tbody>
      </table>

      <table className="w-full text-sm border border-slate-300">
        <thead className="bg-slate-50 text-left">
          <tr>
            <th className="px-2 py-1.5 border border-slate-300 font-medium">Date</th>
            <th className="px-2 py-1.5 border border-slate-300 font-medium text-right">Lab</th>
            <th className="px-2 py-1.5 border border-slate-300 font-medium text-right">Pharmacy</th>
            <th className="px-2 py-1.5 border border-slate-300 font-medium text-right">OPD</th>
            <th className="px-2 py-1.5 border border-slate-300 font-medium text-right">Admissions</th>
            <th className="px-2 py-1.5 border border-slate-300 font-medium text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {data.byDay.map((d) => (
            <tr key={d.date}>
              <td className="px-2 py-1.5 border border-slate-300">{new Date(d.date).toLocaleDateString()}</td>
              <td className="px-2 py-1.5 border border-slate-300 text-right">{d.lab.toLocaleString()}</td>
              <td className="px-2 py-1.5 border border-slate-300 text-right">{d.pharmacy.toLocaleString()}</td>
              <td className="px-2 py-1.5 border border-slate-300 text-right">{d.opd.toLocaleString()}</td>
              <td className="px-2 py-1.5 border border-slate-300 text-right">{d.admission.toLocaleString()}</td>
              <td className="px-2 py-1.5 border border-slate-300 text-right font-medium">
                {d.total.toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
