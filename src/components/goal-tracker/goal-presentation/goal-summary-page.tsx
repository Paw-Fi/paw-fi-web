import { motion } from 'framer-motion';
import type { GoalCreationResult } from '@/components/goal-tracker/types';
import { Markdown } from '@/components/ui/markdown';
import MonekoAdvisorMessage from '@/components/ui/MonekoAdvisorMessage';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

interface GoalSummaryPageProps {
  goalData: GoalCreationResult;
  isLoggedIn: boolean;
}

export function GoalSummaryPage({ goalData, isLoggedIn }: GoalSummaryPageProps) {
  const { goal, projections } = goalData;
  
  // Calculate time to goal
  const startDate = new Date(); // Start from now since this is a new goal
  const targetDate = new Date(goal?.target_date || Date.now());
  const totalMonths = Math.ceil((targetDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30));
  
  // Calculate progress (new goal starts at 0)
  const progressPercentage = 0;
  const currentAmount = 0;
  const targetAmount = goal?.target_amount || 0;
  
  // Monthly required from projections
  const monthlyRequired = projections?.monthlyRequired || 0;
  const confidenceLevel = Math.round((projections?.confidenceLevel || 0) * 100);
  
  const cards = [
    {
      title: 'Target Goal',
      value: `$${targetAmount.toLocaleString()}`,
      subtitle: goal?.description ? goal.description.slice(0, 100) + '...' : ''
    },
    {
      title: 'Timeline',
      value: `${totalMonths} months`,
      subtitle: `Target date: ${targetDate.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })}`
    },
    {
      title: 'Current Progress',
      value: `${progressPercentage}%`,
      subtitle: `$${currentAmount.toLocaleString()} of $${targetAmount.toLocaleString()}`
    },
    {
      title: 'Monthly Required',
      value: `$${monthlyRequired.toLocaleString()}`,
      subtitle: `${confidenceLevel}% confidence level`
    }
  ];
  
  const urgentMilestones = (goalData.milestones || [])
    .filter(m => m.priority === 'critical' || m.priority === 'high')
    .slice(0, 3);
  
  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="text-center"
      >
        <h1 className="text-3xl font-bold text-foreground mb-4">
          {goal?.title || 'Your Financial Goal'}
        </h1>
        <p className="text-lg text-muted-foreground-color max-w-2xl mx-auto">
          Here's your personalized financial plan created by our AI. Let's break down the key details of your journey to success.
        </p>
      </motion.div>

      {/* Moneko Advisor Message - Plan Message */}
      {goalData.advisorMessages?.planMessage && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <MonekoAdvisorMessage
            message={{
              message: goalData.advisorMessages.planMessage.content,
              tone: goalData.advisorMessages.planMessage.tone
            }}
            showMessage={true}
            typewriterSpeed={75}
          />
        </motion.div>
      )}
      
      {/* Key Metrics Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        {cards.map((card, index) => (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + index * 0.1 }}
            className="transition-all duration-200"
          >
            <Card className="border-0 shadow-sm hover:shadow-md">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-muted-foreground-color">{card.title}</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-2xl font-bold text-primary">{card.value}</div>
                {card.subtitle && (
                  <div className="text-sm text-muted-foreground-color mt-1">{card.subtitle}</div>
                )}
                {!isLoggedIn && index >= 2 && (
                  <div className="text-xs text-primary mt-2 font-medium">Advanced metrics available after sign up</div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>
      
      {/* Strategy Overview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        >
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xl text-foreground">Your Strategy</CardTitle>
          </CardHeader>
          <CardContent>
            <Markdown 
              content={goalData.strategy}
              className={`prose mx-auto max-w-none dark:prose-invert lg:prose-lg ${!isLoggedIn ? 'line-clamp-2' : ''}`}
              components={{
                // Add proper spacing for paragraphs and other elements
                p: ({children}: {children: React.ReactNode}) => <p className="mb-4 leading-relaxed text-foreground">{children}</p>,
                h1: ({children}: {children: React.ReactNode}) => <h1 className="text-2xl font-bold mb-4 mt-6 text-foreground">{children}</h1>,
                h2: ({children}: {children: React.ReactNode}) => <h2 className="text-xl font-semibold mb-3 mt-5 text-foreground">{children}</h2>,
                h3: ({children}: {children: React.ReactNode}) => <h3 className="text-lg font-medium mb-2 mt-4 text-foreground">{children}</h3>,
                ul: ({children}: {children: React.ReactNode}) => <ul className="mb-4 pl-6 space-y-2">{children}</ul>,
                ol: ({children}: {children: React.ReactNode}) => <ol className="mb-4 pl-6 space-y-2">{children}</ol>,
                li: ({children}: {children: React.ReactNode}) => <li className="leading-relaxed text-muted-foreground-color">{children}</li>,
                blockquote: ({children}: {children: React.ReactNode}) => <blockquote className="border-l border pl-4 my-4 italic">{children}</blockquote>,
                // Handle details/summary for collapsible sections
                details: ({children}: {children: React.ReactNode}) => (
                  <details className="mb-4 border rounded-lg overflow-hidden">
                    {children}
                  </details>
                ),
                summary: ({children}: {children: React.ReactNode}) => (
                  <summary className="cursor-pointer bg-subtle-background px-4 py-3 font-medium hover:bg-subtle-background/80 transition-colors">
                    {children}
                  </summary>
                ),
                // Add spacing for other common elements
                strong: ({children}: {children: React.ReactNode}) => <strong className="font-semibold text-foreground">{children}</strong>,
                em: ({children}: {children: React.ReactNode}) => <em className="italic text-muted-foreground-color">{children}</em>,
                code: ({children}: {children: React.ReactNode}) => <code className="bg-subtle-background px-2 py-1 rounded text-sm font-mono">{children}</code>,
                pre: ({children}: {children: React.ReactNode}) => <pre className="bg-subtle-background p-4 rounded-lg overflow-x-auto mb-4">{children}</pre>,
              }}
            />
            {!isLoggedIn && (
              <div className="text-center">
                <span className="text-sm text-primary font-medium bg-subtle-background px-3 py-1 rounded-full">
                  Full strategy available after sign up
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
      
      {/* What Needs Attention */}
      {urgentMilestones.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl text-foreground">What Needs Your Attention</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {urgentMilestones.slice(0, isLoggedIn ? urgentMilestones.length : 2).map((milestone, index) => (
                <div 
                  key={milestone.id || index}
                  className="flex items-start p-4 bg-subtle-background rounded-lg"
                >
                  <div className={`w-2 h-2 rounded-full mt-2 mr-4 flex-shrink-0 ${milestone.priority === 'critical' ? 'bg-warning' : 'bg-primary'}`} />
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground mb-1">
                      {milestone.title}
                    </h3>
                    <p className="text-sm text-muted-foreground-color mb-2">
                      Due: {new Date(milestone.due_date || '').toLocaleDateString()}
                    </p>
                    <p className="text-sm text-muted-foreground-color">
                      {milestone.description}
                    </p>
                    {!isLoggedIn && index >= 1 && (
                      <p className="text-xs text-primary mt-2 font-medium">Detailed action plan available after sign up</p>
                    )}
                  </div>
                </div>
              ))}
              {!isLoggedIn && urgentMilestones.length > 2 && (
                <div className="p-3 bg-subtle-background rounded-lg text-center">
                  <p className="text-sm text-primary font-medium">
                    +{urgentMilestones.length - 2} more priority action{urgentMilestones.length > 3 ? 's' : ''} available after sign up
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}