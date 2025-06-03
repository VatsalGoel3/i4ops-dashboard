import { useEffect, useState } from 'react';
import axios from 'axios';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  CartesianGrid,
} from 'recharts';
import { parse, format } from 'date-fns';
import type { EventRow } from '../../components/EventTable/EventTable';

const EVENT_ORDER = ['new install', 'patch', 'replace device'];
const EVENT_COLORS: Record<string, string> = {
  'new install': '#82ca9d',      // green
  'patch': '#ffc658',            // yellow
  'replace device': '#DC143C',   // red
};

export default function EventTrend() {
  const [data, setData] = useState<any[]>([]);
  const [eventTypes, setEventTypes] = useState<string[]>([]);

  useEffect(() => {
    axios
      .get<EventRow[]>('/mock-events.json')
      .then(res => {
        const map = new Map<string, Map<string, number>>();
        const events = new Set<string>();

        res.data.forEach(r => {
          const dt = parse(r['date-time'], 'yyyy-MM-dd HH:mm:ss', new Date());
          const month = format(dt, 'yyyy-MM');
          const event = r.event.toLowerCase(); // normalize to lowercase

          if (!map.has(month)) {
            map.set(month, new Map());
          }
          const monthMap = map.get(month)!;
          monthMap.set(event, (monthMap.get(event) || 0) + 1);

          events.add(event);
        });

        const sortedMonths = Array.from(map.keys()).sort();
        const sortedEvents = EVENT_ORDER.filter(e => events.has(e));
        setEventTypes(sortedEvents);

        const chartData = sortedMonths.map(month => {
          const obj: any = { month };
          const eventMap = map.get(month)!;
          sortedEvents.forEach(evt => {
            obj[evt] = eventMap.get(evt) || 0;
          });
          return obj;
        });

        setData(chartData);
      })
      .catch(err => console.error('Bar chart load error', err));
  }, []);

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height={340}>
        <BarChart data={data} margin={{ top: 20, right: 20, left: 0, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" angle={-10} textAnchor="end" height={40} />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Legend verticalAlign="bottom" height={30} />
          {eventTypes.map(evt => (
            <Bar
              key={evt}
              dataKey={evt}
              stackId="1"
              fill={EVENT_COLORS[evt] || '#ccc'}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
