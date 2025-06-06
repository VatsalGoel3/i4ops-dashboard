import type { HostFilters } from '../../api/types';

interface Props {
  filters: HostFilters;
  osOptions: string[];
  statusOptions: string[];
  vmCountOptions: number[];
  onChange: (f: HostFilters) => void;
}

export default function HostFiltersComponent({
  filters,
  osOptions,
  statusOptions,
  vmCountOptions,
  onChange,
}: Props) {
  return (
    <div className="flex flex-wrap gap-4">
      {/* OS Filter */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          OS
        </label>
        <select
          className="mt-1 block w-36 px-2 py-1 bg-white dark:bg-gray-700 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring focus:border-indigo-300"
          value={filters.os || ''}
          onChange={(e) => onChange({ ...filters, os: e.target.value || undefined })}
        >
          <option value="">All</option>
          {osOptions.map((os) => (
            <option key={os} value={os}>
              {os}
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
            onChange({ ...filters, status: e.target.value || undefined })
          }
        >
          <option value="">All</option>
          {statusOptions.map((st) => (
            <option key={st} value={st}>
              {st.charAt(0).toUpperCase() + st.slice(1)}
            </option>
          ))}
        </select>
      </div>

      {/* VM Count Filter */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          VM Count
        </label>
        <select
          className="mt-1 block w-24 px-2 py-1 bg-white dark:bg-gray-700 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring focus:border-indigo-300"
          value={filters.vmCount !== undefined ? filters.vmCount.toString() : ''}
          onChange={(e) =>
            onChange({
              ...filters,
              vmCount: e.target.value ? Number(e.target.value) : undefined,
            })
          }
        >
          <option value="">All</option>
          {vmCountOptions.map((count) => (
            <option key={count} value={count}>
              {count}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}