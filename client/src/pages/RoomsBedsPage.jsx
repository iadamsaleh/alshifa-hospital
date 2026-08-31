import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function RoomsBedsPage() {
  const { user, authFetch } = useAuth();
  const navigate = useNavigate();
  const canDischarge = user.role === "ADMIN" || user.role === "RECEPTIONIST";

  const [rooms, setRooms] = useState([]);
  const [activeAdmissions, setActiveAdmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  async function load() {
    try {
      const [roomsRes, admissionsRes] = await Promise.all([
        authFetch("/rooms"),
        authFetch("/admissions/active"),
      ]);
      if (!roomsRes.ok) throw new Error("Failed to load rooms");
      setRooms(await roomsRes.json());
      setActiveAdmissions(admissionsRes.ok ? await admissionsRes.json() : []);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function admissionForBed(bedId) {
    return activeAdmissions.find((a) => a.bedId === bedId);
  }

  return (
    <div className="p-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-800">Rooms &amp; Beds</h1>
        <p className="text-slate-500 text-sm">Room and bed occupancy across the centre.</p>
      </header>

      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

      {loading ? (
        <p className="text-slate-500 text-sm">Loading...</p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rooms.map((room) => (
            <div key={room.id} className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-slate-800">
                  Room {room.roomNumber} <span className="text-xs text-slate-500">({room.type})</span>
                </p>
                <p className="text-xs text-slate-500">
                  {room.availableBeds}/{room.totalBeds} available
                </p>
              </div>
              <div className="grid gap-2">
                {room.beds.map((bed) => {
                  const admission = bed.isOccupied ? admissionForBed(bed.id) : null;
                  return (
                    <div
                      key={bed.id}
                      className={`rounded border px-3 py-2 text-sm ${
                        bed.isOccupied ? "border-amber-200 bg-amber-50" : "border-emerald-200 bg-emerald-50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-slate-800">{bed.bedNumber}</p>
                        <span
                          className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                            bed.isOccupied ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"
                          }`}
                        >
                          {bed.isOccupied ? "Occupied" : "Available"}
                        </span>
                      </div>
                      {admission && (
                        <div className="mt-1.5 flex items-center justify-between">
                          <p className="text-xs text-slate-600">
                            {admission.patient.name} ({admission.patient.patientId})
                          </p>
                          {canDischarge && (
                            <button
                              type="button"
                              onClick={() => navigate(`/admissions/${admission.id}/discharge`)}
                              className="bg-blue-950 text-white rounded px-2 py-1 text-[11px] font-medium hover:bg-blue-900"
                            >
                              Discharge
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
