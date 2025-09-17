import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useNavigate } from '@tanstack/react-router';

interface FinalCallToActionPageProps {
  isLoggedIn: boolean;
  goalTitle: string;
  goalId: string;
  onComplete: () => void;
  onRegister: () => void;
}

export function FinalCallToActionPage({ 
  isLoggedIn, 
  goalTitle, 
  goalId,
  onComplete, 
  onRegister 
}: FinalCallToActionPageProps) {

  const navigate = useNavigate();
  const features = [
    {
      title: 'Track Progress',
      description: 'Monitor your savings and milestone completion with real-time updates'
    },
    {
      title: 'Smart Reminders',
      description: 'Get personalized notifications to stay on track with your goals'
    },
    {
      title: 'AI Updates',
      description: 'Receive AI-powered insights and strategy adjustments as you progress'
    },
    {
      title: 'Action Items',
      description: 'Manage your financial tasks and milestones in one organized place'
    }
  ];
  
  if (isLoggedIn) {
    return (
      <div className="text-center space-y-8">
        
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h1 className="text-4xl font-bold text-foreground mb-4">
            Your plan is ready
          </h1>
          <p className="text-xl text-muted-foreground-color max-w-2xl mx-auto mb-8">
            <strong>{goalTitle}</strong> has been saved to your dashboard. 
            You can now track your progress, manage milestones, and receive AI-powered insights.
          </p>
        </motion.div>
        
        {/* Features Preview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto mb-12"
        >
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 + (index * 0.1) }}
              className="transition-all duration-200"
            >
              <Card className="hover:shadow-md">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground-color">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-foreground text-sm">{feature.description}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
        
        {/* Call to Action */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.0 }}
        >
          <Button onClick={onComplete} size="xl" className="px-8">
            View Your Dashboard
          </Button>
        </motion.div>
      </div>
    );
  }
  
  // Not logged in - Registration prompt
  return (
    <div className="text-center space-y-8">
      
      
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <h1 className="text-4xl font-bold text-foreground mb-4">
          Ready to start your journey?
        </h1>
        <p className="text-xl text-muted-foreground-color max-w-2xl mx-auto mb-8">
          Your personalized <strong>{goalTitle}</strong> is ready! 
          Create a free account to save your plan, track progress, and achieve your financial dreams.
        </p>
      </motion.div>
      
      {/* Value Proposition */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="max-w-4xl mx-auto"
      >
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-2xl text-foreground text-center">What you'll get (free)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {features.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 + (index * 0.1) }}
                  className="flex items-start text-left"
                >
                  <div className="w-2 h-2 rounded-full bg-primary mt-2 mr-3 flex-shrink-0" />
                  <div>
                    <div className="font-semibold text-foreground mb-1">{feature.title}</div>
                    <p className="text-muted-foreground-color text-sm">{feature.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
            <div className="flex items-center justify-center gap-8 text-sm text-muted-foreground-color">
              <span>Secure & Private</span>
              <span>100% Free</span>
              <span>No Credit Card</span>
            </div>
          </CardContent>
        </Card>
      </motion.div>
      
      {/* Call to Action */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2 }}
        className="space-y-4"
      >
        <Button onClick={onRegister} size="xl" className="px-8">
          Create free account & save plan
        </Button>
        
        <p className="text-sm text-muted-foreground-color">
          Takes less than 30 seconds • No spam, ever • Cancel anytime
        </p>
      </motion.div>
      
      {/* Alternative Option */}
     
        <p className="text-muted-foreground-color mb-4 underline cursor-pointer"  onClick={()=>  navigate({ to: '/login', search: { redirect: '/dashboard/tracker/' + goalId } })}>
          Already have an account?
        </p>       
 
    </div>
  );
}