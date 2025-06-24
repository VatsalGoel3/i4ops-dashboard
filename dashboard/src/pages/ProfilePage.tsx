import { useState } from 'react';
import { 
  User, 
  Shield, 
  Settings, 
  Activity, 
  Camera,
  Mail,
  Calendar,
  MapPin,
  Smartphone
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getUserDisplayName, getUserRole, getBestAvatarUrl } from '../lib/userUtils';
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
          <div className="space-y-6">
            {/* Profile Header */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-start space-x-6">
                <div className="relative">
                  <UserAvatar user={user} size="xl" />
                  <button
                    onClick={() => setShowAvatarUpload(true)}
                    className="absolute -bottom-2 -right-2 bg-indigo-600 text-white rounded-full p-2 hover:bg-indigo-700 transition-colors shadow-lg"
                    title="Change avatar"
                  >
                    <Camera size={16} />
                  </button>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        {displayName}
                      </h1>
                      <p className="text-gray-600 dark:text-gray-400 flex items-center mt-1">
                        <Mail size={16} className="mr-2" />
                        {user?.email || 'No email'}
                      </p>
                    </div>
                    <button
                      onClick={() => setIsEditing(true)}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                      Edit Profile
                    </button>
                  </div>
                  
                  <div className="flex flex-wrap gap-4 mt-4 text-sm text-gray-600 dark:text-gray-400">
                    <div className="flex items-center">
                      <User size={16} className="mr-2" />
                      <span className="bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200 px-2 py-1 rounded-full text-xs font-medium">
                        {userRole}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <Calendar size={16} className="mr-2" />
                      Joined {joinedDate}
                    </div>
                    <div className="flex items-center">
                      <Smartphone size={16} className="mr-2" />
                      Last active: {new Date().toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Profile Details */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Profile Information
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Display Name
                  </label>
                  <p className="text-gray-900 dark:text-white">{displayName}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Email Address
                  </label>
                  <p className="text-gray-900 dark:text-white">{user?.email || 'Not set'}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    User ID
                  </label>
                  <p className="text-gray-900 dark:text-white font-mono text-sm">{user?.id}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Account Status
                  </label>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                    Active
                  </span>
                </div>
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
                    w-full flex items-center px-4 py-3 text-left rounded-lg transition-colors
                    ${isActive 
                      ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200 border border-indigo-200 dark:border-indigo-800' 
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