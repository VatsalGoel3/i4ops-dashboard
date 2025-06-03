import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import type { Device } from '../../api/useDevices';

interface Props {
  devices: Device[];
}

export default function FirmwareBar({ devices }: Props) {
  const counts: Record<string, number> = {};
  for (const d of devices) {
    counts[d.dev_fw] = (counts[d.dev_fw] || 0) + 1;
  }

  let rawData = Object.entries(counts).map(([version, value]) => ({
    version,
    value,
  }));

  rawData.sort((a, b) => b.value - a.value);

  const TOP_N = 5;
  const topN = rawData.slice(0, TOP_N);
  const others = rawData.slice(TOP_N);
  if (others.length > 0) {
    const otherCount = others.reduce((sum, entry) => sum + entry.value, 0);
    topN.push({ version: 'Other', value: otherCount });
  }

  const isOther = (v: string) => v.toLowerCase() === 'other';
  const versionToTuple = (v: string) => {
    const parts = v.replace(/^v/, '').split('.');
    const nums = parts.map((p) => parseInt(p, 10) || 0);
    while (nums.length < 3) nums.push(0);
    return nums as [number, number, number];
  };

  topN.sort((a, b) => {
    const aOther = isOther(a.version);
    const bOther = isOther(b.version);
    if (aOther && !bOther) return 1;      
    if (!aOther && bOther) return -1;
    if (aOther && bOther) return 0;     

    const [a1, a2, a3] = versionToTuple(a.version);
    const [b1, b2, b3] = versionToTuple(b.version);
    if (a1 !== b1) return a1 - b1;
    if (a2 !== b2) return a2 - b2;
    return a3 - b3;
  });

  const data = topN.map((entry) => ({
    dev_fw: entry.version,
    value: entry.value,
  }));

  return (
    <div className="w-full h-60 mt-6">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="dev_fw" />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Bar dataKey="value" fill="#60a5fa" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}