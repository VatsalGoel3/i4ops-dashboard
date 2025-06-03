import { useEffect, useState } from 'react';
import axios from 'axios';
import { useDevices, type Device, type DeviceFilters } from '../api/useDevices';
import Filters      from '../components/Filters/Filters';
import DeviceTable  from '../components/DeviceTable/DeviceTable';
import AlertBanner  from '../components/AlertBanner';
import { exportCsv } from '../utils/exportCsv';

export default function DevicesPage() {
  const [page, setPage]      = useState(1);
  const [filters, setFilters]= useState<DeviceFilters>({});
  const [sortField, setSortField] = useState<keyof Device>('dev_name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const [allDevices, setAll] = useState<Device[]>([]);
  const [factories, setFactories] = useState<string[]>([]);
  const [statuses,  setStatuses]  = useState<string[]>([]);

  /* ------------- load devices JSON once ---------------- */
  useEffect(() => {
    axios.get<Device[]>('/mock-devices.json').then(r => {
      setAll(r.data);
      setFactories([...new Set(r.data.map(d => d.factory))].sort());
      setStatuses([...new Set(r.data.map(d => d.dev_status))].sort());
    });
  }, []);

  /* ------------- paging hook (filtered slice) ---------- */
  const { devices, total, loading } = useDevices(
    page, 10, filters, sortField, sortOrder
  );

  const start = (page - 1) * 10 + 1;
  const end   = Math.min(page * 10, total);

  /* ------------------------ render --------------------- */
  return (
    <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">Devices</h2>

      <AlertBanner devices={allDevices} staleThresholdMinutes={30} />

      {/* Filters left, export right */}
      <div className="flex flex-wrap justify-between items-end gap-4 mb-4">
        <Filters
          filters={filters}
          factories={factories}
          statuses={statuses}
          onChange={f => { setPage(1); setFilters(f); }}
        />

        <button
          onClick={() => exportCsv(devices, 'devices.csv')}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded"
        >
          Export CSV
        </button>
      </div>

      {loading ? (
        <p>Loading…</p>
      ) : (
        <>
          <p className="mb-2 text-sm text-gray-600 dark:text-gray-400">
            Showing {start}–{end} of {total} devices
          </p>

          <DeviceTable
            devices={devices}
            sortField={sortField}
            sortOrder={sortOrder}
            onSortChange={field => {
              field === sortField
                ? setSortOrder(o => (o === 'asc' ? 'desc' : 'asc'))
                : (setSortField(field), setSortOrder('asc'));
            }}
          />

          <div className="mt-4 flex justify-center lg:justify-between items-center">
            <div className="hidden lg:block text-sm text-gray-600 dark:text-gray-400">
              Page {page}
            </div>
            <div className="flex space-x-2">
              <button disabled={page === 1}
                      onClick={() => setPage(p => p - 1)}
                      className="px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded disabled:opacity-50">Prev</button>
              <button disabled={page * 10 >= total}
                      onClick={() => setPage(p => p + 1)}
                      className="px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded disabled:opacity-50">Next</button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}