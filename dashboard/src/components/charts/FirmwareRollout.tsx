import { useState, useEffect } from 'react';
import axios from 'axios';
import type { EventRow } from '../../components/EventTable/EventTable';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';

const COLORS = [
  '#8884d8', '#82ca9d', '#ffc658', '#ff8042',
  '#a4de6c', '#d0ed57', '#8dd1e1', '#83a6ed'
];

export default function FirmwareRollout() {
  const [data, setData] = useState<any[]>([]);
  const [sources, setSources] = useState<string[]>([]);

  useEffect(() => {
    axios
      .get<EventRow[]>('/mock-events.json')
      .then(res => {
        const mapFW: Map<string, Map<string, number>> = new Map();
        const sourceSet: Set<string> = new Set();

        res.data.forEach(r => {
          const fwNow = r['FW-now'];
          const src = r['new-FW-source'];
          sourceSet.add(src);

          if (!mapFW.has(fwNow)) {
            mapFW.set(fwNow, new Map());
          }
          const inner = mapFW.get(fwNow)!;
          inner.set(src, (inner.get(src) || 0) + 1);
        });

        const sortedFW = Array.from(mapFW.keys()).sort();
        const sortedSources = Array.from(sourceSet).sort();
        setSources(sortedSources);

        const chartData = sortedFW.map(fw => {
          const obj: any = { fwNow: fw };
          const inner = mapFW.get(fw)!;
          sortedSources.forEach(src => {
            obj[src] = inner.get(src) || 0;
          });
          return obj;
        });

        setData(chartData);
      })
      .catch(err => console.error('FirmwareRollout load error:', err));
  }, []);

  return (
    <ResponsiveContainer width="100%" height={310}>
      <BarChart
        data={data}
        margin={{ top: 20, right: 30, left: 0, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="fwNow" />
        <YAxis allowDecimals={false} />
        <Tooltip />
        <Legend />
        {sources.map((src, idx) => (
          <Bar
            key={src}
            dataKey={src}
            stackId="a"
            fill={COLORS[idx % COLORS.length]}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}