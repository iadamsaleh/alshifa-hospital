// Prescription.comments is a single string column, but the UI needs two
// distinct sections (clinical notes vs. advice). Rather than adding columns,
// we encode both into that one field as JSON and parse it back out on read.
const MARKER = "__notes_advice__";

export function serializeComments(notes, advice) {
  return JSON.stringify({ marker: MARKER, notes, advice });
}

export function parseComments(raw) {
  if (!raw) return { notes: "", advice: "" };
  try {
    const parsed = JSON.parse(raw);
    if (parsed && parsed.marker === MARKER) {
      return { notes: parsed.notes || "", advice: parsed.advice || "" };
    }
  } catch {
    // not JSON — fall through to legacy handling
  }
  // Prescriptions saved before this change stored a single free-text
  // "Notes & Advice" field — show that legacy text as advice.
  return { notes: "", advice: raw };
}
