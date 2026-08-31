const ABNORMAL_TEXT_VALUES = new Set([
  "Reactive",
  "Positive",
  "+1",
  "+2",
  "+3",
  "1:20",
  "1:40",
  "1:80",
  "1:160",
]);

export function isAbnormalTextValue(value) {
  if (!value) return false;
  return ABNORMAL_TEXT_VALUES.has(String(value).trim());
}
