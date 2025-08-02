import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { 
  faTimes, 
  faBrain, 
  faRocket, 
  faDollarSign, 
  faHome, 
  faChartLine, 
  faClock, 
  faCheckCircle, 
  faFlag, 
  faPlus 
} from "@fortawesome/free-solid-svg-icons";
import { motion } from "framer-motion";
import { Modal } from "../ui/Modal";
import { useUserActivities } from "../../hooks/useUserActivities";

// Tracker Modal Component
export function TrackerModal({ 
  isOpen, 
  onClose, 
  goal,
  progressData,
  milestones,
  activeTab,
  setActiveTab,
  savingsGap,
  onUpdate,
  onOptimisticUpdate,
  onProgressUpdate
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  goal: any;
  progressData: any;
  milestones: any[];
  activeTab: 'activity' | 'milestones';
  setActiveTab: (tab: 'activity' | 'milestones') => void;
  savingsGap: number;
  onUpdate: () => void;
  onOptimisticUpdate: (updates: any) => void;
  onProgressUpdate: any;
}) {
  const [showAIAdvice, setShowAIAdvice] = useState(true);
  const [currentAdviceIndex, setCurrentAdviceIndex] = useState(0);
  const [showAddFundsForm, setShowAddFundsForm] = useState(false);
  const [addFundsAmount, setAddFundsAmount] = useState('');
  const [isAddingFunds, setIsAddingFunds] = useState(false);
  
  // Get real activities and filter for this goal
  const { activities, isLoading: activitiesLoading } = useUserActivities();
  const goalActivities = activities.filter(activity => activity.goalId === goal.id);

  // Handle adding funds
  const handleAddFunds = async () => {
    if (!addFundsAmount || isAddingFunds) return;
    
    const amount = parseFloat(addFundsAmount);
    if (isNaN(amount) || amount <= 0) return;

    setIsAddingFunds(true);
    try {
      await onProgressUpdate({
        goalId: goal.id,
        newAmount: (goal.current_amount || 0) + amount,
        source: 'manual_update'
      });
      
      setAddFundsAmount('');
      setShowAddFundsForm(false);
      onUpdate();
    } catch (error) {
      console.error('Failed to add funds:', error);
    } finally {
      setIsAddingFunds(false);
    }
  };
  
  const aiAdviceMessages = [
    {
      message: `You'll need to save $${Math.abs(savingsGap)}/month to stay on track, and right now you're at $${progressData.monthlyCapacity}/month. We've got some work to do!`,
      type: savingsGap > 0 ? 'warning' : 'success'
    },
    {
      message: "Great progress! Your consistent saving habits are building a strong foundation for your financial future.",
      type: 'success'
    },
    {
      message: "Consider automating your savings to make reaching your goal even easier!",
      type: 'tip'
    }
  ];

  // Transform activities to display format
  const recentActivities = goalActivities.slice(0, 10).map(activity => ({
    type: activity.action,
    date: new Date(activity.created_at).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    }),
    amount: activity.metadata?.amount || 0,
    icon: activity.action.toLowerCase().includes('deposit') ? faRocket : faDollarSign
  }));

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="" size="large">
      <div className="max-w-md mx-auto bg-white dark:bg-gray-800 rounded-xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
              Goal Tracker
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <FontAwesomeIcon icon={faTimes} className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* AI Advice Section */}
        {showAIAdvice && (
          <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/30">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center flex-shrink-0">
                <FontAwesomeIcon icon={faBrain} className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                  {aiAdviceMessages[currentAdviceIndex].message}
                </p>
                
                {/* Pagination dots */}
                <div className="flex items-center justify-center gap-2 mt-3">
                  {aiAdviceMessages.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentAdviceIndex(index)}
                      className={`w-2 h-2 rounded-full transition-colors ${
                        index === currentAdviceIndex 
                          ? 'bg-indigo-500' 
                          : 'bg-gray-300 dark:bg-gray-600'
                      }`}
                    />
                  ))}
                </div>
              </div>
              <button
                onClick={() => setShowAIAdvice(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <FontAwesomeIcon icon={faTimes} className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Current Saving */}
        <div className="px-6 py-4">
          <div className="mb-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">Current Saving</span>
          </div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-2xl font-bold text-gray-900 dark:text-white">
              ${progressData.currentAmount.toLocaleString()}
            </span>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              ${(progressData.targetAmount - progressData.currentAmount).toLocaleString()} to go
            </span>
          </div>
          
          {/* Progress Bar */}
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <motion.div
              className="bg-gradient-to-r from-emerald-400 to-emerald-500 h-2 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progressData.progressPercentage}%` }}
              transition={{ duration: 1 }}
            />
          </div>
        </div>

        {/* Countdown Cards */}
        <div className="px-6 py-4">
          <div className="grid grid-cols-2 gap-3">
            {/* Days Until Target */}
            <div className="bg-indigo-100 dark:bg-indigo-900/30 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <FontAwesomeIcon icon={faHome} className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <div>
                  <div className="text-lg font-bold text-gray-900 dark:text-white">
                    {progressData.daysLeft} Days
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    Until {goal.goal_type === 'house' ? 'Home Purchase' : 'Goal Achievement'}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Progress Percentage */}
            <div className="bg-green-100 dark:bg-green-900/30 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <FontAwesomeIcon icon={faChartLine} className="w-5 h-5 text-green-600 dark:text-green-400" />
                <div>
                  <div className="text-lg font-bold text-gray-900 dark:text-white">
                    {progressData.progressPercentage.toFixed(2)}%
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    Progress to Goal
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-6">
          <div className="flex border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setActiveTab('activity')}
              className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'activity'
                  ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              Activity
            </button>
            <button
              onClick={() => setActiveTab('milestones')}
              className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'milestones'
                  ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              Milestones
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="px-6 py-4 max-h-80 overflow-y-auto">
          {activeTab === 'activity' ? (
            <div className="space-y-3">
              {activitiesLoading ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <FontAwesomeIcon icon={faClock} className="w-8 h-8 mb-2 animate-spin" />
                  <p className="text-sm">Loading activities...</p>
                </div>
              ) : recentActivities.length > 0 ? (
                recentActivities.map((activity, index) => (
                  <div key={index} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                        <FontAwesomeIcon 
                          icon={activity.icon} 
                          className="w-4 h-4 text-gray-600 dark:text-gray-400" 
                        />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {activity.type}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {activity.date}
                        </div>
                      </div>
                    </div>
                    <div className="font-semibold text-gray-900 dark:text-white">
                      ${activity.amount.toFixed(2)}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <FontAwesomeIcon icon={faRocket} className="w-8 h-8 mb-2" />
                  <p className="text-sm">No activities yet</p>
                  <p className="text-xs">Activity for this goal will appear here</p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {milestones && milestones.length > 0 ? (
                milestones.map((milestone) => (
                  <div key={milestone.id} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        milestone.status === 'completed' 
                          ? 'bg-green-100 dark:bg-green-900/30' 
                          : 'bg-gray-100 dark:bg-gray-700'
                      }`}>
                        <FontAwesomeIcon 
                          icon={milestone.status === 'completed' ? faCheckCircle : faFlag} 
                          className={`w-4 h-4 ${
                            milestone.status === 'completed' 
                              ? 'text-green-600 dark:text-green-400' 
                              : 'text-gray-600 dark:text-gray-400'
                          }`} 
                        />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white text-sm">
                          {milestone.title}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {milestone.due_date ? new Date(milestone.due_date).toLocaleDateString() : 'No due date'}
                        </div>
                      </div>
                    </div>
                    {milestone.target_amount && (
                      <div className="font-semibold text-gray-900 dark:text-white text-sm">
                        ${milestone.target_amount.toLocaleString()}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <FontAwesomeIcon icon={faFlag} className="w-8 h-8 mb-2" />
                  <p className="text-sm">No milestones yet</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Add Funds Section (only in activity tab) */}
        {activeTab === 'activity' && (
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
            {!showAddFundsForm ? (
              <button 
                onClick={() => setShowAddFundsForm(true)}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-3 px-4 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
              >
                <FontAwesomeIcon icon={faPlus} className="w-4 h-4" />
                Add Funds
              </button>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400">
                      $
                    </span>
                    <input
                      type="number"
                      value={addFundsAmount}
                      onChange={(e) => setAddFundsAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-8 pr-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-gray-900 dark:text-white"
                      min="0"
                      step="0.01"
                      disabled={isAddingFunds}
                    />
                  </div>
                  <button
                    onClick={handleAddFunds}
                    disabled={!addFundsAmount || isAddingFunds || parseFloat(addFundsAmount) <= 0}
                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-400 text-white rounded-lg font-medium flex items-center gap-2 transition-colors"
                  >
                    {isAddingFunds ? (
                      <FontAwesomeIcon icon={faClock} className="w-4 h-4 animate-spin" />
                    ) : (
                      <FontAwesomeIcon icon={faPlus} className="w-4 h-4" />
                    )}
                    {isAddingFunds ? 'Adding...' : 'Add'}
                  </button>
                </div>
                <button
                  onClick={() => {
                    setShowAddFundsForm(false);
                    setAddFundsAmount('');
                  }}
                  className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                  disabled={isAddingFunds}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
