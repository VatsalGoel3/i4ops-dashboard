import { useState } from 'react';
import { 
  User, 
  Shield, 
  Settings, 
  Activity, 
  Camera,
  Mail,
  Calendar,
  Globe,
  Smartphone
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getUserDisplayName, getUserRole } from '../lib/userUtils';
import UserAvatar from '../components/UserAvatar';
import ProfileForm from '../components/ProfileForm';
import AvatarUpload from '../components/AvatarUpload';
import SecuritySettings from '../components/SecuritySettings';
import PreferencesSettings from '../components/PreferencesSettings';
import ActivityLog from '../components/ActivityLog';

type ProfileSection = 'overview' | 'security' | 'preferences' | 'activity';

export default function ProfilePage() {
  const { user } = useAuth();
  const [activeSection, setActiveSection] = useState<ProfileSection>('overview');
  const [isEditing, setIsEditing] = useState(false);
  const [showAvatarUpload, setShowAvatarUpload] = useState(false);

  const displayName = getUserDisplayName(user);
  const userRole = getUserRole(user);
  const joinedDate = user?.created_at ? new Date(user.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }) : 'Unknown';

  const sections = [
    { id: 'overview', label: 'Overview', icon: User },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'preferences', label: 'Preferences', icon: Settings },
    { id: 'activity', label: 'Activity', icon: Activity },
  ] as const;

  const renderSectionContent = () => {
    switch (activeSection) {
      case 'overview':
        return isEditing ? (
          <ProfileForm 
            user={user}
            onSave={() => setIsEditing(false)}
            onCancel={() => setIsEditing(false)}
          />
        ) : (
          <div className="space-y-8">
            {/* Enhanced Profile Header */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-8 border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="flex flex-col md:flex-row items-start md:items-center space-y-6 md:space-y-0 md:space-x-8">
                <div className="relative flex-shrink-0">
                  <div className="relative">
                    <UserAvatar user={user} size="2xl" className="shadow-lg" />
                    <button
                      onClick={() => setShowAvatarUpload(true)}
                      className="absolute -bottom-2 -right-2 bg-indigo-600 text-white rounded-full p-2.5 hover:bg-indigo-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
                      title="Change avatar"
                    >
                      <Camera size={18} />
                    </button>
                  </div>
                </div>
                
                <div className="flex-1 min-w-0 space-y-4">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
                    <div>
                      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                        {displayName}
                      </h1>
                      <div className="flex items-center text-gray-600 dark:text-gray-400 mb-3">
                        <Mail size={18} className="mr-3" />
                        <span className="text-lg">{user?.email || 'No email'}</span>
                      </div>
                      <div className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600">
                        <User size={14} className="mr-2" />
                        {userRole} Account
                      </div>
                    </div>
                    <button
                      onClick={() => setIsEditing(true)}
                      className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all shadow-md hover:shadow-lg transform hover:scale-105 font-medium"
                    >
                      Edit Profile
                    </button>
                  </div>
                  
                  <div className="flex flex-wrap gap-6 text-sm text-gray-600 dark:text-gray-400">
                    <div className="flex items-center">
                      <Calendar size={16} className="mr-2 text-gray-500" />
                      <span>Member since {joinedDate}</span>
                    </div>
                    <div className="flex items-center">
                      <Smartphone size={16} className="mr-2 text-gray-500" />
                      <span>Last active today</span>
                    </div>
                    <div className="flex items-center">
                      <Globe size={16} className="mr-2 text-gray-500" />
                      <span>Active session</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Profile Details Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Basic Information */}
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
                  <User size={20} className="mr-3 text-indigo-600" />
                  Basic Information
                </h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Display Name
                    </label>
                    <p className="text-gray-900 dark:text-white font-medium">{displayName}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Email Address
                    </label>
                    <p className="text-gray-900 dark:text-white">{user?.email || 'Not set'}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Role
                    </label>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                      {userRole}
                    </span>
                  </div>
                </div>
              </div>

              {/* Account Status */}
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
                  <Shield size={20} className="mr-3 text-green-600" />
                  Account Status
                </h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Status
                    </label>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                      ● Active
                    </span>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Authentication
                    </label>
                    <p className="text-gray-900 dark:text-white">Email & Password</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Two-Factor Auth
                    </label>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                      Not Enabled
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                Quick Actions
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  onClick={() => setActiveSection('security')}
                  className="p-6 text-left border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-500 transition-all"
                >
                  <Shield size={20} className="text-gray-600 dark:text-gray-400 mb-3" />
                  <h3 className="font-medium text-gray-900 dark:text-white mb-1">Security Settings</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Manage passwords and sessions</p>
                </button>
                
                <button
                  onClick={() => setActiveSection('preferences')}
                  className="p-6 text-left border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-500 transition-all"
                >
                  <Settings size={20} className="text-gray-600 dark:text-gray-400 mb-3" />
                  <h3 className="font-medium text-gray-900 dark:text-white mb-1">Preferences</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Customize your experience</p>
                </button>
                
                <button
                  onClick={() => setActiveSection('activity')}
                  className="p-6 text-left border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-500 transition-all"
                >
                  <Activity size={20} className="text-gray-600 dark:text-gray-400 mb-3" />
                  <h3 className="font-medium text-gray-900 dark:text-white mb-1">Activity Log</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">View account activity</p>
                </button>
              </div>
            </div>
          </div>
        );
      
      case 'security':
        return <SecuritySettings user={user} />;
      
      case 'preferences':
        return <PreferencesSettings user={user} />;
      
      case 'activity':
        return <ActivityLog user={user} />;
      
      default:
        return null;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">My Profile</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Manage your account settings, security preferences, and personal information
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Navigation Sidebar */}
        <div className="lg:col-span-1">
          <nav className="space-y-2">
            {sections.map((section) => {
              const Icon = section.icon;
              const isActive = activeSection === section.id;
              
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`
                    w-full flex items-center px-4 py-3 text-left rounded-lg transition-all
                    ${isActive 
                      ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200 border border-indigo-200 dark:border-indigo-800 shadow-sm' 
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }
                  `}
                >
                  <Icon size={20} className="mr-3" />
                  {section.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          {renderSectionContent()}
        </div>
      </div>

      {/* Avatar Upload Modal */}
      {showAvatarUpload && (
        <AvatarUpload
          user={user}
          onClose={() => setShowAvatarUpload(false)}
          onSuccess={() => {
            setShowAvatarUpload(false);
            // TODO: Refresh user data
          }}
        />
      )}
    </div>
  );
} 