import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from 'recharts';
import type { Host } from '../../api/types';

interface Props {
  hosts: Host[];
}

const COLORS = ['#4ade80', '#f87171']; // Up = green, Down = red

export default function HostStatusPie({ hosts }: Props) {
  const upCount = hosts.filter(h => h.status === 'up').length;
  const downCount = hosts.filter(h => h.status === 'down').length;
  const data = [
    { name: 'Up', value: upCount },
    { name: 'Down', value: downCount },
  ];

  return (
    <div className="w-full h-64">
      <ResponsiveContainer>
        <PieChart>
          <Pie 
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={40}
            outerRadius={60}
            label
          >
            {data.map((_, index) => (
              <Cell key={`status-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend verticalAlign="bottom" height={36} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}