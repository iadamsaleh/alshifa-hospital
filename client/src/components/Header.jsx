import { useAuth } from "../context/AuthContext";
import { ROLE_BADGE_STYLES } from "../roles";
import { HOSPITAL_NAME } from "../constants/hospital";

export default function Header() {
  const { user, logout } = useAuth();

  return (
    <header className="h-16 shrink-0 bg-white border-b border-slate-200 flex items-center justify-between px-6">
      <h1 className="text-base font-semibold text-slate-800">{HOSPITAL_NAME}</h1>

      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="text-sm font-medium text-slate-800 leading-tight">{user.name}</p>
          <span
            className={`inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full ${ROLE_BADGE_STYLES[user.role] || "bg-slate-100 text-slate-700"}`}
          >
            {user.role.replace("_", " ")}
          </span>
        </div>
        <button
          onClick={logout}
          className="text-sm font-medium text-white bg-blue-950 hover:bg-blue-900 rounded px-3 py-1.5 transition"
        >
          Log out
        </button>
      </div>
    </header>
  );
}
