// English values here are the values actually stored on a prescription —
// Urdu is presentation-only, looked up by English value where needed (e.g.
// for printing). Keeping English as the stored value means the dose/duration
// quantity math elsewhere never has to know about translation at all.

export const DOSE_OPTIONS = [
  { en: "1 Tablet", ur: "۱ گولی" },
  { en: "2 Tablets", ur: "۲ گولیاں" },
  { en: "Half Tablet", ur: "آدھی گولی" },
  { en: "1 Teaspoon", ur: "۱ چمچ" },
  { en: "2 Teaspoons", ur: "۲ چمچ" },
  { en: "1 Injection", ur: "۱ انجکشن" },
];

export const FREQUENCY_OPTIONS = [
  { en: "Morning once", ur: "صبح ایک بار" },
  { en: "Evening once", ur: "شام ایک بار" },
  { en: "Twice a day", ur: "صبح اور شام" },
  { en: "Thrice a day", ur: "صبح دوپہر اور شام" },
  { en: "Four times a day", ur: "دن میں چار بار" },
  { en: "Every 8 hours", ur: "ہر ۸ گھنٹے بعد" },
  { en: "Every 12 hours", ur: "ہر ۱۲ گھنٹے بعد" },
  { en: "As needed", ur: "ضرورت کے مطابق" },
];

// Old English values stored in the database before this update.
// Map each to the closest new equivalent so legacy prescriptions
// display and calculate correctly without a data migration.
const FREQUENCY_LEGACY_MAP = {
  "Once a day": "Morning once",
};

export function normalizeFrequency(val) {
  return FREQUENCY_LEGACY_MAP[val] ?? val;
}

export const INSTRUCTIONS_OPTIONS = [
  { en: "Before meal", ur: "کھانے سے پہلے" },
  { en: "After meal", ur: "کھانے کے بعد" },
  { en: "With meal", ur: "کھانے کے ساتھ" },
  { en: "At bedtime", ur: "سوتے وقت" },
  { en: "Empty stomach", ur: "خالی پیٹ" },
];

export function findUrdu(list, enValue) {
  return list.find((o) => o.en === enValue)?.ur || "";
}
