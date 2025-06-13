import { X } from 'lucide-react';
import type { VM } from '../api/types';
import { useState } from 'react';
import axios from 'axios';
import { useAuditLogs } from '../api/useAuditLogs';
import AuditTimeline from '../components/AuditTimeline';

interface Props {
  vm: VM;
  onClose: () => void;
}

export default function VMDetailModal({ vm, onClose }: Props) {
  const [assignedTo, setAssignedTo] = useState<string>(vm.assignedTo || '');
  const [notes, setNotes] = useState<string>(vm.notes || '');
  const [saving, setSaving] = useState(false);
  const { logs, loading } = useAuditLogs('VM', vm.id);

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.put(`/api/vms/${vm.id}`, {
        ...vm,
        assignedTo,
        notes,
      });
    } catch (err) {
      console.error('Failed to update VM:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-lg shadow-lg max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">VM Details: {vm.name}</h3>
          <button onClick={onClose} className="text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-white">
            <X size={20} />
          </button>
        </div>

        <ul className="space-y-2 text-sm mb-4">
          <li><strong>Host:</strong> {vm.host?.name || 'N/A'}</li>
          <li><strong>Status:</strong> {vm.status.charAt(0).toUpperCase() + vm.status.slice(1)}</li>
          <li><strong>OS:</strong> {vm.os}</li>
          <li><strong>Uptime:</strong> {vm.uptime ? `${Math.floor(vm.uptime / 86400)}d ${Math.floor((vm.uptime % 86400) / 3600)}h` : 'N/A'}</li>
          <li><strong>CPU Usage:</strong> {vm.cpu}%</li>
          <li><strong>RAM Usage:</strong> {vm.ram}%</li>
          <li><strong>Disk Usage:</strong> {vm.disk}%</li>
          <li><strong>IP Address:</strong> {vm.networkIp || 'N/A'}</li>
          <li><strong>MAC Address:</strong> {vm.networkMac || 'N/A'}</li>
        </ul>

        <div className="mb-4 border-t pt-4">
          <h4 className="text-md font-medium mb-2">Manual Tracking</h4>

          <div className="mb-2">
            <label className="block text-sm font-medium mb-1">Assigned To</label>
            <input type="text" className="border rounded p-1 w-full text-sm" placeholder="e.g. diana" value={assignedTo} onChange={e => setAssignedTo(e.target.value)} />
          </div>

          <div className="mb-2">
            <label className="block text-sm font-medium mb-1">Notes</label>
            <textarea className="border rounded p-1 w-full text-sm" rows={3} placeholder="Add VM notes here…" value={notes} onChange={e => setNotes(e.target.value)} />
          </div>

          <button onClick={handleSave} disabled={saving} className={`px-4 py-2 rounded text-white text-sm ${saving ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'}`}>
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>

        <div>
          <h4 className="text-sm font-medium mb-2">VM XML:</h4>
          <pre className="bg-gray-100 dark:bg-gray-800 p-2 rounded text-xs overflow-x-auto">
            {vm.xml}
          </pre>
        </div>

        <div className="mt-6 border-t pt-4">
          <h4 className="text-sm font-bold mb-2 text-gray-700 dark:text-gray-300">Audit History</h4>
          {loading ? <p className="text-sm text-gray-500 italic">Loading audit logs…</p> : <AuditTimeline logs={logs} />}
        </div>
      </div>
    </div>
  );
}