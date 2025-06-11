import { useEffect, useState } from 'react';
import axios from 'axios';
import HostStatusPie from '../components/charts/HostStatusPie';
import HostUptimeHistory from '../components/charts/HostUptimeHistory';
import TopVMsChart from '../components/charts/TopVMsChart';
import HostKPI from '../components/HostKPI';
import type { Host } from '../api/types';

export default function Dashboard() {
  const [hosts, setHosts] = useState<Host[]>([]);
  const [stageCounts, setStageCounts] = useState<Record<string, number>>({});
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const loadHostData = async () => {
    try {
      const res = await axios.get<{ data: Host[]; total: number }>('http://localhost:4000/api/hosts');
      const hostsData = res.data.data; // ✅ correctly extract host array
      setHosts(hostsData);

      const counts: Record<string, number> = {};
      hostsData.forEach((h) => {
        const raw = h.pipelineStage?.trim().toLowerCase() || 'unassigned';
        const stage = ['unassigned', 'active', 'reserved', 'staging', 'installing', 'broken'].includes(raw)
          ? raw
          : 'unassigned';
        counts[stage] = (counts[stage] || 0) + 1;
      });

      setStageCounts(counts);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Failed to load hosts:', err);
    }
  };

  useEffect(() => {
    loadHostData();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <header className="flex items-center justify-between px-6 py-4 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <h1 className="text-2xl font-semibold">Infrastructure Overview</h1>
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {lastUpdated && (
            <span>
              Last updated:{' '}
              {lastUpdated.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          )}
        </div>
      </header>

      <main className="p-6 space-y-8">
        {/* ── Pipeline Stage Summary ───────────────────── */}
        <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <h2 className="text-lg font-semibold mb-2 text-gray-800 dark:text-gray-100">
            Pipeline Stage Summary
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {Object.entries(stageCounts).map(([stage, count]) => (
              <div
                key={stage}
                className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 flex flex-col items-center"
              >
                <span className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
                  {count}
                </span>
                <span className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                  {stage.charAt(0).toUpperCase() + stage.slice(1)}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* ── Host KPIs ─────────────────────────────── */}
        <HostKPI hosts={hosts} />

        {/* ── Host & VM Charts ───────────────────────── */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <h2 className="text-lg font-semibold mb-2 text-gray-800 dark:text-gray-100">
              Hosts by Status
            </h2>
            <HostStatusPie hosts={hosts} />
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <h2 className="text-lg font-semibold mb-2 text-gray-800 dark:text-gray-100">
              Host Uptime – Last 5 Polls
            </h2>
            <HostUptimeHistory />
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <h2 className="text-lg font-semibold mb-2 text-gray-800 dark:text-gray-100">
              Top VMs by CPU
            </h2>
            <TopVMsChart hosts={hosts} />
          </div>
        </section>
      </main>
    </div>
  );
}