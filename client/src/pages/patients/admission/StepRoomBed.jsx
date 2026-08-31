import { useEffect, useState } from "react";
import { useAuth } from "../../../context/AuthContext";

export default function StepRoomBed({ value, onChange, onBack, onNext }) {
  const { authFetch } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    authFetch("/rooms")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load rooms");
        return res.json();
      })
      .then(setRooms)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function selectBed(room, bed) {
    onChange({ roomId: room.id, bedId: bed.id, roomLabel: `${room.roomNumber} (${room.type})`, bedLabel: bed.bedNumber });
  }

  return (
    <section className="bg-white rounded-lg shadow p-6 max-w-2xl">
      <h2 className="text-lg font-semibold text-slate-800 mb-1">Room & Bed</h2>
      <p className="text-slate-500 text-sm mb-4">Select an available bed for this patient.</p>

      {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
      {loading ? (
        <p className="text-slate-500 text-sm">Loading rooms...</p>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {rooms.map((room) => (
            <div key={room.id} className="border border-slate-200 rounded p-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-slate-800">
                  Room {room.roomNumber} <span className="text-xs text-slate-500">({room.type})</span>
                </p>
                <p className="text-xs text-slate-500">
                  {room.availableBeds}/{room.totalBeds} available
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {room.beds.map((bed) => (
                  <button
                    type="button"
                    key={bed.id}
                    disabled={bed.isOccupied}
                    onClick={() => selectBed(room, bed)}
                    className={`text-xs rounded px-2 py-1 border transition ${
                      bed.isOccupied
                        ? "border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed"
                        : value.bedId === bed.id
                          ? "border-blue-950 bg-blue-950 text-white"
                          : "border-slate-300 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {bed.bedNumber}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-between mt-4">
        <button
          type="button"
          onClick={onBack}
          className="bg-slate-100 hover:bg-slate-200 text-slate-700 rounded px-4 py-2 font-medium"
        >
          Back
        </button>
        <button
          type="button"
          disabled={!value.bedId}
          onClick={onNext}
          className="bg-blue-950 text-white rounded px-4 py-2 font-medium hover:bg-blue-900 disabled:opacity-50"
        >
          Next: Confirmation
        </button>
      </div>
    </section>
  );
}
