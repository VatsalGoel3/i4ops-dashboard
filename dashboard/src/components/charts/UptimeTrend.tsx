import { useState, useEffect } from 'react';
import axios from 'axios';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { subHours, startOfHour, format, parseISO } from 'date-fns';
import type { Device } from '../../api/useDevices';

interface TrendPoint {
  time: string;
  downCount: number;
}

export default function UptimeTrend() {
  const [data, setData] = useState<TrendPoint[]>([]);

  useEffect(() => {
    axios
      .get<Device[]>('/mock-devices.json')
      .then(res => {
        const devices = res.data;
        // Build 24 hourly buckets up to now
        const now = new Date();
        const buckets: Record<string, number> = {};
        for (let i = 23; i >= 0; i--) {
          const hour = startOfHour(subHours(now, i));
          buckets[hour.toISOString()] = 0;
        }
        // Count downs into buckets
        devices.forEach(d => {
          if (d.dev_status === 'down') {
            const seen = parseISO(d.last_seen);
            const bucket = startOfHour(seen).toISOString();
            if (bucket in buckets) buckets[bucket] += 1;
          }
        });
        // Flatten & sort
        const trend = Object.entries(buckets)
          .map(([time, downCount]) => ({ time, downCount }))
          .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
        setData(trend);
      })
      .catch(err => console.error('Failed to load trend from mock data', err));
  }, []);

  return (
    <div className="w-full h-64">
      <ResponsiveContainer>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="time"
            tickFormatter={t => format(new Date(t), 'ha')}
          />
          <YAxis allowDecimals={false} />
          <Tooltip
            labelFormatter={l => format(new Date(l), 'PPp')}
          />
          <Line
            type="monotone"
            dataKey="downCount"
            stroke="#f87171"
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}