import { useAuth } from '@/contexts/auth-context';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect } from 'react';

export const Route = createFileRoute('/dashboard/')({  
  component: Dashboard,
});

export function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

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

  
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
      
      <div className="bg-white shadow rounded-lg p-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-2">Welcome back, {user?.user_metadata?.full_name || 'User'}!</h2>
          <p className="text-gray-600">
            Track your learning progress and achievements here.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-blue-50 p-6 rounded-lg">
            <h3 className="font-medium mb-2">Learning Progress</h3>
            <div className="text-3xl font-bold text-blue-600">0%</div>
            <p className="text-sm text-gray-600 mt-2">
              Start a course to track your progress
            </p>
          </div>
          
          <div className="bg-green-50 p-6 rounded-lg">
            <h3 className="font-medium mb-2">XP Earned</h3>
            <div className="text-3xl font-bold text-green-600">0</div>
            <p className="text-sm text-gray-600 mt-2">
              Complete lessons to earn XP
            </p>
          </div>
          
          <div className="bg-purple-50 p-6 rounded-lg">
            <h3 className="font-medium mb-2">Badges</h3>
            <div className="text-3xl font-bold text-purple-600">0</div>
            <p className="text-sm text-gray-600 mt-2">
              Earn badges by completing courses
            </p>
          </div>
        </div>
        
        <div className="mt-8">
          <h3 className="text-lg font-semibold mb-4">Recommended Courses</h3>
          <div className="bg-gray-100 p-8 rounded-lg text-center">
            <p className="text-gray-600">
              No courses available yet. Chat with our AI to get personalized recommendations.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
