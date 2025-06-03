import { format, parse } from 'date-fns';
export interface EventRow {
  'ID': number;
  'event': string;
  'service-ticket#': number | string;
  'FW-prior': string;
  'new-FW-source': string;
  'FW-now': string;
  'date-time': string; // e.g. "2025-05-14 00:20:24"
}

interface Props {
  events: EventRow[];
  sortField: keyof EventRow;
  sortOrder: 'asc' | 'desc';
  onSortChange: (field: keyof EventRow) => void;
}

/**
 * Helper: Title-case a string (e.g. "replace device" → "Replace Device")
 */
function toTitleCase(str: string) {
  return str.replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function EventTable({
  events,
  sortField,
  sortOrder,
  onSortChange,
}: Props) {
  const SortIcon = (field: keyof EventRow) =>
    sortField === field ? (sortOrder === 'asc' ? '▲' : '▼') : '';

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full table-auto border-collapse">
        <thead className="bg-gray-50 dark:bg-gray-700">
          <tr>
            <th
              className="px-4 py-2 text-center cursor-pointer"
              onClick={() => onSortChange('ID')}
            >
              ID {SortIcon('ID')}
            </th>
            <th
              className="px-4 py-2 text-center cursor-pointer"
              onClick={() => onSortChange('event')}
            >
              Event {SortIcon('event')}
            </th>
            <th
              className="px-4 py-2 text-left cursor-pointer"
              onClick={() => onSortChange('service-ticket#')}
            >
              Service Ticket # {SortIcon('service-ticket#')}
            </th>
            <th
              className="px-4 py-2 text-center cursor-pointer"
              onClick={() => onSortChange('FW-prior')}
            >
              FW Prior {SortIcon('FW-prior')}
            </th>
            <th
              className="px-4 py-2 text-center cursor-pointer"
              onClick={() => onSortChange('new-FW-source')}
            >
              New FW Source {SortIcon('new-FW-source')}
            </th>
            <th
              className="px-4 py-2 text-center cursor-pointer"
              onClick={() => onSortChange('FW-now')}
            >
              FW Now {SortIcon('FW-now')}
            </th>
            <th
              className="px-4 py-2 text-right cursor-pointer"
              onClick={() => onSortChange('date-time')}
            >
              Date-Time {SortIcon('date-time')}
            </th>
          </tr>
        </thead>

        <tbody>
          {events.map((row) => {
            // Parse "yyyy-MM-dd HH:mm:ss" into a Date
            const parsed = parse(
              row['date-time'],
              'yyyy-MM-dd HH:mm:ss',
              new Date()
            );

            return (
              <tr
                key={row['ID']}
                className="border-t hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <td className="px-4 py-2 text-center">{row['ID']}</td>
                <td className="px-4 py-2 text-center">
                  {toTitleCase(row['event'])}
                </td>
                <td className="px-4 py-2 text-left">
                  {row['service-ticket#']}
                </td>
                <td className="px-4 py-2 text-center">{row['FW-prior']}</td>
                <td className="px-4 py-2 text-center">
                  {toTitleCase(row['new-FW-source'])}
                </td>
                <td className="px-4 py-2 text-center">{row['FW-now']}</td>
                <td
                  className="px-4 py-2 text-right"
                  title={format(parsed, 'PPpp')}
                >
                  {format(parsed, 'yyyy-MM-dd HH:mm')}
                </td>
              </tr>
            );
          })}

          {events.length === 0 && (
            <tr>
              <td colSpan={7} className="px-4 py-6 text-center text-gray-500">
                No events to display.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}