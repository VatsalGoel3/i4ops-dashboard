import { X } from 'lucide-react';
import type { Host } from '../api/types';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from 'recharts';
import axios from 'axios';
import { useState } from 'react';

interface Props {
  host: Host;
  onClose: () => void;
  onSave: (updatedHost: Host) => void;
}

export default function HostDetailModal({ host, onClose, onSave }: Props) {
  const cpuData = host.vms.map((vm) => ({ name: vm.name, cpu: vm.cpu }));

  // ─── Local state for form ──────────────────────
  const [pipelineStage, setPipelineStage] = useState<string>(host.pipelineStage);
  const [assignedTo, setAssignedTo] = useState<string>(host.assignedTo || '');
  const [notes, setNotes] = useState<string>(host.notes || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const payload = { pipelineStage, assignedTo, notes };

      // Send to backend (no need to expect full Host return)
      await axios.put(`http://localhost:4000/api/hosts/${host.id}`, payload);

      // Locally merge updated fields into the existing host object
      const updatedHost: Host = {
        ...host,
        pipelineStage,
        assignedTo,
        notes,
      };

      setSuccess('Saved successfully!');
      onSave(updatedHost);
    } catch (err) {
      console.error('Failed to update host:', err);
      setError('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-lg shadow-lg max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Host Details: {host.name}</h3>
          <button
            onClick={onClose}
            className="text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        {/* Host Info */}
        <ul className="space-y-2 text-sm mb-4">
          <li>
            <strong>IP:</strong> {host.ip}
          </li>
          <li>
            <strong>OS:</strong> {host.os}
          </li>
          <li>
            <strong>Status:</strong>{' '}
            {host.status.charAt(0).toUpperCase() + host.status.slice(1)}
          </li>
          <li>
            <strong>SSH:</strong> {host.ssh ? 'Open' : 'Closed'}
          </li>
          <li>
            <strong>Uptime:</strong>{' '}
            {host.uptime
              ? `${Math.floor(host.uptime / 86400)}d ${Math.floor(
                  (host.uptime % 86400) / 3600
                )}h`
              : 'N/A'}
          </li>
          <li>
            <strong>CPU Usage:</strong> {host.cpu}%
          </li>
          <li>
            <strong>RAM Usage:</strong> {host.ram}%
          </li>
          <li>
            <strong>Disk Usage:</strong> {host.disk}%
          </li>
          <li>
            <strong>Total VMs:</strong> {host.vms.length}
          </li>
        </ul>

        {/* Manual Tracking Fields */}
        <div className="mb-4 border-t pt-4">
          <h4 className="text-md font-medium mb-2">Provisioning Status</h4>

          {/* Stage Dropdown */}
          <div className="mb-2">
            <label className="block text-sm font-medium mb-1">Current Stage</label>
            <select
              className="border rounded p-1 w-full text-sm"
              value={pipelineStage}
              onChange={(e) => setPipelineStage(e.target.value)}
            >
              <option value="Active">Active</option>
              <option value="Broken">Broken</option>
              <option value="Installing">Installing</option>
              <option value="Reserved">Reserved</option>
              <option value="Staging">Staging</option>
              <option value="Unassigned">Unassigned</option>
            </select>
            <p className="mt-1 text-xs text-gray-500">
              Use the <strong>Notes</strong> field below to describe what’s being set up or debugged.
            </p>
        </div>

        {/* Assigned To */}
        <div className="mb-2">
          <label className="block text-sm font-medium mb-1">Assigned To</label>
          <input
            type="text"
            className="border rounded p-1 w-full text-sm"
            placeholder="e.g. Alice"
            value={assignedTo}
            onChange={(e) => setAssignedTo(e.target.value)}
          />
        </div>

        {/* Notes */}
        <div className="mb-2">
          <label className="block text-sm font-medium mb-1">Notes</label>
          <textarea
            className="border rounded p-1 w-full text-sm"
            rows={3}
            placeholder="e.g. Reformatted disk, joined VPN, ran install.sh"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        {/* Save Button + Feedback */}
        <button
          onClick={handleSave}
          disabled={saving}
          className={`px-4 py-2 rounded text-white text-sm ${
          saving ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'
          }`}
        >
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        {success && <p className="mt-2 text-sm text-green-600">{success}</p>}
      </div>

        {/* VM CPU Chart */}
        {host.vms.length > 0 ? (
          <div>
            <h4 className="text-sm font-medium mb-2">Per-VM CPU Usage:</h4>
            <div className="w-full h-48">
              <ResponsiveContainer>
                <BarChart
                  data={cpuData}
                  margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis domain={[0, 100]} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="cpu" fill="#60A5FA" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-500">No VMs on this host.</p>
        )}
      </div>
    </div>
  );
}