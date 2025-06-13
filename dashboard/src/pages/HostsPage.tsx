import { useEffect, useState } from 'react';
import type { Host, HostFilters } from '../api/types';
import HostFiltersComponent from '../components/Filters/HostFilters';
import HostTable from '../components/HostTable';
import HostDetailModal from '../components/HostDetailModal';
import { useRealTimeContext } from '../context/RealTimeContext';

function compareHostnames(a: string, b: string) {
  const hostRegex = /^([a-zA-Z]+)(\d+)$/;
  const m1 = a.match(hostRegex);
  const m2 = b.match(hostRegex);
  if (m1 && m2 && m1[1] === m2[1]) {
    return Number(m1[2]) - Number(m2[2]);
  }
  return a.localeCompare(b);
}

export default function HostsPage() {
  const { hosts: allHosts } = useRealTimeContext();

  const [displayedHosts, setDisplayedHosts] = useState<Host[]>([]);
  const [osOptions, setOsOptions] = useState<string[]>([]);
  const [statusOptions, setStatusOptions] = useState<string[]>([]);
  const [vmCountOptions, setVmCountOptions] = useState<number[]>([]);

  const [filters, setFilters] = useState<HostFilters>({});
  const [sortField, setSortField] = useState<keyof Host>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const pageSize = 15;
  const [total, setTotal] = useState(0);

  const [selectedHost, setSelectedHost] = useState<Host | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  // Extract options once hosts are available
  useEffect(() => {
    setOsOptions(Array.from(new Set(allHosts.map((h) => h.os))).sort());
    setStatusOptions(Array.from(new Set(allHosts.map((h) => h.status))).sort());
    setVmCountOptions(
      Array.from(new Set(allHosts.map((h) => h.vms?.length ?? 0))).sort((a, b) => a - b)
    );
  }, [allHosts]);

  // Filtering, sorting, pagination
  useEffect(() => {
    let list = [...allHosts];

    if (filters.os) list = list.filter((h) => h.os === filters.os);
    if (filters.status) list = list.filter((h) => h.status === filters.status);
    if (filters.vmCount !== undefined)
      list = list.filter((h) => (h.vms?.length ?? 0) === filters.vmCount);

    list.sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];

      if (sortField === 'uptime' || sortField === 'cpu' || sortField === 'ram' || sortField === 'disk') {
        return sortOrder === 'asc'
          ? (aVal as number) - (bVal as number)
          : (bVal as number) - (aVal as number);
      }

      if (sortField === 'name') {
        const cmp = compareHostnames(a.name, b.name);
        return sortOrder === 'asc' ? cmp : -cmp;
      }

      if (sortField === 'ssh') {
        return sortOrder === 'asc'
          ? a.ssh === b.ssh
            ? 0
            : a.ssh
            ? 1
            : -1
          : a.ssh === b.ssh
          ? 0
          : a.ssh
          ? -1
          : 1;
      }

      if (sortField === 'vms') {
        const aLen = a.vms?.length ?? 0;
        const bLen = b.vms?.length ?? 0;
        return sortOrder === 'asc' ? aLen - bLen : bLen - aLen;
      }

      const aStr = String(aVal);
      const bStr = String(bVal);
      return sortOrder === 'asc'
        ? aStr.localeCompare(bStr)
        : bStr.localeCompare(aStr);
    });

    setTotal(list.length);
    const startIdx = (page - 1) * pageSize;
    setDisplayedHosts(list.slice(startIdx, startIdx + pageSize));
  }, [allHosts, filters, sortField, sortOrder, page]);

  const handleRowClick = (host: Host) => {
    setSelectedHost(host);
    setModalVisible(true);
  };

  const handleHostSave = () => {
    setModalVisible(false);
    // SSE will auto-update the UI
  };

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <>
      <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-100">
          Hosts
        </h2>

        <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
          <HostFiltersComponent
            filters={filters}
            osOptions={osOptions}
            statusOptions={statusOptions}
            vmCountOptions={vmCountOptions}
            onChange={(f) => {
              setPage(1);
              setFilters(f);
            }}
          />
          <button
            disabled
            className="px-4 py-2 bg-indigo-400 text-white rounded-lg opacity-60 cursor-not-allowed"
            title="Auto-refresh enabled"
          >
            Refresh
          </button>
        </div>

        <>
          <p className="mb-2 text-sm text-gray-600 dark:text-gray-400">
            Showing {start}–{end} of {total} hosts
          </p>
          <HostTable
            hosts={displayedHosts}
            sortField={sortField}
            sortOrder={sortOrder}
            onSortChange={(field) => {
              if (field === sortField) {
                setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
              } else {
                setSortField(field);
                setSortOrder('asc');
              }
            }}
            onRowClick={handleRowClick}
          />

          <div className="mt-4 flex justify-between items-center">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Page {page} of {Math.ceil(total / pageSize)}
            </div>
            <div className="flex space-x-2">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded-lg disabled:opacity-50"
              >
                Prev
              </button>
              <button
                disabled={page * pageSize >= total}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded-lg disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </>
      </section>

      {modalVisible && selectedHost && (
        <HostDetailModal
          host={selectedHost}
          onClose={() => setModalVisible(false)}
          onSave={handleHostSave}
        />
      )}
    </>
  );
}