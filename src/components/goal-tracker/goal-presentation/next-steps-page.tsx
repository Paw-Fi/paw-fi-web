import { motion } from 'framer-motion';
import type { DBMilestone, AdvisorMessage } from '@/components/goal-tracker/types';
import MonekoAdvisorMessage from '@/components/ui/MonekoAdvisorMessage';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Markdown } from '@/components/ui/markdown';

interface NextStepsPageProps {
  milestones: DBMilestone[];
  strategy: string;
  isLoggedIn: boolean;
  advisorMessage?: AdvisorMessage;
}

export function NextStepsPage({ milestones, strategy, isLoggedIn, advisorMessage }: NextStepsPageProps) {
  const getPriorityClasses = (priority: string) => {
    switch (priority) {
      case 'critical':
        return { dot: 'bg-destructive', text: 'text-destructive' };
      case 'high':
        return { dot: 'bg-warning', text: 'text-warning' };
      case 'medium':
        return { dot: 'bg-primary', text: 'text-primary' };
      case 'low':
        return { dot: 'bg-success', text: 'text-success' };
      default:
        return { dot: 'bg-primary', text: 'text-primary' };
    }
  };
  
  const getTimelineStatus = (dueDate: string) => {
    const due = new Date(dueDate);
    const now = new Date();
    const diffTime = due.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return { text: 'Overdue', color: 'text-destructive' };
    } else if (diffDays <= 30) {
      return { text: `${diffDays} days`, color: 'text-warning' };
    } else if (diffDays <= 90) {
      return { text: `${Math.ceil(diffDays / 30)} months`, color: 'text-primary' };
    } else {
      return { text: `${Math.ceil(diffDays / 365)} years`, color: 'text-success' };
    }
  };
  
  // Sort milestones by due date (end date)
  const sortedMilestones = [...milestones].sort((a, b) => {
    return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
  });
  
  // Get immediate actions (critical and high priority, due within 90 days)
  const immediateActions = sortedMilestones.filter(m => {
    const dueDate = new Date(m.due_date);
    const now = new Date();
    const diffDays = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return (m.priority === 'critical' || m.priority === 'high') && diffDays <= 90;
  });
  
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
          Your Action Plan
        </h1>
        <p className="text-lg text-muted-foreground-color max-w-2xl mx-auto">
          Here's your personalized roadmap to success. Follow these milestones and actions 
          to stay on track and achieve your financial goal.
        </p>
      </motion.div>

      {/* Moneko Advisor Message - Next Steps Message */}
      {advisorMessage?.content && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <MonekoAdvisorMessage
            message={{
              message: advisorMessage.content,
              tone: advisorMessage.tone
            }}
            showMessage={true}
            typewriterSpeed={75}
          />
        </motion.div>
      )}
      
      {/* Immediate Actions */}
      {immediateActions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-xl text-foreground">Immediate Actions Required</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {immediateActions.slice(0, isLoggedIn ? immediateActions.length : 2).map((milestone, index) => {
                  const cls = getPriorityClasses(milestone.priority);
                  const timeline = getTimelineStatus(milestone.due_date);
                  return (
                    <motion.div
                      key={milestone.id || index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + (index * 0.1) }}
                      className="flex items-start p-4 bg-subtle-background rounded-lg"
                    >
                      <div className={`w-3 h-3 rounded-full ${cls.dot} mt-2 mr-4 flex-shrink-0`} />
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-semibold text-foreground">{milestone.title}</h3>
                          <div className={`text-sm font-medium ${timeline.color}`}>{timeline.text}</div>
                        </div>
                        <p className="text-sm text-muted-foreground-color mb-2">{milestone.description}</p>
                        <div className="flex items-center text-xs text-muted-foreground-color">
                          <span className="capitalize">{milestone.milestone_type}</span>
                          {milestone.target_amount && milestone.target_amount > 0 && (
                            <>
                              <span className="mx-2">•</span>
                              <span>${milestone.target_amount.toLocaleString()}</span>
                            </>
                          )}
                          {milestone.frequency && (
                            <>
                              <span className="mx-2">•</span>
                              <span className="capitalize">{milestone.frequency}</span>
                            </>
                          )}
                        </div>
                        {!isLoggedIn && index >= 1 && (
                          <p className="text-xs text-primary mt-2 font-medium">Additional action details available after sign up</p>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
                {!isLoggedIn && immediateActions.length > 2 && (
                  <div className="p-3 bg-subtle-background rounded-lg text-center">
                    <p className="text-sm text-primary font-medium">
                      +{immediateActions.length - 2} more urgent action{immediateActions.length > 3 ? 's' : ''} available after sign up
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
      
      {/* All Milestones Timeline */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-xl text-foreground">Complete Roadmap</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6 relative">
          {sortedMilestones.slice(0, isLoggedIn ? sortedMilestones.length : 3).map((milestone, index) => {
            const cls = getPriorityClasses(milestone.priority);
            const timeline = getTimelineStatus(milestone.due_date);
            
            return (
              <motion.div
                key={milestone.id || index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + (index * 0.1) }}
                className="relative"
              >
                {/* Timeline line */}
                {index < (isLoggedIn ? sortedMilestones.length - 1 : Math.min(3, sortedMilestones.length) - 1) && (
                  <div className="absolute left-6 top-12 w-0.5 h-[86%] bg-foreground/10 rounded-full z-0" />
                )}
                
                <div className="flex items-start">
                  <div className={`w-12 h-12 rounded-full border flex items-center justify-center mr-4 flex-shrink-0`}>
                    <div className={`w-2 h-2 rounded-full ${cls.dot}`} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-lg font-semibold text-foreground mb-1">
                          {milestone.title}
                        </h3>
                        <div className="flex items-center text-sm text-muted-foreground-color">
                          <span>Due: {new Date(milestone.due_date).toLocaleDateString()}</span>
                          <span className="mx-2">•</span>
                          <Badge variant="outline" className="capitalize text-xs">{milestone.priority}</Badge>
                        </div>
                      </div>
                      <div className={`text-right ${timeline.color}`}>
                        <div className="text-sm font-medium">{timeline.text}</div>
                        {milestone.target_amount && milestone.target_amount > 0 && (
                          <div className="text-lg font-bold">
                            ${milestone.target_amount.toLocaleString()}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <p className="text-muted-foreground-color mb-3">
                      {milestone.description}
                    </p>
                    
                    {milestone.habit_description && (
                      <div className="p-3 bg-subtle-background rounded-lg">
                        <div className="flex items-center text-sm text-muted-foreground-color">
                          <span className="font-medium">Habit: </span>
                          <span className="ml-1">{milestone.habit_description}</span>
                          {milestone.habit_target_value && milestone.habit_target_value > 0 && (
                            <>
                              <span className="mx-2">•</span>
                              <span>${milestone.habit_target_value.toLocaleString()}</span>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                    {!isLoggedIn && index >= 2 && (
                      <p className="text-xs text-primary mt-2 font-medium">Milestone progress tracking available after sign up</p>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
          {!isLoggedIn && sortedMilestones.length > 3 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
            >
              <Card>
                <CardContent className="p-6 text-center">
                  <h3 className="text-lg font-bold text-foreground mb-2">Complete Roadmap Available</h3>
                  <p className="text-primary font-medium">
                    +{sortedMilestones.length - 3} more milestone{sortedMilestones.length > 4 ? 's' : ''} with detailed tracking available after sign up
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>
          </CardContent>
        </Card>
      </motion.div>
      
      {/* Strategy Reminder */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
      >
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xl text-foreground">Remember Your Strategy</CardTitle>
          </CardHeader>
          <CardContent>
            <Markdown 
              content={strategy}
              className={`prose mx-auto max-w-none dark:prose-invert lg:prose-lg ${!isLoggedIn ? 'line-clamp-2' : ''}`}
              components={{
                p: ({children}: {children: React.ReactNode}) => <p className="mb-4 leading-relaxed text-foreground">{children}</p>,
                h1: ({children}: {children: React.ReactNode}) => <h1 className="text-2xl font-bold mb-4 mt-6 text-foreground">{children}</h1>,
                h2: ({children}: {children: React.ReactNode}) => <h2 className="text-xl font-semibold mb-3 mt-5 text-foreground">{children}</h2>,
                h3: ({children}: {children: React.ReactNode}) => <h3 className="text-lg font-medium mb-2 mt-4 text-foreground">{children}</h3>,
                ul: ({children}: {children: React.ReactNode}) => <ul className="mb-4 pl-6 space-y-2">{children}</ul>,
                ol: ({children}: {children: React.ReactNode}) => <ol className="mb-4 pl-6 space-y-2">{children}</ol>,
                li: ({children}: {children: React.ReactNode}) => <li className="leading-relaxed text-muted-foreground-color">{children}</li>,
                blockquote: ({children}: {children: React.ReactNode}) => <blockquote className="border-l border pl-4 my-4 italic">{children}</blockquote>,
                details: ({children}: {children: React.ReactNode}) => (
                  <details className="mb-4 border rounded-lg overflow-hidden">{children}</details>
                ),
                summary: ({children}: {children: React.ReactNode}) => (
                  <summary className="cursor-pointer bg-subtle-background px-4 py-3 font-medium hover:bg-subtle-background/80 transition-colors">{children}</summary>
                ),
                strong: ({children}: {children: React.ReactNode}) => <strong className="font-semibold text-foreground">{children}</strong>,
                em: ({children}: {children: React.ReactNode}) => <em className="italic text-muted-foreground-color">{children}</em>,
                code: ({children}: {children: React.ReactNode}) => <code className="bg-subtle-background px-2 py-1 rounded text-sm font-mono">{children}</code>,
                pre: ({children}: {children: React.ReactNode}) => <pre className="bg-subtle-background p-4 rounded-lg overflow-x-auto mb-4">{children}</pre>,
              }}
            />
            {!isLoggedIn && (
              <div className="text-center">
                <span className="text-sm text-primary font-medium bg-subtle-background px-3 py-1 rounded-full">Complete strategy details available after sign up</span>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}