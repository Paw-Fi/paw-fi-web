import React, { useState } from 'react';
import { useRouter } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowRight, faBullseye, faHome, faGraduationCap, faChartLine, faShield, faStar } from '@fortawesome/free-solid-svg-icons';
import { GoalAssessmentWizard } from './GoalAssessmentWizard';

export interface GoalType {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  badge?: string;
  color: string;
  assessmentQuestions: AssessmentQuestion[];
}

// FontAwesome icon wrapper components
const TargetIcon: React.FC<{ className?: string }> = ({ className }) => (
  <FontAwesomeIcon icon={faBullseye} className={className} />
);

const HomeIcon: React.FC<{ className?: string }> = ({ className }) => (
  <FontAwesomeIcon icon={faHome} className={className} />
);

const GraduationCapIcon: React.FC<{ className?: string }> = ({ className }) => (
  <FontAwesomeIcon icon={faGraduationCap} className={className} />
);

const TrendingUpIcon: React.FC<{ className?: string }> = ({ className }) => (
  <FontAwesomeIcon icon={faChartLine} className={className} />
);

const ShieldIcon: React.FC<{ className?: string }> = ({ className }) => (
  <FontAwesomeIcon icon={faShield} className={className} />
);

const SparklesIcon: React.FC<{ className?: string }> = ({ className }) => (
  <FontAwesomeIcon icon={faStar} className={className} />
);

export interface AssessmentQuestion {
  id: string;
  type: 'slider' | 'textarea' | 'single_choice' | 'multiple_choice' | 'number' | 'date';
  question: string;
  placeholder?: string;
  required: boolean;
  range?: [number, number];
  options?: Array<{
    id: string;
    label: string;
    riskLevel?: string;
    value?: any;
  }>;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
}

const goalTypes: GoalType[] = [
  {
    id: 'retirement',
    icon: TargetIcon,
    title: 'Retirement Planning',
    description: 'Build wealth for your golden years',
    badge: 'Most Popular',
    color: 'from-blue-500 to-indigo-600',
    assessmentQuestions: [
      {
        id: 'current_age',
        type: 'slider',
        question: 'What is your current age?',
        range: [18, 70],
        required: true
      },
      {
        id: 'target_retirement_age',
        type: 'slider',
        question: 'When do you plan to retire?',
        range: [50, 75],
        required: true
      },
      {
        id: 'current_savings',
        type: 'number',
        question: 'How much do you currently have saved for retirement?',
        placeholder: '25000',
        required: true,
        validation: { min: 0 }
      },
      {
        id: 'monthly_contribution',
        type: 'number',
        question: 'How much can you contribute monthly?',
        placeholder: '500',
        required: true,
        validation: { min: 0 }
      },
      {
        id: 'retirement_lifestyle',
        type: 'textarea',
        question: 'Describe your ideal retirement lifestyle',
        placeholder: 'Travel frequently, maintain current home, pursue hobbies, spend time with family...',
        required: true
      },
      {
        id: 'risk_scenario',
        type: 'single_choice',
        question: 'Your portfolio drops 20% in the first month. You:',
        options: [
          { id: 'buy_more', label: 'Buy more while prices are low', riskLevel: 'aggressive' },
          { id: 'hold_steady', label: 'Hold steady and wait it out', riskLevel: 'moderate' },
          { id: 'reduce_risk', label: 'Move to safer investments', riskLevel: 'conservative' }
        ],
        required: true
      },
      {
        id: 'income_replacement',
        type: 'slider',
        question: 'What percentage of your current income will you need in retirement?',
        range: [50, 100],
        required: true
      }
    ]
  },
  {
    id: 'home_purchase',
    icon: HomeIcon,
    title: 'Home Purchase',
    description: 'Save for your dream home',
    color: 'from-green-500 to-emerald-600',
    assessmentQuestions: [
      {
        id: 'current_age',
        type: 'slider',
        question: 'What is your current age?',
        range: [18, 70],
        required: true
      },
      {
        id: 'target_purchase_date',
        type: 'date',
        question: 'When do you plan to purchase your home?',
        required: true
      },
      {
        id: 'estimated_home_price',
        type: 'number',
        question: 'What is your estimated home price?',
        placeholder: '400000',
        required: true,
        validation: { min: 50000 }
      },
      {
        id: 'down_payment_percentage',
        type: 'single_choice',
        question: 'What down payment percentage are you targeting?',
        options: [
          { id: '10', label: '10% - Lower upfront, higher monthly payments', value: 10 },
          { id: '15', label: '15% - Balanced approach', value: 15 },
          { id: '20', label: '20% - Avoid PMI, lower monthly payments', value: 20 },
          { id: 'more', label: 'More than 20%', value: 25 }
        ],
        required: true
      },
      {
        id: 'current_savings',
        type: 'number',
        question: 'How much do you currently have saved?',
        placeholder: '15000',
        required: true,
        validation: { min: 0 }
      },
      {
        id: 'monthly_savings_ability',
        type: 'number',
        question: 'How much can you save monthly?',
        placeholder: '1200',
        required: true,
        validation: { min: 0 }
      },
      {
        id: 'preferred_location',
        type: 'textarea',
        question: 'What city or region are you considering?',
        placeholder: 'Austin, Texas or similar markets...',
        required: false
      },
      {
        id: 'annual_income',
        type: 'single_choice',
        question: 'What is your annual household income?',
        options: [
          { id: 'under_30k', label: 'Under $30,000' },
          { id: '30k_50k', label: '$30,000 - $50,000' },
          { id: '50k_75k', label: '$50,000 - $75,000' },
          { id: '75k_100k', label: '$75,000 - $100,000' },
          { id: '100k_150k', label: '$100,000 - $150,000' },
          { id: '150k_250k', label: '$150,000 - $250,000' },
          { id: 'over_250k', label: 'Over $250,000' }
        ],
        required: true
      },
      {
        id: 'investment_experience',
        type: 'single_choice',
        question: 'What is your investment experience?',
        options: [
          { id: 'beginner', label: 'Beginner - Limited or no investment experience' },
          { id: 'intermediate', label: 'Intermediate - Some investment knowledge and experience' },
          { id: 'advanced', label: 'Advanced - Extensive investment experience' }
        ],
        required: true
      },
      {
        id: 'first_time_buyer',
        type: 'single_choice',
        question: 'Are you a first-time home buyer?',
        options: [
          { id: 'yes', label: 'Yes, this is my first home purchase' },
          { id: 'no', label: 'No, I have owned a home before' }
        ],
        required: true
      },
      {
        id: 'risk_tolerance',
        type: 'single_choice',
        question: 'How comfortable are you with investment risk for your down payment fund?',
        options: [
          { id: 'conservative', label: 'Conservative - Protect my money, minimal risk', riskLevel: 'conservative' },
          { id: 'moderate', label: 'Moderate - Balanced growth with some risk', riskLevel: 'moderate' },
          { id: 'aggressive', label: 'Aggressive - Maximize growth potential', riskLevel: 'aggressive' }
        ],
        required: true
      }
    ]
  },
  {
    id: 'education',
    icon: GraduationCapIcon,
    title: 'Education Fund',
    description: 'Invest in future learning',
    color: 'from-purple-500 to-violet-600',
    assessmentQuestions: [
      {
        id: 'education_type',
        type: 'single_choice',
        question: 'What type of education are you saving for?',
        options: [
          { id: 'college', label: 'College/University (4 years)' },
          { id: 'graduate', label: 'Graduate school' },
          { id: 'trade', label: 'Trade school/Certification' },
          { id: 'multiple_children', label: 'Multiple children\'s education' }
        ],
        required: true
      },
      {
        id: 'beneficiary_age',
        type: 'number',
        question: 'How old is the beneficiary now?',
        placeholder: '5',
        required: true,
        validation: { min: 0, max: 17 }
      },
      {
        id: 'education_start_year',
        type: 'number',
        question: 'What year will they start their education?',
        placeholder: '2035',
        required: true,
        validation: { min: new Date().getFullYear() }
      },
      {
        id: 'estimated_cost',
        type: 'number',
        question: 'Estimated total education cost (in today\'s dollars)?',
        placeholder: '120000',
        required: true,
        validation: { min: 10000 }
      },
      {
        id: 'current_savings',
        type: 'number',
        question: 'Current education savings amount?',
        placeholder: '5000',
        required: true,
        validation: { min: 0 }
      },
      {
        id: 'monthly_contribution',
        type: 'number',
        question: 'Monthly contribution amount?',
        placeholder: '300',
        required: true,
        validation: { min: 0 }
      },
      {
        id: 'school_preference',
        type: 'single_choice',
        question: 'School preference?',
        options: [
          { id: 'public', label: 'Public/State schools' },
          { id: 'private', label: 'Private schools' },
          { id: 'flexible', label: 'Flexible - depends on opportunities' }
        ],
        required: true
      }
    ]
  },
  {
    id: 'wealth_building',
    icon: TrendingUpIcon,
    title: 'Wealth Building',
    description: 'Grow your net worth',
    color: 'from-orange-500 to-red-600',
    assessmentQuestions: [
      {
        id: 'target_amount',
        type: 'number',
        question: 'What is your wealth building target?',
        placeholder: '1000000',
        required: true,
        validation: { min: 10000 }
      },
      {
        id: 'timeline_years',
        type: 'slider',
        question: 'Over how many years?',
        range: [5, 30],
        required: true
      },
      {
        id: 'current_net_worth',
        type: 'number',
        question: 'What is your current net worth?',
        placeholder: '50000',
        required: true
      },
      {
        id: 'monthly_investment',
        type: 'number',
        question: 'How much can you invest monthly?',
        placeholder: '1000',
        required: true,
        validation: { min: 0 }
      },
      {
        id: 'investment_focus',
        type: 'multiple_choice',
        question: 'What areas interest you most? (Select all that apply)',
        options: [
          { id: 'stocks', label: 'Growth stocks' },
          { id: 'etfs', label: 'Index funds & ETFs' },
          { id: 'international', label: 'International markets' },
          { id: 'real_estate', label: 'Real estate investment' },
          { id: 'alternatives', label: 'Alternative investments' },
          { id: 'crypto', label: 'Cryptocurrency' }
        ],
        required: true
      },
      {
        id: 'risk_comfort',
        type: 'single_choice',
        question: 'How comfortable are you with investment risk?',
        options: [
          { id: 'high', label: 'High - I want maximum growth potential', riskLevel: 'aggressive' },
          { id: 'medium', label: 'Medium - Balanced growth and stability', riskLevel: 'moderate' },
          { id: 'low', label: 'Low - Stability is most important', riskLevel: 'conservative' }
        ],
        required: true
      }
    ]
  },
  {
    id: 'emergency_fund',
    icon: ShieldIcon,
    title: 'Emergency Fund',
    description: 'Build financial security',
    badge: 'Essential',
    color: 'from-cyan-500 to-blue-600',
    assessmentQuestions: [
      {
        id: 'monthly_expenses',
        type: 'number',
        question: 'What are your monthly essential expenses?',
        placeholder: '3500',
        required: true,
        validation: { min: 500 }
      },
      {
        id: 'target_months',
        type: 'slider',
        question: 'How many months of expenses do you want to save?',
        range: [3, 12],
        required: true
      },
      {
        id: 'current_emergency_savings',
        type: 'number',
        question: 'Current emergency fund amount?',
        placeholder: '2000',
        required: true,
        validation: { min: 0 }
      },
      {
        id: 'monthly_contribution',
        type: 'number',
        question: 'How much can you save monthly?',
        placeholder: '400',
        required: true,
        validation: { min: 0 }
      },
      {
        id: 'job_stability',
        type: 'single_choice',
        question: 'How would you rate your job stability?',
        options: [
          { id: 'very_stable', label: 'Very stable - secure employment' },
          { id: 'stable', label: 'Stable - generally secure' },
          { id: 'moderate', label: 'Moderate - some uncertainty' },
          { id: 'unstable', label: 'Unstable - irregular income or high risk' }
        ],
        required: true
      },
      {
        id: 'access_preference',
        type: 'single_choice',
        question: 'How quickly do you need access to emergency funds?',
        options: [
          { id: 'immediate', label: 'Immediate - same day access' },
          { id: 'within_week', label: 'Within a week is fine' },
          { id: 'flexible', label: 'Flexible - higher returns preferred' }
        ],
        required: true
      }
    ]
  },
  {
    id: 'custom',
    icon: SparklesIcon,
    title: 'Custom Goal',
    description: 'Define your own target',
    color: 'from-pink-500 to-rose-600',
    assessmentQuestions: [
      {
        id: 'goal_name',
        type: 'textarea',
        question: 'What is your financial goal?',
        placeholder: 'Start a business, travel fund, wedding, etc.',
        required: true
      },
      {
        id: 'target_amount',
        type: 'number',
        question: 'How much money do you need?',
        placeholder: '50000',
        required: true,
        validation: { min: 1000 }
      },
      {
        id: 'target_date',
        type: 'date',
        question: 'When do you need this money?',
        required: true
      },
      {
        id: 'current_savings',
        type: 'number',
        question: 'How much do you currently have saved?',
        placeholder: '2000',
        required: true,
        validation: { min: 0 }
      },
      {
        id: 'monthly_contribution',
        type: 'number',
        question: 'How much can you save/invest monthly?',
        placeholder: '400',
        required: true,
        validation: { min: 0 }
      },
      {
        id: 'flexibility',
        type: 'single_choice',
        question: 'How flexible is your timeline?',
        options: [
          { id: 'fixed', label: 'Fixed - date cannot change' },
          { id: 'somewhat', label: 'Somewhat flexible - within 6 months' },
          { id: 'flexible', label: 'Flexible - can adjust if needed' }
        ],
        required: true
      },
      {
        id: 'risk_tolerance',
        type: 'single_choice',
        question: 'What\'s your risk tolerance for this goal?',
        options: [
          { id: 'conservative', label: 'Conservative - protect what I have', riskLevel: 'conservative' },
          { id: 'moderate', label: 'Moderate - balanced approach', riskLevel: 'moderate' },
          { id: 'aggressive', label: 'Aggressive - maximize growth', riskLevel: 'aggressive' }
        ],
        required: true
      }
    ]
  }
];

export function GoalSelector() {
  const [selectedGoal, setSelectedGoal] = useState<GoalType | null>(null);
  const router = useRouter();

  const handleGoalSelection = (goal: GoalType) => {
    setSelectedGoal(goal);
  };

  const handleBackToSelection = () => {
    setSelectedGoal(null);
  };

  if (selectedGoal) {
    return (
      <GoalAssessmentWizard
        goal={selectedGoal}
        onBack={handleBackToSelection}
      />
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          What's your primary financial goal?
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Let our AI create a personalized investment strategy tailored to your specific objectives and timeline.
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {goalTypes.map((goal) => {
          const IconComponent = goal.icon;
          return (
            <Card
              key={goal.id}
              className="cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-105 border-2 hover:border-blue-300 group"
              onClick={() => handleGoalSelection(goal)}
            >
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between mb-3">
                  <div className={`p-3 rounded-lg bg-gradient-to-br ${goal.color} shadow-md`}>
                    <IconComponent className="w-6 h-6 text-white" />
                  </div>
                  {goal.badge && (
                    <Badge variant="secondary" className="text-xs">
                      {goal.badge}
                    </Badge>
                  )}
                </div>
                <CardTitle className="text-xl font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                  {goal.title}
                </CardTitle>
                <CardDescription className="text-gray-600">
                  {goal.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">
                    {goal.assessmentQuestions.length} questions
                  </span>
                  <FontAwesomeIcon icon={faArrowRight} className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      
      <div className="mt-12 text-center">
        <p className="text-gray-500 mb-4">
          Not sure which goal to prioritize?{' '}
          <button 
            className="text-blue-600 hover:text-blue-700 font-medium underline"
            onClick={() => router.navigate({ to: '/dashboard/chat' })}
          >
            Chat with our AI advisor
          </button>
        </p>
        <div className="flex flex-wrap justify-center gap-4 text-sm text-gray-400">
          <span className="flex items-center gap-1">
            <FontAwesomeIcon icon={faShield} className="w-4 h-4" />
            Bank-level security
          </span>
          <span className="flex items-center gap-1">
            <FontAwesomeIcon icon={faBullseye} className="w-4 h-4" />
            Personalized recommendations
          </span>
          <span className="flex items-center gap-1">
            <FontAwesomeIcon icon={faStar} className="w-4 h-4" />
            AI-powered insights
          </span>
        </div>
      </div>
    </div>
  );
}