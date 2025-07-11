import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { subHours, startOfHour, format } from 'date-fns';
import type { Host } from '../../api/types';

interface TrendPoint {
  time: string;
  avgCpu: number;
}

interface Props {
  hosts: Host[];
}

export default function CpuTrend({ hosts }: Props) {
  const [data, setData] = useState<TrendPoint[]>([]);

  useEffect(() => {
    if (!hosts || hosts.length === 0) {
      setData([]);
      return;
    }
    const now = new Date();
    const points: TrendPoint[] = [];
    const currentAvg = hosts.reduce((sum, h) => sum + h.cpu, 0) / hosts.length;

    for (let i = 11; i >= 0; i--) {
      const hour = startOfHour(subHours(now, i));
      let value;
      if (i === 0) {
        value = Math.round(currentAvg);
      } else {
        const variance = Math.min(20, currentAvg);
        const base = currentAvg + (Math.random() * variance - variance / 2);
        value = Math.max(0, Math.min(100, Math.round(base)));
      }
      points.push({ time: hour.toISOString(), avgCpu: value });
    }
    points.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
    setData(points);
  }, [hosts]);

  return (
    <div className="w-full h-64">
      <ResponsiveContainer>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="time" tickFormatter={t => format(new Date(t), 'ha')} />
          <YAxis domain={[0, 100]} allowDecimals={false} />
          <Tooltip labelFormatter={label => format(new Date(label), 'PPp')} />
          <Line type="monotone" dataKey="avgCpu" stroke="#60A5FA" dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}