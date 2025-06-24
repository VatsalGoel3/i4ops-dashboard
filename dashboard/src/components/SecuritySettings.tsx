import { useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { 
  Lock, 
  Eye, 
  EyeOff, 
  Shield, 
  Smartphone, 
  Globe, 
  AlertTriangle,
  CheckCircle,
  Loader,
  Calendar,
  MapPin
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../lib/supabaseClient';

interface SecuritySettingsProps {
  user: User | null;
}

interface PasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export default function SecuritySettings({ }: SecuritySettingsProps) {
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordForm, setPasswordForm] = useState<PasswordForm>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [sessions] = useState([
    {
      id: '1',
      device: 'Chrome on MacOS',
      location: 'San Francisco, CA',
      ip: '192.168.1.100',
      lastActive: '2 minutes ago',
      current: true,
    },
    {
      id: '2', 
      device: 'Safari on iPhone',
      location: 'San Francisco, CA', 
      ip: '192.168.1.101',
      lastActive: '1 hour ago',
      current: false,
    },
    {
      id: '3',
      device: 'Edge on Windows',
      location: 'New York, NY',
      ip: '10.0.0.50', 
      lastActive: '2 days ago',
      current: false,
    },
  ]);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    setPasswordLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordForm.newPassword
      });

      if (error) throw error;

      toast.success('Password updated successfully!');
      setShowPasswordForm(false);
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (error: any) {
      console.error('Error updating password:', error);
      toast.error(error.message || 'Failed to update password');
    } finally {
      setPasswordLoading(false);
    }
  };

  const getPasswordStrength = (password: string): number => {
    let strength = 0;
    if (password.length >= 8) strength += 25;
    if (password.match(/[a-z]/)) strength += 25;
    if (password.match(/[A-Z]/)) strength += 25;
    if (password.match(/[0-9]/)) strength += 25;
    return strength;
  };

  const getPasswordStrengthLabel = (strength: number): string => {
    if (strength <= 25) return 'Weak';
    if (strength <= 50) return 'Fair';
    if (strength <= 75) return 'Good';
    return 'Strong';
  };

  const getPasswordStrengthColor = (strength: number): string => {
    if (strength <= 25) return 'bg-red-500';
    if (strength <= 50) return 'bg-yellow-500';
    if (strength <= 75) return 'bg-blue-500';
    return 'bg-green-500';
  };

  const signOutAllDevices = async () => {
    try {
      // Sign out from all devices
      await supabase.auth.signOut({ scope: 'global' });
      toast.success('Signed out from all devices');
    } catch (error: any) {
      toast.error('Failed to sign out from all devices');
    }
  };

  return (
    <div className="space-y-6">
      {/* Password Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Lock size={20} className="text-gray-600 dark:text-gray-400 mr-3" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Password
            </h3>
          </div>
          <button
            onClick={() => setShowPasswordForm(!showPasswordForm)}
            className="px-4 py-2 text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium"
          >
            {showPasswordForm ? 'Cancel' : 'Change Password'}
          </button>
        </div>

        {!showPasswordForm ? (
          <div className="flex items-center">
            <div className="flex">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="w-2 h-2 bg-gray-400 dark:bg-gray-600 rounded-full mr-1" />
              ))}
            </div>
            <span className="text-sm text-gray-600 dark:text-gray-400 ml-3">
              Last changed 30 days ago
            </span>
          </div>
        ) : (
          <form onSubmit={handlePasswordChange} className="space-y-4">
            {/* Current Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Current Password
              </label>
              <div className="relative">
                <input
                  type={showPasswords.current ? 'text' : 'password'}
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  required
                  disabled={passwordLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPasswords.current ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showPasswords.new ? 'text' : 'password'}
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  required
                  disabled={passwordLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPasswords.new ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              
              {/* Password Strength Indicator */}
              {passwordForm.newPassword && (
                <div className="mt-2">
                  <div className="flex items-center space-x-2">
                    <div className="flex-1 bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all ${getPasswordStrengthColor(getPasswordStrength(passwordForm.newPassword))}`}
                        style={{ width: `${getPasswordStrength(passwordForm.newPassword)}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-600 dark:text-gray-400 min-w-0">
                      {getPasswordStrengthLabel(getPasswordStrength(passwordForm.newPassword))}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  type={showPasswords.confirm ? 'text' : 'password'}
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  required
                  disabled={passwordLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPasswords.confirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={passwordLoading}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center"
              >
                {passwordLoading ? (
                  <Loader size={16} className="animate-spin mr-2" />
                ) : (
                  <Lock size={16} className="mr-2" />
                )}
                Update Password
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Two-Factor Authentication */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Shield size={20} className="text-gray-600 dark:text-gray-400 mr-3" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Two-Factor Authentication
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Add an extra layer of security to your account
              </p>
            </div>
          </div>
          <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
            Enable 2FA
          </button>
        </div>
        <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
          <AlertTriangle size={16} className="mr-2 text-yellow-500" />
          Two-factor authentication is not enabled
        </div>
      </div>

      {/* Active Sessions */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Smartphone size={20} className="text-gray-600 dark:text-gray-400 mr-3" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Active Sessions
            </h3>
          </div>
          <button
            onClick={signOutAllDevices}
            className="px-4 py-2 text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
          >
            Sign Out All Devices
          </button>
        </div>

        <div className="space-y-4">
          {sessions.map((session) => (
            <div key={session.id} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                  {session.device.includes('iPhone') ? (
                    <Smartphone size={20} className="text-gray-600 dark:text-gray-400" />
                  ) : (
                    <Globe size={20} className="text-gray-600 dark:text-gray-400" />
                  )}
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      {session.device}
                    </h4>
                    {session.current && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                        <CheckCircle size={12} className="mr-1" />
                        Current session
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                    <div className="flex items-center">
                      <MapPin size={12} className="mr-1" />
                      {session.location}
                    </div>
                    <div className="flex items-center">
                      <Globe size={12} className="mr-1" />
                      {session.ip}
                    </div>
                    <div className="flex items-center">
                      <Calendar size={12} className="mr-1" />
                      {session.lastActive}
                    </div>
                  </div>
                </div>
              </div>
              {!session.current && (
                <button className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-sm font-medium">
                  Revoke
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Security Recommendations */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6 border border-blue-200 dark:border-blue-800">
        <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-4">
          Security Recommendations
        </h3>
        <ul className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
          <li className="flex items-start">
            <CheckCircle size={16} className="mr-2 mt-0.5 text-green-600" />
            Use a strong, unique password for your account
          </li>
          <li className="flex items-start">
            <AlertTriangle size={16} className="mr-2 mt-0.5 text-yellow-600" />
            Enable two-factor authentication for additional security
          </li>
          <li className="flex items-start">
            <CheckCircle size={16} className="mr-2 mt-0.5 text-green-600" />
            Regularly review your active sessions
          </li>
          <li className="flex items-start">
            <AlertTriangle size={16} className="mr-2 mt-0.5 text-yellow-600" />
            Sign out from devices you no longer use
          </li>
        </ul>
      </div>
    </div>
  );
} 