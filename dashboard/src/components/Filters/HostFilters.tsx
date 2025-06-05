import type { HostFilters } from '../../api/types';

interface Props {
  filters: HostFilters;
  onChange: (f: HostFilters) => void;
  osOptions: string[];
  statusOptions: string[];
  vmCountOptions: number[];
}

export default function HostFilters({
  filters,
  onChange,
  osOptions,
  statusOptions,
  vmCountOptions
}: Props) {
  return (
    <div className="flex space-x-4">
      {/* OS Filter */}
      <div>
        <label className="block text-sm font-medium mb-1">OS</label>
        <select
          className="border rounded p-1 text-sm"
          value={filters.os || ''}
          onChange={e =>
            onChange({ ...filters, os: e.target.value || undefined })
          }
        >
          <option value="">All</option>
          {osOptions.map(os => (
            <option key={os} value={os}>
              {os}
            </option>
          ))}
        </select>
      </div>

      {/* Status Filter */}
      <div>
        <label className="block text-sm font-medium mb-1">Status</label>
        <select
          className="border rounded p-1 text-sm"
          value={filters.status || ''}
          onChange={e =>
            onChange({ ...filters, status: e.target.value || undefined })
          }
        >
          <option value="">All</option>
          {statusOptions.map(status => (
            <option key={status} value={status}>
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </option>
          ))}
        </select>
      </div>

      {/* VM Count Filter */}
      <div>
        <label className="block text-sm font-medium mb-1">VM Count</label>
        <select
          className="border rounded p-1 text-sm"
          value={filters.vmCount !== undefined ? String(filters.vmCount) : ''}
          onChange={e => {
            const val = e.target.value;
            onChange({
              ...filters,
              vmCount: val !== '' ? parseInt(val, 10) : undefined
            });
          }}
        >
          <option value="">All</option>
          {vmCountOptions.map(count => (
            <option key={count} value={count}>
              {count}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}