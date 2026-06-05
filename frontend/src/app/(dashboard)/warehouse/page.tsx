'use client';

const MOVEMENT_LOG = [
  {
    action: 'RECEIVED',
    location: 'Receiving Dock B',
    time: 'Jun 14, 10:00 AM',
  },
  {
    action: 'INSPECTED',
    location: 'Inspection Area B',
    time: 'Jun 14, 11:30 AM',
  },
  {
    action: 'PLACED',
    location: 'Zone B, Aisle 12, Rack 4, Level 2',
    time: 'Jun 14, 1:00 PM',
  },
];

export default function WarehousePage() {
  return (
    <div>
      {/* Header */}
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#07172E]">Warehouse</h2>
          <p className="mt-1 text-sm text-gray-500">
            Inventory, storage locations and movement history
          </p>
        </div>
        <button
          disabled
          title="Coming Soon"
          className="cursor-not-allowed rounded-lg bg-gray-200 px-4 py-2 text-sm font-semibold text-gray-500"
        >
          + New Intake
        </button>
      </div>

      {/* Entry card */}
      <div className="max-w-2xl rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <div className="text-lg font-bold text-[#07172E]">
              Acme International Export LLC
            </div>
            <div className="mt-0.5 text-sm text-gray-500">
              Batch: BATCH-2025-0612-A · Lot: LOT-4421-B
            </div>
          </div>
          <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">
            IN STORAGE
          </span>
        </div>

        {/* Detail grid */}
        <div className="grid grid-cols-1 gap-4 border-t border-gray-100 pt-4 sm:grid-cols-2">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
              Location
            </div>
            <div className="mt-0.5 text-sm font-medium text-gray-800">
              Zone B, Aisle 12, Rack 4, Level 2
            </div>
          </div>
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
              Cargo
            </div>
            <div className="mt-0.5 text-sm font-medium text-gray-800">
              12 pallets · 8,400 kg · Temp: 15–25°C
            </div>
          </div>
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
              Storage Period
            </div>
            <div className="mt-0.5 text-sm font-medium text-gray-800">
              Jun 14 → Jul 14, 2025
            </div>
          </div>
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
              Hazmat
            </div>
            <div className="mt-0.5">
              <span className="inline-block rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-bold text-red-700">
                ☢️ Class 3 · UN1219 · ISOPROPANOL
              </span>
            </div>
          </div>
        </div>

        {/* Movement log */}
        <div className="mt-6 border-t border-gray-100 pt-4">
          <div className="mb-3 text-sm font-semibold text-[#07172E]">
            Movement Log
          </div>
          <ul>
            {MOVEMENT_LOG.map((m, i) => (
              <li key={m.action} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-green-500 text-[10px] text-white">
                    ✓
                  </span>
                  {i < MOVEMENT_LOG.length - 1 && (
                    <span className="my-1 w-px flex-1 bg-gray-200" />
                  )}
                </div>
                <div className="pb-4">
                  <div className="text-sm font-bold text-[#07172E]">
                    {m.action}
                  </div>
                  <div className="text-xs text-gray-500">
                    {m.location} — {m.time}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <p className="mt-4 text-xs italic text-gray-400">
        Full warehouse management (intake, picking, releases) is coming soon.
      </p>
    </div>
  );
}
