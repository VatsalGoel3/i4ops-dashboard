import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import type { Host } from '../../api/types';

interface Props {
  hosts: Host[];
}

export default function TopVMsChart({ hosts }: Props) {
  // Flatten all VMs from all hosts and sort by CPU usage
  const allVMs = hosts.flatMap(h => h.vms);
  allVMs.sort((a, b) => b.cpu - a.cpu);
  const topList = allVMs.slice(0, 10);
  const data = topList.map(vm => ({
    name: vm.name.length > 12 ? vm.name.slice(0, 12) + '…' : vm.name,
    cpu: vm.cpu
  }));

  return (
    <div className="w-full h-64">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 30 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" angle={-45} textAnchor="end" interval={0} />
          <YAxis domain={[0, 100]} allowDecimals={false} />
          <Tooltip />
          <Bar dataKey="cpu" fill="#F59E0B" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}