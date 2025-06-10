import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid, ResponsiveContainer } from 'recharts';
import { useEffect, useState } from 'react';

interface HistoryPoint {
  time: string;
  up: number;
  down: number;
}

export default function HostUptimeHistory() {
  const [data, setData] = useState<HistoryPoint[]>([]);

  useEffect(() => {
    const fetchHistory = async () => {
      const res = await fetch('http://localhost:4000/api/poll-history');
      const json = await res.json();
      setData(json);
    };
    fetchHistory();
  }, []);

  return (
    <div className="w-full h-64">
      <ResponsiveContainer>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="time" tickFormatter={(t) => new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} />
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