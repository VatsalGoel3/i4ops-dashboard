import { useEffect, useState } from 'react';
import axios from 'axios';
import StatusPie from '../components/charts/StatusPie';
import FirmwareBar from '../components/charts/FirmwareBar';
import UptimeTrend from '../components/charts/UptimeTrend';
import EventTrend from '../components/charts/EventTrend';
import EventDistribution from '../components/charts/EventDistribution';
import FirmwareRollout from '../components/charts/FirmwareRollout';
import HostStatusPie from '../components/charts/HostStatusPie';
import CpuTrend from '../components/charts/CpuTrend';
import TopVMsChart from '../components/charts/TopVMsChart';
import KpiCards from '../components/KPIStats';
import HostKPI from '../components/HostKPI';
import type { Host } from '../api/types';

interface EventRow {
  event: string;
}

export default function Dashboard() {
  const [devices, setDevices] = useState<any[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [hosts, setHosts] = useState<Host[]>([]);
  const [stageCounts, setStageCounts] = useState<Record<string, number>>({});
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const [devicesRes, eventsRes] = await Promise.all([
          axios.get('/mock-devices.json'),
          axios.get('/mock-events.json')
        ]);
        setDevices(devicesRes.data);
        setEvents(eventsRes.data);

        const hostRes = await axios.get<Host[]>('/api/hosts');
        const hostsData = hostRes.data;
        setHosts(hostsData);

        const counts: Record<string, number> = {};
        hostsData.forEach(h => {
          const stage = h.pipelineStage || 'unassigned';
          counts[stage] = (counts[stage] || 0) + 1;
        });
        setStageCounts(counts);

        setLastUpdated(new Date());
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      }
    };
    loadDashboardData();
  }, []);

  const handleRefreshAll = async () => {
    try {
      const [devicesRes, eventsRes, hostRes] = await Promise.all([
        axios.get('/mock-devices.json'),
        axios.get('/mock-events.json'),
        axios.get<Host[]>('/api/hosts')
      ]);
      setDevices(devicesRes.data);
      setEvents(eventsRes.data);
      const hostsData = hostRes.data;
      setHosts(hostsData);

      const counts: Record<string, number> = {};
      hostsData.forEach(h => {
        const stage = h.pipelineStage || 'unassigned';
        counts[stage] = (counts[stage] || 0) + 1;
      });
      setStageCounts(counts);

      setLastUpdated(new Date());
    } catch (err) {
      console.error('Failed to refresh all data:', err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <header className="h-16 flex items-center px-4 shadow-md bg-white dark:bg-gray-800">
        <h1 className="text-xl font-semibold">Infrastructure Overview</h1>
        <button
          onClick={handleRefreshAll}
          className="ml-auto px-3 py-1 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded"
        >
          Refresh All
        </button>
        {lastUpdated && (
          <span className="ml-4 text-xs text-gray-600 dark:text-gray-400">
            Last updated: {lastUpdated.toLocaleString()}
          </span>
        )}
      </header>

      <main className="p-6 space-y-8">
        {/* ── Pipeline Stage Summary ───────────────────── */}
        <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <h2 className="text-lg font-semibold mb-2">Pipeline Stage Summary</h2>
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

        {/* ── Firmware KPIs (existing) ──────────────── */}
        <KpiCards devices={devices} events={events} />

        {/* ── Device Charts ─────────────────────────── */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <h2 className="text-lg font-semibold mb-2">Status Summary</h2>
            <StatusPie devices={devices} />
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <h2 className="text-lg font-semibold mb-2">Firmware Distribution</h2>
            <FirmwareBar devices={devices} />
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <h2 className="text-lg font-semibold mb-2">Uptime Trend</h2>
            <UptimeTrend />
          </div>
        </section>

        {/* ── Event Charts ──────────────────────────── */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <h2 className="text-lg font-semibold mb-2">Event Trends</h2>
            <EventTrend />
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <h2 className="text-lg font-semibold mb-2">Event Distribution</h2>
            <EventDistribution />
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <h2 className="text-lg font-semibold mb-2">Firmware Rollouts</h2>
            <FirmwareRollout />
          </div>
        </section>

        {/* ── Host & VM Charts ───────────────────────── */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <h2 className="text-lg font-semibold mb-2">Hosts by Status</h2>
            <HostStatusPie hosts={hosts} />
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <h2 className="text-lg font-semibold mb-2">Avg CPU (All Hosts)</h2>
            <CpuTrend hosts={hosts} />
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <h2 className="text-lg font-semibold mb-2">Top VMs by CPU</h2>
            <TopVMsChart hosts={hosts} />
          </div>
        </section>
      </main>
    </div>
  );
}