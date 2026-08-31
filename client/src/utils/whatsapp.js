import { HOSPITAL_PHONE } from "../constants/hospital";

// Converts Pakistani phone numbers to WhatsApp-compatible international format (no + sign).
// Examples: "0301-1234567" → "923011234567", "+923001234567" → "923001234567"
export function formatWhatsAppNumber(phone) {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("92")) return digits;
  if (digits.startsWith("0")) return "92" + digits.slice(1);
  return digits;
}

export function whatsAppPrescriptionUrl(patientPhone) {
  const number = formatWhatsAppNumber(patientPhone);
  const text = encodeURIComponent(
    `Assalam o Alaikum, please find your prescription from Al-Shifa Diagnostic Centre. ` +
    `Please follow the doctor's instructions carefully. ` +
    `For any queries contact us at ${HOSPITAL_PHONE}. Thank you.`
  );
  return `https://wa.me/${number}?text=${text}`;
}

export function whatsAppLabReportUrl(patientPhone) {
  const number = formatWhatsAppNumber(patientPhone);
  const text = encodeURIComponent(
    `Assalam o Alaikum, please find your lab report from Al-Shifa Diagnostic Centre attached. ` +
    `For any queries please contact us at ${HOSPITAL_PHONE}. Thank you.`
  );
  return `https://wa.me/${number}?text=${text}`;
}

export async function openWhatsApp(url) {
  if (window.electronAPI?.openExternal) {
    await window.electronAPI.openExternal(url);
  } else {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}
