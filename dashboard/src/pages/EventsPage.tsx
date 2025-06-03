import { useState, useEffect } from 'react';
import axios from 'axios';
import { parse, isWithinInterval, compareAsc, compareDesc } from 'date-fns';
import EventTable, { type EventRow } from '../components/EventTable/EventTable';
import { exportCsv } from '../utils/exportCsv';

function toTitleCase(str: string) {
  return str.replace(/\b\w/g, (c) => c.toUpperCase());
}
function parseRepoVersion(src: string): number {
  const m = src.match(/(\d+(\.\d+)?)/);
  return m ? parseFloat(m[1]) : NaN;
}

export default function EventsPage() {
  const [allEvents, setAllEvents] = useState<EventRow[]>([]);
  const [filtered,  setFiltered]  = useState<EventRow[]>([]);

  // filter state
  const [eventFilter,  setEventFilter]  = useState('');
  const [ticketFilter, setTicketFilter] = useState('');
  const [startDate,    setStartDate]    = useState('');
  const [endDate,      setEndDate]      = useState('');
  const [uniqueEvents, setUniqueEvents] = useState<string[]>([]);

  // sort + pagination
  const [sortField, setSortField] = useState<keyof EventRow>('ID');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  /* ----------------------------- load JSON ----------------------------- */
  useEffect(() => {
    axios.get<EventRow[]>('/mock-events.json')
         .then(r => {
           setAllEvents(r.data);
           setUniqueEvents(Array.from(new Set(r.data.map(e => e.event))).sort());
           setFiltered(r.data);
         })
         .catch(err => console.error('Failed to load events', err));
  }, []);

  /* ---------------------------- filtering ------------------------------ */
  useEffect(() => {
    let tmp = [...allEvents];

    if (eventFilter)
      tmp = tmp.filter(r => r.event === eventFilter);

    if (ticketFilter)
      tmp = tmp.filter(r =>
        String(r['service-ticket#']).includes(ticketFilter.trim())
      );

    if (startDate || endDate) {
      const start = startDate
        ? parse(startDate + ' 00:00:00', 'yyyy-MM-dd HH:mm:ss', new Date())
        : null;
      const end   = endDate
        ? parse(endDate   + ' 23:59:59', 'yyyy-MM-dd HH:mm:ss', new Date())
        : null;

      tmp = tmp.filter(r => {
        const dt = parse(r['date-time'], 'yyyy-MM-dd HH:mm:ss', new Date());
        if (start && end) return isWithinInterval(dt, { start, end });
        if (start)        return dt >= start;
        if (end)          return dt <= end;
        return true;
      });
    }

    /* ----------------------------- sorting ----------------------------- */
    tmp.sort((a, b) => {
      const aVal = a[sortField];  const bVal = b[sortField];

      if (sortField === 'ID')
        return sortOrder === 'asc'
          ? +aVal - +bVal : +bVal - +aVal;

      if (sortField === 'new-FW-source') {
        const na = parseRepoVersion(String(aVal));
        const nb = parseRepoVersion(String(bVal));
        if (!isNaN(na) && !isNaN(nb))
          return sortOrder === 'asc' ? na - nb : nb - na;
      }

      if (sortField === 'date-time') {
        const da = parse(String(aVal), 'yyyy-MM-dd HH:mm:ss', new Date());
        const db = parse(String(bVal), 'yyyy-MM-dd HH:mm:ss', new Date());
        return sortOrder === 'asc' ? compareAsc(da, db) : compareDesc(da, db);
      }

      const sa = String(aVal).toLowerCase();
      const sb = String(bVal).toLowerCase();
      return sortOrder === 'asc' ? (sa < sb ? -1 : sa > sb ? 1 : 0)
                                 : (sb < sa ? -1 : sb > sa ? 1 : 0);
    });

    setFiltered(tmp);
    setPage(1);
  }, [allEvents, eventFilter, ticketFilter, startDate, endDate, sortField, sortOrder]);

  /* ------------------------- pagination slice -------------------------- */
  const total    = filtered.length;
  const startIdx = (page - 1) * pageSize;
  const endIdx   = Math.min(startIdx + pageSize, total);
  const current  = filtered.slice(startIdx, endIdx);

  function handleSort(field: keyof EventRow) {
    field === sortField ? setSortOrder(o => o === 'asc' ? 'desc' : 'asc')
                        : (setSortField(field), setSortOrder('asc'));
  }

  /* ----------------------------- render ------------------------------- */
  return (
    <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">Firmware Events</h2>

      {/* Filters left, export right */}
      <div className="flex flex-wrap justify-between items-end gap-4 mb-6">

        {/* LEFT: filter controls */}
        <div className="flex flex-wrap items-end gap-4">
          {/* Event dropdown */}
          <div>
            <label className="block text-sm font-medium mb-1">Event</label>
            <select
              value={eventFilter}
              onChange={(e) => setEventFilter(e.target.value)}
              className="border rounded p-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="">All</option>
              {uniqueEvents.map(ev => (
                <option key={ev} value={ev}>{toTitleCase(ev)}</option>
              ))}
            </select>
          </div>

          {/* Ticket search */}
          <div>
            <label className="block text-sm font-medium mb-1">Ticket #</label>
            <input
              type="text"
              value={ticketFilter}
              onChange={e => setTicketFilter(e.target.value)}
              className="border rounded p-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              placeholder="Search Ticket"
            />
          </div>

          {/* Dates */}
          <div>
            <label className="block text-sm font-medium mb-1">Start</label>
            <input type="date" value={startDate}
                   onChange={e => setStartDate(e.target.value)}
                   className="border rounded p-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">End</label>
            <input type="date" value={endDate}
                   onChange={e => setEndDate(e.target.value)}
                   className="border rounded p-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
          </div>
        </div>

        {/* RIGHT: export */}
        <button
          onClick={() => exportCsv(current, 'events.csv')}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded"
        >
          Export CSV
        </button>
      </div>

      <p className="mb-2 text-sm text-gray-600 dark:text-gray-400">
        Showing {startIdx + 1}–{endIdx} of {total} events
      </p>

      <EventTable
        events={current}
        sortField={sortField}
        sortOrder={sortOrder}
        onSortChange={handleSort}
      />

      {/* pagination footer unchanged */}
      <div className="mt-4 flex justify-center lg:justify-between items-center">
        <div className="hidden lg:block text-sm text-gray-600 dark:text-gray-400">
          Page {page}
        </div>
        <div className="flex space-x-2">
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                  className="px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded disabled:opacity-50">Prev</button>
          <button disabled={endIdx >= total} onClick={() => setPage(p => p + 1)}
                  className="px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded disabled:opacity-50">Next</button>
        </div>
      </div>
    </section>
  );
}