import { useEffect, useState } from 'react';
import axios from 'axios';
import type { Host, HostFilters } from '../api/types';
import HostFiltersComponent from '../components/Filters/HostFilters';
import HostTable from '../components/HostTable';

export default function HostsPage() {
  const [allHosts, setAllHosts] = useState<Host[]>([]);
  const [displayedHosts, setDisplayedHosts] = useState<Host[]>([]);
  const [osOptions, setOsOptions] = useState<string[]>([]);
  const [statusOptions, setStatusOptions] = useState<string[]>([]);
  const [vmCountOptions, setVmCountOptions] = useState<number[]>([]);
  const [filters, setFilters] = useState<HostFilters>({});
  const [sortField, setSortField] = useState<keyof Host>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  // Fetch all hosts from /api/hosts
  useEffect(() => {
    const loadHosts = async () => {
      setLoading(true);
      try {
        const res = await axios.get<Host[]>('/api/hosts');
        const hosts = res.data;
        setAllHosts(hosts);

        // Derive filter options
        setOsOptions(Array.from(new Set(hosts.map(h => h.os))).sort());
        setStatusOptions(Array.from(new Set(hosts.map(h => h.status))).sort());
        setVmCountOptions(Array.from(new Set(hosts.map(h => h.vms.length))).sort((a, b) => a - b));
      } catch (err) {
        console.error('Failed to load hosts:', err);
      } finally {
        setLoading(false);
      }
    };
    loadHosts();
  }, []);

  // When hosts or filters or sort/page change, recompute displayed
  useEffect(() => {
    let list = [...allHosts];

    // Apply filters
    if (filters.os) list = list.filter(h => h.os === filters.os);
    if (filters.status) list = list.filter(h => h.status === filters.status);
    if (filters.vmCount !== undefined) list = list.filter(h => h.vms.length === filters.vmCount);

    // Sort
    if (sortField) {
      list.sort((a, b) => {
        const aVal = a[sortField];
        const bVal = b[sortField];
        if (sortField === 'uptime' || sortField === 'cpu' || sortField === 'ram' || sortField === 'disk') {
          return sortOrder === 'asc'
            ? (aVal as number) - (bVal as number)
            : (bVal as number) - (aVal as number);
        }
        if (sortField === 'ssh') {
          return sortOrder === 'asc'
            ? (a.ssh === b.ssh ? 0 : a.ssh ? 1 : -1)
            : (a.ssh === b.ssh ? 0 : a.ssh ? -1 : 1);
        }
        if (sortField === 'vms') {
          // sort by vms.length if vms is selected
          return sortOrder === 'asc'
            ? a.vms.length - b.vms.length
            : b.vms.length - a.vms.length;
        }
        // string fields
        return sortOrder === 'asc'
          ? String(aVal).localeCompare(String(bVal))
          : String(bVal).localeCompare(String(aVal));
      });
    }

    setTotal(list.length);
    const startIdx = (page - 1) * pageSize;
    setDisplayedHosts(list.slice(startIdx, startIdx + pageSize));
  }, [allHosts, filters, sortField, sortOrder, page]);

  const handleRefresh = async () => {
    setPage(1);
    setLoading(true);
    try {
      const res = await axios.get<Host[]>('/api/hosts');
      const hosts = res.data;
      setAllHosts(hosts);
      setOsOptions(Array.from(new Set(hosts.map(h => h.os))).sort());
      setStatusOptions(Array.from(new Set(hosts.map(h => h.status))).sort());
      setVmCountOptions(Array.from(new Set(hosts.map(h => h.vms.length))).sort((a, b) => a - b));
    } catch (err) {
      console.error('Refresh failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">Hosts</h2>
      <div className="flex flex-wrap justify-between items-end gap-4 mb-4">
        <HostFiltersComponent
          filters={filters}
          osOptions={osOptions}
          statusOptions={statusOptions}
          vmCountOptions={vmCountOptions}
          onChange={f => { setPage(1); setFilters(f); }}
        />
        <button
          onClick={handleRefresh}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded"
        >
          Refresh
        </button>
      </div>
      {loading ? (
        <p>Loading hosts…</p>
      ) : (
        <>
          <p className="mb-2 text-sm text-gray-600 dark:text-gray-400">
            Showing {start}–{end} of {total} hosts
          </p>
          <HostTable
            hosts={displayedHosts}
            sortField={sortField}
            sortOrder={sortOrder}
            onSortChange={field => {
              if (field === sortField) {
                setSortOrder(o => (o === 'asc' ? 'desc' : 'asc'));
              } else {
                setSortField(field);
                setSortOrder('asc');
              }
            }}
          />
          <div className="mt-4 flex justify-between items-center">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Page {page} of {Math.ceil(total / pageSize)}
            </div>
            <div className="flex space-x-2">
              <button
                disabled={page === 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded disabled:opacity-50"
              >
                Prev
              </button>
              <button
                disabled={page * pageSize >= total}
                onClick={() => setPage(p => p + 1)}
                className="px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}