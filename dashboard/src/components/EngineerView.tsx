import type { Device } from '../api/useDevices';

interface Props {
  devices: Device[];
}

export default function EngineerView({ devices }: Props) {
  // Build map engineer → devices
  const map: Record<string, Device[]> = {};
  devices.forEach(d => {
    [d.first_service, d.second_service, d.third_service].forEach(name => {
      if (!map[name]) map[name] = [];
      map[name].push(d);
    });
  });

  return (
    <div className="mt-8">
      <h3 className="text-lg font-semibold mb-4">Engineer Assignments</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Object.entries(map).map(([engineer, devs]) => (
          <div key={engineer} className="p-4 bg-white dark:bg-gray-800 rounded shadow">
            <h4 className="font-medium mb-2">{engineer}</h4>
            <ul className="list-disc list-inside text-sm">
              {devs.map(d => (
                <li key={d.id}>{d.dev_name} ({d.factory})</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
