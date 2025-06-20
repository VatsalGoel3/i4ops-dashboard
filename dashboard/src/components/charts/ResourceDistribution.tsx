import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import type { Host } from '../../api/types';

interface Props {
  hosts: Host[];
}

export default function ResourceDistribution({ hosts }: Props) {
  // Group hosts by resource usage ranges
  const getUsageRange = (usage: number): string => {
    if (usage >= 90) return '90-100%';
    if (usage >= 80) return '80-89%';
    if (usage >= 60) return '60-79%';
    if (usage >= 40) return '40-59%';
    if (usage >= 20) return '20-39%';
    return '0-19%';
  };

  const ranges = ['0-19%', '20-39%', '40-59%', '60-79%', '80-89%', '90-100%'];
  
  const data = ranges.map(range => {
    const cpuCount = hosts.filter(h => getUsageRange(h.cpu) === range).length;
    const ramCount = hosts.filter(h => getUsageRange(h.ram) === range).length;
    const diskCount = hosts.filter(h => getUsageRange(h.disk) === range).length;
    
    return {
      range,
      CPU: cpuCount,
      RAM: ramCount,
      Disk: diskCount
    };
  });

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-600 rounded shadow-lg">
          <p className="font-medium text-gray-900 dark:text-gray-100">{`${label} Usage`}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {`${entry.dataKey}: ${entry.value} hosts`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-64">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 30 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="range" 
            angle={-45} 
            textAnchor="end" 
            interval={0}
            height={60}
          />
          <YAxis allowDecimals={false} />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="CPU" fill="#3B82F6" name="CPU" />
          <Bar dataKey="RAM" fill="#10B981" name="RAM" />
          <Bar dataKey="Disk" fill="#F59E0B" name="Disk" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
} 