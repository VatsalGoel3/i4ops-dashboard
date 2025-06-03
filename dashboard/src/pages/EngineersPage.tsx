import { useState, useEffect } from 'react';
import axios from 'axios';
import EngineerView from '../components/EngineerView';
import type { Device } from '../api/useDevices';

export default function EngineersPage() {
  const [allDevices, setAll] = useState<Device[]>([]);
  useEffect(() => {
    axios.get<Device[]>('/mock-devices.json').then(r => setAll(r.data));
  }, []);
  return (
    <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">Engineers</h2>
      <EngineerView devices={allDevices} />
    </section>
  );
}