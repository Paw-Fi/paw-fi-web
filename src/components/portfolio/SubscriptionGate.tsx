import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useSubscription, useUpgradeModal } from '@/hooks/useSubscription';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faLock, 
  faCrown, 
  faBolt, 
  faCheckCircle, 
  faArrowRight,
  faStar,
  faShield,
  faChartLine,
  faComment,
  faChartBar,
  faCalculator
} from '@fortawesome/free-solid-svg-icons';

interface SubscriptionGateProps {
  feature: string;
  title: string;
  description: string;
  requiredTier: 'premium' | 'premium_pro';
  children: React.ReactNode;
  className?: string;
}

export function SubscriptionGate({ 
  feature, 
  title, 
  description, 
  requiredTier, 
  children, 
  className 
}: SubscriptionGateProps) {
  const { canAccessFeature, tier } = useSubscription();
  const upgradeModal = useUpgradeModal();

  // Check if user has access to this feature
  const hasAccess = canAccessFeature(feature as any);

  if (hasAccess) {
    return <>{children}</>;
  }

  return (
    <div className={`relative ${className}`}>
      {/* Blurred content */}
      <div className="relative opacity-30 pointer-events-none select-none">
        {children}
      </div>
      
      {/* Upgrade overlay */}
      <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm rounded-lg">
        <Card className="max-w-sm mx-auto shadow-lg border-2 border-yellow-200">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center mb-3">
              {requiredTier === 'plus' ? (
                <FontAwesomeIcon icon={faCrown} className="w-6 h-6 text-white" />
              ) : (
                <FontAwesomeIcon icon={faBolt} className="w-6 h-6 text-white" />
              )}
            </div>
            <CardTitle className="text-lg">{title}</CardTitle>
            <CardDescription className="text-sm">
              {description}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Badge 
              variant="secondary" 
              className="mb-4 bg-gradient-to-r from-yellow-100 to-orange-100 text-yellow-800"
            >
              {requiredTier === 'plus' ? 'Premium Pro' : 'Premium'} Feature
            </Badge>
            <Button 
              onClick={() => upgradeModal.open(feature)}
              className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white"
            >
              Upgrade Now
              <FontAwesomeIcon icon={faArrowRight} className="w-4 h-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Pre-configured subscription gates for common features
export function PremiumPortfolioGate({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <SubscriptionGate
      feature="fullPortfolioDetails"
      title="Complete Portfolio Access"
      description="Unlock full portfolio breakdown with detailed educational analysis and insights"
      requiredTier="premium"
      className={className}
    >
      {children}
    </SubscriptionGate>
  );
}

export function AIConversationGate({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <SubscriptionGate
      feature="aiConversationMode"
      title="AI Conversation Mode"
      description="Chat directly with your AI analyst for educational market insights"
      requiredTier="plus"
      className={className}
    >
      {children}
    </SubscriptionGate>
  );
}

export function ScenarioAnalysisGate({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <SubscriptionGate
      feature="scenarioAnalysis"
      title="Portfolio Scenario Analysis"
      description="See how your portfolio performs in different market conditions"
      requiredTier="premium"
      className={className}
    >
      {children}
    </SubscriptionGate>
  );
}

// Feature showcase component for marketing
export function FeatureShowcase() {
  const { tier } = useSubscription();
  const upgradeModal = useUpgradeModal();

  const features = [
    {
      tier: 'free',
      name: 'Free',
      price: '$0',
      description: 'Get started with basic portfolio management',
      features: [
        '1 financial goal',
        'Basic portfolio (3 ETFs shown)',
        'Monthly AI check-ins',
        'Simple progress tracking',
        'Educational content'
      ],
      icon: Shield,
      color: 'from-gray-400 to-gray-600'
    },
    {
      tier: 'premium',
      name: 'Premium',
      price: '$19.99',
      period: '/month',
      description: 'Advanced AI analysis and portfolio insights',
      features: [
        '3 simultaneous goals',
        'Full portfolio transparency',
        'Weekly AI analysis',
        'Tax optimization',
        'Rebalancing alerts',
        'Scenario analysis',
        'Life event planning'
      ],
      icon: Star,
      color: 'from-blue-500 to-purple-600',
      popular: true
    },
    {
      tier: 'plus',
      name: 'Premium Pro',
      price: '$49.99',
      period: '/month',
      description: 'Complete portfolio analysis with AI conversation',
      features: [
        'Unlimited goals',
        'AI conversation mode',
        'Predictive life planning',
        'API access',
        'Priority support',
        'Custom strategies',
        'Family account management',
        'Advanced analytics'
      ],
      icon: Crown,
      color: 'from-yellow-500 to-orange-600'
    }
  ];

  return (
    <div className="py-12">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          Choose Your AI Financial Analysis Platform
        </h2>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Unlock educational portfolio analysis and AI-powered market insights tailored to your goals
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {features.map((plan) => {
          const Icon = plan.icon;
          const isCurrentTier = tier === plan.tier;
          
          return (
            <Card 
              key={plan.tier}
              className={`relative overflow-hidden ${
                plan.popular ? 'border-2 border-blue-500 shadow-xl scale-105' : 'border border-gray-200'
              }`}
            >
              {plan.popular && (
                <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-blue-500 to-purple-600 text-white text-center py-2 text-sm font-semibold">
                  Most Popular
                </div>
              )}
              
              <CardHeader className={plan.popular ? 'pt-12' : ''}>
                <div className="text-center">
                  <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br ${plan.color} text-white mb-4`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900">{plan.name}</h3>
                  <div className="mt-2">
                    <span className="text-4xl font-bold text-gray-900">{plan.price}</span>
                    {plan.period && <span className="text-gray-600">{plan.period}</span>}
                  </div>
                  <p className="text-gray-600 mt-2">{plan.description}</p>
                </div>
              </CardHeader>
              
              <CardContent>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-center gap-3">
                      <FontAwesomeIcon icon={faCheckCircle} className="w-4 h-4 text-green-500 flex-shrink-0" />
                      <span className="text-sm text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>
                
                <Button 
                  className={`w-full ${
                    isCurrentTier 
                      ? 'bg-gray-100 text-gray-500 cursor-not-allowed' 
                      : `bg-gradient-to-r ${plan.color} hover:opacity-90 text-white`
                  }`}
                  disabled={isCurrentTier}
                  onClick={() => !isCurrentTier && upgradeModal.open(plan.tier)}
                >
                  {isCurrentTier ? 'Current Plan' : `Upgrade to ${plan.name}`}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
      
      <div className="text-center mt-12">
        <p className="text-gray-500 mb-4">
          All plans include bank-level security and can be cancelled anytime
        </p>
        <div className="flex justify-center items-center gap-8 text-sm text-gray-400">
          <div className="flex items-center gap-2">
            <FontAwesomeIcon icon={faShield} className="w-4 h-4" />
            SSL Encrypted
          </div>
          <div className="flex items-center gap-2">
            <FontAwesomeIcon icon={faLock} className="w-4 h-4" />
            SOC 2 Compliant
          </div>
          <div className="flex items-center gap-2">
            <FontAwesomeIcon icon={faCheckCircle} className="w-4 h-4" />
            30-Day Money Back
          </div>
        </div>
      </div>
    </div>
  );
}