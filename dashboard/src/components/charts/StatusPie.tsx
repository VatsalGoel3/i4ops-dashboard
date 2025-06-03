import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from 'recharts';
import type { Device } from '../../api/useDevices';

interface Props { devices: Device[] }

const COLORS = ['#4ade80', '#f87171', '#9CA3AF']; // Up, Down, Unreachable

export default function StatusPie({ devices }: Props) {
  const upCount = devices.filter(d => d.dev_status === 'up').length;
  const downCount = devices.filter(d => d.dev_status === 'down').length;
  const unreachableCount = devices.length - upCount - downCount;

  const data = [
    { name: 'Up', value: upCount },
    { name: 'Down', value: downCount },
    { name: 'Unreachable', value: unreachableCount },
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