import type { VMFilters } from '../../api/types';

interface Props {
  filters: VMFilters;
  onChange: (f: VMFilters) => void;
  hostOptions: { id: number; name: string }[];
  statusOptions: string[];
}

export default function VMFilters({
  filters,
  onChange,
  hostOptions,
  statusOptions
}: Props) {
  return (
    <div className="flex space-x-4">
      {/* Host Filter */}
      <div>
        <label className="block text-sm font-medium mb-1">Host</label>
        <select
          className="border rounded p-1 text-sm"
          value={filters.hostId !== undefined ? String(filters.hostId) : ''}
          onChange={e =>
            onChange({
              ...filters,
              hostId: e.target.value ? Number(e.target.value) : undefined
            })
          }
        >
          <option value="">All</option>
          {hostOptions.map(h => (
            <option key={h.id} value={h.id}>
              {h.name}
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
          {statusOptions.map(s => (
            <option key={s} value={s}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
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
          onChange={e =>
            onChange({ ...filters, name: e.target.value || undefined })
          }
        />
      </div>
    </div>
  );
}