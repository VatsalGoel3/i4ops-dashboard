import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from 'recharts';
import type { Host } from '../../api/types';

interface Props {
  hosts: Host[];
}

export default function HostStatusPie({ hosts }: Props) {
  const upCount = hosts.filter(h => h.status === 'up').length;
  const downCount = hosts.filter(h => h.status === 'down').length;
  const data = [
    { name: 'Up', value: upCount },
    { name: 'Down', value: downCount }
  ];
  const COLORS = ['#4ade80', '#f87171']; // green/red

  return (
    <div className="w-full h-64">
      <ResponsiveContainer>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={40} outerRadius={60} label>
            {data.map((_, idx) => (
              <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend verticalAlign="bottom" height={36} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}