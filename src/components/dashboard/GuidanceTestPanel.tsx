import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { dashboardGuidanceMonitor } from '@/utils/dashboard-guidance-monitor';
import { Badge } from '@/components/ui/badge';

interface GuidanceTestPanelProps {
  onClose?: () => void;
}

export const GuidanceTestPanel: React.FC<GuidanceTestPanelProps> = ({ onClose }) => {
  // Direct tooltip test function
  const testTooltipDirectly = () => {
    const monitorInstance = dashboardGuidanceMonitor as any;
    
    if (monitorInstance.onShowTooltip) {
      monitorInstance.onShowTooltip('educator', 'This is a direct test message from the test panel! 🧪', 'left');
    } else {
      console.error('onShowTooltip callback not found!');
    }
  };
  const handleTestAction = (action: string, data?: any) => {
    dashboardGuidanceMonitor.trackUserAction(action, data);
  };

  const handleResetState = () => {
    dashboardGuidanceMonitor.resetGuidanceState();
    // Reload the page to see fresh guidance
    setTimeout(() => window.location.reload(), 500);
  };

  const getStats = () => {
    const stats = dashboardGuidanceMonitor.getGuidanceStats();
    return stats;
  };

  const triggerSpecificScenario = (scenarioType: string) => {
    
    switch (scenarioType) {
      case 'first_dashboard_visit':
        dashboardGuidanceMonitor.resetGuidanceState();
        setTimeout(() => {
          dashboardGuidanceMonitor.trackRouteChange('/dashboard/', {});
        }, 1000);
        break;
        
      case 'tracker_first_visit':
        dashboardGuidanceMonitor.trackRouteChange('/dashboard/tracker/', {});
        break;
        
      case 'goal_creation_visit':
        dashboardGuidanceMonitor.trackRouteChange('/dashboard/tracker/create/', {});
        break;
        
      case 'goal_created':
        handleTestAction('goal_created', { goalId: 'test-goal-123', goalTitle: 'Test Savings Goal' });
        setTimeout(() => {
          dashboardGuidanceMonitor.trackRouteChange('/dashboard/tracker/test-goal-123', { goalId: 'test-goal-123' });
        }, 1000);
        break;
        
      case 'learning_first_visit':
        dashboardGuidanceMonitor.trackRouteChange('/dashboard/learning/', {});
        break;
        
      case 'essentials_first_visit':
        dashboardGuidanceMonitor.trackRouteChange('/dashboard/essentials/', {});
        break;
        
      case 'course_selection':
        dashboardGuidanceMonitor.trackRouteChange('/dashboard/learning/investing-basics/', { courseId: 'investing-basics' });
        break;
        
      case 'first_lesson':
        dashboardGuidanceMonitor.trackRouteChange('/dashboard/learning/investing-basics/lesson/intro-to-investing', { 
          courseId: 'investing-basics', 
          lessonId: 'intro-to-investing' 
        });
        break;
        
      case 'portfolio_first_visit':
        dashboardGuidanceMonitor.trackRouteChange('/dashboard/portfolio/', {});
        break;
        
      case 'settings_first_visit':
        dashboardGuidanceMonitor.trackRouteChange('/dashboard/user-settings/', {});
        break;
        
      case 'profile_visit':
        dashboardGuidanceMonitor.trackRouteChange('/dashboard/user-settings/profile', {});
        break;
        
      case 'membership_visit':
        dashboardGuidanceMonitor.trackRouteChange('/dashboard/user-settings/membership/', {});
        break;
        
      case 'lesson_completed':
        handleTestAction('lesson_completed', { 
          lessonId: 'test-lesson-123', 
          courseId: 'test-course-456' 
        });
        setTimeout(() => {
          dashboardGuidanceMonitor.trackRouteChange('/dashboard/learning/test-course-456', { courseId: 'test-course-456' });
        }, 1000);
        break;
        
      case 'return_user_simulation':
        // Mark user as having visited before
        handleTestAction('learning_visited');
        handleTestAction('portfolio_visited');
        setTimeout(() => {
          dashboardGuidanceMonitor.trackRouteChange('/dashboard/', {});
        }, 1000);
        break;
        
      default:
        console.log('Unknown scenario type:', scenarioType);
    }
  };

  const stats = getStats();

  return (
    <Card className="w-full max-w-2xl mx-auto bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg text-orange-800 dark:text-orange-200">
            🧪 Guidance System Test Panel
          </CardTitle>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose} className="text-orange-600">
              ✕
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Current Stats */}
        <div className="bg-white/50 dark:bg-slate-800/50 p-3 rounded-lg">
          <h4 className="font-semibold text-sm mb-2 text-orange-800 dark:text-orange-200">Current Stats:</h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>Total Visits: <Badge variant="secondary">{stats?.totalVisits || 0}</Badge></div>
            <div>Routes Visited: <Badge variant="secondary">{stats?.routesVisited || 0}</Badge></div>
            <div>Scenarios Shown: <Badge variant="secondary">{stats?.scenariosShown || 0}</Badge></div>
            <div>Has Created Goal: <Badge variant={stats?.userJourney?.hasCreatedGoal ? "default" : "outline"}>
              {stats?.userJourney?.hasCreatedGoal ? 'Yes' : 'No'}
            </Badge></div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-3">
          <h4 className="font-semibold text-sm text-orange-800 dark:text-orange-200">Quick Actions:</h4>
          
          <div className="grid grid-cols-2 gap-2">
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => handleTestAction('chat_used', { aiType: 'advisor' })}
              className="text-xs"
            >
              Mark Chat Used
            </Button>
            
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => handleTestAction('learning_visited')}
              className="text-xs"
            >
              Mark Learning Visited
            </Button>
            
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => handleTestAction('portfolio_visited')}
              className="text-xs"
            >
              Mark Portfolio Visited
            </Button>
            
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => handleTestAction('goal_created', { goalId: 'test-123' })}
              className="text-xs"
            >
              Mark Goal Created
            </Button>
          </div>
        </div>

        {/* Scenario Triggers */}
        <div className="space-y-3">
          <h4 className="font-semibold text-sm text-orange-800 dark:text-orange-200">Test Scenarios:</h4>
          
          <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto">
            <Button 
              size="sm" 
              onClick={() => triggerSpecificScenario('first_dashboard_visit')}
              className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200"
            >
              🏠 First Dashboard Visit
            </Button>
            
            <Button 
              size="sm" 
              onClick={() => triggerSpecificScenario('tracker_first_visit')}
              className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200"
            >
              🎯 First Tracker Visit
            </Button>
            
            <Button 
              size="sm" 
              onClick={() => triggerSpecificScenario('goal_creation_visit')}
              className="text-xs bg-green-100 hover:bg-green-200 text-green-800 dark:bg-green-900/30 dark:text-green-200"
            >
              ➕ Goal Creation Page
            </Button>
            
            <Button 
              size="sm" 
              onClick={() => triggerSpecificScenario('goal_created')}
              className="text-xs bg-green-100 hover:bg-green-200 text-green-800 dark:bg-green-900/30 dark:text-green-200"
            >
              🎊 Goal Created Success
            </Button>
            
            <Button 
              size="sm" 
              onClick={() => triggerSpecificScenario('learning_first_visit')}
              className="text-xs bg-purple-100 hover:bg-purple-200 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200"
            >
              📚 First Learning Visit
            </Button>
            
            <Button 
              size="sm" 
              onClick={() => triggerSpecificScenario('essentials_first_visit')}
              className="text-xs bg-purple-100 hover:bg-purple-200 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200"
            >
              🏗️ First Essentials Visit
            </Button>
            
            <Button 
              size="sm" 
              onClick={() => triggerSpecificScenario('course_selection')}
              className="text-xs bg-purple-100 hover:bg-purple-200 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200"
            >
              📖 Course Selection
            </Button>
            
            <Button 
              size="sm" 
              onClick={() => triggerSpecificScenario('first_lesson')}
              className="text-xs bg-purple-100 hover:bg-purple-200 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200"
            >
              🚀 First Lesson Visit
            </Button>
            
            <Button 
              size="sm" 
              onClick={() => triggerSpecificScenario('lesson_completed')}
              className="text-xs bg-indigo-100 hover:bg-indigo-200 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-200"
            >
              ✅ Lesson Completed
            </Button>
            
            <Button 
              size="sm" 
              onClick={() => triggerSpecificScenario('portfolio_first_visit')}
              className="text-xs bg-yellow-100 hover:bg-yellow-200 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200"
            >
              💰 First Portfolio Visit
            </Button>
            
            <Button 
              size="sm" 
              onClick={() => triggerSpecificScenario('settings_first_visit')}
              className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-800 dark:bg-gray-900/30 dark:text-gray-200"
            >
              ⚙️ First Settings Visit
            </Button>
            
            <Button 
              size="sm" 
              onClick={() => triggerSpecificScenario('profile_visit')}
              className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-800 dark:bg-gray-900/30 dark:text-gray-200"
            >
              👤 Profile Page Visit
            </Button>
            
            <Button 
              size="sm" 
              onClick={() => triggerSpecificScenario('membership_visit')}
              className="text-xs bg-pink-100 hover:bg-pink-200 text-pink-800 dark:bg-pink-900/30 dark:text-pink-200"
            >
              👑 Membership Page Visit
            </Button>
            
            <Button 
              size="sm" 
              onClick={() => triggerSpecificScenario('return_user_simulation')}
              className="text-xs bg-teal-100 hover:bg-teal-200 text-teal-800 dark:bg-teal-900/30 dark:text-teal-200"
            >
              🔄 Return User Simulation
            </Button>
          </div>
        </div>

        {/* Direct Testing */}
        <div className="space-y-3 pt-3 border-t border-orange-200 dark:border-orange-700">
          <h4 className="font-semibold text-sm text-orange-800 dark:text-orange-200">Direct Testing:</h4>
          
          <div className="flex gap-2">
            <Button 
              size="sm" 
              onClick={testTooltipDirectly}
              className="text-xs bg-red-100 hover:bg-red-200 text-red-800 dark:bg-red-900/30 dark:text-red-200"
            >
              🔥 Test Tooltip Directly
            </Button>
          </div>
        </div>

        {/* System Controls */}
        <div className="space-y-3 pt-3 border-t border-orange-200 dark:border-orange-700">
          <h4 className="font-semibold text-sm text-orange-800 dark:text-orange-200">System Controls:</h4>
          
          <div className="flex gap-2">
            <Button 
              size="sm" 
              variant="outline" 
              onClick={getStats}
              className="text-xs"
            >
              📊 Log Stats
            </Button>
            
            <Button 
              size="sm" 
              variant="destructive" 
              onClick={handleResetState}
              className="text-xs"
            >
              🔄 Reset & Reload
            </Button>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-200 dark:border-blue-700">
          <h4 className="font-semibold text-xs mb-1 text-blue-800 dark:text-blue-200">How to Test:</h4>
          <ol className="text-xs text-blue-700 dark:text-blue-300 space-y-1 list-decimal list-inside">
            <li>Click "Reset & Reload" to start fresh</li>
            <li>Try different scenario buttons to trigger guidance messages</li>
            <li>Look for tooltips appearing on the right sidebar chat agents</li>
            <li>Check browser console for detailed logs</li>
            <li>Navigate between different dashboard pages to test route-based scenarios</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
};