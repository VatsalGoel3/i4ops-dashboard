import { useEffect, useState } from 'react';
import axios from 'axios';

import StatusPie from '../components/charts/StatusPie';
import FirmwareBar from '../components/charts/FirmwareBar';
import UptimeTrend from '../components/charts/UptimeTrend';
import EventTrend from '../components/charts/EventTrend';
import EventDistribution from '../components/charts/EventDistribution';
import FirmwareRollout from '../components/charts/FirmwareRollout';
import KpiCards from '../components/KPIStats';

import type { Device } from '../api/useDevices';

interface EventRow {
  event: string;
  // You can extend this if needed (e.g. ID, date-time, etc.)
}

export default function Dashboard() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);

  useEffect(() => {
    axios.get<Device[]>('/mock-devices.json').then((res) => setDevices(res.data));
    axios.get<EventRow[]>('/mock-events.json').then((res) => setEvents(res.data));
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      {/* Header */}
      <header className="h-16 flex items-center px-4 shadow-md bg-white dark:bg-gray-800">
        <h1 className="text-xl font-semibold">Device Insights Hub</h1>
      </header>

      {/* Main Content */}
      <main className="p-6 space-y-8">
        {/* ── KPI Strip ───────────────────────────── */}
        <KpiCards devices={devices} events={events} />

        {/* ── Row 1: Device Charts ────────────────── */}
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

        {/* ── Row 2: Event Charts ─────────────────── */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <h2 className="text-lg font-semibold mb-2">Event Trends Over Time</h2>
            <EventTrend />
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <h2 className="text-lg font-semibold mb-2">Event Distribution</h2>
            <EventDistribution />
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <h2 className="text-lg font-semibold mb-2">Firmware Rollouts by Source</h2>
            <FirmwareRollout />
          </div>
        </section>
      </main>
    </div>
  );
}