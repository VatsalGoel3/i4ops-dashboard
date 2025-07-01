import { X, Calendar, Clock, User } from 'lucide-react';
import type { Host } from '../api/types';
import { PipelineStage } from '../api/types';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from 'recharts';
import { useState } from 'react';
import { useUpdateHost } from '../api/queries';

interface Props {
  host: Host;
  onClose: () => void;
  onSave: (updatedHost: Host) => void;
}

const pipelineStages = Object.values(PipelineStage);

function capitalize(s: string) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
}

export default function HostDetailModal({ host, onClose, onSave }: Props) {
  const cpuData = host.vms?.map((vm) => ({ name: vm.name, cpu: vm.cpu })) ?? [];

  const [pipelineStage, setPipelineStage] = useState<PipelineStage>(host.pipelineStage);
  const [assignedTo, setAssignedTo] = useState<string>(host.assignedTo || '');
  const [notes, setNotes] = useState<string>(host.notes || '');
  
  // Scheduling state
  const [assignmentMode, setAssignmentMode] = useState<'now' | 'schedule'>('now');
  const [assignmentDate, setAssignmentDate] = useState<string>('');
  const [assignmentTime, setAssignmentTime] = useState<string>('15:00'); // Default to 3 PM
  const [assignmentDuration, setAssignmentDuration] = useState<string>('4'); // Default 4 hours
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const updateHostMutation = useUpdateHost();

  // Calculate assignment expiration
  const getAssignmentExpiration = () => {
    if (!assignmentDate || !assignmentTime) return null;
    
    const dateTime = new Date(`${assignmentDate}T${assignmentTime}`);
    const durationHours = parseInt(assignmentDuration) || 4;
    dateTime.setHours(dateTime.getHours() + durationHours);
    
    return dateTime;
  };

  // Check if assignment is expired
  const isAssignmentExpired = () => {
    if (!host.assignedUntil) return false;
    return new Date(host.assignedUntil) < new Date();
  };

  // Format assignment duration for display
  const formatAssignmentDuration = (until: string) => {
    const now = new Date();
    const untilDate = new Date(until);
    const diffMs = untilDate.getTime() - now.getTime();
    const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));
    
    if (diffHours < 1) return 'Expires soon';
    if (diffHours < 24) return `Expires in ${diffHours}h`;
    
    const diffDays = Math.ceil(diffHours / 24);
    return `Expires in ${diffDays}d`;
  };

  const handleSave = async () => {
    const updates: any = { pipelineStage, assignedTo, notes };
    
    // Handle assignment logic
    if (assignedTo) {
      if (assignmentMode === 'schedule' && assignmentDate && assignmentTime) {
        // Scheduled assignment with expiration
        const expiration = getAssignmentExpiration();
        if (expiration) {
          updates.assignedAt = new Date().toISOString();
          updates.assignedUntil = expiration.toISOString();
        }
      } else {
        // Immediate assignment (no expiration)
        updates.assignedAt = new Date().toISOString();
        // Don't include assignedUntil (no expiration)
      }
      
      // Auto-update pipeline stage when assigning
      if (pipelineStage === PipelineStage.unassigned) {
        updates.pipelineStage = PipelineStage.active;
      }
    } else {
      // No one assigned - clear assignment fields
      updates.assignedTo = null;
      // Don't include assignedAt and assignedUntil (they will be null in database)
    }
    
    updateHostMutation.mutate(
      { hostId: host.id, updates },
      {
        onSuccess: (updatedHost) => {
          onSave(updatedHost);
          onClose();
        },
      }
    );
  };

  const handleReset = () => {
    setShowResetConfirm(true);
  };

  const confirmReset = () => {
    // Reset all fields to default values
    const updates: any = {
      pipelineStage: PipelineStage.unassigned,
      assignedTo: null,
      notes: '',
      // Explicitly set these to null to clear them
      assignedAt: null,
      assignedUntil: null
    };

    // Update the local state
    setPipelineStage(PipelineStage.unassigned);
    setAssignedTo('');
    setNotes('');
    setAssignmentMode('now');
    setAssignmentDate('');
    setAssignmentTime('15:00');
    setAssignmentDuration('4');

    // Automatically save the changes
    updateHostMutation.mutate(
      { hostId: host.id, updates },
      {
        onSuccess: (updatedHost) => {
          onSave(updatedHost);
          onClose();
        },
      }
    );

    setShowResetConfirm(false);
  };

  const cancelReset = () => {
    setShowResetConfirm(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl shadow-lg max-h-[90vh] overflow-y-auto relative">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Host Details: {host.name}</h3>
          <button
            onClick={onClose}
            className="text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex items-center gap-4 mb-4">
          <span
            className={`inline-block px-2 py-1 text-xs rounded-full ${
              host.status === 'up'
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
            }`}
          >
            {capitalize(host.status)}
          </span>
          <span className="inline-block px-2 py-1 text-xs rounded-full bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
            {capitalize(host.pipelineStage)}
          </span>
          {host.assignedTo && (
            <span className={`inline-block px-2 py-1 text-xs rounded-full flex items-center gap-1 ${
              isAssignmentExpired() 
                ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
            }`}>
              <User size={10} />
              {host.assignedTo}
              {host.assignedUntil && (
                <span className="text-xs">
                  {isAssignmentExpired() ? ' (Expired)' : ` (${formatAssignmentDuration(host.assignedUntil)})`}
                </span>
              )}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Host Info */}
          <div>
            <h4 className="text-md font-medium mb-3">System Information</h4>
            <ul className="space-y-2 text-sm mb-4">
              <li><strong>IP:</strong> {host.ip}</li>
              <li><strong>OS:</strong> {host.os}</li>
              <li>
                <strong>Uptime:</strong>{' '}
                {host.uptime
                  ? `${Math.floor(host.uptime / 86400)}d ${Math.floor((host.uptime % 86400) / 3600)}h`
                  : 'N/A'}
              </li>
              <li><strong>CPU Usage:</strong> {host.cpu}%</li>
              <li><strong>RAM Usage:</strong> {host.ram}%</li>
              <li><strong>Disk Usage:</strong> {host.disk}%</li>
              {host.vms?.length ? (
                <li><strong>Total VMs:</strong> {host.vms.length}</li>
              ) : null}
            </ul>

            {/* Assignment History */}
            {host.assignedAt && (
              <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <h5 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Clock size={14} />
                  Assignment History
                </h5>
                <div className="text-xs space-y-1">
                  <div><strong>Assigned:</strong> {new Date(host.assignedAt).toLocaleString()}</div>
                  {host.assignedUntil && (
                    <div><strong>Until:</strong> {new Date(host.assignedUntil).toLocaleString()}</div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Assignment & Scheduling */}
          <div>
            <h4 className="text-md font-medium mb-3">Assignment & Scheduling</h4>
            
            <div className="space-y-4">
              {/* Current Stage */}
              <div>
                <label className="block text-sm font-medium mb-1">Current Stage</label>
                <select
                  className="border rounded p-2 w-full text-sm bg-white dark:bg-gray-700 dark:text-gray-100"
                  value={pipelineStage}
                  onChange={(e) => setPipelineStage(e.target.value as PipelineStage)}
                >
                  {pipelineStages.map((stage) => (
                    <option key={stage} value={stage}>
                      {stage}
                    </option>
                  ))}
                </select>
              </div>

              {/* Assign To */}
              <div>
                <label className="block text-sm font-medium mb-1">Assign To</label>
                <input
                  type="text"
                  className="border rounded p-2 w-full text-sm bg-white dark:bg-gray-700 dark:text-gray-100"
                  placeholder="e.g. Alice, Bob, Team Alpha"
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                />
              </div>

              {/* Assignment Mode Selection */}
              {assignedTo && (
                <div className="space-y-3">
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="assignmentMode"
                        value="now"
                        checked={assignmentMode === 'now'}
                        onChange={(e) => setAssignmentMode(e.target.value as 'now' | 'schedule')}
                        className="rounded"
                      />
                      <span className="text-sm font-medium">Assign Now (No Expiration)</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="assignmentMode"
                        value="schedule"
                        checked={assignmentMode === 'schedule'}
                        onChange={(e) => setAssignmentMode(e.target.value as 'now' | 'schedule')}
                        className="rounded"
                      />
                      <span className="text-sm font-medium">Schedule with Expiration</span>
                    </label>
                  </div>
                </div>
              )}

              {/* Scheduling Options */}
              {assignmentMode === 'schedule' && assignedTo && (
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg space-y-3">
                  <h5 className="text-sm font-medium text-blue-800 dark:text-blue-300 flex items-center gap-2">
                    <Calendar size={14} />
                    Schedule Assignment
                  </h5>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium mb-1">Assignment Start Date</label>
                      <input
                        type="date"
                        className="border rounded p-2 w-full text-sm bg-white dark:bg-gray-700 dark:text-gray-100"
                        value={assignmentDate}
                        onChange={(e) => setAssignmentDate(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs font-medium mb-1">Assignment Start Time</label>
                      <input
                        type="time"
                        className="border rounded p-2 w-full text-sm bg-white dark:bg-gray-700 dark:text-gray-100"
                        value={assignmentTime}
                        onChange={(e) => setAssignmentTime(e.target.value)}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium mb-1">Assignment Duration</label>
                    <select
                      className="border rounded p-2 w-full text-sm bg-white dark:bg-gray-700 dark:text-gray-100"
                      value={assignmentDuration}
                      onChange={(e) => setAssignmentDuration(e.target.value)}
                    >
                      <option value="1">1 hour</option>
                      <option value="2">2 hours</option>
                      <option value="4">4 hours</option>
                      <option value="8">8 hours (1 day)</option>
                      <option value="24">24 hours</option>
                      <option value="168">1 week</option>
                    </select>
                  </div>

                  {/* Preview */}
                  {assignmentDate && assignmentTime && (
                    <div className="p-2 bg-white dark:bg-gray-800 rounded border text-xs">
                      <div><strong>Assignment will expire:</strong></div>
                      <div className="text-blue-600 dark:text-blue-400">
                        {getAssignmentExpiration()?.toLocaleString()}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium mb-1">Notes</label>
                <textarea
                  className="border rounded p-2 w-full text-sm bg-white dark:bg-gray-700 dark:text-gray-100"
                  rows={3}
                  placeholder="e.g. Re-formatted disk, joined VPN, ran install.sh, or assignment reason"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 bg-white dark:bg-gray-800 pt-4 pb-4 border-t mt-6">
          <div className="flex justify-between items-center">
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={updateHostMutation.isPending}
                className={`px-6 py-2 rounded text-white text-sm font-medium ${
                  updateHostMutation.isPending ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {updateHostMutation.isPending 
                  ? 'Saving…' 
                  : assignmentMode === 'schedule' 
                    ? 'Assign & Schedule' 
                    : 'Assign Now'
                }
              </button>
              <button
                onClick={handleReset}
                className="px-4 py-2 rounded text-sm font-medium bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300"
                title="Clear all fields"
              >
                Clear Form
              </button>
            </div>
            <button
              onClick={onClose}
              className="text-sm underline text-gray-500 dark:text-gray-400"
            >
              Cancel
            </button>
          </div>
        </div>

        {/* VM CPU Chart */}
        {cpuData.length > 0 && (
          <div className="mt-6">
            <h4 className="text-sm font-medium mb-2">Per-VM CPU Usage:</h4>
            <div className="w-full h-48">
              <ResponsiveContainer>
                <BarChart data={cpuData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis domain={[0, 100]} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="cpu" fill="#60A5FA" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* Reset Confirmation Dialog */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Reset to Default
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to reset all fields to default values? This will clear the assignment and scheduling.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={cancelReset}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={confirmReset}
                disabled={updateHostMutation.isPending}
                className={`px-4 py-2 rounded font-medium ${
                  updateHostMutation.isPending 
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-red-600 hover:bg-red-700 text-white'
                }`}
              >
                {updateHostMutation.isPending ? 'Resetting...' : 'Reset'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}