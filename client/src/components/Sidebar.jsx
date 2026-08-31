import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { NAV_SECTIONS } from "../roles";

const linkClasses = ({ isActive }) =>
  `block rounded px-3 py-2 text-sm font-medium transition ${
    isActive ? "bg-white text-blue-950" : "text-blue-100 hover:bg-white/10"
  }`;

function usePendingPrescriptionsCount() {
  const { user, authFetch } = useAuth();
  const [count, setCount] = useState(0);

  const eligible = user?.role === "ADMIN" || user?.role === "DOCTOR";

  useEffect(() => {
    if (!eligible) return;

    async function fetchCount() {
      try {
        const res = await authFetch("/prescription/pending");
        if (res.ok) {
          const data = await res.json();
          setCount(Array.isArray(data) ? data.length : 0);
        }
      } catch {
        // network error — leave count unchanged
      }
    }

    fetchCount();
    const interval = setInterval(fetchCount, 60000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eligible]);

  return eligible ? count : 0;
}

export default function Sidebar() {
  const { user } = useAuth();
  const pendingCount = usePendingPrescriptionsCount();

  return (
    <aside className="w-64 h-screen sticky top-0 bg-blue-950 text-white flex flex-col shrink-0 overflow-y-auto">
      <div className="px-6 py-5 border-b border-white/10 shrink-0">
        <h1 className="text-lg font-semibold leading-tight">Al-Shifa</h1>
        <p className="text-xs text-blue-200">Diagnostic Centre</p>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-4">
        {NAV_SECTIONS.map((section) => {
          if (section.items) {
            const visibleItems = section.items.filter((item) => item.roles.includes(user.role));
            if (visibleItems.length === 0) return null;
            return (
              <div key={section.label}>
                <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-blue-300 mb-1">
                  {section.label}
                </p>
                <div className="space-y-1">
                  {visibleItems.map((item) => (
                    <NavLink key={item.path} to={item.path} className={linkClasses}>
                      <span className="flex items-center justify-between">
                        <span>{item.label}</span>
                        {item.badge === "pendingPrescriptions" && pendingCount > 0 && (
                          <span className="bg-amber-400 text-blue-950 text-[10px] font-bold rounded-full px-1.5 py-0.5 min-w-[18px] text-center leading-none">
                            {pendingCount}
                          </span>
                        )}
                      </span>
                    </NavLink>
                  ))}
                </div>
              </div>
            );
          }

          if (!section.roles.includes(user.role)) return null;
          return (
            <NavLink key={section.path} to={section.path} className={linkClasses}>
              {section.label}
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}
