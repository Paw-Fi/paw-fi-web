import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { seo } from '@/utils/seo';
import { getCanonicalUrl } from '@/utils/canonical';

export const Route = createFileRoute('/dashboard/user-settings/')({  
  component: UserSettings,
  head: () => {
    const pageUrl = getCanonicalUrl('/dashboard/user-settings');
    const meta = seo({
      title: 'User Settings | Moneko',
      description: 'Manage your account settings, update your profile, and configure your Moneko experience.',
      keywords: 'user settings, account settings, profile, Moneko',
      url: pageUrl,
    });
    
    return {
      meta,
      link: [
        {
          rel: 'canonical',
          href: pageUrl
        }
      ]
    };
  },
});

export function UserSettings() {
  const { user, resetPassword, deleteAccount, signOut } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState(user?.user_metadata?.full_name || '');
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  
  if (!user) {
    return <div className="flex items-center justify-center h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
    </div>;
  }

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    setError(null);
    setUpdateSuccess(false);
    
    try {
      const { error } = await supabase.auth.updateUser({
        data: { full_name: fullName }
      });
      
      if (error) throw error;
      
      // Update the profile in the users table
      if (user) {
        const { error: profileError } = await supabase
          .from('users')
          .update({ full_name: fullName, updated_at: new Date().toISOString() })
          .eq('id', user.id);
          
        if (profileError) throw profileError;
      }
      
      setUpdateSuccess(true);
    } catch (err: any) {
      setError(err.message || 'An error occurred while updating your profile');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleResetPassword = async () => {
    if (!user?.email) return;
    
    setIsResetting(true);
    setError(null);
    setResetSuccess(false);
    
    try {
      await resetPassword(user.email, '/reset-password');
      setResetSuccess(true);
    } catch (err: any) {
      setError(err.message || 'An error occurred while sending reset email');
    } finally {
      setIsResetting(false);
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    setError(null);
    
    try {
      await deleteAccount();
      await signOut();
      navigate({ to: '/' });
    } catch (err: any) {
      setError(err.message || 'An error occurred while deleting your account');
      setShowDeleteConfirm(false);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className=" w-[85vw] lg:w-[40rem] mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold mb-6">Your Profile</h1>
      
      <div className="bg-white shadow rounded-lg p-6 max-w-2xl">
        <form onSubmit={handleUpdateProfile} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <Input
              id="email"
              type="email"
              value={user?.email || ''}
              disabled
              className="bg-gray-50"
            />
            <p className="mt-1 text-xs text-gray-500">Your email cannot be changed</p>
          </div>
          
          <div>
            <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
              Full Name
            </label>
            <Input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Enter your full name"
              required
            />
          </div>
          
          {error && (
            <div className="text-red-500 text-sm p-2 bg-red-50 rounded">
              {error}
            </div>
          )}
          
          {updateSuccess && (
            <div className="text-green-500 text-sm p-2 bg-green-50 rounded">
              Profile updated successfully!
            </div>
          )}
          
          <div>
            <Button
              type="submit"
              disabled={isUpdating}
              className="w-full sm:w-auto"
            >
              {isUpdating ? 'Updating...' : 'Update Profile'}
            </Button>
          </div>
        </form>
        
        <div className="mt-8 pt-6 border-t border-gray-200">
          <h2 className="text-lg font-semibold mb-4">Account Settings</h2>
          
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-gray-700">Change Password</h3>
              <Button
                variant="outline"
                className="mt-2"
                onClick={handleResetPassword}
                disabled={isResetting}
              >
                {isResetting ? 'Sending Reset Email...' : 'Reset Password'}
              </Button>
              {resetSuccess && (
                <div className="mt-2 text-green-600 text-sm">
                  Password reset email sent! Check your inbox.
                </div>
              )}
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-red-600">Danger Zone</h3>
              <Button
                variant="outline"
                className="mt-2 text-red-600 border-red-300 hover:bg-red-50"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isDeleting}
              >
                Delete Account
              </Button>
              
              {showDeleteConfirm && (
                <div className="mt-4 p-4 border border-red-200 rounded-lg bg-red-50">
                  <h4 className="font-medium text-red-800 mb-2">Are you sure?</h4>
                  <p className="text-sm text-red-700 mb-4">
                    This action cannot be undone. All your data will be permanently deleted.
                  </p>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowDeleteConfirm(false)}
                      disabled={isDeleting}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-600 border-red-300 hover:bg-red-100"
                      onClick={handleDeleteAccount}
                      disabled={isDeleting}
                    >
                      {isDeleting ? 'Deleting...' : 'Yes, Delete My Account'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default UserSettings;
