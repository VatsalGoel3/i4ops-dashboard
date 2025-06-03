import { useState, useEffect } from 'react';
import axios from 'axios';
import type { EventRow } from '../../components/EventTable/EventTable';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';

const EVENT_ORDER = ['new install', 'patch', 'replace device'];

const EVENT_COLORS: Record<string, string> = {
  'new install': '#82ca9d',     // green
  'patch': '#ffc658',           // yellow
  'replace device': '#DC143C'   // red
};

const COLORS = [
  '#8884d8', '#a4de6c', '#d0ed57', '#8dd1e1', '#83a6ed'
]; // fallback colors

interface DistData {
  name: string;
  value: number;
}

export default function EventDistribution() {
  const [data, setData] = useState<DistData[]>([]);

  useEffect(() => {
    axios
      .get<EventRow[]>('/mock-events.json')
      .then(res => {
        const countMap = new Map<string, number>();
        res.data.forEach(r => {
          const event = r.event.toLowerCase(); // normalize
          countMap.set(event, (countMap.get(event) || 0) + 1);
        });

        // Generate ordered data array
        const arr: DistData[] = EVENT_ORDER
          .filter(e => countMap.has(e))
          .map(name => ({
            name,
            value: countMap.get(name)!
          }));

        setData(arr);
      })
      .catch(err => console.error('EventDistribution load error:', err));
  }, []);

  return (
    <ResponsiveContainer width="100%" height={330}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={80}
          label
        >
          {data.map((entry, index) => (
            <Cell
              key={entry.name}
              fill={EVENT_COLORS[entry.name] || COLORS[index % COLORS.length]}
            />
          ))}
        </Pie>
        <Tooltip />
        <Legend verticalAlign="bottom" height={36} />
      </PieChart>
    </ResponsiveContainer>
  );
}
