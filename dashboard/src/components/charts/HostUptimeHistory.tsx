import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid, ResponsiveContainer } from 'recharts';
import { useEffect, useState } from 'react';
import { config } from '../../lib/config';

interface HistoryPoint {
  time: string;
  up: number;
  down: number;
}

export default function HostUptimeHistory() {
  const [data, setData] = useState<HistoryPoint[] | null>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await fetch(`${config.api.baseUrl}/poll-history`);
        const json = await res.json();
        setData(json);
      } catch (e) {
        console.error('Error fetching poll history:', e);
        setData([]);
      }
    };
    fetchHistory();
  }, []);

  if (data === null) return <div className="text-sm text-gray-500">Loading...</div>;
  if (data.length === 0) return <div className="text-sm text-gray-500">No poll data yet</div>;

  return (
    <div className="w-full h-64">
      <ResponsiveContainer>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="time"
            tickFormatter={(t) =>
              new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }
          />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="up" stackId="a" fill="#4ade80" />
          <Bar dataKey="down" stackId="a" fill="#f87171" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}