import { useState, useRef } from 'react';
import type { User } from '@supabase/supabase-js';
import { Upload, X, Camera, Trash2, Loader } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../lib/supabaseClient';
import { config } from '../lib/config';
import UserAvatar from './UserAvatar';

interface AvatarUploadProps {
  user: User | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AvatarUpload({ user, onClose, onSuccess }: AvatarUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (file: File) => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    setSelectedFile(file);

    // Create preview URL
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const uploadAvatar = async () => {
    if (!selectedFile || !user) return;

    setUploading(true);

    try {
      // Upload to local server using the correct API configuration
      const formData = new FormData();
      formData.append('avatar', selectedFile);
      formData.append('userId', user.id);

      const response = await fetch(`${config.api.baseUrl}/upload/avatar`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload avatar');
      }

      const { avatarUrl } = await response.json();

      // Update user metadata with new avatar URL
      const { error: updateError } = await supabase.auth.updateUser({
        data: {
          avatar_url: avatarUrl
        }
      });

      if (updateError) throw updateError;

      toast.success('Avatar updated successfully!');
      onSuccess();
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      toast.error(error.message || 'Failed to upload avatar');
    } finally {
      setUploading(false);
    }
  };

  const removeAvatar = async () => {
    if (!user) return;

    setUploading(true);

    try {
      // Remove avatar URL from user metadata
      const { error } = await supabase.auth.updateUser({
        data: {
          avatar_url: null
        }
      });

      if (error) throw error;

      toast.success('Avatar removed successfully!');
      onSuccess();
    } catch (error: any) {
      console.error('Error removing avatar:', error);
      toast.error(error.message || 'Failed to remove avatar');
    } finally {
      setUploading(false);
    }
  };

  const clearSelection = () => {
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Update Avatar
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            disabled={uploading}
          >
            <X size={24} />
          </button>
        </div>

        {/* Current Avatar */}
        <div className="text-center mb-6">
          <div className="inline-block relative">
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="Avatar preview"
                className="w-20 h-20 rounded-full object-cover border-4 border-gray-200 dark:border-gray-600"
              />
            ) : (
              <UserAvatar user={user} size="xl" />
            )}
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            {previewUrl ? 'New avatar preview' : 'Current avatar'}
          </p>
        </div>

        {/* Upload Area */}
        {!selectedFile && (
          <div
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
              dragActive
                ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                : 'border-gray-300 dark:border-gray-600 hover:border-indigo-400'
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <Upload size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Drop your image here
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              or click to browse
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              disabled={uploading}
            >
              <Camera size={16} className="inline mr-2" />
              Choose File
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileInput}
              className="hidden"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
              Supports: JPG, PNG, GIF • Max size: 5MB
            </p>
          </div>
        )}

        {/* Selected File Info */}
        {selectedFile && (
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  {selectedFile.name}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <button
                onClick={clearSelection}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                disabled={uploading}
              >
                <X size={20} />
              </button>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex space-x-3">
          {/* Upload Button */}
          <button
            onClick={uploadAvatar}
            disabled={!selectedFile || uploading}
            className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {uploading ? (
              <Loader size={16} className="animate-spin mr-2" />
            ) : (
              <Upload size={16} className="mr-2" />
            )}
            {uploading ? 'Uploading...' : 'Upload Avatar'}
          </button>

          {/* Remove Avatar Button */}
          {user?.user_metadata?.avatar_url && (
            <button
              onClick={removeAvatar}
              disabled={uploading}
              className="px-4 py-2 text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors disabled:opacity-50 flex items-center"
            >
              <Trash2 size={16} className="mr-2" />
              Remove
            </button>
          )}
        </div>

        {/* Note about local storage */}
        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <p className="text-xs text-blue-600 dark:text-blue-400">
            📝 <strong>Note:</strong> Avatar images are stored locally on the server. 
            Use square images for best results.
          </p>
        </div>
      </div>
    </div>
  );
} 