import { motion } from 'framer-motion';
import type { Insight, AdvisorMessage } from '@/components/goal-tracker/types';
import MonekoAdvisorMessage from '@/components/ui/MonekoAdvisorMessage';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface KeyInsightsPageProps {
  insights: Insight[];
  isLoggedIn: boolean;
  advisorMessage?: AdvisorMessage;
}

export function KeyInsightsPage({ insights, isLoggedIn, advisorMessage }: KeyInsightsPageProps) {
  const getPriorityClasses = (priority: string) => {
    switch (priority) {
      case 'high':
        return { dot: 'bg-destructive', text: 'text-destructive' };
      case 'medium':
        return { dot: 'bg-warning', text: 'text-warning' };
      case 'low':
        return { dot: 'bg-success', text: 'text-success' };
      default:
        return { dot: 'bg-primary', text: 'text-primary' };
    }
  };
  
  // Group insights by priority
  const highPriorityInsights = insights.filter(i => i.priority === 'high');
  const mediumPriorityInsights = insights.filter(i => i.priority === 'medium');
  const lowPriorityInsights = insights.filter(i => i.priority === 'low');
  
  const renderInsightGroup = (title: string, groupInsights: Insight[], delay: number) => {
    if (groupInsights.length === 0) return null;
    
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay }}
      >
        <Card className="mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-foreground">{title}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {groupInsights.map((insight, index) => {
                const cls = getPriorityClasses(insight.priority);
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: delay + (index * 0.1) }}
                    className="flex items-start p-4 bg-subtle-background rounded-lg"
                  >
                    <div className={`w-2 h-2 rounded-full mt-2 mr-4 flex-shrink-0 ${cls.dot}`} />
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="text-base font-semibold text-foreground">{insight.title}</h4>
                        {insight.actionable && (
                          <Badge variant="outline" className="text-xs">Action Required</Badge>
                        )}
                      </div>
                      <p className="text-muted-foreground-color leading-relaxed">
                        {insight.content}
                      </p>
                      <div className="flex items-center mt-3 text-xs text-muted-foreground-color">
                        <span className="capitalize">{insight.type} insight</span>
                        <span className="mx-2">•</span>
                        <span className={`capitalize ${cls.text}`}>{insight.priority} priority</span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  };
  
  return (
    <div className="space-y-8 w-full">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="text-center"
      >
        <h1 className="text-3xl font-bold text-foreground mb-4">
          Key Insights From Your AI Advisor
        </h1>
        <p className="text-lg text-muted-foreground-color max-w-2xl mx-auto">
          Our AI has analyzed your financial situation and identified important insights to help you succeed. 
          Pay special attention to actionable items that require your attention.
        </p>
      </motion.div>

      {/* Moneko Advisor Message - Insights Message */}
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
      
      {/* Insights by Priority */}
      <div className="space-y-12">
        {renderInsightGroup(
          '🚨 High Priority Insights', 
          highPriorityInsights, 
          0.2
        )}
        
        {renderInsightGroup(
          '⚠️ Medium Priority Insights', 
          isLoggedIn ? mediumPriorityInsights : mediumPriorityInsights.slice(0, 1), 
          0.4
        )}
        
        {renderInsightGroup(
          '✅ Additional Insights', 
          isLoggedIn ? lowPriorityInsights : lowPriorityInsights.slice(0, 1), 
          0.6
        )}
        
        {!isLoggedIn && (mediumPriorityInsights.length > 1 || lowPriorityInsights.length > 1) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
          >
            <Card>
              <CardContent className="p-6 text-center">
                <h3 className="text-lg font-bold text-foreground mb-2">Additional Insights Available</h3>
                <p className="text-primary font-medium">
                  +{(mediumPriorityInsights.length > 1 ? mediumPriorityInsights.length - 1 : 0) + (lowPriorityInsights.length > 1 ? lowPriorityInsights.length - 1 : 0)} more personalized insights available after sign up
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
      
      {/* Summary */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
      >
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xl text-foreground">AI Analysis Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary mb-2">{insights.length}</div>
                <div className="text-sm text-muted-foreground-color">Total Insights</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary mb-2">{insights.filter(i => i.actionable).length}</div>
                <div className="text-sm text-muted-foreground-color">Action Items</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary mb-2">{highPriorityInsights.length}</div>
                <div className="text-sm text-muted-foreground-color">High Priority</div>
              </div>
            </div>
            {!isLoggedIn && (
              <div className="mt-4 text-center text-sm text-primary font-medium">
                Complete detailed analysis available after sign up
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}