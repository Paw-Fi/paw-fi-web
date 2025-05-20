import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';
import { createFileRoute, useNavigate } from '@tanstack/react-router';

export const Route = createFileRoute('/profile/')({  
  component: Profile,
});

export function Profile() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState(user?.user_metadata?.full_name || '');
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    if (!user) {
      navigate({ to: '/login' });
    }
  }, [user, navigate]);
  
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
                onClick={() => {
                  // This would typically open a modal or navigate to a password reset page
                  alert('Password reset functionality would go here');
                }}
              >
                Reset Password
              </Button>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-red-600">Danger Zone</h3>
              <Button
                variant="outline"
                className="mt-2 text-red-600 border-red-300 hover:bg-red-50"
                onClick={() => {
                  // This would typically open a confirmation modal
                  alert('Account deletion functionality would go here');
                }}
              >
                Delete Account
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Profile;
