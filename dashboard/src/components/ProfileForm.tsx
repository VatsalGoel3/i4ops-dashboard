import { useState } from 'react';
import { User } from '@supabase/supabase-js';
import { Save, X, Loader } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../lib/supabaseClient';
import { getUserDisplayName } from '../lib/userUtils';

interface ProfileFormProps {
  user: User | null;
  onSave: () => void;
  onCancel: () => void;
}

interface ProfileData {
  displayName: string;
  firstName: string;
  lastName: string;
  timezone: string;
  language: string;
  bio: string;
}

export default function ProfileForm({ user, onSave, onCancel }: ProfileFormProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<ProfileData>({
    displayName: getUserDisplayName(user),
    firstName: user?.user_metadata?.first_name || '',
    lastName: user?.user_metadata?.last_name || '',
    timezone: user?.user_metadata?.timezone || 'UTC',
    language: user?.user_metadata?.language || 'en',
    bio: user?.user_metadata?.bio || '',
  });

  const [errors, setErrors] = useState<Partial<ProfileData>>({});

  const validateForm = (): boolean => {
    const newErrors: Partial<ProfileData> = {};

    if (!formData.displayName.trim()) {
      newErrors.displayName = 'Display name is required';
    }

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }

    if (formData.bio.length > 500) {
      newErrors.bio = 'Bio must be 500 characters or less';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Please fix the form errors');
      return;
    }

    setLoading(true);

    try {
      // Update user metadata in Supabase
      const { error } = await supabase.auth.updateUser({
        data: {
          full_name: formData.displayName,
          first_name: formData.firstName,
          last_name: formData.lastName,
          timezone: formData.timezone,
          language: formData.language,
          bio: formData.bio,
        }
      });

      if (error) throw error;

      toast.success('Profile updated successfully!');
      onSave();
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast.error(error.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof ProfileData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const timezones = [
    { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
    { value: 'America/New_York', label: 'Eastern Time (ET)' },
    { value: 'America/Chicago', label: 'Central Time (CT)' },
    { value: 'America/Denver', label: 'Mountain Time (MT)' },
    { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
    { value: 'Europe/London', label: 'Greenwich Mean Time (GMT)' },
    { value: 'Europe/Paris', label: 'Central European Time (CET)' },
    { value: 'Asia/Tokyo', label: 'Japan Standard Time (JST)' },
    { value: 'Asia/Shanghai', label: 'China Standard Time (CST)' },
    { value: 'Australia/Sydney', label: 'Australian Eastern Time (AET)' },
  ];

  const languages = [
    { value: 'en', label: 'English' },
    { value: 'es', label: 'Spanish' },
    { value: 'fr', label: 'French' },
    { value: 'de', label: 'German' },
    { value: 'ja', label: 'Japanese' },
    { value: 'zh', label: 'Chinese' },
  ];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Edit Profile
        </h2>
        <div className="flex space-x-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
          >
            <X size={16} className="mr-2 inline" />
            Cancel
          </button>
          <button
            type="submit"
            form="profile-form"
            disabled={loading}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center"
          >
            {loading ? (
              <Loader size={16} className="mr-2 animate-spin" />
            ) : (
              <Save size={16} className="mr-2" />
            )}
            Save Changes
          </button>
        </div>
      </div>

      <form id="profile-form" onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Display Name *
            </label>
            <input
              type="text"
              value={formData.displayName}
              onChange={(e) => handleInputChange('displayName', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                errors.displayName ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="How you'd like to be displayed"
              disabled={loading}
            />
            {errors.displayName && (
              <p className="text-red-500 text-sm mt-1">{errors.displayName}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Email Address
            </label>
            <input
              type="email"
              value={user?.email || ''}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 dark:bg-gray-600 dark:border-gray-600 dark:text-gray-400"
              disabled
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Email cannot be changed here. Contact support if needed.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              First Name *
            </label>
            <input
              type="text"
              value={formData.firstName}
              onChange={(e) => handleInputChange('firstName', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                errors.firstName ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Your first name"
              disabled={loading}
            />
            {errors.firstName && (
              <p className="text-red-500 text-sm mt-1">{errors.firstName}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Last Name *
            </label>
            <input
              type="text"
              value={formData.lastName}
              onChange={(e) => handleInputChange('lastName', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                errors.lastName ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Your last name"
              disabled={loading}
            />
            {errors.lastName && (
              <p className="text-red-500 text-sm mt-1">{errors.lastName}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Timezone
            </label>
            <select
              value={formData.timezone}
              onChange={(e) => handleInputChange('timezone', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              disabled={loading}
            >
              {timezones.map((tz) => (
                <option key={tz.value} value={tz.value}>
                  {tz.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Language
            </label>
            <select
              value={formData.language}
              onChange={(e) => handleInputChange('language', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              disabled={loading}
            >
              {languages.map((lang) => (
                <option key={lang.value} value={lang.value}>
                  {lang.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Bio */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Bio
          </label>
          <textarea
            value={formData.bio}
            onChange={(e) => handleInputChange('bio', e.target.value)}
            rows={4}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
              errors.bio ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Tell us a bit about yourself..."
            disabled={loading}
            maxLength={500}
          />
          <div className="flex justify-between items-center mt-1">
            {errors.bio && (
              <p className="text-red-500 text-sm">{errors.bio}</p>
            )}
            <p className="text-xs text-gray-500 dark:text-gray-400 ml-auto">
              {formData.bio.length}/500 characters
            </p>
          </div>
        </div>
      </form>
    </div>
  );
} 