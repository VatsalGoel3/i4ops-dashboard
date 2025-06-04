import type { VMFilters } from '../../api/types';

interface Props {
  filters: VMFilters;
  onChange: (f: VMFilters) => void;
  hostOptions: string[];
  statusOptions: string[];
}

export default function VMFilters({ filters, onChange, hostOptions, statusOptions }: Props) {
  return (
    <div className="flex space-x-4">
      {/* Host Filter */}
      <div>
        <label className="block text-sm font-medium mb-1">Host</label>
        <select
          className="border rounded p-1 text-sm"
          value={filters.host || ''}
          onChange={(e) =>
            onChange({ ...filters, host: e.target.value || undefined })
          }
        >
          <option value="">All</option>
          {hostOptions.map(host => (
            <option key={host} value={host}>
              {host}
            </option>
          ))}
        </select>
      </div>

      {/* Status Filter */}
      <div>
        <label className="block text-sm font-medium mb-1">VM Status</label>
        <select
          className="border rounded p-1 text-sm"
          value={filters.status || ''}
          onChange={(e) =>
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

      {/* VM Name Filter */}
      <div>
        <label className="block text-sm font-medium mb-1">VM Name</label>
        <input
          type="text"
          className="border rounded p-1 text-sm"
          placeholder="Search name..."
          value={filters.name || ''}
          onChange={(e) =>
            onChange({ ...filters, name: e.target.value || undefined })
          }
        />
      </div>
    </div>
  );
}