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
  const [pollCount, setPollCount] = useState(5);
  const [loading, setLoading] = useState(false);

  const fetchHistory = async (limit: number) => {
    setLoading(true);
    try {
      const res = await fetch(`${config.api.baseUrl}/poll-history?limit=${limit}`);
      const json = await res.json();
      setData(json.reverse()); // Reverse to show chronological order (oldest first)
    } catch (e) {
      console.error('Error fetching poll history:', e);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory(pollCount);
  }, [pollCount]);

  const formatXAxisTick = (tickItem: string) => {
    const date = new Date(tickItem);
    const now = new Date();
    const diffHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    // If within last 24 hours, show time only
    if (diffHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    // If older, show date + time
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' }) + 
           ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const date = new Date(label);
      const total = payload[0].value + payload[1].value;
      return (
        <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg">
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            {date.toLocaleString()}
          </p>
          <p className="text-sm text-green-600">
            Up: {payload[0].value} ({total > 0 ? Math.round((payload[0].value / total) * 100) : 0}%)
          </p>
          <p className="text-sm text-red-600">
            Down: {payload[1].value} ({total > 0 ? Math.round((payload[1].value / total) * 100) : 0}%)
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Total hosts: {total}
          </p>
        </div>
      );
    }
    return null;
  };

  if (data === null) {
    return (
      <div className="w-full h-64 flex items-center justify-center">
        <div className="text-sm text-gray-500">Loading poll history...</div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="w-full h-64 flex items-center justify-center">
        <div className="text-sm text-gray-500">No poll data available yet</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Host Uptime History
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">Show last:</span>
          <select
            value={pollCount}
            onChange={(e) => setPollCount(parseInt(e.target.value))}
            disabled={loading}
            className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            <option value={5}>5 polls</option>
            <option value={10}>10 polls</option>
            <option value={15}>15 polls</option>
          </select>
        </div>
      </div>

      {/* Chart */}
      <div className="w-full h-64">
        <ResponsiveContainer>
          <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="time"
              tickFormatter={formatXAxisTick}
              angle={-45}
              textAnchor="end"
              height={60}
              interval={0}
              fontSize={12}
              stroke="#6b7280"
            />
            <YAxis 
              stroke="#6b7280"
              fontSize={12}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Bar 
              dataKey="up" 
              stackId="hosts" 
              fill="#10b981" 
              name="Up"
              radius={[0, 0, 0, 0]}
            />
            <Bar 
              dataKey="down" 
              stackId="hosts" 
              fill="#ef4444" 
              name="Down"
              radius={[2, 2, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Status */}
      {loading && (
        <div className="flex items-center justify-center py-2">
          <div className="text-xs text-gray-500">Updating...</div>
        </div>
      )}
    </div>
  );
}