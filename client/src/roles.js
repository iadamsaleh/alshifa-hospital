export const DEFAULT_ROUTE_BY_ROLE = {
  ADMIN: "/dashboard",
  RECEPTIONIST: "/patients/new",
  DOCTOR: "/patients/all",
  LAB_ASSISTANT: "/lab/invoices",
};

// Sidebar nav, grouped by section. A section is either a single link
// (has `path` + `roles`) or a group of sub-links (has `items`).
export const NAV_SECTIONS = [
  { label: "Dashboard", path: "/dashboard", roles: ["ADMIN"] },
  {
    label: "Patients",
    items: [
      { label: "New Admission", path: "/patients/new", roles: ["ADMIN", "RECEPTIONIST"] },
      { label: "All Patients", path: "/patients/all", roles: ["ADMIN", "RECEPTIONIST", "DOCTOR"] },
      { label: "Active Patients", path: "/patients/active", roles: ["ADMIN", "RECEPTIONIST"] },
      { label: "New OPD Visit", path: "/opd/new", roles: ["ADMIN", "RECEPTIONIST"] },
      { label: "Today's Queue", path: "/opd/today", roles: ["ADMIN", "RECEPTIONIST", "DOCTOR"] },
      { label: "OPD History", path: "/opd/history", roles: ["ADMIN", "RECEPTIONIST", "DOCTOR"] },
      { label: "Pending Prescriptions", path: "/prescriptions/pending", roles: ["ADMIN", "DOCTOR"], badge: "pendingPrescriptions" },
    ],
  },
  {
    label: "Doctors",
    items: [
      { label: "Doctor List", path: "/doctors/list", roles: ["ADMIN", "RECEPTIONIST", "DOCTOR"] },
      { label: "Schedules", path: "/doctors/schedules", roles: ["ADMIN", "RECEPTIONIST", "DOCTOR"] },
    ],
  },
  {
    label: "Lab",
    items: [
      { label: "Lab Tests", path: "/lab/tests", roles: ["ADMIN"] },
      { label: "New Lab Invoice", path: "/lab/invoices/new", roles: ["ADMIN", "LAB_ASSISTANT"] },
      { label: "Lab Invoices", path: "/lab/invoices", roles: ["ADMIN", "LAB_ASSISTANT"] },
      { label: "Results Queue", path: "/lab/results/queue", roles: ["ADMIN", "LAB_ASSISTANT"] },
    ],
  },
  {
    label: "Pharmacy",
    items: [
      { label: "Inventory", path: "/pharmacy/inventory", roles: ["ADMIN"] },
      { label: "New Pharmacy Invoice", path: "/pharmacy/invoices/new", roles: ["ADMIN"] },
      { label: "Pharmacy Invoices", path: "/pharmacy/invoices", roles: ["ADMIN"] },
      { label: "Stock Report", path: "/pharmacy/reports", roles: ["ADMIN"] },
    ],
  },
  { label: "Rooms & Beds", path: "/rooms-beds", roles: ["ADMIN", "RECEPTIONIST"] },
  { label: "Reports", path: "/reports", roles: ["ADMIN"] },
  { label: "Settings", path: "/settings", roles: ["ADMIN"] },
];

export const ROLE_BADGE_STYLES = {
  ADMIN: "bg-amber-100 text-amber-800",
  DOCTOR: "bg-blue-100 text-blue-800",
  RECEPTIONIST: "bg-emerald-100 text-emerald-800",
  LAB_ASSISTANT: "bg-purple-100 text-purple-800",
};
