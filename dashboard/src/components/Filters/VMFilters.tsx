import type { VMFilters } from '../../api/types';

interface Props {
  filters: VMFilters;
  hostOptions: { name: string; id: number }[];
  statusOptions: ('running' | 'stopped' | 'offline')[];
  onChange: (f: VMFilters) => void;
}

export default function VMFiltersComponent({
  filters,
  hostOptions,
  statusOptions,
  onChange,
}: Props) {
  return (
    <div className="flex flex-wrap gap-4">
      {/* Host Filter */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Host
        </label>
        <select
          className="mt-1 block w-36 px-2 py-1 bg-white dark:bg-gray-700 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring focus:border-indigo-300"
          value={filters.hostId !== undefined ? filters.hostId.toString() : ''}
          onChange={(e) =>
            onChange({ ...filters, hostId: e.target.value ? Number(e.target.value) : undefined })
          }
        >
          <option value="">All Hosts</option>
          {hostOptions.map((h) => (
            <option key={h.id} value={h.id}>
              {h.name}
            </option>
          ))}
        </select>
      </div>

      {/* Status Filter */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Status
        </label>
        <select
          className="mt-1 block w-36 px-2 py-1 bg-white dark:bg-gray-700 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring focus:border-indigo-300"
          value={filters.status || ''}
          onChange={(e) =>
            onChange({ ...filters, status: (e.target.value as 'running' | 'stopped' | 'offline') || undefined })
          }
        >
          <option value="">All Status</option>
          {statusOptions.map((st) => (
            <option key={st} value={st}>
              {st.toUpperCase()}
            </option>
          ))}
        </select>
      </div>

      {/* VM Name Search */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Name
        </label>
        <input
          type="text"
          className="mt-1 block w-36 px-2 py-1 bg-white dark:bg-gray-700 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring focus:border-indigo-300"
          placeholder="Search VMs…"
          value={filters.name || ''}
          onChange={(e) => onChange({ ...filters, name: e.target.value || undefined })}
        />
      </div>
    </div>
  );
}