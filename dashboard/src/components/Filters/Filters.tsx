import type { DeviceFilters } from '../../api/useDevices';

interface Props {
  filters: DeviceFilters;
  onChange: (f: DeviceFilters) => void;
  factories: string[];
  statuses: string[];
}

export default function Filters({ filters, onChange, factories, statuses }: Props) {
  const toTitleCase = (s: string) => s.replace(/\b\w/g, c => c.toUpperCase());

  return (
    <div className="flex space-x-4 mb-4">
      {/* Factory Filter */}
      <div>
        <label className="block text-sm font-medium mb-1">Factory</label>
        <select
          className="border rounded p-1"
          value={filters.factory || ''}
          onChange={e =>
            onChange({ ...filters, factory: e.target.value || undefined })
          }
        >
          <option value="">All</option>
          {factories.map(f => (
            <option key={f} value={f}>
              {toTitleCase(f)}
            </option>
          ))}
        </select>
      </div>

      {/* Status Filter */}
      <div>
        <label className="block text-sm font-medium mb-1">Status</label>
        <select
          className="border rounded p-1"
          value={filters.status || ''}
          onChange={e =>
            onChange({
              ...filters,
              status: (e.target.value as DeviceFilters['status']) || undefined,
            })
          }
        >
          <option value="">All</option>
          {statuses.map(s => (
            <option key={s} value={s}>
              {toTitleCase(s)}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}