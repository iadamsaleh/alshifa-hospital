import { calculateAge } from "../../utils/age";
import { HOSPITAL_NAME, HOSPITAL_ADDRESS, HOSPITAL_PHONE } from "../../constants/hospital";

export default function DischargeBillPrintLayout({
  patient,
  admission,
  dischargeDate,
  daysAdmitted,
  roomDailyRate,
  roomCharges,
  doctorFee,
  procedureRows,
  nursingChargeRows,
  customRows,
  labInvoices,
  pharmacyInvoices,
  grandTotal,
  notes,
  isPaid,
}) {
  const admissionDate = new Date(admission.admissionDate);
  const discharge = new Date(dischargeDate);

  return (
    <div className="print-area max-w-3xl mx-auto bg-white rounded-lg shadow p-8">
      <div className="flex items-start justify-between border-b-2 border-blue-950 pb-4 mb-4">
        <div>
          <h1 className="text-xl font-semibold text-blue-950">{HOSPITAL_NAME}</h1>
          <p className="text-xs text-slate-500">{HOSPITAL_ADDRESS}</p>
          <p className="text-xs text-slate-500">{HOSPITAL_PHONE}</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold text-slate-800">Discharge Bill</p>
          <span
            className={`inline-block mt-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
              isPaid ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
            }`}
          >
            {isPaid ? "Paid" : "Unpaid"}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-y-1 text-sm mb-4 pb-4 border-b border-dashed border-slate-300">
        <p className="text-slate-500">Name</p>
        <p className="text-slate-800 font-medium col-span-3">{patient.name}</p>
        <p className="text-slate-500">Patient ID</p>
        <p className="text-slate-800 font-medium">{patient.patientId}</p>
        <p className="text-slate-500">Age / Gender</p>
        <p className="text-slate-800 font-medium">
          {calculateAge(patient.dateOfBirth)} yrs / {patient.gender}
        </p>
        <p className="text-slate-500">Admission Date</p>
        <p className="text-slate-800 font-medium">{admissionDate.toLocaleDateString()}</p>
        <p className="text-slate-500">Discharge Date</p>
        <p className="text-slate-800 font-medium">{discharge.toLocaleDateString()}</p>
        <p className="text-slate-500">Total Days</p>
        <p className="text-slate-800 font-medium">{daysAdmitted}</p>
        <p className="text-slate-500">Room</p>
        <p className="text-slate-800 font-medium">
          {admission.room ? `${admission.room.roomNumber} (${admission.room.type})` : "—"}
          {admission.bed ? ` — ${admission.bed.bedNumber}` : ""}
        </p>
        <p className="text-slate-500">Doctor</p>
        <p className="text-slate-800 font-medium">{admission.doctor.name}</p>
      </div>

      <table className="w-full text-sm border border-slate-300 mb-4">
        <thead className="bg-slate-50 text-left">
          <tr>
            <th className="px-2 py-1.5 border border-slate-300 font-medium">Description</th>
            <th className="px-2 py-1.5 border border-slate-300 font-medium text-right">Qty</th>
            <th className="px-2 py-1.5 border border-slate-300 font-medium text-right">Rate (PKR)</th>
            <th className="px-2 py-1.5 border border-slate-300 font-medium text-right">Amount (PKR)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="px-2 py-1.5 border border-slate-300">Room Charges</td>
            <td className="px-2 py-1.5 border border-slate-300 text-right">{daysAdmitted} day(s)</td>
            <td className="px-2 py-1.5 border border-slate-300 text-right">{roomDailyRate}</td>
            <td className="px-2 py-1.5 border border-slate-300 text-right">{roomCharges}</td>
          </tr>
          <tr>
            <td className="px-2 py-1.5 border border-slate-300">Doctor Consultation Fee</td>
            <td className="px-2 py-1.5 border border-slate-300 text-right">—</td>
            <td className="px-2 py-1.5 border border-slate-300 text-right">—</td>
            <td className="px-2 py-1.5 border border-slate-300 text-right">{doctorFee}</td>
          </tr>
          {procedureRows.map((p, i) => (
            <tr key={`proc-${i}`}>
              <td className="px-2 py-1.5 border border-slate-300">{p.name}</td>
              <td className="px-2 py-1.5 border border-slate-300 text-right">{p.quantity}</td>
              <td className="px-2 py-1.5 border border-slate-300 text-right">{p.unitPrice}</td>
              <td className="px-2 py-1.5 border border-slate-300 text-right">{p.subtotal}</td>
            </tr>
          ))}
          {(nursingChargeRows || []).map((n, i) => (
            <tr key={`nursing-${i}`}>
              <td className="px-2 py-1.5 border border-slate-300">{n.name}</td>
              <td className="px-2 py-1.5 border border-slate-300 text-right">{n.quantity}</td>
              <td className="px-2 py-1.5 border border-slate-300 text-right">{n.unitPrice}</td>
              <td className="px-2 py-1.5 border border-slate-300 text-right">{n.subtotal}</td>
            </tr>
          ))}
          {customRows.map((c, i) => (
            <tr key={`custom-${i}`}>
              <td className="px-2 py-1.5 border border-slate-300">{c.description}</td>
              <td className="px-2 py-1.5 border border-slate-300 text-right">—</td>
              <td className="px-2 py-1.5 border border-slate-300 text-right">—</td>
              <td className="px-2 py-1.5 border border-slate-300 text-right">{c.amount}</td>
            </tr>
          ))}
          {labInvoices.map((inv) => (
            <tr key={`lab-${inv.id}`}>
              <td className="px-2 py-1.5 border border-slate-300">
                Lab: {inv.tests.map((t) => t.testName).join(", ")}
              </td>
              <td className="px-2 py-1.5 border border-slate-300 text-right">—</td>
              <td className="px-2 py-1.5 border border-slate-300 text-right">—</td>
              <td className="px-2 py-1.5 border border-slate-300 text-right">{inv.totalAmount}</td>
            </tr>
          ))}
          {pharmacyInvoices.map((inv) => (
            <tr key={`pharm-${inv.id}`}>
              <td className="px-2 py-1.5 border border-slate-300">
                Pharmacy: {inv.items.map((it) => `${it.itemName} x${it.quantity}`).join(", ")}
              </td>
              <td className="px-2 py-1.5 border border-slate-300 text-right">—</td>
              <td className="px-2 py-1.5 border border-slate-300 text-right">—</td>
              <td className="px-2 py-1.5 border border-slate-300 text-right">{inv.totalAmount}</td>
            </tr>
          ))}
          <tr>
            <td colSpan={3} className="px-2 py-2 border border-slate-300 text-right font-bold text-base">
              Grand Total
            </td>
            <td className="px-2 py-2 border border-slate-300 text-right font-bold text-base text-blue-950">
              PKR {grandTotal}
            </td>
          </tr>
        </tbody>
      </table>

      {notes && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-slate-800 mb-1">Notes / Remarks</h2>
          <p className="text-sm text-slate-700 whitespace-pre-wrap">{notes}</p>
        </div>
      )}

      <p className="text-center text-xs text-slate-400 border-t border-slate-200 pt-3">
        Thank you for choosing {HOSPITAL_NAME}. Wishing you a speedy recovery.
        <br />
        {HOSPITAL_PHONE}
      </p>
    </div>
  );
}
